#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
[ -f .env.rollback ] || { echo "No previous deployment tag is available (.env.rollback missing)." >&2; exit 1; }
previous=$(sed -n 's/^IMAGE_TAG=//p' .env.rollback | tail -1)
[ -n "$previous" ] || { echo "Previous IMAGE_TAG is empty." >&2; exit 1; }
cp .env .env.failed
cp .env.rollback .env.next
chmod --reference=.env .env.next 2>/dev/null || chmod 600 .env.next
mv .env.next .env
docker compose -f compose.prod.yml config >/dev/null
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d --remove-orphans
docker compose -f compose.prod.yml ps
echo "Rolled back to IMAGE_TAG=$previous"
