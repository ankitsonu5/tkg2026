#!/usr/bin/env bash
# Run on the server from the project folder:  bash deploy/deploy.sh
set -euo pipefail
test -f .env || { echo ".env missing"; exit 1; }
grep -q '^NEXT_PUBLIC_SERVER_URL=https://' .env || { echo "NEXT_PUBLIC_SERVER_URL must be https://... in .env"; exit 1; }

# This server hosts several sites, so the app's port comes from .env (default 3000).
# nginx proxy_pass must point at the same port.
APP_PORT="$(sed -nE 's/^[[:space:]]*APP_PORT[[:space:]]*=[[:space:]]*([0-9]+)[[:space:]]*$/\1/p' .env | tail -1)"
APP_PORT="${APP_PORT:-3000}"
echo "using APP_PORT=$APP_PORT"

# Refuse to start if something else already holds the port and it is not our own app.
if command -v ss >/dev/null 2>&1; then
  if ss -tlnp 2>/dev/null | grep -q "127.0.0.1:${APP_PORT} "; then
    if ! pm2 pid tkg >/dev/null 2>&1 || [ -z "$(pm2 pid tkg 2>/dev/null)" ]; then
      echo "ERROR: port ${APP_PORT} is already in use by another process."
      echo "       Pick a free port: set APP_PORT in .env, update proxy_pass in the nginx config, reload nginx."
      ss -tlnp 2>/dev/null | grep "127.0.0.1:${APP_PORT} " || true
      exit 1
    fi
  fi
fi

git pull --ff-only
npm ci --include=dev
npm run build            # NEXT_PUBLIC_* are baked in here, so .env must be final before this
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
sleep 5
curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" && echo " <- health OK"
