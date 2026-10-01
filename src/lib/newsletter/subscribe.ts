import { randomBytes } from 'node:crypto'

import type { Payload } from 'payload'

import { assertEmailAccepted, providerMessageId } from '@/lib/email/delivery-receipt'
import { esc, GOLD, INK, layout, MUTED, NAVY } from '@/lib/email/template'
import { consumeRateLimit } from '@/lib/inquiries/rate-limit'

/**
 * Newsletter double opt-in write path (FORM-NEWSLETTER, CTA-014).
 *
 * Mirrors the honesty rules used for inquiries: a "success" outcome is only ever returned
 * once the confirmation email has actually been accepted by the mail transport, never merely
 * because the database row was written.
 */

// Deliberately conservative, matching the inquiry validator (src/lib/inquiries/validate.ts).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export type NewsletterOutcome =
  | { status: 'success' }
  | { status: 'already-subscribed' }
  | { status: 'invalid'; message: string }
  | { status: 'rate-limited'; retryAfterSeconds: number }
  | { status: 'failed'; message: string }

export interface SubscribeInput {
  email: string
  sourcePage?: string
  /** Must be explicit; rendering a checked box is not server-side proof of consent. */
  privacyAccepted?: boolean
  /** Used only to derive a salted rate-limit bucket; the raw value is never stored. */
  clientIdentifier?: string
}

export async function subscribeToNewsletter(payload: Payload, input: SubscribeInput): Promise<NewsletterOutcome> {
  const email = input.email.trim().toLowerCase()
  if (!EMAIL_RE.test(email) || input.privacyAccepted !== true) {
    return { status: 'invalid', message: 'Enter a valid email address and accept the Privacy Policy.' }
  }

  if (input.clientIdentifier) {
    const limit = await consumeRateLimit({
      payload,
      scope: 'newsletter-signup',
      identifier: input.clientIdentifier,
      limit: 5,
      windowSeconds: 15 * 60,
    })
    if (!limit.allowed) {
      return { status: 'rate-limited', retryAfterSeconds: limit.retryAfterSeconds }
    }
  }

  const settings = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true }).catch(() => null)
  const now = new Date()

  const existing = await payload.find({
    collection: 'newsletter-subscriptions',
    where: { email: { equals: email } },
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })
  const doc = existing.docs[0]

  if (doc && doc.state === 'subscribed') {
    return { status: 'already-subscribed' }
  }

  const confirmationToken = randomBytes(24).toString('hex')
  const confirmationExpiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const policyVersion = String(settings?.privacyPolicyVersion ?? 'draft-unapproved')

  let subscriptionId: string
  if (doc) {
    const updated = await payload.update({
      collection: 'newsletter-subscriptions',
      id: doc.id,
      data: {
        confirmationToken,
        confirmationExpiresAt: confirmationExpiresAt.toISOString(),
        confirmationSentAt: null,
        confirmationMessageId: null,
        consentedAt: now.toISOString(),
        policyVersion,
        sourcePage: input.sourcePage,
        state: 'pending-confirmation',
        unsubscribedAt: null,
      },
      overrideAccess: true,
    })
    subscriptionId = String(updated.id)
  } else {
    const created = await payload.create({
      collection: 'newsletter-subscriptions',
      data: {
        email,
        confirmationToken,
        confirmationExpiresAt: confirmationExpiresAt.toISOString(),
        consentedAt: now.toISOString(),
        policyVersion,
        sourcePage: input.sourcePage,
        state: 'pending-confirmation',
      },
      overrideAccess: true,
    })
    subscriptionId = String(created.id)
  }

  // A confirmation link must always be a clickable absolute URL in an email, unlike a page
  // canonical where a relative path is harmless. `settings.productionOrigin` is deliberately
  // left unset until the public SEO domain decision is made (Appendix C), so this uses
  // NEXT_PUBLIC_SERVER_URL instead — the same server-reachable origin already used for CMS
  // preview links (see src/backend/collections/Articles.ts etc.) and CORS/CSRF.
  const origin = process.env.NEXT_PUBLIC_SERVER_URL?.trim() || settings?.productionOrigin?.trim()
  if (!origin) {
    return {
      status: 'failed',
      message: 'The confirmation email could not be created because the public site URL is not configured.',
    }
  }
  const confirmPath = `/newsletter/confirm?token=${confirmationToken}`
  let confirmUrl: string
  try {
    confirmUrl = new URL(confirmPath, origin).toString()
  } catch {
    return {
      status: 'failed',
      message: 'The confirmation email could not be created because the public site URL is invalid.',
    }
  }

  try {
    const receipt = await payload.sendEmail({
      to: email,
      subject: "Confirm your subscription to Tel K. Ganesan's Ideas",
      text: [
        "Please confirm your subscription to receive Tel K. Ganesan's Ideas.",
        '',
        confirmUrl,
        '',
        'If you did not request this, you can ignore this email and you will not be subscribed.',
      ].join('\n'),
      html: layout({
        preheader: "Confirm your subscription to Tel K. Ganesan's Ideas.",
        eyebrow: 'Ideas newsletter',
        title: 'Confirm your subscription',
        body: `
    <p style="margin:0 0 26px;font-size:15px;line-height:1.7;color:${INK};">Thank you for your interest in Tel K. Ganesan's Ideas. Please confirm your email address to start receiving new essays and frameworks.</p>
    <table role="presentation" cellspacing="0" cellpadding="0"><tr>
      <td style="background:${GOLD};border-radius:3px;">
        <a href="${esc(confirmUrl)}" style="display:inline-block;padding:14px 30px;font-size:14px;font-weight:bold;color:${NAVY};text-decoration:none;">Confirm subscription</a>
      </td>
    </tr></table>
    <p style="margin:26px 0 6px;font-size:12px;line-height:1.6;color:${MUTED};">If the button does not work, copy this link into your browser:</p>
    <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};word-break:break-all;">${esc(confirmUrl)}</p>`,
        footer: 'If you did not request this, you can ignore this email and you will not be subscribed.',
      }),
    })
    assertEmailAccepted(receipt, email)
    await payload.update({
      collection: 'newsletter-subscriptions',
      id: subscriptionId,
      data: {
        confirmationSentAt: new Date().toISOString(),
        confirmationMessageId: providerMessageId(receipt),
      },
      overrideAccess: true,
    })
  } catch (error) {
    console.error('Newsletter confirmation email failed to send:', error)
    return {
      status: 'failed',
      message: 'Your email was saved, but the confirmation message could not be sent. Please try again shortly.',
    }
  }

  return { status: 'success' }
}

export async function confirmNewsletterSubscription(payload: Payload, token: string): Promise<boolean> {
  if (!token) return false

  const existing = await payload.find({
    collection: 'newsletter-subscriptions',
    where: {
      and: [
        { confirmationToken: { equals: token } },
        { state: { equals: 'pending-confirmation' } },
      ],
    },
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })
  const doc = existing.docs[0]
  if (!doc) return false

  if (!doc.confirmationExpiresAt || new Date(String(doc.confirmationExpiresAt)).getTime() <= Date.now()) {
    await payload.update({
      collection: 'newsletter-subscriptions',
      id: doc.id,
      data: { confirmationToken: null },
      overrideAccess: true,
    })
    return false
  }

  await payload.update({
    collection: 'newsletter-subscriptions',
    id: doc.id,
    data: {
      state: 'subscribed',
      confirmedAt: new Date().toISOString(),
      confirmationToken: null,
      confirmationExpiresAt: null,
    },
    overrideAccess: true,
  })

  return true
}
