#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:8000}"
OWNER_ID="${SMOKE_OWNER_ID:-11111111-1111-1111-1111-111111111111}"
DATABASE_URL="${DATABASE_URL:-postgresql://admin:admin@localhost:5433/postgres?schema=public}"
TIMEOUT_SECONDS="${E2E_TIMEOUT_SECONDS:-600}"
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

echo "==> Seed API key"
API_KEY="$(
  cd "${ROOT}/dashboard"
  DATABASE_URL="${DATABASE_URL}" SMOKE_OWNER_ID="${OWNER_ID}" npx tsx scripts/seed-smoke-key.ts
)"
test -n "$API_KEY"

echo "==> Wait for worker model tiny"
for _ in $(seq 1 90); do
  MODELS="$(curl -sf -H "Authorization: Bearer ${API_KEY}" "${BASE_URL}/api/v1/models" || true)"
  if printf '%s' "$MODELS" | python3 -c 'import json,sys; data=json.load(sys.stdin); raise SystemExit(0 if any(m.get("model")=="tiny" for m in data.get("models",[])) else 1)'; then
    break
  fi
  sleep 2
done
MODELS="$(curl -sf -H "Authorization: Bearer ${API_KEY}" "${BASE_URL}/api/v1/models")"
printf '%s' "$MODELS" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert any(m["model"]=="tiny" for m in data["models"]), data'

echo "==> Create tiny audio fixture"
AUDIO="${TMP_DIR}/e2e.wav"
python3 - "$AUDIO" <<'PY'
import wave, struct, math, pathlib, sys
path = pathlib.Path(sys.argv[1])
with wave.open(str(path), "w") as handle:
    handle.setnchannels(1)
    handle.setsampwidth(2)
    handle.setframerate(16000)
    for i in range(16000 * 2):
        value = int(12000 * math.sin(2 * math.pi * 440 * i / 16000))
        handle.writeframes(struct.pack("<h", value))
PY

JOB_NAME="e2e-$(date +%s)"
echo "==> Create job ${JOB_NAME}"
CREATE="$(curl -sf -X POST "${BASE_URL}/api/v1/jobs" \
  -H "Authorization: Bearer ${API_KEY}" \
  -F "file=@${AUDIO};filename=e2e.wav" \
  -F "name=${JOB_NAME}" \
  -F "model=tiny" \
  -F "participants=1" \
  -F "language=en")"
printf '%s' "$CREATE" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["job"]["status"] in ("PENDING","PROCESSING"), data'

echo "==> Wait for worker to finish job (timeout ${TIMEOUT_SECONDS}s)"
deadline=$((SECONDS + TIMEOUT_SECONDS))
STATUS_JSON=""
while [ "$SECONDS" -lt "$deadline" ]; do
  STATUS_JSON="$(curl -sf -H "Authorization: Bearer ${API_KEY}" "${BASE_URL}/api/v1/jobs/${JOB_NAME}")"
  STATE="$(printf '%s' "$STATUS_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["job"]["status"])')"
  echo "    status=${STATE}"
  if [ "$STATE" = "FINISHED" ]; then
    break
  fi
  if [ "$STATE" = "FAILED" ]; then
    echo "$STATUS_JSON" >&2
    exit 1
  fi
  sleep 5
done

printf '%s' "$STATUS_JSON" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["job"]["status"]=="FINISHED", data'

echo "==> Download result"
HTTP_CODE="$(curl -sL -o "${TMP_DIR}/result.bin" -w "%{http_code}" \
  -H "Authorization: Bearer ${API_KEY}" \
  "${BASE_URL}/api/v1/jobs/${JOB_NAME}/result")"
if [ "$HTTP_CODE" != "200" ]; then
  echo "Result download failed (${HTTP_CODE})" >&2
  exit 1
fi
python3 - "$TMP_DIR/result.bin" <<'PY'
import sys, zipfile, pathlib
path = pathlib.Path(sys.argv[1])
assert path.stat().st_size > 0, "empty result"
if zipfile.is_zipfile(path):
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        assert names, "empty zip"
        text = archive.read(names[0]).decode("utf-8", "ignore")
else:
    text = path.read_text(encoding="utf-8", errors="ignore")
assert len(text.strip()) > 0, "empty transcript"
print(text[:200])
PY

echo "==> E2E test passed"
