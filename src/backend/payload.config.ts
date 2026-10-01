import path from 'path'
import { fileURLToPath } from 'url'

import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import {
  lexicalEditor,
  FixedToolbarFeature,
  InlineToolbarFeature,
  HeadingFeature,
  BlockquoteFeature,
  EXPERIMENTAL_TableFeature,
  LinkFeature,
  UploadFeature,
  HorizontalRuleFeature,
  AlignFeature,
  OrderedListFeature,
  UnorderedListFeature,
  ChecklistFeature,
  BlocksFeature,
} from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { CtaButtonBlock, CalloutBoxBlock } from './blocks/editorBlocks'

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
  throw new Error('DATABASE_URI is not set. Copy .env.example to .env and point it at your MongoDB database.')
}

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET,
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
  globals: [SiteSettings, Navigation, Footer],
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures,
      FixedToolbarFeature(),
      InlineToolbarFeature(),
      HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }),
      BlockquoteFeature(),
      EXPERIMENTAL_TableFeature(),
      LinkFeature({
        enabledCollections: ['pages', 'articles'],
      }),
      UploadFeature({
        collections: {
          assets: {
            fields: [
              {
                name: 'caption',
                type: 'text',
              },
            ],
          },
        },
      }),
      HorizontalRuleFeature(),
      AlignFeature(),
      OrderedListFeature(),
      UnorderedListFeature(),
      ChecklistFeature(),
      BlocksFeature({
        blocks: [CtaButtonBlock, CalloutBoxBlock],
      }),
    ],
  }),
  // Keep the generated public types at src/payload-types.ts; application imports use
  // @/payload-types, while this config lives one directory deeper.
  typescript: { outputFile: path.resolve(dirname, '../payload-types.ts') },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || 'mongodb://127.0.0.1:27017/tel_ganesan_dev',
  }),
  email: nodemailerAdapter({
    defaultFromAddress: process.env.MAIL_FROM_ADDRESS || 'no-reply@localhost',
    defaultFromName: process.env.MAIL_FROM_NAME || 'Tel K. Ganesan Platform (development)',
    transportOptions: {
      host: process.env.SMTP_HOST || '127.0.0.1',
      port: Number(process.env.SMTP_PORT || 1025),
      // The local dev capture server (127.0.0.1:1025) speaks plain SMTP with no TLS
      // support at all, so TLS must be skipped there. A real provider (Gmail, Postmark,
      // etc.) requires STARTTLS on 587 or implicit TLS on 465 — forcing ignoreTLS there
      // makes AUTH fail, since the provider refuses to negotiate credentials in the clear.
      secure: Number(process.env.SMTP_PORT || 1025) === 465,
      ignoreTLS: (process.env.SMTP_HOST || '127.0.0.1') === '127.0.0.1',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    },
  }),
  sharp,
  // CSRF/origin protection for authenticated admin requests.
  csrf: [
    process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ],
  cors: [
    process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ],
  plugins: [],
})
