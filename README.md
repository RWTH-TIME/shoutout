# <img src="dashboard/app/icon.svg" alt="" width="36" height="36" /> Shoutout

Self-hosted audio transcription with speaker diarization.

Upload one or more audio files as a single job, run Whisper (and optionally pyannote) on attached workers, then preview transcripts in the browser, download a zip, or share the job privately, with signed-in users, or publicly.

## Models

Speech-to-text uses [OpenAI Whisper](https://github.com/openai/whisper) through the `openai-whisper` package. A job names one checkpoint; the worker loads it with `whisper.load_model` on CUDA when a GPU is present, otherwise on CPU. The create-job form and `GET /api/v1/models` only list names a connected worker advertises in `WHISPER_MODELS`.

| Name | Role |
|------|------|
| `turbo` | Alias of `large-v3-turbo`. Recommended: almost as accurate as large, and much faster. |
| `large`, `large-v1`, `large-v2`, `large-v3` | Most accurate, and the slowest. `large` is `large-v3`. |
| `medium` | Good accuracy at a moderate speed. |
| `small` | Faster than medium, with less accuracy on hard audio. |
| `base` | Fast, with clearly lower accuracy. |
| `tiny` | Fastest, and the least accurate. Useful for a quick draft. |

`tiny`, `base`, `small`, and `medium` also have an English-only twin whose name ends in `.en` (`tiny.en`, `base.en`, `small.en`, `medium.en`). Those checkpoints do not transcribe other languages.

Speaker labels come from [pyannote/speaker-diarization-community-1](https://huggingface.co/pyannote/speaker-diarization-community-1). The worker aligns those speaker turns with the Whisper segments. Without a Hugging Face token that has accepted that model’s conditions, transcription still runs and every segment is labeled `SPEAKER_00`. Override the pipeline with `DIARIZATION_MODEL` if you need a different pyannote checkpoint.

The local Compose worker bakes in `tiny`. CI publishes `ghcr.io/rwth-time/shoutout/worker:tiny` and `:turbo` (`:latest` is the turbo image). Any other name in `WHISPER_MODELS` is downloaded the first time a job asks for it.

## What it does

- **Jobs as projects** — multiple files live in one job; each file gets its own transcript preview and playback
- **Speaker-aware transcripts** — Whisper plus optional pyannote diarization with timestamps
- **Web UI** — create jobs, watch status, preview results, share links, and manage mailing preferences when mail is enabled
- **Workers over HTTPS** — GPU or CPU workers claim work from the dashboard; they never need database credentials
- **Automation** — per-user API keys for REST and MCP
- **Local storage** — Postgres for metadata, Garage (S3) for audio and results
- **Optional email** — Listmonk notifications when a job finishes or fails, gated by `MAIL_ENABLED`
- **NixOS modules** — deploy the dashboard host and remote workers separately

```text
Browser / API / MCP  --HTTPS (OIDC session or API key)-->  Dashboard
                                                              |
                                                              +--> Postgres
                                                              +--> Garage (S3)

Workers  --HTTPS (enrollment / worker token)-->  Dashboard
Workers  --presigned GET/PUT------------------>  Garage
```

## Requirements

- Docker and Docker Compose (recommended for first install)
- Optional: NVIDIA GPU + [nvidia-container-toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) for CUDA workers
- Optional: Hugging Face token with access to `pyannote/speaker-diarization-community-1`

## Install with Docker

Clone the repository, then start infrastructure, bootstrap object storage, and bring up the app:

```sh
git clone https://github.com/rwth-time/shoutout.git
cd shoutout

docker compose up -d postgres garage keycloak keycloak-postgres
COMPOSE_FILE=docker-compose.yml ./scripts/garage-bootstrap.sh
docker compose up -d --build dashboard worker
docker compose up -d --force-recreate dashboard
```

`garage-bootstrap.sh` creates the Garage layout, access key, bucket, and CORS rules for browser uploads. Credentials are written to `.garage-creds.env` (gitignored). Recreate the dashboard after bootstrap so it loads those credentials.

Open [http://localhost:8000](http://localhost:8000) and sign in with **test** / **test**.

| Service   | URL / port | Notes |
|-----------|------------|--------|
| Dashboard | [localhost:8000](http://localhost:8000) | Login `test` / `test` |
| Keycloak  | [localhost:8090](http://localhost:8090) | Admin `admin` / `admin`, realm `main` |
| Postgres  | `localhost:5433` | User/password `admin` |
| Garage S3 | `localhost:3900` | Browser uploads/downloads |

The default worker is CPU-only with Whisper `tiny` (fine for local testing). Without `HUGGINGFACE_APIKEY` it falls back to single-speaker transcription, so every transcript shows only `SPEAKER_00`. Set the token (and accept the conditions for `pyannote/speaker-diarization-community-1` on Hugging Face) for real diarization:

```sh
export HUGGINGFACE_APIKEY=hf_...
docker compose up -d --build worker
```

This rebuilds the worker image locally and pre-warms the diarization model into that local image layer so it starts instantly. This pre-warm build arg is for local/dev builds only: the `worker:tiny` and `worker:turbo` images published to `ghcr.io` are built by CI **without** any Hugging Face token, so they never bundle gated model weights. Published workers fetch `pyannote/speaker-diarization-community-1` over the network on first use with the `HUGGINGFACE_TOKEN` env var and cache it under `HF_HOME` (mount a volume there, as `docker-compose.prod.yml` does, so restarts don't re-download it).

### GPU worker

```sh
docker compose --profile gpu up -d --build worker-gpu
```

### Re-import Keycloak realm

If you change `.keycloak-config/main-realm.json` after the first import:

```sh
docker compose stop keycloak
docker compose rm -f keycloak
docker volume rm shoutout_keycloak-postgres-data
docker compose up -d keycloak-postgres keycloak
```

## Using the app

1. Sign in and create a job (one or many audio files).
2. A worker claims the job, writes per-file transcripts, and packs a zip.
3. Open `/job/<uuid>` to preview audio and transcript, download results, or share.
4. Visibility: **private**, **signed-in users with the link**, or **public**.
5. Under **Settings**, configure theme, language, and API keys. Mailing options appear there when `MAIL_ENABLED=true`.

Jobs expire after `JOB_EXPIRATION_DAYS` (default 14). Set `0` for no expiration.

## API and MCP

Create an API key under **Settings → API keys**. The secret is shown once. The same bearer token works for REST and MCP.

```bash
export SHOUTOUT_KEY="so_xxx_yyy"
export SHOUTOUT_URL="https://shoutout.example.com"

curl -s -H "Authorization: Bearer $SHOUTOUT_KEY" "$SHOUTOUT_URL/api/v1/languages"
curl -s -H "Authorization: Bearer $SHOUTOUT_KEY" "$SHOUTOUT_URL/api/v1/models"

# One or more files become a single job
curl -s -X POST "$SHOUTOUT_URL/api/v1/jobs" \
  -H "Authorization: Bearer $SHOUTOUT_KEY" \
  -F "files[]=@meeting-a.mp3;filename=meeting-a.mp3" \
  -F "files[]=@meeting-b.mp3;filename=meeting-b.mp3" \
  -F "name=weekly-standup" \
  -F "model=large-v3" \
  -F "participants=3" \
  -F "language=en"

curl -s -H "Authorization: Bearer $SHOUTOUT_KEY" "$SHOUTOUT_URL/api/v1/jobs/weekly-standup"
curl -L -H "Authorization: Bearer $SHOUTOUT_KEY" \
  "$SHOUTOUT_URL/api/v1/jobs/weekly-standup/result" -o weekly-standup.zip
```

### MCP client

```json
{
  "mcpServers": {
    "shoutout": {
      "url": "https://shoutout.example.com/api/mcp",
      "headers": {
        "Authorization": "Bearer ${SHOUTOUT_KEY}"
      }
    }
  }
}
```

Tools: `list_languages`, `list_models`, `request_upload`, `create_job`, `create_jobs_bulk`, `list_jobs`, `get_job`, `delete_job`, `download_job_result`.

## Email notifications (Listmonk)

Optional. Set `MAIL_ENABLED=true` to show mailing preferences and the per-job notify toggle. With that flag on, Shoutout can email you when a job finishes or fails (per user settings and per-job toggle).

Set `LISTMONK_URL`, `LISTMONK_USERNAME`, `LISTMONK_TOKEN`, and `LISTMONK_TEMPLATE_ID` as well. If `MAIL_ENABLED` is false, or `LISTMONK_URL` is empty, jobs still complete and no mail is sent. Mailing controls stay hidden while `MAIL_ENABLED` is false.

Example template body:

```html
<p>Your transcript <strong>{{ .Tx.Data.jobName }}</strong> ({{ .Tx.Data.model }}) is ready.</p>
<p><a href="{{ .Tx.Data.jobUrl }}">Open job</a></p>
```

## NixOS

### Dashboard host

```nix
{
  imports = [ inputs.shoutout.nixosModules.shoutout ];
  services.shoutout = {
    enable = true;
    url = "https://shoutout.example.com";
    jobExpirationDays = 14;
    oidc.issuer = "https://auth.example.com/realms/main";
    oidc.clientSecretFile = "/run/secrets/shoutout-oidc";
    nextauthSecretFile = "/run/secrets/shoutout-nextauth";
    workerEnrollmentTokenFile = "/run/secrets/shoutout-worker-enroll";
    garage.accessKeyFile = "/run/secrets/shoutout-s3-access";
    garage.secretKeyFile = "/run/secrets/shoutout-s3-secret";
    mail.enable = true;
    listmonk.url = "https://listmonk.example.com";
    listmonk.username = "api";
    listmonk.tokenFile = "/run/secrets/shoutout-listmonk";
    listmonk.templateId = 1;
  };
}
```

### GPU worker host

```nix
{
  imports = [ inputs.shoutout.nixosModules.shoutout-worker ];
  services.shoutout-worker = {
    enable = true;
    cuda = true;
    dashboardUrl = "https://shoutout.example.com";
    enrollmentTokenFile = "/run/secrets/shoutout-worker-enroll";
    huggingfaceTokenFile = "/run/secrets/hf";
    whisperModels = [ "small" "large-v3" ];
    concurrency = 1;
  };
}
```

```sh
nix develop
```

## Development

### Dashboard

```bash
cd dashboard
npm ci
PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x npx prisma generate
npm run dev
```

### Worker

```bash
cd worker
pip install -e .
export DASHBOARD_URL=http://localhost:3000
export WORKER_ENROLLMENT_TOKEN=dev-worker-enrollment-token
export WHISPER_MODELS=tiny
export HUGGINGFACE_TOKEN=...
shoutout-worker
```

### Tests

```sh
# API smoke (fake worker claim/complete)
docker compose -f docker-compose.smoke.yml up -d postgres garage
COMPOSE_FILE=docker-compose.smoke.yml ./scripts/garage-bootstrap.sh
docker compose -f docker-compose.smoke.yml up -d --build dashboard
./scripts/smoke-test.sh

# Full e2e with Whisper tiny worker
docker compose -f docker-compose.e2e.yml up -d postgres garage
COMPOSE_FILE=docker-compose.e2e.yml ./scripts/garage-bootstrap.sh
docker compose -f docker-compose.e2e.yml up -d --build dashboard worker
./scripts/e2e-test.sh
```

## Environment variables

### Dashboard

| Name | Default | Description |
|------|---------|-------------|
| `DATABASE_URL` | `postgresql://admin:admin@localhost:5433/postgres?schema=public` | Postgres connection |
| `S3_ENDPOINT` | `http://localhost:3900` | Internal Garage/S3 endpoint |
| `S3_PUBLIC_ENDPOINT` | same as `S3_ENDPOINT` | Browser-reachable S3 endpoint for presigns |
| `S3_WORKER_ENDPOINT` | same as `S3_ENDPOINT` | Worker-reachable S3 endpoint for claim presigns |
| `S3_REGION` | `garage` | S3 region |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | from `.garage-creds.env` | S3 credentials |
| `S3_BUCKET` | `shoutout-job-bucket` | Bucket name |
| `WORKER_ENROLLMENT_TOKEN` | `dev-worker-enrollment-token` | Shared secret for worker registration |
| `JOB_EXPIRATION_DAYS` | `14` | Days until jobs expire; `0` disables expiration |
| `MAIL_ENABLED` | `false` | `true` shows mailing settings and per-job notification toggles, and allows notification emails |
| `LISTMONK_URL` | empty | Optional Listmonk base URL |
| `LISTMONK_USERNAME` / `LISTMONK_TOKEN` | empty | Listmonk API credentials |
| `LISTMONK_TEMPLATE_ID` | `0` | Transactional template id |
| `OIDC_*` / `NEXTAUTH_*` | Keycloak defaults | Authentication |

### Worker

| Name | Default | Description |
|------|---------|-------------|
| `DASHBOARD_URL` | `http://localhost:3000` | Dashboard base URL |
| `WORKER_ENROLLMENT_TOKEN` | `dev-worker-enrollment-token` | Enrollment secret |
| `WORKER_TOKEN` | empty | Optional pre-issued worker token |
| `WHISPER_MODELS` | `tiny` | Comma-separated models this worker offers |
| `HUGGINGFACE_TOKEN` | empty | Token for pyannote; without it transcripts are single-speaker |
| `DIARIZATION_MODEL` | `pyannote/speaker-diarization-community-1` | Diarization pipeline to load |
| `CONCURRENCY` | `1` | Parallel jobs per process |
| `HF_HOME` | `/var/cache/shoutout-worker` | Model cache |
