#!/usr/bin/env bash
# Deploy BridoConnect на Hostinger KVM VPS.
#
# Usage:
#   HOSTINGER_HOST=example.com HOSTINGER_USER=root ./scripts/deploy-hostinger.sh
#
# Требования на сервере (одноразово):
#   - Docker + docker compose plugin
#   - Открытые порты 80 / 443
#   - DNS A-запись домена смотрит на IP VPS
#
# Скрипт:
#   1. Билдит image локально с prod-переменными из .env.production
#   2. Пушит tarball на VPS через ssh
#   3. docker load + docker compose up -d --force-recreate
#   4. Проверяет healthz

set -euo pipefail

HOST="${HOSTINGER_HOST:?HOSTINGER_HOST env required}"
USER="${HOSTINGER_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/opt/bridoconnect}"
TAG="${TAG:-$(date +%Y%m%d-%H%M%S)}"
ENV_FILE="${ENV_FILE:-.env.production}"

echo "▶ Building image bridoconnect/web:${TAG}…"
docker build \
  --build-arg VITE_SUPABASE_URL="$(grep VITE_SUPABASE_URL $ENV_FILE | cut -d= -f2-)" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="$(grep VITE_SUPABASE_PUBLISHABLE_KEY $ENV_FILE | cut -d= -f2-)" \
  --build-arg VITE_SENTRY_DSN="$(grep '^VITE_SENTRY_DSN' $ENV_FILE 2>/dev/null | cut -d= -f2- || true)" \
  --build-arg VITE_POSTHOG_KEY="$(grep '^VITE_POSTHOG_KEY' $ENV_FILE 2>/dev/null | cut -d= -f2- || true)" \
  --build-arg VITE_POSTHOG_HOST="$(grep '^VITE_POSTHOG_HOST' $ENV_FILE 2>/dev/null | cut -d= -f2- || true)" \
  --build-arg VITE_APP_URL="$(grep '^VITE_APP_URL' $ENV_FILE 2>/dev/null | cut -d= -f2- || true)" \
  -t bridoconnect/web:${TAG} \
  -t bridoconnect/web:latest \
  .

echo "▶ Saving tarball…"
docker save bridoconnect/web:${TAG} | gzip > /tmp/bridoconnect-${TAG}.tar.gz
SIZE=$(du -h /tmp/bridoconnect-${TAG}.tar.gz | cut -f1)
echo "  → ${SIZE}"

echo "▶ Uploading to ${USER}@${HOST}:${REMOTE_DIR}…"
ssh "${USER}@${HOST}" "mkdir -p ${REMOTE_DIR}/caddy ${REMOTE_DIR}/logs"
scp /tmp/bridoconnect-${TAG}.tar.gz "${USER}@${HOST}:${REMOTE_DIR}/"
scp docker-compose.yml "${USER}@${HOST}:${REMOTE_DIR}/"
scp caddy/Caddyfile "${USER}@${HOST}:${REMOTE_DIR}/caddy/"
scp "${ENV_FILE}" "${USER}@${HOST}:${REMOTE_DIR}/.env"

echo "▶ Deploying on remote…"
ssh "${USER}@${HOST}" bash <<EOF
  set -e
  cd ${REMOTE_DIR}
  gunzip -c bridoconnect-${TAG}.tar.gz | docker load
  export TAG=${TAG}
  docker compose --env-file .env up -d --force-recreate web caddy
  sleep 5
  docker compose ps
  # Cleanup старых tarball (> 3 штук)
  ls -t bridoconnect-*.tar.gz 2>/dev/null | tail -n +4 | xargs -r rm -f
EOF

echo "▶ Verifying healthz…"
sleep 3
if curl -fsSL "https://${HOSTINGER_HOST}/healthz" 2>/dev/null | grep -q ok; then
  echo "✅ Deploy успешен: https://${HOSTINGER_HOST}"
else
  echo "⚠  Health-check не прошёл — проверь logs:"
  echo "   ssh ${USER}@${HOST} 'cd ${REMOTE_DIR} && docker compose logs --tail=100'"
  exit 1
fi

rm -f /tmp/bridoconnect-${TAG}.tar.gz
