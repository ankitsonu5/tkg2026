import { timingSafeEqual } from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'

import { config } from '../config'

let warned = false

/**
 * Guards the internal API. Only the Next.js server calls it, sending INTERNAL_API_KEY in
 * the `x-internal-key` header. In development the key may be left unset (with a warning);
 * config.ts refuses to start production without it.
 */
export function requireInternalKey(req: Request, res: Response, next: NextFunction) {
  const expected = config.internalApiKey
  if (!expected) {
    if (!warned) {
      console.warn('INTERNAL_API_KEY is not set: the internal API is unauthenticated (development only).')
      warned = true
    }
    return next()
  }

  const supplied = req.get('x-internal-key') ?? ''
  const a = Buffer.from(supplied)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  return next()
}
