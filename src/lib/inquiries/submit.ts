import { randomBytes, randomUUID } from 'node:crypto'

import type { Payload } from 'payload'

import { getBaselineRoute } from '@/baseline/inquiry-routes'
import { normalizeAttribution } from './attribution'
import { consumeRateLimit } from './rate-limit'
import { computeSlaDueAt, type SlaClock } from './sla'
import { validateSubmission, type FieldError } from './validate'

/**
 * The single write path for an inquiry (FR-FORM-01).
 *
 * Delivery contract, stated explicitly because the UI message depends on it:
 *   - stored   : row committed, no delivery queued yet (transient internal state)
 *   - pending  : queued for owner delivery, worker has not yet succeeded
 *   - delivered: at least one owner recipient was accepted by the transport
 *   - failed   : all owner attempts exhausted their retries
 *
 * The UI shows SUCCESS only for `delivered`, an honest PENDING for `pending`, and a
 * recoverable ERROR with the reference for `failed`. A database insert alone is never
 * reported as success.
 */

export type SubmitOutcome =
  | { status: 'success'; reference: string; deliveryState: 'delivered'; slaHours: number; slaDueAt: string }
  | { status: 'pending'; reference: string; deliveryState: 'pending'; slaHours: number; slaDueAt: string }
  | { status: 'failed'; reference: string; message: string }
  | { status: 'invalid'; errors: FieldError[] }
  | { status: 'rate-limited'; retryAfterSeconds: number }
  | { status: 'route-unavailable'; message: string }

export interface SubmitInput {
  routeId: string
  values: Record<string, unknown>
  /** Sanitized before storage. */
  sourcePage?: string
  entryPage?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
  analyticsConsent?: boolean
  privacyAccepted?: boolean
  marketingOptIn?: boolean
  /** Supplied by the client so a retried submission does not create a second lead. */
  idempotencyKey?: string
  /** Used only to derive a salted rate-limit bucket; the raw value is never stored. */
  clientIdentifier?: string
}

/** Human-quotable, unguessable-enough operational reference. Distinct from analytics IDs. */
export function generateReference(routeId: string): string {
  const token = randomBytes(4).toString('hex').toUpperCase()
  const year = new Date().getUTCFullYear()
  return `${routeId.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)}-${year}-${token}`
}

