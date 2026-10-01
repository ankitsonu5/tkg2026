import type { CollectionConfig } from 'payload'

import { adminOnly, noone } from '@/access'

/**
 * Persistent rate-limit buckets (FR-SEC-01).
 *
 * Stored in the database rather than process memory so the limit holds across serverless
 * instances, restarts and multiple app servers. An in-memory counter would reset on every
 * cold start and provide no real protection.
 *
 * The key is a salted hash of the client IP — never the raw address.
 */
export const RateLimitBuckets: CollectionConfig = {
  slug: 'rate-limit-buckets',
  admin: { group: 'Administration', useAsTitle: 'key', hidden: true },
  access: { read: adminOnly, create: noone, update: noone, delete: adminOnly },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, index: true },
    { name: 'count', type: 'number', required: true, defaultValue: 0 },
    { name: 'windowStart', type: 'date', required: true },
    { name: 'expiresAt', type: 'date', required: true, index: true },
  ],
}
