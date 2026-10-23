#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:8000}"
ENROLLMENT_TOKEN="${WORKER_ENROLLMENT_TOKEN:-dev-worker-enrollment-token}"
OWNER_ID="${SMOKE_OWNER_ID:-11111111-1111-1111-1111-111111111111}"
DATABASE_URL="${DATABASE_URL:-postgresql://admin:admin@localhost:5433/postgres?schema=public}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "==> Waiting for dashboard at ${BASE_URL}"
ready=0
for _ in $(seq 1 90); do
  if curl -sf "${BASE_URL}/auth" >/dev/null; then
    ready=1
    break
  fi
  sleep 2
done
if [ "$ready" -ne 1 ]; then
  echo "Dashboard did not become ready" >&2
  exit 1
fi

echo "==> Register worker"
REGISTER="$(curl -sf -X POST "${BASE_URL}/api/worker/register" \
  -H "Authorization: Bearer ${ENROLLMENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"smoke-worker","models":["tiny"],"info":{"smoke":true}}')"
WORKER_TOKEN="$(printf '%s' "$REGISTER" | python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')"
test -n "$WORKER_TOKEN"

echo "==> Seed API key"
API_KEY="$(
  cd "${ROOT}/dashboard"
  DATABASE_URL="${DATABASE_URL}" SMOKE_OWNER_ID="${OWNER_ID}" npx tsx scripts/seed-smoke-key.ts
)"
test -n "$API_KEY"

echo "==> List languages"
LANGS="$(curl -sf -H "Authorization: Bearer ${API_KEY}" "${BASE_URL}/api/v1/languages")"
printf '%s' "$LANGS" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert "languages" in data and len(data["languages"])>=1'

echo "==> List models"
MODELS="$(curl -sf -H "Authorization: Bearer ${API_KEY}" "${BASE_URL}/api/v1/models")"
printf '%s' "$MODELS" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert any(m["model"]=="tiny" for m in data["models"]), data'

echo "==> Create tiny audio fixture"
AUDIO="${TMP_DIR}/smoke.wav"
python3 - "$AUDIO" <<'PY'
import wave, struct, math, pathlib, sys
path = pathlib.Path(sys.argv[1])
with wave.open(str(path), "w") as handle:
    handle.setnchannels(1)
    handle.setsampwidth(2)
    handle.setframerate(16000)
    for i in range(16000):
        value = int(12000 * math.sin(2 * math.pi * 440 * i / 16000))
        handle.writeframes(struct.pack("<h", value))
PY

echo "==> Create job via REST multipart"
JOB_NAME="smoke-$(date +%s)"
CREATE="$(curl -sf -X POST "${BASE_URL}/api/v1/jobs" \
  -H "Authorization: Bearer ${API_KEY}" \
  -F "file=@${AUDIO};filename=smoke.wav" \
  -F "name=${JOB_NAME}" \
  -F "model=tiny" \
  -F "participants=1" \
  -F "language=en")"
printf '%s' "$CREATE" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["job"]["status"]=="PENDING", data; assert data["job"].get("publicId"), data; assert len(data["job"].get("files") or [])==1, data'

PUBLIC_ID="$(printf '%s' "$CREATE" | python3 -c 'import json,sys; print(json.load(sys.stdin)["job"]["publicId"])')"

echo "==> Worker claim"
CLAIM=""
for _ in $(seq 1 20); do
  CANDIDATE="$(curl -sf -X POST "${BASE_URL}/api/worker/jobs/claim" \
    -H "Authorization: Bearer ${WORKER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"models":["tiny"],"info":{"smoke":true}}')"
  NAME="$(printf '%s' "$CANDIDATE" | python3 -c 'import json,sys; job=json.load(sys.stdin).get("job"); print(job["name"] if job else "")')"
  if [ -z "$NAME" ]; then
    echo "No claimable jobs left before finding ${JOB_NAME}" >&2
    exit 1
  fi
  if [ "$NAME" = "$JOB_NAME" ]; then
    CLAIM="$CANDIDATE"
    break
  fi
  OTHER_ID="$(printf '%s' "$CANDIDATE" | python3 -c 'import json,sys; print(json.load(sys.stdin)["job"]["id"])')"
  curl -sf -X POST "${BASE_URL}/api/worker/jobs/${OTHER_ID}/fail" \
    -H "Authorization: Bearer ${WORKER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"error":"skipped by smoke test"}' >/dev/null || true
