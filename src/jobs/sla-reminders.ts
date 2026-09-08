import type { Payload } from 'payload'

import { getBaselineRoute } from '@/baseline/inquiry-routes'

/**
 * SLA reminders (FR-ROUTE-01).
 *
 * Deliberate constraint from the baseline: an overdue lead reminds the ROUTE OWNER and
 * BACKUP. It does not automatically escalate to Tel. Escalation to Tel is a judgement call
 * against each route's stated criterion (material value, capital, reputation, tier-one
 * outlet, and so on) and is recorded by a person, never inferred from a clock.
 *
 * The General route never escalates to Tel at all; it is reclassified to the correct owner.
 */

export interface SlaSweepResult {
  overdue: number
  remindersQueued: number
  /** Leads whose route criterion means a human should consider escalation. */
  flaggedForEscalationReview: string[]
}

export async function runSlaSweep(payload: Payload): Promise<SlaSweepResult> {
  const now = new Date()
  const result: SlaSweepResult = { overdue: 0, remindersQueued: 0, flaggedForEscalationReview: [] }

  const overdue = await payload.find({
    collection: 'inquiries',
    where: {
      and: [
        { slaDueAt: { less_than: now.toISOString() } },
        { workState: { in: ['new'] } },
        { deliveryState: { in: ['pending', 'delivered'] } },
      ],
    },
    limit: 100,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })

  for (const inquiry of overdue.docs) {
    result.overdue += 1
    const baselineRoute = getBaselineRoute(String(inquiry.route))

    const routeConfig = await payload.find({
      collection: 'inquiry-routes',
      where: { routeId: { equals: String(inquiry.route) } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    })
    const route = routeConfig.docs[0]
    if (!route) continue

    // Remind the owner and backup only.
    for (const recipient of [route.primaryRecipient, route.backupRecipient]) {
      if (!recipient) continue
      await payload.create({
        collection: 'delivery-attempts',
        data: {
          inquiry: inquiry.id,
          route: String(inquiry.route),
          recipientKind: recipient === route.primaryRecipient ? 'primary' : 'backup',
          recipient,
          state: 'queued',
          attemptCount: 0,
          maxAttempts: 3,
          nextAttemptAt: now.toISOString(),
        },
        overrideAccess: true,
      })
      result.remindersQueued += 1
    }

    // Flag for human escalation review; never escalate automatically, and never for General.
    if (baselineRoute?.escalatesToTel) {
      result.flaggedForEscalationReview.push(String(inquiry.reference))
    }

    await payload.create({
      collection: 'audit-events',
      data: {
        event: 'inquiry.sla_breached',
        subjectCollection: 'inquiries',
        subjectId: String(inquiry.id),
        actor: 'sla-worker',
        detail:
          `Reference ${inquiry.reference} passed its ${baselineRoute?.slaHours ?? '?'}h window. ` +
          `Owner and backup reminded. ` +
          (baselineRoute?.escalatesToTel
            ? `Escalation to Tel requires a human decision against: "${baselineRoute.escalationCriterion}".`
            : 'This route never escalates to Tel; reclassify to the correct owner.'),
        occurredAt: now.toISOString(),
      },
      overrideAccess: true,
    })
  }

  return result
}
