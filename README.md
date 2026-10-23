A modern web application for transcribing audio files on your own server.
Powered by models like whisper and pyannote/speaker-diarization.

# Why Shoutout?

Shoutout provides:

- a simple web interface built with [hightide](https://github.com/helpwave/hightide) `AppPage`
- accurate transcriptions with speaker detection and timestamps
- local data storage (Garage S3 + Postgres)
- GPU workers that attach over HTTPS (no shared database credentials)
- REST + MCP automation with per-user API keys
- optional Listmonk email when a transcript is ready
- NixOS modules for the system and for workers

# Screenshots

### Creating a new job
![.assets/Shoutout_1.png](.assets/Shoutout_1.png)

### Web-interface with an overview of all jobs
![.assets/Shoutout_2.png](.assets/Shoutout_2.png)

### Downloading transcripts after finishing a job
![.assets/Shoutout_3.png](.assets/Shoutout_3.png)

## Architecture

```text
Browser / MCP / curl  --HTTPS + session or API key-->  Dashboard
                                                        |     \
                                                        |      \--> Garage (S3)
                                                        v
                                                     Postgres
Workers  --HTTPS + worker token (claim/heartbeat)--> Dashboard
Workers  --presigned GET/PUT-----------------------> Garage
Dashboard --optional transactional email-----------> Listmonk
```

Workers only need `DASHBOARD_URL`, a worker enrollment token, and a Hugging Face token.
RabbitMQ and direct worker access to Postgres/MinIO are gone.

## Quickstart (Docker)

Update `S3_PUBLIC_ENDPOINT` in `docker-compose.yml` to a hostname the browser can reach.
For GPU workers, install the [nvidia-container-toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html).

```sh
docker compose up -d postgres garage
COMPOSE_FILE=docker-compose.yml ./scripts/garage-bootstrap.sh
docker compose up -d
```

`garage-bootstrap.sh` creates the Garage layout, access key, and bucket, writing `.garage-creds.env` (gitignored). Point the dashboard at those credentials (or copy them into your compose env).

Services:

1. Dashboard at [localhost:8000](http://localhost:8000)
2. Postgres on port `5433`
3. Garage S3 API on port `3900`
4. Keycloak on port `8090`
5. One or more workers attached over HTTPS

### Local smoke test

```sh
docker compose -f docker-compose.smoke.yml up -d postgres garage
COMPOSE_FILE=docker-compose.smoke.yml ./scripts/garage-bootstrap.sh
docker compose -f docker-compose.smoke.yml up -d --build dashboard
./scripts/smoke-test.sh
```

CI runs the same smoke path as a required quality gate (lint, build, worker flake8, nix flake show, compose smoke) before image publishes on `main`.

### Migrate data from MinIO

```sh
rclone sync minio:shoutout-job-bucket garage:shoutout-job-bucket
```

## API keys, REST, and MCP

Create an API key in the dashboard (header action **API keys**). The secret is shown once.
The same bearer token works for REST and MCP.

```bash
export SHOUTOUT_KEY="so_xxx_yyy"
export SHOUTOUT_URL="https://shoutout.example.com"

curl -s -H "Authorization: Bearer $SHOUTOUT_KEY" "$SHOUTOUT_URL/api/v1/languages"
curl -s -H "Authorization: Bearer $SHOUTOUT_KEY" "$SHOUTOUT_URL/api/v1/models"

curl -s -X POST "$SHOUTOUT_URL/api/v1/jobs" \
  -H "Authorization: Bearer $SHOUTOUT_KEY" \
  -F "file=@meeting.mp3" -F "name=weekly-standup" \
  -F "model=large-v3" -F "participants=3" -F "language=en"

curl -s -X POST "$SHOUTOUT_URL/api/v1/jobs/bulk" \
  -H "Authorization: Bearer $SHOUTOUT_KEY" \
  -F "files[]=@call1.mp3;filename=call1.mp3" \
  -F "files[]=@call2.mp3;filename=call2.mp3" \
  -F 'metadata={"call1.mp3":{"model":"small","participants":2,"language":"de"},"call2.mp3":{"model":"large-v3","participants":4,"language":"en"}}'

curl -s -H "Authorization: Bearer $SHOUTOUT_KEY" "$SHOUTOUT_URL/api/v1/jobs/weekly-standup"
curl -L -H "Authorization: Bearer $SHOUTOUT_KEY" \
  "$SHOUTOUT_URL/api/v1/jobs/weekly-standup/result" -o weekly-standup.zip
```

### MCP client config

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

## Listmonk notifications

When a job finishes, Shoutout can send a transactional email through an external Listmonk instance.

Set `LISTMONK_URL`, `LISTMONK_USERNAME`, `LISTMONK_TOKEN`, and `LISTMONK_TEMPLATE_ID`.
If `LISTMONK_URL` is empty, completion still succeeds and no mail is sent.

Example template body:

```html
<p>Your transcript <strong>{{ .Tx.Data.jobName }}</strong> ({{ .Tx.Data.model }}) is ready.</p>
<p><a href="{{ .Tx.Data.downloadUrl }}">Download transcript</a></p>
```

The download URL is a durable dashboard link (`/api/downloads/<token>`), not a raw S3 URL.

## NixOS

### System host

```nix
{
  imports = [ inputs.shoutout.nixosModules.shoutout ];
  services.shoutout = {
    enable = true;
    url = "https://shoutout.example.com";
    oidc.issuer = "https://auth.example.com/realms/main";
    oidc.clientSecretFile = "/run/secrets/shoutout-oidc";
    nextauthSecretFile = "/run/secrets/shoutout-nextauth";
    workerEnrollmentTokenFile = "/run/secrets/shoutout-worker-enroll";
    garage.accessKeyFile = "/run/secrets/shoutout-s3-access";
    garage.secretKeyFile = "/run/secrets/shoutout-s3-secret";
    listmonk.url = "https://listmonk.example.com";
    listmonk.username = "api";
    listmonk.tokenFile = "/run/secrets/shoutout-listmonk";
    listmonk.templateId = 1;
  };
}
```

### Separate GPU worker host

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

Development shell:

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

## Environment variables

### Dashboard

| NAME | DEFAULT | DESCRIPTION |
| ---- | ------- | ----------- |
| `DATABASE_URL` | `postgresql://admin:admin@localhost:5433/postgres?schema=public` | Postgres connection |
| `S3_ENDPOINT` | `http://localhost:3900` | Internal Garage/S3 endpoint |
| `S3_PUBLIC_ENDPOINT` | same as `S3_ENDPOINT` | Browser-reachable S3 endpoint for presigns |
| `S3_REGION` | `garage` | S3 region |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | `shoutoutdevuser` | S3 credentials |
| `S3_BUCKET` | `shoutout-job-bucket` | Bucket name |
| `WORKER_ENROLLMENT_TOKEN` | `dev-worker-enrollment-token` | Shared secret for worker registration |
| `LISTMONK_URL` | empty | Optional Listmonk base URL |
| `LISTMONK_USERNAME` / `LISTMONK_TOKEN` | empty | Listmonk API credentials |
| `LISTMONK_TEMPLATE_ID` | `0` | Transactional template id |
| `OIDC_*` / `NEXTAUTH_*` | Keycloak defaults | Auth |

### Worker

| NAME | DEFAULT | DESCRIPTION |
| ---- | ------- | ----------- |
| `DASHBOARD_URL` | `http://localhost:3000` | Dashboard base URL |
| `WORKER_ENROLLMENT_TOKEN` | `dev-worker-enrollment-token` | Enrollment secret |
| `WORKER_TOKEN` | empty | Optional pre-issued worker token |
| `WHISPER_MODELS` | `tiny` | Comma-separated models this worker offers |
| `HUGGINGFACE_TOKEN` | empty | Token for pyannote |
| `CONCURRENCY` | `1` | Parallel jobs per process |
| `HF_HOME` | `/var/cache/shoutout-worker` | Model cache |
