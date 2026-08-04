#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
[ -f compose.prod.yml ] || { echo "compose.prod.yml is required." >&2; exit 1; }
[ -f .env ] || { echo ".env is required." >&2; exit 1; }
new_tag=${1:-}
current_tag=$(sed -n 's/^IMAGE_TAG=//p' .env | tail -1)
if [ -n "$new_tag" ] && [ "$new_tag" != "$current_tag" ]; then
  cp .env .env.rollback
  tmp=$(mktemp .env.XXXXXX)
  awk -v tag="$new_tag" 'BEGIN{done=0} /^IMAGE_TAG=/{print "IMAGE_TAG=" tag; done=1; next} {print} END{if(!done) print "IMAGE_TAG=" tag}' .env > "$tmp"
  chmod --reference=.env "$tmp" 2>/dev/null || chmod 600 "$tmp"
  mv "$tmp" .env
fi
docker compose -f compose.prod.yml config >/dev/null
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d --remove-orphans
docker compose -f compose.prod.yml ps
if ! docker compose -f compose.prod.yml ps --status running --services | grep -qx backend; then
  docker compose -f compose.prod.yml logs --tail=100 backend
  exit 1
fi
