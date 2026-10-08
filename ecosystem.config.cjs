// PM2 process file. Env vars come from the server's .env (Next.js loads it itself).
module.exports = {
  apps: [
    {
      name: 'tkg',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '900M',
      env: { NODE_ENV: 'production', NODE_OPTIONS: '--no-deprecation' },
    },
  ],
}
