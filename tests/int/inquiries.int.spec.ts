import { describe, it, expect, beforeAll } from 'vitest'
import type { Payload } from 'payload'

import { testPayload, uid } from './helpers'
import { submitInquiry } from '@/lib/inquiries/submit'
import { runDeliveryPass } from '@/jobs/deliver-inquiries'
import { BASELINE_INQUIRY_ROUTES } from '@/baseline/inquiry-routes'
import { computeSlaDueAt } from '@/lib/inquiries/sla'

/**
 * QA-ROUTE-* : the seven priority routes, the delivery contract and the honesty rules that
 * the baseline places on what a visitor is told.
 */
describe('Inquiry routes, qualification and delivery', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await testPayload()

    // Ensure all seven route records exist in the test database.
    for (const route of BASELINE_INQUIRY_ROUTES) {
      const existing = await payload.find({
        collection: 'inquiry-routes',
        where: { routeId: { equals: route.routeId } },
        limit: 1,
        pagination: false,
        overrideAccess: true,
      })
      if (existing.docs.length > 0) continue
      await payload.create({
        collection: 'inquiry-routes',
        data: {
          routeId: route.routeId as never,
          label: route.label,
          ownerRole: route.ownerRole,
          minimumQualification: route.minimumQualification,
          slaHours: route.slaHours,
          slaClock: 'elapsed',
          primaryRecipient: `owner+${route.routeId}@localhost.test`,
          backupRecipient: `backup+${route.routeId}@localhost.test`,
          acceptanceStatus: 'unassigned',
          escalationCriterion: route.escalationCriterion,
          escalatesToTel: route.escalatesToTel,
          enabled: true,
        },
        overrideAccess: true,
      })
    }
  })

  const validValuesFor = (routeId: string) => {
    const route = BASELINE_INQUIRY_ROUTES.find((r) => r.routeId === routeId)!
    const values: Record<string, unknown> = {}
    for (const field of route.fields) {
      if (!field.required) continue
      switch (field.type) {
        case 'email':
          values[field.name] = 'sender@localhost.test'
          break
        case 'date':
          values[field.name] = '2027-01-15'
          break
        case 'select':
          values[field.name] = field.options![0].value
          break
        default:
          values[field.name] = `Provided ${field.name}`
      }
    }
    return values
  }

  it('QA-ROUTE-01: all seven baseline routes accept a qualified submission', async () => {
    for (const route of BASELINE_INQUIRY_ROUTES) {
      const outcome = await submitInquiry(payload, {
        routeId: route.routeId,
        values: validValuesFor(route.routeId),
        privacyAccepted: true,
        idempotencyKey: uid('idem'),
      })

      // Delivery has not run yet, so the honest state is pending - never success.
      expect(outcome.status, `route ${route.routeId}`).toBe('pending')
    }
  })

  it('QA-ROUTE-02: a submission missing required qualification is rejected with field errors', async () => {
    const outcome = await submitInquiry(payload, {
      routeId: 'speaking',
      values: { fullName: 'No Detail', email: 'sender@localhost.test' },
      privacyAccepted: true,
      idempotencyKey: uid('idem'),
    })

    expect(outcome.status).toBe('invalid')
    if (outcome.status !== 'invalid') return
    const fields = outcome.errors.map((e) => e.field)
    expect(fields).toContain('event')
    expect(fields).toContain('budget')
  })

  it('QA-ROUTE-03: a submission without privacy consent is rejected', async () => {
    const outcome = await submitInquiry(payload, {
      routeId: 'general',
      values: validValuesFor('general'),
      privacyAccepted: false,
      idempotencyKey: uid('idem'),
    })

    expect(outcome.status).toBe('invalid')
    if (outcome.status !== 'invalid') return
    expect(outcome.errors.map((e) => e.field)).toContain('privacyAccepted')
  })

  it('QA-ROUTE-04: a retried submission does not create a duplicate lead', async () => {
    const key = uid('idem-retry')
    const values = validValuesFor('general')

    const first = await submitInquiry(payload, { routeId: 'general', values, privacyAccepted: true, idempotencyKey: key })
    const second = await submitInquiry(payload, { routeId: 'general', values, privacyAccepted: true, idempotencyKey: key })

    expect(first.status).toBe('pending')
    expect(second.status).toBe('pending')
    if (first.status !== 'pending' || second.status !== 'pending') return

    expect(second.reference).toBe(first.reference)

    const matches = await payload.find({
      collection: 'inquiries',
      where: { idempotencyKey: { equals: key } },
      pagination: false,
      overrideAccess: true,
    })
    expect(matches.docs).toHaveLength(1)
  })

  it('QA-ROUTE-05: a lead is stored with pending delivery and durable outbox rows, not fire-and-forget', async () => {
    const outcome = await submitInquiry(payload, {
      routeId: 'media',
      values: validValuesFor('media'),
      privacyAccepted: true,
      idempotencyKey: uid('idem'),
    })
    expect(outcome.status).toBe('pending')
    if (outcome.status !== 'pending') return

    const lead = await payload.find({
      collection: 'inquiries',
      where: { reference: { equals: outcome.reference } },
      pagination: false,
      overrideAccess: true,
    })
    expect(lead.docs[0].deliveryState).toBe('pending')

    const attempts = await payload.find({
      collection: 'delivery-attempts',
      where: { inquiry: { equals: lead.docs[0].id } },
      pagination: false,
      overrideAccess: true,
    })
    // primary owner, backup owner and the sender acknowledgement
    expect(attempts.docs.length).toBe(3)
    expect(attempts.docs.every((a) => a.state === 'queued')).toBe(true)
  })

  it('QA-ROUTE-06: a route with no configured owner reports failure, never success', async () => {
    await payload.update({
      collection: 'inquiry-routes',
      where: { routeId: { equals: 'creative' } },
      data: { primaryRecipient: null, backupRecipient: null },
      overrideAccess: true,
    })

    const outcome = await submitInquiry(payload, {
      routeId: 'creative',
      values: validValuesFor('creative'),
      privacyAccepted: true,
      idempotencyKey: uid('idem'),
    })

    expect(outcome.status).toBe('failed')
    if (outcome.status !== 'failed') return
    expect(outcome.reference).toBeTruthy()

    // Restore for later runs.
    await payload.update({
      collection: 'inquiry-routes',
      where: { routeId: { equals: 'creative' } },
      data: { primaryRecipient: 'owner+creative@localhost.test', backupRecipient: 'backup+creative@localhost.test' },
      overrideAccess: true,
    })
  })

  it('QA-ROUTE-07: delivery failure retries with backoff and never marks the lead delivered', async () => {
    const outcome = await submitInquiry(payload, {
      routeId: 'impact',
      values: validValuesFor('impact'),
      privacyAccepted: true,
      idempotencyKey: uid('idem'),
    })
    expect(outcome.status).toBe('pending')
    if (outcome.status !== 'pending') return

    // Force every send to fail, simulating an unreachable transport.
    const original = payload.sendEmail
    payload.sendEmail = (async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:1025')
    }) as typeof payload.sendEmail

    try {
      await runDeliveryPass(payload, { batchSize: 50 })
    } finally {
      payload.sendEmail = original
    }

    const lead = await payload.find({
      collection: 'inquiries',
      where: { reference: { equals: outcome.reference } },
      pagination: false,
      overrideAccess: true,
    })
    // Still pending: a failed send must never be reported as delivered.
    expect(lead.docs[0].deliveryState).not.toBe('delivered')

    const attempts = await payload.find({
      collection: 'delivery-attempts',
      where: { inquiry: { equals: lead.docs[0].id } },
      pagination: false,
      overrideAccess: true,
    })
    const owner = attempts.docs.find((a) => a.recipientKind === 'primary')!
    expect(owner.state).toBe('failed')
    expect(owner.attemptCount).toBe(1)
    expect(new Date(String(owner.nextAttemptAt)).getTime()).toBeGreaterThan(Date.now())
    // The transport error is recorded, with addresses redacted.
    expect(owner.lastError).toContain('ECONNREFUSED')
  })

  it('QA-ROUTE-08: only an owner delivery marks a lead delivered; a sender acknowledgement does not', async () => {
    const outcome = await submitInquiry(payload, {
      routeId: 'general',
      values: validValuesFor('general'),
      privacyAccepted: true,
      idempotencyKey: uid('idem'),
    })
    if (outcome.status !== 'pending') throw new Error('expected pending')

    const lead = await payload.find({
      collection: 'inquiries',
      where: { reference: { equals: outcome.reference } },
      pagination: false,
      overrideAccess: true,
    })
    const leadId = lead.docs[0].id

    // Remove the owner rows, leaving only the sender acknowledgement.
    const attempts = await payload.find({
      collection: 'delivery-attempts',
      where: { inquiry: { equals: leadId } },
      pagination: false,
      overrideAccess: true,
    })
    for (const attempt of attempts.docs) {
      if (attempt.recipientKind !== 'sender-ack') {
        await payload.delete({ collection: 'delivery-attempts', id: attempt.id, overrideAccess: true })
      }
    }

    const original = payload.sendEmail
    payload.sendEmail = (async () => ({ messageId: 'test' })) as typeof payload.sendEmail
    try {
      await runDeliveryPass(payload, { batchSize: 50 })
    } finally {
      payload.sendEmail = original
    }

    const after = await payload.findByID({ collection: 'inquiries', id: leadId, overrideAccess: true })
    expect(after.deliveryState).toBe('pending')
  })

  it('QA-ROUTE-09: consent denial records unattributed context rather than inventing a source', async () => {
    const outcome = await submitInquiry(payload, {
      routeId: 'general',
      values: validValuesFor('general'),
      privacyAccepted: true,
      analyticsConsent: false,
      utmSource: 'newsletter',
      utmCampaign: 'launch',
      idempotencyKey: uid('idem'),
    })
    if (outcome.status !== 'pending') throw new Error('expected pending')

    const lead = await payload.find({
      collection: 'inquiries',
      where: { reference: { equals: outcome.reference } },
      pagination: false,
      overrideAccess: true,
    })

    expect(lead.docs[0].attribution?.attributionState).toBe('consent-denied')
    // The UTM values must NOT be stored when consent was refused.
    expect(lead.docs[0].attribution?.utmSource).toBeFalsy()
    expect(lead.docs[0].attribution?.utmCampaign).toBeFalsy()
  })

  it('QA-ROUTE-10: granted consent preserves validated attribution through to the lead record', async () => {
    const outcome = await submitInquiry(payload, {
      routeId: 'general',
      values: validValuesFor('general'),
      privacyAccepted: true,
      analyticsConsent: true,
      utmSource: 'newsletter',
      utmCampaign: 'launch',
      entryPage: '/ideas?secret=should-be-stripped',
      idempotencyKey: uid('idem'),
    })
    if (outcome.status !== 'pending') throw new Error('expected pending')

    const lead = await payload.find({
      collection: 'inquiries',
      where: { reference: { equals: outcome.reference } },
      pagination: false,
      overrideAccess: true,
    })

    const attribution = lead.docs[0].attribution
    expect(attribution?.attributionState).toBe('attributed')
    expect(attribution?.utmSource).toBe('newsletter')
    // Query string stripped: it may carry personal data.
    expect(attribution?.entryPage).toBe('/ideas')
  })

  it('QA-ROUTE-11: an inquiry never subscribes the sender to the newsletter by itself', async () => {
    const outcome = await submitInquiry(payload, {
      routeId: 'general',
      values: validValuesFor('general'),
      privacyAccepted: true,
      idempotencyKey: uid('idem'),
    })
    if (outcome.status !== 'pending') throw new Error('expected pending')

    const subscriptions = await payload.find({
      collection: 'newsletter-subscriptions',
      where: { email: { equals: 'sender@localhost.test' } },
      pagination: false,
      overrideAccess: true,
    })
    expect(subscriptions.docs).toHaveLength(0)
  })

  it('QA-ROUTE-12: the General route never escalates to Tel', async () => {
    const general = BASELINE_INQUIRY_ROUTES.find((r) => r.routeId === 'general')!
    expect(general.escalatesToTel).toBe(false)

    const stored = await payload.find({
      collection: 'inquiry-routes',
      where: { routeId: { equals: 'general' } },
      pagination: false,
      overrideAccess: true,
    })
    expect(stored.docs[0].escalatesToTel).toBe(false)
  })

  it('QA-ROUTE-13: SLA hours match the baseline exactly', async () => {
    const expected: Record<string, number> = {
      'strategic-partnership': 24,
      'investment-ma': 24,
      speaking: 24,
      media: 4,
      creative: 72,
      impact: 48,
      general: 48,
    }
    for (const route of BASELINE_INQUIRY_ROUTES) {
      expect(route.slaHours, route.routeId).toBe(expected[route.routeId])
    }
  })

  it('QA-ROUTE-14: elapsed and business-hours SLA clocks produce different due dates', async () => {
    // Friday 16:00 local.
    const friday = new Date('2026-09-11T16:00:00')
    const elapsed = computeSlaDueAt({ from: friday, hours: 24, clock: 'elapsed' })
    const business = computeSlaDueAt({ from: friday, hours: 24, clock: 'business' })

    expect(elapsed.getTime()).toBeLessThan(business.getTime())
    // Business hours must not land on a weekend.
    expect([0, 6]).not.toContain(business.getDay())
  })

  it('QA-SEC-01: repeated submissions from one client are rate limited', async () => {
    const client = uid('client-ip')
    const values = validValuesFor('general')
    const outcomes: string[] = []

    for (let i = 0; i < 7; i += 1) {
      const outcome = await submitInquiry(payload, {
        routeId: 'general',
        values,
        privacyAccepted: true,
        idempotencyKey: uid('idem'),
        clientIdentifier: client,
      })
      outcomes.push(outcome.status)
    }

    expect(outcomes).toContain('rate-limited')
  })
})
