import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

import { config } from '../config'
import { data } from '../data/client'
import { esc, GOLD, INK, layout, MUTED, NAVY } from '../lib/email/template'
import { assertEmailAccepted } from '../lib/email/delivery-receipt'
import { consumeRateLimit } from '../lib/inquiries/rate-limit'
import { User } from '../models'
import { hashPassword, passwordProblem } from './auth'

/**
 * "Lost your password?" for the admin: a 6-digit code is emailed to the account's address and
 * exchanged, with a new password, for a reset.
 *
 * - Only a keyed hash of the code is stored; it expires after 10 minutes and dies after 5 wrong
 *   tries.
 * - The request endpoint answers the same way whether or not the account exists, so it cannot
 *   be used to discover usernames or emails.
 * - Requests are rate limited per client IP, and one account gets at most one code a minute.
 */

const CODE_TTL_MS = 10 * 60 * 1000
const MAX_CODE_ATTEMPTS = 5
const RESEND_AFTER_MS = 60 * 1000

function codeHash(userId: string, code: string): string {
  return createHmac('sha256', config.appSecret || 'dev-reset-secret').update(`${userId}:${code}`).digest('hex')
}

function findAccount(login: string) {
  const value = login.trim().toLowerCase()
  if (!value) return null
  return User.findOne(value.includes('@') ? { email: value } : { username: value }).lean().exec()
}

export const GENERIC_SENT =
  'If that account exists and has an email address, a 6-digit code is on its way. Check the inbox (and spam folder) — the code works for 10 minutes.'

export async function requestPasswordReset(login: unknown, ip: string): Promise<{ ok: true } | { error: string; status: number; retryAfterSeconds?: number }> {
  if (typeof login !== 'string' || !login.trim()) return { error: 'Enter your username or email address.', status: 400 }

  const limit = await consumeRateLimit({ db: data, scope: 'admin-password-reset', identifier: ip || 'unknown', limit: 5, windowSeconds: 15 * 60 })
  if (!limit.allowed) {
    return { error: 'Too many reset requests. Please wait before trying again.', status: 429, retryAfterSeconds: limit.retryAfterSeconds }
  }

  const doc = await findAccount(login)
  const email = typeof doc?.email === 'string' ? doc.email : ''
  if (!doc || !email) return { ok: true }

  const lastSent = doc.resetOtpSentAt ? new Date(doc.resetOtpSentAt as Date).getTime() : 0
  if (Date.now() - lastSent < RESEND_AFTER_MS) return { ok: true }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const userId = String(doc._id)
  await User.updateOne(
    { _id: doc._id },
    { $set: { resetOtpHash: codeHash(userId, code), resetOtpExpiresAt: new Date(Date.now() + CODE_TTL_MS), resetOtpAttempts: 0, resetOtpSentAt: new Date() } },
  ).exec()

  const name = String(doc.name || doc.username || 'there').split(' ')[0]
  try {
    const receipt = await data.sendEmail({
      to: email,
      subject: `${code} is your Tel K. Ganesan admin password reset code`,
      text: [
        `Hi ${name},`,
        '',
        `Your password reset code is: ${code}`,
        '',
        'It works for 10 minutes. If you did not ask to reset your password, ignore this email — your password stays the same.',
      ].join('\n'),
      html: layout({
        preheader: `Your password reset code is ${code}. It expires in 10 minutes.`,
        eyebrow: 'Admin security',
        title: 'Reset your password',
        body: `
    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:${INK};">Hi ${esc(name)}, use this code to reset the password for your Tel K. Ganesan admin account.</p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px;"><tr>
      <td style="background:${NAVY};border-radius:6px;padding:18px 30px;">
        <div style="font-family:'Courier New',monospace;font-size:34px;letter-spacing:10px;color:${GOLD};font-weight:bold;">${esc(code)}</div>
      </td>
    </tr></table>
    <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">The code expires in 10 minutes and can be used once.</p>`,
        footer: 'If you did not ask to reset your password, ignore this email — your password stays the same.',
      }),
    })
    assertEmailAccepted(receipt, email)
  } catch (error) {
    console.error('password reset email failed:', error)
    return { error: 'The reset email could not be sent. Please try again in a few minutes.', status: 502 }
  }

  await data
    .create({
      collection: 'audit-events',
      data: { event: 'admin.password_reset_requested', subjectCollection: 'users', subjectId: userId, actor: 'password-reset', detail: 'Reset code emailed', occurredAt: new Date().toISOString() },
    })
    .catch(() => undefined)
  return { ok: true }
}

export async function completePasswordReset(login: unknown, code: unknown, password: unknown): Promise<{ ok: true } | { error: string; status: number }> {
  const invalid = { error: 'That code is not valid or has expired. Request a new one.', status: 400 }
  if (typeof login !== 'string' || typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) return invalid
  const problem = passwordProblem(password)
  if (problem) return { error: problem, status: 400 }

  const doc = await findAccount(login)
  if (!doc || typeof doc.resetOtpHash !== 'string') return invalid
  const expires = doc.resetOtpExpiresAt ? new Date(doc.resetOtpExpiresAt as Date).getTime() : 0
  const attempts = Number(doc.resetOtpAttempts ?? 0)
  if (expires < Date.now() || attempts >= MAX_CODE_ATTEMPTS) {
    await User.updateOne({ _id: doc._id }, { $set: { resetOtpHash: null, resetOtpExpiresAt: null } }).exec()
    return invalid
  }

  const expected = Buffer.from(doc.resetOtpHash, 'hex')
  const given = Buffer.from(codeHash(String(doc._id), code.trim()), 'hex')
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    await User.updateOne({ _id: doc._id }, { $inc: { resetOtpAttempts: 1 } }).exec()
    const left = MAX_CODE_ATTEMPTS - attempts - 1
    return { error: left > 0 ? `That code is not right. ${left} tr${left === 1 ? 'y' : 'ies'} left.` : invalid.error, status: 400 }
  }

  await User.updateOne(
    { _id: doc._id },
    {
      $set: {
        ...(await hashPassword(String(password))),
        resetOtpHash: null,
        resetOtpExpiresAt: null,
        resetOtpAttempts: 0,
        loginAttempts: 0,
        lockUntil: null,
      },
    },
  ).exec()
  await data
    .create({
      collection: 'audit-events',
      data: { event: 'admin.password_reset', subjectCollection: 'users', subjectId: String(doc._id), actor: 'password-reset', detail: 'Password reset with emailed code; all sessions signed out', occurredAt: new Date().toISOString() },
    })
    .catch(() => undefined)
  return { ok: true }
}
