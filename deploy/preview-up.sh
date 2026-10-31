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
JWT_SECRET_FILE="/opt/${PROJECT}/preview-secrets/pr-${PR_NUMBER}.env"

PGPASSWORD=$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2-)
[ -n "$PGPASSWORD" ] || { echo "DB_PASSWORD is empty in $ENV_FILE" >&2; exit 1; }

echo "==> preview for PR #${PR_NUMBER} at https://${HOST}"

# Every push pulls a new pr-<n>-<sha> backend and migrate image, and old tags
# are not dangling, so `docker image prune` keeps them -- that filled the shared
# disk once. This removes this PR's images by name rather than with `prune -a`,
# which acts on every project's images on the droplet. Images any container uses
# are skipped by ID: when several tags share one image (a preview and a release
# built from the same commit), `docker rmi` of one tag only untags it, even
# while a container runs it. Run before the pulls too, so a nearly full disk
# does not fail the pull before cleanup is ever reached.
remove_unused_pr_images() {
  echo "    removing unused images for PR #${PR_NUMBER}"
  docker images --no-trunc --format '{{.ID}} {{.Repository}}:{{.Tag}}' \
    | grep -E " (${BACKEND_IMAGE%:*}|${MIGRATE_IMAGE%:*}):pr-${PR_NUMBER}-" \
    | grep -vFf <(docker ps -aq | xargs -r docker inspect -f '{{.Image}}') \
    | cut -d' ' -f2 \
    | xargs -r docker rmi >/dev/null 2>&1 || true
}
remove_unused_pr_images

# Idempotent: a re-push to the same PR keeps the database, so data entered
# during review survives.
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
docker run --rm --network edge \
  -e DATABASE_URL="postgres://postgres:${PGPASSWORD}@preview-db:5432/${DB_NAME}?sslmode=disable" \
  "$MIGRATE_IMAGE"

# Generated here rather than set in preview.env, so a preview never depends on
# someone hand-editing the droplet. One per PR, kept across pushes so reviewers
# stay logged in, and never shared with production or other previews.
if [ ! -s "$JWT_SECRET_FILE" ]; then
  echo "    generating JWT secret for PR #${PR_NUMBER}"
  install -m 700 -d "$(dirname "$JWT_SECRET_FILE")"
  (umask 077; echo "JWT_SECRET=$(openssl rand -hex 32)" > "$JWT_SECRET_FILE")
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
  --env-file "$JWT_SECRET_FILE" \
  -e DB_NAME="$DB_NAME" \
  -e APP_VERSION="$SHA" \
  --log-opt max-size=10m --log-opt max-file=3 \
  --label "caddy=${HOST}" \
  --label "caddy.reverse_proxy={{upstreams 8000}}" \
  "$BACKEND_IMAGE" >/dev/null

# The old container is gone now, so its image can go too. Before the health
# check, so a failing deploy still cleans up.
remove_unused_pr_images

# `docker run -d` succeeds as soon as the container exists, so without this a
# backend that exits on bad config would report a healthy preview. The restart
# count matters as much as Running: --restart brings a crashing container back
# within a second, so sampling Running alone mostly catches it while it is up.
echo "    waiting for the container to stay up"
for _ in $(seq 1 15); do
  sleep 2
  if [ "$(docker inspect -f '{{.State.Running}} {{.RestartCount}}' "$CONTAINER" 2>/dev/null)" = "true 0" ]; then
    continue
  fi
  echo "::error::${CONTAINER} exited instead of starting. Last lines:" >&2
  docker logs --tail 30 "$CONTAINER" >&2 2>&1 || true
  exit 1
done

echo "==> https://${HOST}"