export async function submitInquiry(payload: Payload, input: SubmitInput): Promise<SubmitOutcome> {
  const baselineRoute = getBaselineRoute(input.routeId)
  if (!baselineRoute) {
    return { status: 'route-unavailable', message: 'Unknown inquiry route.' }
  }

  // 1. Rate limit before doing any real work.
  if (input.clientIdentifier) {
    const limit = await consumeRateLimit({
      payload,
      scope: 'inquiry-submit',
      identifier: input.clientIdentifier,
      limit: 5,
      windowSeconds: 15 * 60,
    })
    if (!limit.allowed) {
      return { status: 'rate-limited', retryAfterSeconds: limit.retryAfterSeconds }
    }
  }

  // 2. Server-side validation is authoritative.
  const validation = validateSubmission(input.routeId, {
    ...input.values,
    privacyAccepted: input.privacyAccepted,
  })
  if (!validation.ok) {
    return { status: 'invalid', errors: validation.errors }
  }

  // 3. Route must be configured and enabled.
  const routeConfig = await payload.find({
    collection: 'inquiry-routes',
    where: { routeId: { equals: input.routeId } },
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })
  const route = routeConfig.docs[0]
  if (!route || route.enabled === false) {
    return { status: 'route-unavailable', message: 'This inquiry route is not currently accepting submissions.' }
  }

  // 4. Idempotency: a retry returns the original lead rather than creating a duplicate.
  const idempotencyKey = input.idempotencyKey?.slice(0, 100) || randomUUID()
  const existing = await payload.find({
    collection: 'inquiries',
    where: { idempotencyKey: { equals: idempotencyKey } },
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })
  if (existing.docs[0]) {
    const doc = existing.docs[0]
    return describeOutcome(String(doc.reference), String(doc.deliveryState), Number(route.slaHours), String(doc.slaDueAt))
  }

  const settings = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true })
  const now = new Date()
  const slaDueAt = computeSlaDueAt({
    from: now,
    hours: Number(route.slaHours ?? baselineRoute.slaHours),
    clock: (route.slaClock as SlaClock) ?? 'elapsed',
    timezone: String(route.slaTimezone ?? 'UTC'),
  })

  const attribution = normalizeAttribution(
    {
      sourcePage: input.sourcePage,
      entryPage: input.entryPage,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      utmTerm: input.utmTerm,
      utmContent: input.utmContent,
    },
    Boolean(input.analyticsConsent),
  )

  const reference = generateReference(input.routeId)

  // 5. Persist the lead. Only fields declared by the route schema are stored.
  const { fullName, email, ...qualification } = validation.values

  const inquiry = await payload.create({
    collection: 'inquiries',
    data: {
      reference,
      idempotencyKey,
      route: input.routeId as never,
      fullName: String(fullName ?? ''),
      email: String(email ?? ''),
      qualification,
      deliveryState: 'stored',
      workState: 'new',
      slaDueAt: slaDueAt.toISOString(),
      attribution,
      consent: {
        privacyAccepted: true,
        policyVersion: String(settings?.privacyPolicyVersion ?? 'draft-unapproved'),
        consentedAt: now.toISOString(),
        analyticsConsent: Boolean(input.analyticsConsent),
        // Never inferred from the inquiry itself.
        marketingOptIn: Boolean(input.marketingOptIn),
      },
    },
    overrideAccess: true,
  })

  // 6. Queue durable delivery rows. These survive a process crash; a fire-and-forget
  //    promise would not.
  const recipients: { kind: 'primary' | 'backup' | 'sender-ack'; address: string | null | undefined }[] = [
    { kind: 'primary', address: route.primaryRecipient },
    { kind: 'backup', address: route.backupRecipient },
    { kind: 'sender-ack', address: String(email ?? '') },
  ]

  let queuedOwnerRecipients = 0
  for (const recipient of recipients) {
    if (!recipient.address) continue
    if (recipient.kind !== 'sender-ack') queuedOwnerRecipients += 1
    await payload.create({
      collection: 'delivery-attempts',
      data: {
        inquiry: inquiry.id,
        route: input.routeId,
        recipientKind: recipient.kind,
        recipient: recipient.address,
        state: 'queued',
        attemptCount: 0,
        maxAttempts: 5,
        nextAttemptAt: now.toISOString(),
      },
      overrideAccess: true,
    })
  }

  // No configured owner mailbox means the lead cannot be delivered. That is reported
  // honestly as failed rather than shown to the visitor as a success.
  const deliveryState = queuedOwnerRecipients > 0 ? 'pending' : 'failed'

  await payload.update({
    collection: 'inquiries',
    id: inquiry.id,
    data: { deliveryState },
    overrideAccess: true,
  })

  await payload.create({
    collection: 'audit-events',
    data: {
      event: 'inquiry.received',
      subjectCollection: 'inquiries',
      subjectId: String(inquiry.id),
      actor: 'public-form',
      // Reference and route only. The inquiry body is never written to the audit trail.
      detail: `route=${input.routeId} reference=${reference} deliveryState=${deliveryState}`,
      occurredAt: now.toISOString(),
    },
    overrideAccess: true,
  })

  if (deliveryState === 'failed') {
    return {
      status: 'failed',
      reference,
      message:
        'Your message was saved but could not be delivered to an owner because this route has no configured recipient. Please quote the reference below when following up.',
    }
  }

  return describeOutcome(reference, deliveryState, Number(route.slaHours), slaDueAt.toISOString())
}

function describeOutcome(
  reference: string,
  deliveryState: string,
  slaHours: number,
  slaDueAt: string,
): SubmitOutcome {
  if (deliveryState === 'delivered') {
    return { status: 'success', reference, deliveryState: 'delivered', slaHours, slaDueAt }
  }
  if (deliveryState === 'failed') {
    return {
      status: 'failed',
      reference,
      message: 'Your message was saved but delivery to the owner has not succeeded yet.',
    }
  }
  return { status: 'pending', reference, deliveryState: 'pending', slaHours, slaDueAt }
}
