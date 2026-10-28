import { bucketKey } from '../lib/inquiries/rate-limit'
import { RateLimitBucket } from '../models'

/**
 * Brute-force protection for the admin login, per client IP and independent of the
 * username tried (the per-account lockout in auth.ts covers a single account; this stops one
 * client from cycling through many accounts).
 *
 * Only FAILED attempts count. After MAX_FAILURES failures inside the counting window the IP is
 * blocked for BLOCK_MS; a successful login clears the counter.
 */

export const MAX_FAILURES = 5
/** Failures are counted over this window... */
const WINDOW_MS = 15 * 60 * 1000
/** ...and reaching the limit pauses logins from that IP for this long. */
export const BLOCK_MS = 30 * 1000

function key(ip: string) {
  return bucketKey('admin-login', ip || 'unknown')
}

export interface LoginGate {
  blocked: boolean
  retryAfterSeconds: number
  failures: number
}

export async function checkLoginGate(ip: string): Promise<LoginGate> {
  const bucket = await RateLimitBucket.findOne({ key: key(ip) }).lean().exec()
  const expiresAt = bucket?.expiresAt ? new Date(bucket.expiresAt as Date).getTime() : 0
  if (!bucket || expiresAt <= Date.now()) return { blocked: false, retryAfterSeconds: 0, failures: 0 }
  const failures = Number(bucket.count ?? 0)
  return {
    blocked: failures >= MAX_FAILURES,
    retryAfterSeconds: Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000)),
    failures,
  }
}

/** Records a failed attempt; returns the state after it. */
export async function recordLoginFailure(ip: string): Promise<LoginGate> {
  const now = Date.now()
  const current = await checkLoginGate(ip)
  if (current.failures === 0) {
    await RateLimitBucket.updateOne(
      { key: key(ip) },
      { $set: { count: 1, windowStart: new Date(now), expiresAt: new Date(now + WINDOW_MS) } },
      { upsert: true },
    ).exec()
    return { blocked: false, retryAfterSeconds: 0, failures: 1 }
  }
  const failures = current.failures + 1
  // The block lasts BLOCK_MS from the attempt that triggered it.
  const set: Record<string, unknown> = { count: failures }
  if (failures >= MAX_FAILURES) set.expiresAt = new Date(now + BLOCK_MS)
  await RateLimitBucket.updateOne({ key: key(ip) }, { $set: set }).exec()
  return { blocked: failures >= MAX_FAILURES, retryAfterSeconds: failures >= MAX_FAILURES ? BLOCK_MS / 1000 : current.retryAfterSeconds, failures }
}

export async function clearLoginFailures(ip: string): Promise<void> {
  await RateLimitBucket.deleteOne({ key: key(ip) }).exec()
}
