#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.smoke.yml}"
BUCKET="${S3_BUCKET:-shoutout-job-bucket}"
CREDS_FILE="${GARAGE_CREDS_FILE:-${ROOT}/.garage-creds.env}"

garage() {
  docker compose -f "$COMPOSE_FILE" exec -T garage /garage "$@"
}

echo "==> Waiting for Garage"
for _ in $(seq 1 60); do
  if curl -sf http://localhost:3903/health >/dev/null; then
    break
  fi
  sleep 2
done
curl -sf http://localhost:3903/health >/dev/null

NODE_RAW="$(garage node id | head -n1 | tr -d '[:space:]')"
NODE_ID="$(printf '%s' "$NODE_RAW" | cut -c1-16)"
echo "==> Assigning layout to node ${NODE_ID}"
garage layout assign -z dc1 -c 10G "$NODE_ID" >/dev/null || true
garage layout apply --version 1 >/dev/null || garage layout apply --version 2 >/dev/null || true

KEY_NAME="shoutout"
EXISTING="$(garage key list 2>/dev/null | awk -v name="$KEY_NAME" '$0 ~ name {print $1; exit}')"
if [ -n "${EXISTING:-}" ]; then
  echo "==> Reusing access key ${EXISTING}"
  INFO="$(garage key info "$EXISTING" 2>/dev/null || true)"
  ACCESS_KEY="$EXISTING"
  SECRET_KEY="$(printf '%s\n' "$INFO" | awk -F': +' '/Secret key:/ {print $2; exit}')"
fi

if [ -z "${SECRET_KEY:-}" ]; then
  echo "==> Creating access key ${KEY_NAME}"
  CREATE_OUT="$(garage key create "$KEY_NAME")"
  ACCESS_KEY="$(printf '%s\n' "$CREATE_OUT" | awk -F': +' '/Key ID:/ {print $2; exit}')"
  SECRET_KEY="$(printf '%s\n' "$CREATE_OUT" | awk -F': +' '/Secret key:/ {print $2; exit}')"
fi

if [ -z "${ACCESS_KEY:-}" ] || [ -z "${SECRET_KEY:-}" ]; then
  echo "Failed to resolve Garage credentials" >&2
  exit 1
fi

echo "==> Creating bucket ${BUCKET}"
garage bucket create "$BUCKET" >/dev/null || true
garage bucket allow --read --write --owner "$BUCKET" --key "$ACCESS_KEY" >/dev/null

cat >"$CREDS_FILE" <<EOF
S3_ACCESS_KEY_ID=${ACCESS_KEY}
S3_SECRET_ACCESS_KEY=${SECRET_KEY}
S3_BUCKET=${BUCKET}
EOF

echo "==> Wrote ${CREDS_FILE}"
echo "==> Garage bootstrap complete"
garage status || true
