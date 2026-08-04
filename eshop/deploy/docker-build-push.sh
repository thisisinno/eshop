#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
NO_PUSH=false
[ "${1:-}" = "--no-push" ] && NO_PUSH=true
command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker is unavailable or authentication cannot be verified." >&2; exit 1; }
DOCKERHUB_USERNAME=${DOCKERHUB_USERNAME:-$(docker info --format '{{.Name}}')}
[ -n "$DOCKERHUB_USERNAME" ] || { echo 'Set DOCKERHUB_USERNAME: export DOCKERHUB_USERNAME="your-dockerhub-username"' >&2; exit 1; }
GIT_SHA=$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || git -C "$ROOT/.." rev-parse HEAD)
API_ARG=${NEXT_PUBLIC_API_BASE_URL:-/api}
WS_ARG=${NEXT_PUBLIC_WS_BASE_URL:-/ws}
build() {
  name=$1 context=$2
  shift 2
  docker build "$@" -t "$DOCKERHUB_USERNAME/smartwear-$name:$GIT_SHA" -t "$DOCKERHUB_USERNAME/smartwear-$name:latest" "$context"
  if [ "$NO_PUSH" = false ]; then
    docker push "$DOCKERHUB_USERNAME/smartwear-$name:$GIT_SHA"
    docker push "$DOCKERHUB_USERNAME/smartwear-$name:latest"
  fi
}
build backend "$ROOT/backend_django"
build client "$ROOT/client_nextjs" --build-arg "NEXT_PUBLIC_API_BASE_URL=$API_ARG" --build-arg "NEXT_PUBLIC_WS_BASE_URL=$WS_ARG"
build admin "$ROOT/admin_web_nextjs/nextjs-admin" --build-arg "NEXT_PUBLIC_API_BASE_URL=$API_ARG" --build-arg "NEXT_PUBLIC_WS_BASE_URL=$WS_ARG"
printf 'Images built%s:\n' "$( [ "$NO_PUSH" = true ] && printf ' (not pushed)' )"
printf '%s\n' "$DOCKERHUB_USERNAME/smartwear-backend:$GIT_SHA" "$DOCKERHUB_USERNAME/smartwear-client:$GIT_SHA" "$DOCKERHUB_USERNAME/smartwear-admin:$GIT_SHA"
