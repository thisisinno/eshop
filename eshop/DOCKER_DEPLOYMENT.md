# SmartWear Docker deployment

The production stack contains PostgreSQL, Redis, the Django ASGI backend, and two standalone Next.js servers. Only the three application ports bind to host loopback; Nginx is the public entrypoint. The VPS pulls prebuilt images and does not build source.

## Local validation

```bash
cd /workspaces/eshop
docker compose -f eshop/compose.dev.yml up --build
```

Customer, admin, and backend are then available on `127.0.0.1:13001`, `127.0.0.1:13000`, and `127.0.0.1:18000`.

## Build and publish

```bash
export DOCKERHUB_USERNAME="actual-username"
./eshop/deploy/docker-build-push.sh
```

The script publishes both the full Git SHA and `latest`. Prefer the immutable SHA in production. Builds belong in GitHub Actions or a development machine, not on a small VPS.

## Initial VPS setup

```bash
sudo mkdir -p /opt/smartwear
sudo chown "$USER":"$USER" /opt/smartwear
```

Copy only `compose.prod.yml`, `.env`, `deploy/deploy-vps.sh`, `deploy/rollback-vps.sh`, `deploy/backup-postgres.sh`, `deploy/restore-postgres.sh`, and `deploy/nginx/smartwear.conf.example` to matching paths under `/opt/smartwear`. The Git source is not required. Create `.env` from `.env.example`, replace every blank secret, and set the published Docker Hub namespace and image SHA.

```bash
cd /opt/smartwear
docker compose -f compose.prod.yml config
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
docker compose -f compose.prod.yml ps
```

For updates, pass an immutable tag; the script preserves the old environment as `.env.rollback`:

```bash
cd /opt/smartwear
./deploy/deploy-vps.sh FULL_GIT_SHA
```

Rollback without touching the database volume:

```bash
cd /opt/smartwear
./deploy/rollback-vps.sh
```

## Operations

```bash
docker compose -f compose.prod.yml logs -f backend
docker compose -f compose.prod.yml logs -f client
docker compose -f compose.prod.yml logs -f admin
docker compose -f compose.prod.yml exec backend python manage.py check
docker compose -f compose.prod.yml exec backend python manage.py showmigrations
docker compose -f compose.prod.yml exec backend python manage.py createsuperuser
BACKUP_DIR=/opt/smartwear/backups BACKUP_KEEP=14 ./deploy/backup-postgres.sh
./deploy/restore-postgres.sh --confirm /opt/smartwear/backups/smartwear-TIMESTAMP.dump
```

Restore runs `pg_restore --clean --if-exists` inside the existing database and therefore modifies database objects; take a fresh backup first. It never deletes the PostgreSQL volume.

## Nginx and TLS

```bash
sudo apt-get update && sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo cp /opt/smartwear/deploy/nginx/smartwear.conf.example /etc/nginx/sites-available/smartwear.conf
sudo ln -s /etc/nginx/sites-available/smartwear.conf /etc/nginx/sites-enabled/smartwear.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d smartwear.co.tz -d www.smartwear.co.tz -d admin.smartwear.co.tz
```

The example intentionally contains no certificate paths so Certbot can add them safely.

## Migration from the current VPS

1. Back up the current database and verify the backup is non-empty.
2. Preserve the old services, source, environment, and Nginx configuration.
3. Deploy the containers on their loopback-only ports.
4. Check `curl --fail http://127.0.0.1:18000/health/`.
5. Verify customer and admin HTTP responses on ports 13001 and 13000.
6. Install/test the new Nginx configuration, then obtain certificates.
7. Verify WebSocket connections through both domains.
8. Verify product media loads from S3.
9. Verify customer and administrator authentication.
10. Create and inspect a test order.
11. Verify real-time notifications and order chat.
12. Only after all checks pass, disable the old manually managed services; retain them for rollback until the new deployment is proven.
