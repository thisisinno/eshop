#!/bin/sh

set -eu

if [ "${DJANGO_DEBUG:-False}" != "True" ] && [ "${DJANGO_DEBUG:-False}" != "true" ]; then
    for name in DJANGO_SECRET_KEY DB_NAME DB_USER DB_PASSWORD DB_HOST; do
        eval "value=\${$name:-}"
        if [ -z "$value" ]; then
            echo "Required production environment variable is missing: $name" >&2
            exit 1
        fi
    done
fi

if [ -n "${DB_HOST:-}" ]; then
    echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT:-5432}..."
    python - <<'PY'
import os, socket, sys, time
host, port = os.environ["DB_HOST"], int(os.getenv("DB_PORT", "5432"))
for _ in range(60):
    try:
        with socket.create_connection((host, port), timeout=2):
            break
    except OSError:
        time.sleep(1)
else:
    sys.exit(f"PostgreSQL did not become reachable at {host}:{port}")
PY
fi

echo "Running Django database migrations..."
python manage.py migrate --noinput

echo "Collecting Django static files..."
python manage.py collectstatic --noinput

echo "Starting SmartWear backend..."
exec "$@"