done
if [ -z "$CLAIM" ]; then
  echo "Could not claim smoke job ${JOB_NAME}" >&2
  exit 1
fi
JOB_ID="$(printf '%s' "$CLAIM" | python3 -c 'import json,sys; print(json.load(sys.stdin)["job"]["id"])')"
FILE_ID="$(printf '%s' "$CLAIM" | python3 -c 'import json,sys; print(json.load(sys.stdin)["files"][0]["id"])')"
TEXT_URL="$(printf '%s' "$CLAIM" | python3 -c 'import json,sys; print(json.load(sys.stdin)["files"][0]["textUploadUrl"])')"
JSON_URL="$(printf '%s' "$CLAIM" | python3 -c 'import json,sys; print(json.load(sys.stdin)["files"][0]["jsonUploadUrl"])')"
ZIP_URL="$(printf '%s' "$CLAIM" | python3 -c 'import json,sys; print(json.load(sys.stdin)["zipUploadUrl"])')"

echo "==> Upload fake artifacts and complete"
printf 'SPEAKER_00 00:00:00\nsmoke ok\n' > "${TMP_DIR}/result.txt"
printf '{"segments":[{"speaker":"SPEAKER_00","start":0,"end":1,"text":"smoke ok"}]}' > "${TMP_DIR}/result.json"
python3 - "$TMP_DIR" <<'PY'
import zipfile, pathlib, sys
workdir = pathlib.Path(sys.argv[1])
with zipfile.ZipFile(workdir / "result.zip", "w") as archive:
    archive.write(workdir / "result.txt", "smoke.txt")
PY

upload_artifact() {
  local kind="$1"
  local url="$2"
  local file="$3"
  local type="$4"
  local put_code
  put_code="$(curl -s -o "${TMP_DIR}/put-${kind}.out" -w "%{http_code}" -X PUT \
    --data-binary @"${file}" \
    -H "Content-Type: ${type}" \
    "${url}")"
  if [ "${put_code}" != "200" ] && [ "${put_code}" != "204" ]; then
    echo "${kind} upload failed (${put_code})" >&2
    cat "${TMP_DIR}/put-${kind}.out" >&2 || true
    exit 1
  fi
}

upload_artifact text "${TEXT_URL}" "${TMP_DIR}/result.txt" "text/plain"
upload_artifact json "${JSON_URL}" "${TMP_DIR}/result.json" "application/json"
upload_artifact zip "${ZIP_URL}" "${TMP_DIR}/result.zip" "application/zip"

curl -sf -X POST "${BASE_URL}/api/worker/jobs/${JOB_ID}/complete" \
  -H "Authorization: Bearer ${WORKER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"files\":[{\"id\":\"${FILE_ID}\",\"durationSeconds\":1}]}" >/dev/null

echo "==> Fetch job status"
STATUS="$(curl -sf -H "Authorization: Bearer ${API_KEY}" "${BASE_URL}/api/v1/jobs/${JOB_NAME}")"
printf '%s' "$STATUS" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["job"]["status"]=="FINISHED", data'

echo "==> Fetch transcript JSON"
TRANSCRIPT="$(curl -sf -H "Authorization: Bearer ${API_KEY}" "${BASE_URL}/api/jobs/${PUBLIC_ID}/files/${FILE_ID}/transcript")"
printf '%s' "$TRANSCRIPT" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["segments"], data'

echo "==> Set job public and fetch without auth"
curl -sf -X PATCH "${BASE_URL}/api/jobs/${PUBLIC_ID}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"visibility":"PUBLIC"}' >/dev/null
curl -sf "${BASE_URL}/api/jobs/${PUBLIC_ID}" >/dev/null

echo "==> MCP initialize"
MCP_INIT="$(curl -sf -X POST "${BASE_URL}/api/mcp" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.1"}}}')"
printf '%s' "$MCP_INIT" | python3 -c 'import sys; text=sys.stdin.read().lower(); assert "shoutout" in text or "result" in text or "serverinfo" in text, text[:500]'

echo "==> Smoke test passed"
