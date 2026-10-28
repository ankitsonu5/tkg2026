import { beforeAll, describe, expect, it } from 'vitest'
import type { DataClient } from '../src/data/client'

import { confirmNewsletterSubscription, subscribeToNewsletter } from '../src/lib/newsletter/subscribe'
import { testDb, uid } from './helpers'

describe('Newsletter consent, confirmation and delivery', () => {
  let db: DataClient

  beforeAll(async () => {
    db = await testDb()

  })

  it('QA-NEWS-01: rejects a missing/invalid email and missing privacy consent without writing a subscription', async () => {
    const email = `${uid('newsletter-invalid')}@localhost.test`

    const invalidEmail = await subscribeToNewsletter(db, { email: 'not-an-email', privacyAccepted: true })
    const noConsent = await subscribeToNewsletter(db, { email, privacyAccepted: false })

    expect(invalidEmail.status).toBe('invalid')
    expect(noConsent.status).toBe('invalid')
    const stored = await db.find({
      collection: 'newsletter-subscriptions',
      where: { email: { equals: email } },
      pagination: false,
      overrideAccess: true,
    })
    expect(stored.docs).toHaveLength(0)
  })

  it('QA-NEWS-02: accepted transport receipt produces a pending double-opt-in record and absolute confirmation URL', async () => {
    const email = `${uid('newsletter-delivery')}@localhost.test`
    const messages: Array<Record<string, unknown>> = []
    const original = db.sendEmail
    db.sendEmail = (async (message) => {
      messages.push(message as Record<string, unknown>)
      return { accepted: [email], rejected: [], messageId: '<newsletter-provider-id>' }
    }) as typeof db.sendEmail

    try {
      const outcome = await subscribeToNewsletter(db, {
        email,
        sourcePage: '/ideas',
        privacyAccepted: true,
      })
      expect(outcome.status).toBe('success')
    } finally {
      db.sendEmail = original
    }

    expect(messages).toHaveLength(1)
    expect(messages[0].to).toBe(email)
    expect(String(messages[0].text)).toMatch(/http:\/\/localhost:3000\/newsletter\/confirm\?token=[a-f0-9]{48}/)

    const stored = await db.find({
      collection: 'newsletter-subscriptions',
      where: { email: { equals: email } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    })
    expect(stored.docs[0].state).toBe('pending-confirmation')
    expect(stored.docs[0].confirmationSentAt).toBeTruthy()
    expect(stored.docs[0].confirmationMessageId).toBe('<newsletter-provider-id>')
    expect(new Date(String(stored.docs[0].confirmationExpiresAt)).getTime()).toBeGreaterThan(Date.now())
  })

  it('QA-NEWS-03: confirmation token is single-use and changes the lead state to subscribed', async () => {
    const email = `${uid('newsletter-confirm')}@localhost.test`
    const original = db.sendEmail
    db.sendEmail = (async () => ({ accepted: [email], rejected: [], messageId: '<confirm-id>' })) as typeof db.sendEmail

    try {
      expect((await subscribeToNewsletter(db, { email, privacyAccepted: true })).status).toBe('success')
    } finally {
      db.sendEmail = original
    }

    const pending = await db.find({
      collection: 'newsletter-subscriptions',
      where: { email: { equals: email } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    })
    const token = String(pending.docs[0].confirmationToken)

    expect(await confirmNewsletterSubscription(db, token)).toBe(true)
    expect(await confirmNewsletterSubscription(db, token)).toBe(false)

    const confirmed = await db.findByID({
      collection: 'newsletter-subscriptions',
      id: pending.docs[0].id,
      overrideAccess: true,
    })
    expect(confirmed.state).toBe('subscribed')
    expect(confirmed.confirmedAt).toBeTruthy()
    expect(confirmed.confirmationToken).toBeFalsy()
  })

  it('QA-NEWS-04: a rejected transport recipient is a failure, never a false success', async () => {
    const email = `${uid('newsletter-rejected')}@localhost.test`
    const original = db.sendEmail
    db.sendEmail = (async () => ({ accepted: [], rejected: [email], messageId: '<rejected-id>' })) as typeof db.sendEmail

    try {
      const outcome = await subscribeToNewsletter(db, { email, privacyAccepted: true })
      expect(outcome.status).toBe('failed')
    } finally {
      db.sendEmail = original
    }

    const stored = await db.find({
      collection: 'newsletter-subscriptions',
      where: { email: { equals: email } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    })
    expect(stored.docs[0].state).toBe('pending-confirmation')
    expect(stored.docs[0].confirmationSentAt).toBeFalsy()
  })

  it('QA-NEWS-05: an expired confirmation token is rejected and invalidated', async () => {
    const email = `${uid('newsletter-expired')}@localhost.test`
    const original = db.sendEmail
    db.sendEmail = (async () => ({ accepted: [email], rejected: [], messageId: '<expired-id>' })) as typeof db.sendEmail

    try {
      expect((await subscribeToNewsletter(db, { email, privacyAccepted: true })).status).toBe('success')
    } finally {
      db.sendEmail = original
    }

    const pending = await db.find({
      collection: 'newsletter-subscriptions',
      where: { email: { equals: email } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    })
    const token = String(pending.docs[0].confirmationToken)
    await db.update({
      collection: 'newsletter-subscriptions',
      id: pending.docs[0].id,
      data: { confirmationExpiresAt: new Date(Date.now() - 1000).toISOString() },
      overrideAccess: true,
    })

    expect(await confirmNewsletterSubscription(db, token)).toBe(false)
    const expired = await db.findByID({
      collection: 'newsletter-subscriptions',
      id: pending.docs[0].id,
      overrideAccess: true,
    })
    expect(expired.confirmationToken).toBeFalsy()
    expect(expired.state).toBe('pending-confirmation')
  })
})
