#!/usr/bin/env bash
# Run on the server from the project folder:  bash deploy/deploy.sh
set -euo pipefail
test -f frontend/.env || { echo "frontend/.env missing (copy frontend/.env.example)"; exit 1; }
test -f backend/.env || { echo "backend/.env missing (copy backend/.env.example)"; exit 1; }
grep -q '^NEXT_PUBLIC_SERVER_URL=https://' frontend/.env || { echo "NEXT_PUBLIC_SERVER_URL must be https://... in frontend/.env"; exit 1; }
grep -qE '^INTERNAL_API_KEY=.+' backend/.env || { echo "INTERNAL_API_KEY must be set in backend/.env"; exit 1; }
[ "$(grep -E '^INTERNAL_API_KEY=' backend/.env)" = "$(grep -E '^INTERNAL_API_KEY=' frontend/.env)" ] \
  || { echo "INTERNAL_API_KEY differs between backend/.env and frontend/.env"; exit 1; }

# This server hosts several sites, so ports must not collide. Ask ecosystem.config.cjs rather
# than re-parsing .env here: PM2 uses that file to start the apps, so deriving the ports from
# the same place is the only way the health checks cannot drift from the processes' ports.
APP_PORT="$(node -p "require('./ecosystem.config.cjs').apps.find(a => a.name === 'tkg').args.match(/-p (\d+)/)[1]")"
API_PORT="$(node -p "require('./ecosystem.config.cjs').apps.find(a => a.name === 'tkg-api').env.API_PORT")"
echo "using APP_PORT=$APP_PORT API_PORT=$API_PORT"

# Warn loudly when the .env files do not pin the ports, instead of silently taking defaults.
grep -qE '^[[:space:]]*APP_PORT[[:space:]]*=' frontend/.env || echo "WARNING: frontend/.env has no APP_PORT line; using ${APP_PORT}."
grep -qE '^[[:space:]]*API_PORT[[:space:]]*=' backend/.env || echo "WARNING: backend/.env has no API_PORT line; using ${API_PORT}."
grep -qE "^BACKEND_URL=http://127\.0\.0\.1:${API_PORT}/?$" frontend/.env \
  || echo "WARNING: frontend/.env BACKEND_URL does not point at http://127.0.0.1:${API_PORT}."

# nginx must proxy to the website port.
if ! grep -qE "127\.0\.0\.1:${APP_PORT}\b" deploy/nginx-new-staging.conf deploy/nginx-telkganesan.conf; then
  echo "WARNING: no nginx config in deploy/ points at 127.0.0.1:${APP_PORT}."
fi

# Refuse to start if something else already holds a port and it is not our own app.
check_port() {
  local port="$1" app="$2"
  if command -v ss >/dev/null 2>&1 && ss -tlnp 2>/dev/null | grep -q "127.0.0.1:${port} "; then
    if [ -z "$(pm2 pid "$app" 2>/dev/null)" ]; then
      echo "ERROR: port ${port} is already in use by another process (expected ${app})."
      ss -tlnp 2>/dev/null | grep "127.0.0.1:${port} " || true
      exit 1
    fi
  fi
}
check_port "$APP_PORT" tkg
check_port "$API_PORT" tkg-api

git pull --ff-only
npm --prefix backend ci --include=dev
npm --prefix backend run build
npm --prefix frontend ci --include=dev
npm --prefix frontend run build   # NEXT_PUBLIC_* are baked in here, so frontend/.env must be final before this
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
sleep 5
curl -fsS "http://127.0.0.1:${API_PORT}/api/health" && echo " <- API health OK"
curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" && echo " <- site -> API health OK"
