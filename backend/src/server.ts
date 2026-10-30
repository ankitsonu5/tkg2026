import { createApp } from './app'
import { config } from './config'
import { connectDatabase, disconnectDatabase } from './db'

async function main() {
  await connectDatabase()
  const app = createApp()
  const server = app.listen(config.port, config.host, () => {
    console.log(`API listening on http://${config.host}:${config.port}`)
  })

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`)
    server.close(() => {
      disconnectDatabase().finally(() => process.exit(0))
    })
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
