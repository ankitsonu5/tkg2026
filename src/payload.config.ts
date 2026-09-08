import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Articles } from './collections/Articles'
import { Assets } from './collections/Assets'
import { AuditEvents } from './collections/AuditEvents'
import { Claims } from './collections/Claims'
import { DeliveryAttempts } from './collections/DeliveryAttempts'
import { Downloads } from './collections/Downloads'
import { Entities } from './collections/Entities'
import { EvidenceSources } from './collections/EvidenceSources'
import { Initiatives } from './collections/Initiatives'
import { Inquiries } from './collections/Inquiries'
import { InquiryRoutes } from './collections/InquiryRoutes'
import { NewsletterSubscriptions } from './collections/NewsletterSubscriptions'
import { Pages } from './collections/Pages'
import { Projects } from './collections/Projects'
import { RateLimitBuckets } from './collections/RateLimitBuckets'
import { Redirects } from './collections/Redirects'
import { Users } from './collections/Users'
import { Footer } from './globals/Footer'
import { Navigation } from './globals/Navigation'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.PAYLOAD_SECRET) {
  // Fail loudly rather than booting with a blank signing secret.
  throw new Error('PAYLOAD_SECRET is not set. Copy .env.example to .env and generate a secret.')
}

if (!process.env.DATABASE_URI) {
  throw new Error('DATABASE_URI is not set. Copy .env.example to .env and point it at your Postgres database.')
}

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: '— Tel K. Ganesan Platform' },
  },
  collections: [
    // Content
    Pages,
    Articles,
    Entities,
    Projects,
    Initiatives,
    Downloads,
    // Evidence
    Claims,
    EvidenceSources,
    Assets,
    // Inquiries
    InquiryRoutes,
    Inquiries,
    DeliveryAttempts,
    NewsletterSubscriptions,
    // Administration
    Redirects,
    RateLimitBuckets,
    AuditEvents,
    Users,
  ],
  globals: [Navigation, Footer, SiteSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI },
    // Migrations are explicit; schema is never silently pushed in production.
    push: process.env.NODE_ENV !== 'production',
    migrationDir: path.resolve(dirname, '../migrations'),
  }),
  email: nodemailerAdapter({
    defaultFromAddress: process.env.MAIL_FROM_ADDRESS || 'no-reply@localhost',
    defaultFromName: process.env.MAIL_FROM_NAME || 'Tel K. Ganesan Platform (development)',
    transportOptions: {
      host: process.env.SMTP_HOST || '127.0.0.1',
      port: Number(process.env.SMTP_PORT || 1025),
      // Local capture only. A production provider requires TLS and credentials.
      secure: false,
      ignoreTLS: true,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    },
  }),
  sharp,
  // CSRF/origin protection for authenticated admin requests.
  csrf: [process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'],
  cors: [process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'],
  plugins: [],
})
