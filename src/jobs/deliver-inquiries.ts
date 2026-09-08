import type { Payload } from 'payload'

import { getBaselineRoute } from '@/baseline/inquiry-routes'

/**
 * Durable delivery worker (FR-OPS-01).
 *
 * Claims queued delivery attempts whose `nextAttemptAt` has arrived, sends them, and applies
 * bounded exponential backoff on failure. Run it from cron or a long-lived process:
 *   npm run worker:delivery
 *
 * Honesty rules enforced here:
 *  - `sent` means the transport ACCEPTED the message. It never means a person read it.
 *  - An inquiry becomes `delivered` only when an OWNER recipient succeeds. A successful
 *    sender acknowledgement alone does not mark the lead delivered.
 *  - Retries are exhausted into `dead`, and the inquiry becomes `failed` — never silently
 *    dropped.
 */

const BASE_BACKOFF_SECONDS = 30

export interface DeliveryRunResult {
  claimed: number
  sent: number
  failed: number
  dead: number
}

function backoffSeconds(attempt: number): number {
  // 30s, 60s, 120s, 240s, 480s
  return BASE_BACKOFF_SECONDS * Math.pow(2, Math.max(0, attempt - 1))
}

function redactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  // Keep the transport reason, drop anything that looks like an address or body.
  return message.replace(/[^\s@]+@[^\s@]+/g, '[redacted-address]').slice(0, 500)
}

function renderOwnerEmail(args: {
  reference: string
  routeLabel: string
  ownerRole: string
  slaHours: number
  slaDueAt: string
  fullName: string
  email: string
  qualification: Record<string, unknown>
  attribution: Record<string, unknown>
}): { subject: string; text: string } {
  const lines = [
    `A qualified inquiry has been routed to you as ${args.ownerRole}.`,
    '',
    `Reference:      ${args.reference}`,
    `Route:          ${args.routeLabel}`,
    `Response SLA:   ${args.slaHours}h (due ${args.slaDueAt})`,
    '',
    'Sender',
    `  Name:  ${args.fullName}`,
    `  Email: ${args.email}`,
    '',
    'Qualification',
    ...Object.entries(args.qualification).map(([k, v]) => `  ${k}: ${String(v)}`),
    '',
    'Attribution',
    ...Object.entries(args.attribution).map(([k, v]) => `  ${k}: ${String(v ?? '')}`),
    '',
    'Acknowledge this inquiry in the admin so SLA tracking reflects reality.',
  ]
  return { subject: `[${args.reference}] ${args.routeLabel} inquiry`, text: lines.join('\n') }
}

function renderSenderAck(args: { reference: string; routeLabel: string; slaHours: number }): {
  subject: string
  text: string
} {
  const text = [
    'Thank you for your message.',
    '',
    `Your reference is ${args.reference}.`,
    `It has been routed as a ${args.routeLabel} inquiry, and the accountable owner aims to respond within ${args.slaHours} hours.`,
    '',
    'This is an automated acknowledgement of receipt. It is not a commitment, booking or agreement.',
  ].join('\n')
  return { subject: `We received your inquiry (${args.reference})`, text }
}

export async function runDeliveryPass(payload: Payload, opts: { batchSize?: number } = {}): Promise<DeliveryRunResult> {
  const batchSize = opts.batchSize ?? 20
  const now = new Date()
  const result: DeliveryRunResult = { claimed: 0, sent: 0, failed: 0, dead: 0 }

  const due = await payload.find({
    collection: 'delivery-attempts',
    where: {
      and: [
        { state: { in: ['queued', 'failed'] } },
        { nextAttemptAt: { less_than_equal: now.toISOString() } },
      ],
    },
    limit: batchSize,
    depth: 1,
    pagination: false,
    overrideAccess: true,
  })

  for (const attempt of due.docs) {
    result.claimed += 1
    const attemptCount = Number(attempt.attemptCount ?? 0) + 1
    const maxAttempts = Number(attempt.maxAttempts ?? 5)

    // Mark in-flight so a second worker does not pick up the same row.
    await payload.update({
      collection: 'delivery-attempts',
      id: attempt.id,
      data: { state: 'in-flight', attemptCount },
      overrideAccess: true,
    })

    const inquiryId: number = typeof attempt.inquiry === 'object' ? attempt.inquiry.id : attempt.inquiry
    const inquiry = await payload.findByID({
      collection: 'inquiries',
      id: inquiryId,
      depth: 0,
      overrideAccess: true,
    })

    const baselineRoute = getBaselineRoute(String(inquiry.route))
    const routeLabel = baselineRoute?.label ?? String(inquiry.route)
    const slaHours = baselineRoute?.slaHours ?? 48

    const message =
      attempt.recipientKind === 'sender-ack'
        ? renderSenderAck({ reference: String(inquiry.reference), routeLabel, slaHours })
        : renderOwnerEmail({
            reference: String(inquiry.reference),
            routeLabel,
            ownerRole: baselineRoute?.ownerRole ?? 'Route Owner',
            slaHours,
            slaDueAt: String(inquiry.slaDueAt ?? ''),
            fullName: String(inquiry.fullName),
            email: String(inquiry.email),
            qualification: (inquiry.qualification ?? {}) as Record<string, unknown>,
            attribution: (inquiry.attribution ?? {}) as Record<string, unknown>,
          })

    try {
      await payload.sendEmail({
        to: String(attempt.recipient),
        subject: message.subject,
        text: message.text,
      })

      await payload.update({
        collection: 'delivery-attempts',
        id: attempt.id,
        data: { state: 'sent', sentAt: new Date().toISOString(), lastError: null },
        overrideAccess: true,
      })
      result.sent += 1

      // Only an OWNER delivery flips the inquiry to delivered.
      if (attempt.recipientKind !== 'sender-ack') {
        await payload.update({
          collection: 'inquiries',
          id: inquiryId,
          data: { deliveryState: 'delivered' },
          overrideAccess: true,
        })
      }
    } catch (error) {
      const exhausted = attemptCount >= maxAttempts
      await payload.update({
        collection: 'delivery-attempts',
        id: attempt.id,
        data: {
          state: exhausted ? 'dead' : 'failed',
          lastError: redactError(error),
          nextAttemptAt: exhausted
            ? null
            : new Date(Date.now() + backoffSeconds(attemptCount) * 1000).toISOString(),
        },
        overrideAccess: true,
      })

      if (exhausted) {
        result.dead += 1
        if (attempt.recipientKind !== 'sender-ack') {
          // Every owner route exhausted? Then the lead has genuinely failed.
          const siblings = await payload.find({
            collection: 'delivery-attempts',
            where: {
              and: [
                { inquiry: { equals: inquiryId } },
                { recipientKind: { not_equals: 'sender-ack' } },
                { state: { not_equals: 'dead' } },
              ],
            },
            limit: 1,
            pagination: false,
            overrideAccess: true,
          })
          if (siblings.docs.length === 0) {
            await payload.update({
              collection: 'inquiries',
              id: inquiryId,
              data: { deliveryState: 'failed' },
              overrideAccess: true,
            })
            await payload.create({
              collection: 'audit-events',
              data: {
                event: 'inquiry.delivery_failed',
                subjectCollection: 'inquiries',
                subjectId: String(inquiryId),
                actor: 'delivery-worker',
                detail: `All owner delivery attempts exhausted for reference ${inquiry.reference}. Operator action required.`,
                occurredAt: new Date().toISOString(),
              },
              overrideAccess: true,
            })
          }
        }
      } else {
        result.failed += 1
      }
    }
  }

  return result
}
