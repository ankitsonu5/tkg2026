/**
 * Local development SMTP capture.
 *
 * Docker is not available on this machine, so the baseline's "local email capture service"
 * is provided as a dependency-free SMTP sink instead of a Mailpit/MailHog container. It
 * accepts messages, writes each to `.mail/<timestamp>-<to>.eml` and prints a one-line
 * summary. It NEVER forwards anywhere: no message can reach a real person from development.
 *
 * Run: npm run mail:dev
 */
import net from 'node:net'
import fs from 'node:fs'
import path from 'node:path'

const PORT = Number(process.env.SMTP_PORT || 1025)
const HOST = process.env.SMTP_HOST || '127.0.0.1'
const OUT_DIR = path.resolve(process.cwd(), '.mail')

fs.mkdirSync(OUT_DIR, { recursive: true })

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._@-]/g, '_').slice(0, 80)
}

const server = net.createServer((socket) => {
  let buffer = ''
  let inData = false
  let dataLines: string[] = []
  const rcptTo: string[] = []

  const send = (line: string) => socket.write(line + '\r\n')

  send('220 localhost dev-mail-capture ready')

  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8')

    let idx: number
    while ((idx = buffer.indexOf('\r\n')) !== -1) {
      const line = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)

      if (inData) {
        if (line === '.') {
          inData = false
          const raw = dataLines.join('\r\n')
          const to = rcptTo[0] ?? 'unknown'
          const file = path.join(OUT_DIR, `${Date.now()}-${safeSegment(to)}.eml`)
          fs.writeFileSync(file, raw, 'utf8')

          const subject = /^Subject:\s*(.*)$/im.exec(raw)?.[1]?.trim() ?? '(no subject)'
          console.log(`captured  to=${to}  subject="${subject}"  file=${path.relative(process.cwd(), file)}`)

          send('250 2.0.0 Message accepted for delivery (captured locally)')
          dataLines = []
          rcptTo.length = 0
        } else {
          // RFC 5321 transparency: a leading dot is doubled on the wire.
          dataLines.push(line.startsWith('..') ? line.slice(1) : line)
        }
        continue
      }

      const upper = line.toUpperCase()

      if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
        send('250-localhost greets you')
        send('250 SIZE 10485760')
      } else if (upper.startsWith('MAIL FROM')) {
          send('250 2.1.0 OK')
      } else if (upper.startsWith('RCPT TO')) {
        rcptTo.push(line.slice(line.indexOf(':') + 1).trim().replace(/^<|>$/g, ''))
        send('250 2.1.5 OK')
      } else if (upper === 'DATA') {
        inData = true
        send('354 End data with <CR><LF>.<CR><LF>')
      } else if (upper === 'RSET') {
        dataLines = []
        rcptTo.length = 0
        send('250 2.0.0 OK')
      } else if (upper === 'NOOP') {
        send('250 2.0.0 OK')
      } else if (upper === 'QUIT') {
        send('221 2.0.0 Bye')
        socket.end()
      } else {
        send('250 2.0.0 OK')
      }
    }
  })

  socket.on('error', (err) => {
    console.error('smtp socket error:', (err as Error).message)
  })
})

// A client disconnecting mid-session must never take the capture service down.
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} on ${HOST} is already in use. Set SMTP_PORT to a free port in .env ` +
        `(and restart the app so it sends to the same port).`,
    )
    process.exit(1)
  }
  console.error('smtp server error:', err.message)
})

server.on('clientError', (err, socket) => {
  console.error('smtp client error:', (err as Error).message)
  if (!socket.destroyed) socket.destroy()
})

// Shut down cleanly so stopping the service is not reported as a crash.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`\nstopping dev mail capture (${signal})`)
    server.close(() => process.exit(0))
    // Do not hang on lingering keep-alive connections.
    setTimeout(() => process.exit(0), 1000).unref()
  })
}

server.listen(PORT, HOST, () => {
  console.log(`dev mail capture listening on ${HOST}:${PORT}`)
  console.log(`messages are written to ${path.relative(process.cwd(), OUT_DIR)}/ and never forwarded`)
})
