#!/bin/sh
set -eu
[ "${1:-}" = "--confirm" ] && dump=${2:-} || { echo "Usage: $0 --confirm PATH_TO_DUMP" >&2; echo "WARNING: restore modifies the configured database." >&2; exit 2; }
[ -f "$dump" ] || { echo "Dump not found: $dump" >&2; exit 1; }
[ -s "$dump" ] || { echo "Dump is empty: $dump" >&2; exit 1; }
cd "$(dirname "$0")/.."
echo "Restoring $dump into the configured SmartWear database..."
docker compose -f compose.prod.yml exec -T db sh -c 'pg_restore --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$dump"
echo "Database restore completed successfully."
