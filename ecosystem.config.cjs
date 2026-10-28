// PM2 process file: two processes, the API (backend/) and the website (frontend/).
//
// Ports: this server hosts several sites, so ports must not collide. PM2 passes `-p` before
// Next.js loads .env, so the ports are read from the .env files here instead of relying on the
// apps picking them up at runtime:
//   frontend/.env  APP_PORT  (default 3015) — nginx `upstream` must point here
//                            (deploy/nginx-new-staging.conf for staging,
//                             deploy/nginx-telkganesan.conf at cutover)
//   backend/.env   API_PORT  (default 4000) — frontend/.env BACKEND_URL must point here
// Both bind to loopback only; nginx terminates TLS and proxies to the website, which in turn
// proxies /api/assets/*, /api/health and /api/cron/* to the API.
const fs = require('fs')
const path = require('path')

function readPort(envFile, name, fallback) {
  if (process.env[name]) return process.env[name]
  try {
    const text = fs.readFileSync(envFile, 'utf8')
    // Tolerates `export NAME=3015`, trailing spaces and a trailing `# comment`.
    const match = text.match(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*"?(\\d+)"?\\s*(?:#.*)?$`, 'm'))
    if (match) return match[1]
  } catch {
    // No .env yet (first checkout) — fall through to the default.
  }
  return fallback
}

const FRONTEND_DIR = path.join(__dirname, 'frontend')
const BACKEND_DIR = path.join(__dirname, 'backend')
// 3000 is already taken on this server by another next-server, so the site uses 3015.
const APP_PORT = readPort(path.join(FRONTEND_DIR, '.env'), 'APP_PORT', '3015')
const API_PORT = readPort(path.join(BACKEND_DIR, '.env'), 'API_PORT', '4000')

module.exports = {
  apps: [
    {
      name: 'tkg',
      script: 'node_modules/next/dist/bin/next',
      args: `start -p ${APP_PORT} -H 127.0.0.1`,
      cwd: FRONTEND_DIR,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '900M',
      env: { NODE_ENV: 'production', NODE_OPTIONS: '--no-deprecation' },
    },
    {
      name: 'tkg-api',
      script: 'dist/server.js',
      cwd: BACKEND_DIR,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production', API_PORT, API_HOST: '127.0.0.1' },
    },
  ],
}
