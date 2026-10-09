// PM2 process file. Env vars come from the server's .env (Next.js loads it itself).
//
// Port: this server hosts several sites, so the port must not collide. PM2 passes `-p`
// before Next.js loads .env, so the value is read from .env here instead of relying on
// Next.js picking up PORT at runtime. Set APP_PORT in .env and keep nginx's proxy_pass in
// deploy/nginx-telkganesan.conf pointing at the same port.
const fs = require('fs')
const path = require('path')

function appPort() {
  if (process.env.APP_PORT) return process.env.APP_PORT
  try {
    const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8')
    const match = envFile.match(/^\s*APP_PORT\s*=\s*(\d+)\s*$/m)
    if (match) return match[1]
  } catch {
    // No .env yet (first checkout) — fall through to the default.
  }
  return '3000'
}

const PORT = appPort()

module.exports = {
  apps: [
    {
      name: 'tkg',
      script: 'node_modules/next/dist/bin/next',
      // Bound to loopback only; nginx terminates TLS and proxies to it.
      args: `start -p ${PORT} -H 127.0.0.1`,
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '900M',
      env: { NODE_ENV: 'production', NODE_OPTIONS: '--no-deprecation' },
    },
  ],
}
