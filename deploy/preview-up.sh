#!/usr/bin/env bash
# Create or update the preview backend for one pull request.
#
# Runs ON the droplet, fed over stdin so the droplet needs no checkout:
#   ssh host bash -s -- <pr> <sha> <backend-image> <migrate-image> < deploy/preview-up.sh
#
# Secrets are NOT arguments: they are read from /opt/boutline/preview.env, so
# they never appear in the droplet's process list or in CI logs.
set -euo pipefail

PR_NUMBER=${1:?usage: preview-up.sh <pr-number> <sha> <backend-image> <migrate-image>}
SHA=${2:?missing commit sha}
BACKEND_IMAGE=${3:?missing backend image}
MIGRATE_IMAGE=${4:?missing migrate image}

PROJECT=boutline
ENV_FILE="/opt/${PROJECT}/preview.env"
PREVIEW_DOMAIN_FILE="/opt/${PROJECT}/preview-domain"

[ -r "$ENV_FILE" ] || { echo "missing $ENV_FILE" >&2; exit 1; }
[ -r "$PREVIEW_DOMAIN_FILE" ] || { echo "missing $PREVIEW_DOMAIN_FILE" >&2; exit 1; }

# Project-prefixed because every project on the droplet shares one preview-db
# and one preview wildcard: a bare pr_12 or pr-12 would collide with PR #12 of
# another repo.
PREVIEW_DOMAIN=$(cat "$PREVIEW_DOMAIN_FILE")
DB_NAME="${PROJECT}_pr_${PR_NUMBER}"
CONTAINER="${PROJECT}-pr-${PR_NUMBER}"
HOST="${PROJECT}-pr-${PR_NUMBER}.${PREVIEW_DOMAIN}"

PGPASSWORD=$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2-)
[ -n "$PGPASSWORD" ] || { echo "DB_PASSWORD is empty in $ENV_FILE" >&2; exit 1; }

echo "==> preview for PR #${PR_NUMBER} at https://${HOST}"

# Idempotent: a re-push to the same PR keeps the database, so data entered
# during review survives unless its migrations stop applying (see below).
if docker exec -e PGPASSWORD="$PGPASSWORD" preview-db \
     psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  echo "    database ${DB_NAME} already exists"
else
  echo "    creating database ${DB_NAME}"
  docker exec -e PGPASSWORD="$PGPASSWORD" preview-db createdb -U postgres "${DB_NAME}"
fi

# Before the new code starts, so a bad migration fails the preview instead of
# leaving the app against a schema it cannot read.
echo "    applying migrations"
docker pull --quiet "$MIGRATE_IMAGE"
migrate() {
  docker run --rm --network edge \
    -e DATABASE_URL="postgres://postgres:${PGPASSWORD}@preview-db:5432/${DB_NAME}?sslmode=disable" \
    "$MIGRATE_IMAGE"
}

# A long-lived PR's database drifts from its branch: merging main brings in
# migrations older than ones already applied (Atlas's non-linear error), and a
# renamed migration re-runs against objects it already created. Review data is
# disposable, so rebuild from empty; a migration that still fails there is a
# real bug and fails the preview.
if ! migrate; then
  echo "    migrations do not apply to the existing database; recreating ${DB_NAME}"
  docker exec -e PGPASSWORD="$PGPASSWORD" preview-db \
    psql -U postgres -tAc "DROP DATABASE ${DB_NAME} WITH (FORCE)" >/dev/null
  docker exec -e PGPASSWORD="$PGPASSWORD" preview-db createdb -U postgres "${DB_NAME}"
  migrate
fi

# Replacing the container is how an update happens; Caddy notices the new one
# through the Docker socket and reroutes automatically.
echo "    starting ${CONTAINER}"
docker pull --quiet "$BACKEND_IMAGE"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d \
  --name "$CONTAINER" \
  --network edge \
  --restart unless-stopped \
  --env-file "$ENV_FILE" \
  -e DB_NAME="$DB_NAME" \
  -e APP_VERSION="$SHA" \
  --label "caddy=${HOST}" \
  --label "caddy.reverse_proxy={{upstreams 8000}}" \
  "$BACKEND_IMAGE" >/dev/null

# `docker run -d` succeeds as soon as the container exists, so without this a
# backend that exits on bad config would report a healthy preview.
echo "    waiting for the container to stay up"
for _ in $(seq 1 15); do
  sleep 2
  if [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null)" = "true" ]; then
    continue
  fi
  echo "::error::${CONTAINER} exited instead of starting. Last lines:" >&2
  docker logs --tail 30 "$CONTAINER" >&2 2>&1 || true
  exit 1
done

# Every push pulls two new images and nothing else removes the old ones, so they
# pile up until the droplet's disk fills. Scoped to this PR rather than
# `prune -a` because the droplet is shared with other projects.
echo "    removing this PR's older images"
docker images --format '{{.Repository}}:{{.Tag}}' \
  | grep -E "/${PROJECT}/(backend|migrate):pr-${PR_NUMBER}-" \
  | grep -vxF -e "$BACKEND_IMAGE" -e "$MIGRATE_IMAGE" \
  | xargs -r docker rmi >/dev/null 2>&1 || true

echo "==> https://${HOST}"
