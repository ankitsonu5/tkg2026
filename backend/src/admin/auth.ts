import { createHmac, pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

import type { NextFunction, Request, Response } from 'express'

import { config } from '../config'
import { User } from '../models'
import { ROLES, type Role } from './permissions'

const pbkdf2Async = promisify(pbkdf2)

/**
 * Staff authentication for the admin panel.
 *
 * Passwords use the same scheme Payload used (PBKDF2-SHA256, 600k iterations, 32-byte key,
 * `pbkdf2-sha256-v1:` prefix; older 25k/512-byte hashes are still accepted and upgraded on
 * login), so every existing account keeps its password.
 *
 * Sessions are a signed, httpOnly, SameSite=Strict cookie. No session table is needed.
 */

const HASH_PREFIX = 'pbkdf2-sha256-v1:'
const CURRENT = { iterations: 600_000, keyLength: 32 }
const LEGACY = { iterations: 25_000, keyLength: 512 }

export const SESSION_COOKIE = 'tkg_admin'
const SESSION_HOURS = 8
const MAX_LOGIN_ATTEMPTS = 5
const LOCK_MS = 30 * 1000

export interface StaffUser {
  id: string
  email: string
  username: string
  name: string
  roles: Role[]
  assignedRoutes: string[]
}

const devSecret = randomBytes(32).toString('hex')
function signingSecret(): string {
  // config.ts already refuses to start production without APP_SECRET.
  return config.appSecret || devSecret
}

/**
 * New password fields for a user document. `passwordChangedAt` makes every session issued
 * earlier invalid (see requireStaff).
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string; passwordChangedAt: Date }> {
  const salt = randomBytes(32).toString('hex')
  const raw = await pbkdf2Async(password, salt, CURRENT.iterations, CURRENT.keyLength, 'sha256')
  return { hash: `${HASH_PREFIX}${raw.toString('hex')}`, salt, passwordChangedAt: new Date() }
}

export async function verifyPassword(password: string, salt: unknown, hash: unknown): Promise<{ ok: boolean; upgrade: boolean }> {
  if (typeof salt !== 'string' || typeof hash !== 'string') return { ok: false, upgrade: false }
  const current = hash.startsWith(HASH_PREFIX)
  const params = current ? CURRENT : LEGACY
  const stored = Buffer.from(current ? hash.slice(HASH_PREFIX.length) : hash, 'hex')
  const computed = await pbkdf2Async(password, salt, params.iterations, params.keyLength, 'sha256')
  const ok = computed.length === stored.length && timingSafeEqual(computed, stored)
  return { ok, upgrade: ok && !current }
}

export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters.'
  if (password.length > 200) return 'Password is too long.'
  return null
}

function sign(payload: string): string {
  return createHmac('sha256', signingSecret()).update(payload).digest('base64url')
}

export function createSessionToken(userId: string): string {
  const now = Date.now()
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: now, exp: now + SESSION_HOURS * 3600_000 })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

function readSessionToken(token: string | undefined): { sub: string; iat: number } | null {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const { sub, exp, iat } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string; exp?: number; iat?: number }
    if (!sub || !exp || exp < Date.now()) return null
    return { sub, iat: Number(iat ?? 0) }
  } catch {
    return null
  }
}

function cookieValue(req: Request, name: string): string | undefined {
  const header = req.headers.cookie ?? ''
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return undefined
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProduction,
    path: '/',
    maxAge: SESSION_HOURS * 3600_000,
  })
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' })
}

export function toStaffUser(doc: Record<string, any>): StaffUser {
  return {
    id: String(doc._id ?? doc.id),
    email: String(doc.email ?? ''),
    username: String(doc.username ?? ''),
    name: String(doc.name ?? ''),
    roles: (Array.isArray(doc.roles) ? doc.roles : []).filter((r: string): r is Role => (ROLES as readonly string[]).includes(r)),
    assignedRoutes: Array.isArray(doc.assignedRoutes) ? doc.assignedRoutes.map(String) : [],
  }
}

/** Email + password login with lockout after repeated failures. */
export async function login(
  emailInput: unknown,
  password: unknown,
): Promise<{ user: StaffUser } | { error: string; status: number; retryAfterSeconds?: number; failed?: boolean }> {
  // WordPress-style: the login field accepts a username or an email address.
  const login = typeof emailInput === 'string' ? emailInput.trim().toLowerCase() : ''
  if (!login || typeof password !== 'string' || !password) return { error: 'Enter your username (or email) and password.', status: 400 }

  const doc = await User.findOne(login.includes('@') ? { email: login } : { username: login }).lean().exec()
  // Same message whether or not the account exists.
  const invalid = { error: 'The username or password is incorrect.', status: 401, failed: true }
  if (!doc) return invalid

  const lockUntil = doc.lockUntil ? new Date(doc.lockUntil as string).getTime() : 0
  if (lockUntil > Date.now()) {
    return {
      error: 'Too many failed attempts. This account is temporarily locked.',
      status: 423,
      retryAfterSeconds: Math.ceil((lockUntil - Date.now()) / 1000),
    }
  }

  const { ok, upgrade } = await verifyPassword(password, doc.salt, doc.hash)
  if (!ok) {
    const attempts = Number(doc.loginAttempts ?? 0) + 1
    const locks = attempts >= MAX_LOGIN_ATTEMPTS
    await User.updateOne({ _id: doc._id }, { $set: locks ? { loginAttempts: 0, lockUntil: new Date(Date.now() + LOCK_MS) } : { loginAttempts: attempts } }).exec()
    if (locks) {
      return { error: 'Too many failed attempts. This account is temporarily locked.', status: 423, retryAfterSeconds: LOCK_MS / 1000, failed: true }
    }
    return invalid
  }

  const set: Record<string, unknown> = { loginAttempts: 0, lockUntil: null }
  if (upgrade) Object.assign(set, await hashPassword(password))
  await User.updateOne({ _id: doc._id }, { $set: set }).exec()
  return { user: toStaffUser(doc) }
}

declare module 'express-serve-static-core' {
  interface Request {
    staff?: StaffUser
  }
}

/** Requires a valid session; loads the current user (so role changes apply immediately). */
export async function requireStaff(req: Request, res: Response, next: NextFunction) {
  const session = readSessionToken(cookieValue(req, SESSION_COOKIE))
  if (!session) return res.status(401).json({ error: 'Please log in.' })
  const doc = await User.findById(session.sub).lean().exec().catch(() => null)
  if (!doc) return res.status(401).json({ error: 'Please log in.' })
  // A password change (or reset) signs out every session issued before it.
  const changedAt = doc.passwordChangedAt ? new Date(doc.passwordChangedAt as Date).getTime() : 0
  if (changedAt && session.iat < changedAt) return res.status(401).json({ error: 'Your password was changed. Please log in again.' })
  req.staff = toStaffUser(doc)
  return next()
}

/**
 * Cross-site request protection for state-changing admin calls. The cookie is already
 * SameSite=Strict; this additionally refuses requests whose Origin is not the site.
 */
export function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD') return next()
  const origin = req.get('origin')
  if (!origin) return next()
  const allowed = new Set(
    [config.publicSiteUrl, 'http://localhost:3000', 'http://127.0.0.1:3000']
      .filter(Boolean)
      .map((u) => {
        try {
          return new URL(u).origin
        } catch {
          return ''
        }
      }),
  )
  const host = req.get('x-forwarded-host') ?? req.get('host')
  if (allowed.has(origin) || (host && new URL(origin).host === host)) return next()
  return res.status(403).json({ error: 'Cross-site request refused.' })
}
