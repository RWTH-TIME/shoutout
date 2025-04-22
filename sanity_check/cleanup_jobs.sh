#!/bin/bash

echo "Running the Cleanup Script..."

set -euo pipefail

: "${DB_USER:?Environment variable DB_USER is required}"
: "${DB_PASSWORD:?Environment variable DB_PASSWORD is required}"
: "${DB_NAME:?Environment variable DB_NAME is required}"
: "${DB_PORT:?Environment variable DB_PORT is required}"
: "${DB_HOST:?Environment variable DB_HOST is required}"

SQL_QUERY="
DELETE FROM \"job\"
WHERE status = 'FAILED'
   OR \"createdAt\" < NOW() - INTERVAL '7 days';
"

export PGPASSWORD=$DB_PASSWORD

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$SQL_QUERY"

echo "Cleanup Script finished!"
