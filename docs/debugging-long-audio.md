# Long queue delays and duplicate completion notifications

Related issues: [#174](https://github.com/RWTH-TIME/shoutout/issues/174) and
[#175](https://github.com/RWTH-TIME/shoutout/issues/175).

## Cause

`ThreadPoolExecutor(max_workers=...)` limits executing tasks, not queued tasks.
The worker previously kept claiming jobs while all execution slots were occupied.
A queued claim did not start its heartbeat until execution began. After the
90-second stale interval, the same job could be reclaimed and queued again.
Existing duplicate work also delayed later jobs, even though each individual
transcription was fast.

Production logs confirmed the sequence: one claim waited approximately 6 h 52 min
before execution, then completed repeatedly every 2â€“3 minutes. Two affected jobs
had 123 and 103 successful completion API calls. A single attempt took a median
149 s and 146 s respectively. These counts are API completions, not independently
verified email delivery receipts.

Every completion previously regenerated the result token and called the mail
notification function, including repeated completions of an already finished job.

## Fix

- Claim only when an executor slot is available. Completed slots can be reused;
  no unbounded local queue of claimed jobs is created.
- Validate that concurrency is positive. Serialize access to the shared inference
  manager so concurrent jobs cannot replace each other's cached Whisper model.
  Heartbeats continue while another active job uses the model.
- Atomically transition a RUNNING job owned by the worker to FINISHED in the same
  transaction that writes result metadata. Only the winning transaction notifies.
  Repeated completion calls keep the existing download token.
- Reject file results belonging to another job. Make failure transitions
  conditional too, so late errors cannot requeue already completed work.
- Check ownership and RUNNING status atomically when updating heartbeats.
- Log progress and timings separately for diarization, postprocessing and Whisper.

The existing recursive speaker postprocessing and chunk-selection policy are
unchanged. The incident was a scheduling problem, not a slow recursive pass.

Notifications remain best-effort after commit. This prevents duplicate sends
from repeated completion requests but does not provide a durable mail outbox:
a crash between commit and notification can still lose a notification.

## Validation

The worker regression tests exercise saturated execution slots at concurrency
1, 2 and 3, subsequent slot reuse, invalid concurrency, empty transcripts,
existing chunk selection and diarization progress callbacks. They substitute
inference dependencies and do not download models or send mail.

The JavaScript tests execute the actual service with isolated transaction,
storage and mail adapters. They cover 50 concurrent completions, stable tokens,
late failures, foreign files, cancellation and reassignment races, transactional
rollback, and concurrent retryable and terminal failures. These are service tests,
not a substitute for PostgreSQL integration testing.

```bash
# From the repository root, in an isolated Python environment:
python -m pip install pytest pandas numpy httpx pydantic-settings
PYTHONPATH=worker python -m pytest worker/tests -q

cd dashboard
npm ci
npx prisma generate
node --test tests/job-completion.test.mjs
npx tsc --noEmit
npm run lint
```

Both regression suites also run in the existing CI quality jobs.

A real 98-minute recording was tested locally on an RTX 4070 Ti with
pyannote.audio 4.0.7 and PyTorch 2.11.0+cu128. Diarization took 84.38 s,
original postprocessing 0.205 s, and the full original large-v3 transcription
625.54 s over 278 sections, excluding model loading. The server incident used
Whisper turbo, so its runtimes are not directly comparable. The local CUDA test
version differs from the declared torch minimum; no NixOS build or production
deployment was performed. No recordings, transcripts, logs or credentials are
included in this commit.

## Isolated audio diagnosis

Install the worker dependencies, accept the diarization model's Hugging Face
conditions, and run:

```bash
PYTHONPATH=worker python scripts/diagnose-audio.py recording.m4a --token-file huggingface.token
# Optional full Whisper pass:
PYTHONPATH=worker python scripts/diagnose-audio.py recording.m4a --token-file huggingface.token --transcribe --model large
```

Timings, RTTM and section boundaries are written under `.cache/diagnosis/`.
The script does not contact the dashboard or send mail, and refuses to benchmark
a single-speaker fallback as though real diarization had succeeded.

## Deployment

Update the dashboard first, then update and restart every worker to discard any
old in-memory duplicate backlog. No database migration is required. Existing
running claims can be reclaimed after their heartbeat becomes stale; input and
result files should not be deleted as part of this rollout.

## Remaining limitations and verification notes

- Notifications are best-effort after the database commit; there is no durable
  outbox or guaranteed delivery after a process crash.
- The original recursive overlap algorithm is deliberately retained. Synthetic
  deeply nested input can still exceed its recursion limit; it was not the cause
  of this incident and needs separate quality validation before replacement.
- Worker callbacks identify the worker and job, not a unique claim generation.
  A stale callback arriving after the same worker reclaims that job is not fully
  fenced by this protocol. The fix prevents the observed unbounded prefetch loop;
  full lease fencing is a separate improvement.
- Local checks passed: 8 Python tests, 10 service tests, TypeScript, full ESLint,
  Flake8, and the production build with `next build --webpack`.
- The default Turbopack build crashed locally while processing `app/globals.css`
  (its Node subprocess exited before connection), including outside the sandbox.
  The Webpack build succeeded. The Turbopack issue remains unresolved.
- PostgreSQL integration, NixOS builds and production deployment were not run.
  Both dashboard and workers must be updated; restart workers to clear old queues.
