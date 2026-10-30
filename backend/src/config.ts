import path from 'node:path'

import dotenv from 'dotenv'

// Same precedence as Next.js: `.env.production` (in production) wins over `.env`, and real
// environment variables win over both.
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.production') })
}
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is not set. Copy backend/.env.example to backend/.env and fill it in.`)
  }
  return value
}

const isProduction = process.env.NODE_ENV === 'production'

export const config = {
  isProduction,
  port: Number(process.env.PORT || process.env.API_PORT || 4000),
  /** Loopback by default: nginx (or the Next.js rewrite) is the only public entry point. */
  host: process.env.API_HOST || '127.0.0.1',
  databaseUri: required('DATABASE_URI'),
  /**
   * Shared secret the Next.js server sends as `x-internal-key`. Every endpoint other than
   * public media and the health check requires it. Mandatory in production.
   */
  internalApiKey: process.env.INTERNAL_API_KEY?.trim() || '',
  /**
   * Salt for hashed rate-limit buckets. PAYLOAD_SECRET is still read so existing buckets keep
   * matching after the migration.
   */
  appSecret: process.env.APP_SECRET?.trim() || process.env.PAYLOAD_SECRET?.trim() || '',
  /** Public site origin, used to build absolute links in emails. */
  publicSiteUrl: process.env.PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_SERVER_URL?.trim() || '',
  cronSecret: process.env.CRON_SECRET?.trim() || '',
  mediaDir: path.resolve(__dirname, '..', process.env.MEDIA_DIR || 'media'),
  blobToken: process.env.BLOB_READ_WRITE_TOKEN?.trim() || '',
  mail: {
    host: process.env.SMTP_HOST || '127.0.0.1',
    port: Number(process.env.SMTP_PORT || 1025),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    fromAddress: process.env.MAIL_FROM_ADDRESS || 'no-reply@localhost',
    fromName: process.env.MAIL_FROM_NAME || 'Tel K. Ganesan Platform (development)',
  },
}

if (isProduction && !config.internalApiKey) {
  throw new Error('INTERNAL_API_KEY must be set in production.')
}
if (isProduction && !config.appSecret) {
  throw new Error('APP_SECRET must be set in production.')
}
