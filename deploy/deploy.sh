#!/usr/bin/env bash
# Deploys this checkout: pull, build backend + frontend, (re)start both under PM2.
#
#   First time on the server (from the project folder):   bash deploy/deploy.sh
#   After that, just:                                      git pull
#
# The first run installs a git post-merge hook, so every `git pull` that brings new commits
# runs this script automatically. It also migrates the old single-app (Payload) deployment:
# builds frontend/.env + backend/.env from the old root .env, copies the old root media/ into
# backend/media/, and replaces the old `tkg` PM2 process.
set -euo pipefail
cd "$(dirname "$0")/.."

# 1. Pull, then re-run the freshly pulled copy of this script (bash reads scripts lazily, so
#    continuing in a file that `git pull` just rewrote is unsafe). TKG_DEPLOYING stops the
#    post-merge hook from starting a second deploy during this pull.
if [ "${TKG_SKIP_PULL:-}" != 1 ]; then
  TKG_DEPLOYING=1 git pull --ff-only
  TKG_SKIP_PULL=1 exec bash deploy/deploy.sh "$@"
fi

# 2. Install the post-merge hook (idempotent).
HOOK="$(git rev-parse --git-path hooks)/post-merge"
cat > "$HOOK" <<'EOF'
#!/bin/sh
# Installed by deploy/deploy.sh: deploy after every `git pull` that brings new commits.
[ -n "$TKG_DEPLOYING" ] && exit 0
cd "$(git rev-parse --show-toplevel)" || exit 1
TKG_SKIP_PULL=1 bash deploy/deploy.sh 2>&1 | tee deploy/last-deploy.log
EOF
chmod +x "$HOOK"

# 3. Environment files (created from the old root .env on the first run; never overwritten).
node deploy/setup-env.cjs
grep -q '^NEXT_PUBLIC_SERVER_URL=https://' frontend/.env || { echo "NEXT_PUBLIC_SERVER_URL must be https://... in frontend/.env"; exit 1; }

# 4. Media: the old deployment kept uploads in the root media/ folder.
mkdir -p backend/media
if [ -d media ]; then cp -rn media/. backend/media/; fi

# This server hosts several sites, so ports must not collide. Ask ecosystem.config.cjs rather
# than re-parsing .env here: PM2 uses that file to start the apps, so deriving the ports from
# the same place is the only way the health checks cannot drift from the processes' ports.
APP_PORT="$(node -p "require('./ecosystem.config.cjs').apps.find(a => a.name === 'tkg').args.match(/-p (\d+)/)[1]")"
API_PORT="$(node -p "require('./ecosystem.config.cjs').apps.find(a => a.name === 'tkg-api').env.API_PORT")"
echo "using APP_PORT=$APP_PORT API_PORT=$API_PORT"

grep -qE "^BACKEND_URL=http://127\.0\.0\.1:${API_PORT}/?$" frontend/.env \
  || { echo "ERROR: frontend/.env BACKEND_URL must be http://127.0.0.1:${API_PORT} (backend/.env API_PORT)."; exit 1; }

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

# 5. Build.
npm --prefix backend ci --include=dev
npm --prefix backend run build
npm --prefix frontend ci --include=dev
npm --prefix frontend run build   # NEXT_PUBLIC_* are baked in here, so frontend/.env must be final before this

# 6. The old Payload deployment ran a `tkg` process from the repo root. PM2 keeps a process's
#    cwd on reload, so delete it once; the new `tkg` runs from frontend/.
OLD_CWD="$(pm2 jlist 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const p=JSON.parse(s).find(p=>p.name==='tkg');process.stdout.write(p?p.pm2_env.pm_cwd:'')}catch{}})")"
if [ -n "$OLD_CWD" ] && [ "$(cd "$OLD_CWD" 2>/dev/null && pwd -P)" != "$(cd frontend && pwd -P)" ]; then
  echo "replacing old tkg process (cwd $OLD_CWD)"
  pm2 delete tkg
fi
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

# 7. Health checks (give Next.js a few seconds to start).
for i in $(seq 1 20); do
  curl -fsS "http://127.0.0.1:${API_PORT}/api/health" >/dev/null 2>&1 \
    && curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null 2>&1 && break
  sleep 2
done
curl -fsS "http://127.0.0.1:${API_PORT}/api/health" && echo " <- API health OK"
curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" && echo " <- site -> API health OK"
echo "DEPLOY OK"
