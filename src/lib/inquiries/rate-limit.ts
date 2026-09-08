import { createHash } from 'node:crypto'

import type { Payload } from 'payload'

/**
 * Database-backed fixed-window rate limiting.
 *
 * Chosen over an in-memory counter because the deployment target may run several instances;
 * a per-process map would be trivially bypassed and would reset on every cold start.
 */

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

/** Salted hash so raw IP addresses are never stored (data minimization). */
export function bucketKey(scope: string, identifier: string): string {
  const salt = process.env.PAYLOAD_SECRET ?? 'dev-salt'
  const digest = createHash('sha256').update(`${salt}:${scope}:${identifier}`).digest('hex').slice(0, 32)
  return `${scope}:${digest}`
}

export async function consumeRateLimit(args: {
  payload: Payload
  scope: string
  identifier: string
  limit: number
  windowSeconds: number
}): Promise<RateLimitResult> {
  const { payload, scope, identifier, limit, windowSeconds } = args
  const key = bucketKey(scope, identifier)
  const now = Date.now()

  const existing = await payload.find({
    collection: 'rate-limit-buckets',
    where: { key: { equals: key } },
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  const bucket = existing.docs[0]
  const expired = !bucket || Date.parse(String(bucket.expiresAt)) <= now

  if (expired) {
    const expiresAt = new Date(now + windowSeconds * 1000).toISOString()
    if (bucket) {
      await payload.update({
        collection: 'rate-limit-buckets',
        id: bucket.id,
        data: { count: 1, windowStart: new Date(now).toISOString(), expiresAt },
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'rate-limit-buckets',
        data: { key, count: 1, windowStart: new Date(now).toISOString(), expiresAt },
        overrideAccess: true,
      })
    }
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  const count = Number(bucket.count ?? 0)
  const retryAfterSeconds = Math.max(1, Math.ceil((Date.parse(String(bucket.expiresAt)) - now) / 1000))

  if (count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds }
  }

  await payload.update({
    collection: 'rate-limit-buckets',
    id: bucket.id,
    data: { count: count + 1 },
    overrideAccess: true,
  })

  return { allowed: true, remaining: limit - (count + 1), retryAfterSeconds: 0 }
}
