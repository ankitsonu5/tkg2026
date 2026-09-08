import { getPayload } from 'payload'

import config from '@/payload.config'

/**
 * Shared Local API accessor for server components and server actions.
 *
 * IMPORTANT: `getPayload` returns a client whose operations default to `overrideAccess: true`
 * when no `req`/`user` is supplied. That is the documented Payload behaviour and it is easy
 * to leak drafts with by accident. Two rules apply in this codebase:
 *   1. Public page queries pass an explicit `where` on `_status` (see publicWhere below)
 *      rather than relying on access control they have already bypassed.
 *   2. Anything acting on behalf of a signed-in user must pass `{ user, overrideAccess: false }`.
 */
export async function getPayloadClient() {
  return getPayload({ config })
}

/** Constraint for public-facing reads: published only, never drafts. */
export const publishedOnly = { _status: { equals: 'published' } } as const
