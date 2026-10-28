import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer'

import { config } from '../config'

let transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (transporter) return transporter
  const { host, port, user, password } = config.mail
  transporter = nodemailer.createTransport({
    host,
    port,
    // Reuse SMTP connections instead of logging in again for every message.
    pool: true,
    maxConnections: 3,
    secure: port === 465,
    // The local capture server (127.0.0.1:1025, `npm run mail:dev`) speaks plain SMTP with no
    // TLS at all. A real provider needs STARTTLS (587) or implicit TLS (465) before AUTH.
    ignoreTLS: host === '127.0.0.1',
    auth: user ? { user, pass: password } : undefined,
  })
  return transporter
}

/**
 * Sends one message from the configured sender. Resolves with Nodemailer's receipt, which
 * callers check with assertEmailAccepted (a resolved send can still have rejected the
 * recipient).
 */
export async function sendEmail(message: SendMailOptions) {
  const { fromAddress, fromName } = config.mail
  return getTransporter().sendMail({ from: { name: fromName, address: fromAddress }, ...message })
}
