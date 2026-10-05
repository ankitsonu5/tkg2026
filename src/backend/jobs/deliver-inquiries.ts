import type { Payload } from 'payload'

import { getBaselineRoute } from '@/baseline/inquiry-routes'
import { assertEmailAccepted, providerMessageId } from '@/lib/email/delivery-receipt'
import { detailRows, esc, formatDue, GOLD, INK, layout, NAVY } from '@/lib/email/template'
import { isPlaceholderRecipient } from '@/lib/inquiries/routing-readiness'

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
const STALE_IN_FLIGHT_MS = 10 * 60 * 1000

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
}): { subject: string; text: string; html: string } {
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
  const attributionEntries = Object.entries(args.attribution).filter(
    ([k, v]) => v && !['attributionState'].includes(k),
  ) as [string, unknown][]

  const body = `
    <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:${INK};">A qualified inquiry has been routed to you as <strong>${esc(args.ownerRole)}</strong>.</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${NAVY};border-radius:4px;margin:0 0 28px;">
      <tr>
        <td style="padding:18px 22px;">
          <div style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${GOLD};">Reference</div>
          <div style="margin-top:4px;font-family:'Courier New',monospace;font-size:18px;color:#ffffff;letter-spacing:.04em;">${esc(args.reference)}</div>
        </td>
        <td align="right" style="padding:18px 22px;vertical-align:top;">
          <div style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${GOLD};">Respond within</div>
          <div style="margin-top:4px;font-size:18px;color:#ffffff;">${esc(args.slaHours)} hours</div>
        </td>
      </tr>
    </table>

    <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${NAVY};font-weight:bold;padding-bottom:4px;border-bottom:2px solid ${GOLD};">Sender</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${detailRows([
      ['name', args.fullName],
      ['email', args.email],
      ['route', args.routeLabel],
      ['response due', formatDue(args.slaDueAt)],
    ])}</table>

    <div style="margin-top:28px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${NAVY};font-weight:bold;padding-bottom:4px;border-bottom:2px solid ${GOLD};">Inquiry details</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${detailRows(
      Object.entries(args.qualification),
    )}</table>

    ${
      attributionEntries.length > 0
        ? `<div style="margin-top:28px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${NAVY};font-weight:bold;padding-bottom:4px;border-bottom:2px solid ${GOLD};">Source</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${detailRows(attributionEntries)}</table>`
        : ''
    }

    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:32px;"><tr>
      <td style="background:${GOLD};border-radius:3px;">
        <a href="mailto:${esc(args.email)}?subject=${encodeURIComponent(`Re: [${args.reference}] ${args.routeLabel} inquiry`)}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:bold;color:${NAVY};text-decoration:none;">Reply to ${esc(args.fullName.split(' ')[0] || 'sender')}</a>
      </td>
    </tr></table>`

  return {
    subject: `[${args.reference}] ${args.routeLabel} inquiry`,
    text: lines.join('\n'),
    html: layout({
      preheader: `${args.fullName} sent a ${args.routeLabel} inquiry (${args.reference}).`,
      eyebrow: `${args.routeLabel} inquiry`,
      title: `New inquiry from ${args.fullName}`,
      body,
      footer: `Acknowledge this inquiry in the admin so SLA tracking reflects reality.<br>Do not forward this message: it contains the sender's contact details.`,
    }),
  }
}

function renderSenderAck(args: { reference: string; routeLabel: string; slaHours: number }): {
  subject: string
  text: string
  html: string
} {
  const text = [
    'Thank you for your message.',
    '',
    `Your reference is ${args.reference}.`,
    `It has been routed as a ${args.routeLabel} inquiry, and the accountable owner aims to respond within ${args.slaHours} hours.`,
    '',
    'This is an automated acknowledgement of receipt. It is not a commitment, booking or agreement.',
  ].join('\n')
  const body = `
    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:${INK};">Thank you for reaching out. Your message has been received and routed to the accountable owner, who aims to respond within <strong>${esc(args.slaHours)} hours</strong>.</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${NAVY};border-radius:4px;margin:0 0 24px;">
      <tr><td style="padding:18px 22px;">
        <div style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${GOLD};">Your reference</div>
        <div style="margin-top:4px;font-family:'Courier New',monospace;font-size:20px;color:#ffffff;letter-spacing:.04em;">${esc(args.reference)}</div>
        <div style="margin-top:8px;font-size:13px;color:#c9d1dd;">Routed as: ${esc(args.routeLabel)}</div>
      </td></tr>
    </table>

    <p style="margin:0;font-size:14px;line-height:1.7;color:${INK};">Please quote this reference if you follow up.</p>`

  return {
    subject: `We received your inquiry (${args.reference})`,
    text,
    html: layout({
      preheader: `We received your inquiry. Reference ${args.reference}.`,
      eyebrow: 'Inquiry received',
      title: 'Thank you for your message',
      body,
      footer: `This is an automated acknowledgement of receipt. It is not a commitment, booking or agreement.`,
    }),
  }
}

export async function runDeliveryPass(payload: Payload, opts: { batchSize?: number } = {}): Promise<DeliveryRunResult> {
  const batchSize = opts.batchSize ?? 20
  const now = new Date()
  const result: DeliveryRunResult = { claimed: 0, sent: 0, failed: 0, dead: 0 }

  const due = await payload.find({
    collection: 'delivery-attempts',
    where: {
      or: [
        {
          and: [
            { state: { in: ['queued', 'failed'] } },
            { nextAttemptAt: { less_than_equal: now.toISOString() } },
          ],
        },
        // Reclaim rows orphaned by a crash or serverless timeout mid-send. Without this an
        // `in-flight` row is never selected again and the lead is silently stuck.
        {
          and: [
            { state: { equals: 'in-flight' } },
            { updatedAt: { less_than: new Date(now.getTime() - STALE_IN_FLIGHT_MS).toISOString() } },
          ],
        },
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

    const inquiryId: string = typeof attempt.inquiry === 'object' ? attempt.inquiry.id : attempt.inquiry
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
      if (
        process.env.NODE_ENV === 'production' &&
        attempt.recipientKind !== 'sender-ack' &&
        isPlaceholderRecipient(String(attempt.recipient))
      ) {
        throw new Error('Production owner delivery blocked: recipient is a non-deliverable placeholder.')
      }
      const receipt = await payload.sendEmail({
        to: String(attempt.recipient),
        subject: message.subject,
        text: message.text,
        html: message.html,
      })
      assertEmailAccepted(receipt, String(attempt.recipient))

      await payload.update({
        collection: 'delivery-attempts',
        id: attempt.id,
        data: {
          state: 'sent',
          sentAt: new Date().toISOString(),
          lastError: null,
          providerMessageId: providerMessageId(receipt),
        },
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
