#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
backup_dir=${BACKUP_DIR:-./backups}
keep=${BACKUP_KEEP:-14}
mkdir -p "$backup_dir"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
output="$backup_dir/smartwear-$stamp.dump"
docker compose -f compose.prod.yml exec -T db sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$output"
[ -s "$output" ] || { echo "Backup is empty: $output" >&2; exit 1; }
case "$keep" in *[!0-9]*|'') echo "BACKUP_KEEP must be a positive integer." >&2; exit 1;; esac
if [ "$keep" -gt 0 ]; then
  find "$backup_dir" -maxdepth 1 -type f -name 'smartwear-*.dump' -printf '%T@ %p\n' | sort -nr | awk -v keep="$keep" 'NR>keep{sub(/^[^ ]+ /, ""); print}' | xargs -r rm --
fi
echo "Backup created: $output"
