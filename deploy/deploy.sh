#!/usr/bin/env bash
# Run on the server from the project folder:  bash deploy/deploy.sh
set -euo pipefail
test -f .env || { echo ".env missing"; exit 1; }
grep -q '^NEXT_PUBLIC_SERVER_URL=https://' .env || { echo "NEXT_PUBLIC_SERVER_URL must be https://... in .env"; exit 1; }
git pull --ff-only
npm ci --include=dev
npm run build            # NEXT_PUBLIC_* are baked in here, so .env must be final before this
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
sleep 5
curl -fsS http://127.0.0.1:3000/api/health && echo " <- health OK"
