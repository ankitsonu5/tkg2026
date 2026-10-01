/**
 * Development-only end-to-end proof for public forms.
 *
 * Requires `npm run mail:dev` and MongoDB. It submits every inquiry route through the real
 * write path, runs the durable worker, verifies the stored lead/outbox/provider receipt and
 * checks the captured SMTP message at each configured destination. It then exercises the
 * newsletter double-opt-in through confirmation and single-use token invalidation.
 *
 * Run: npx tsx scripts/smoke-forms.ts
 */
import 'dotenv/config'

import fs from 'node:fs'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import { BASELINE_INQUIRY_ROUTES } from '../src/baseline/inquiry-routes'
import { runDeliveryPass } from '../src/jobs/deliver-inquiries'
import { submitInquiry } from '../src/lib/inquiries/submit'
import { confirmNewsletterSubscription, subscribeToNewsletter } from '../src/lib/newsletter/subscribe'

type Result = { caseId: string; status: 'PASS' | 'FAIL'; evidence: string }

const mailDirectory = path.resolve(process.cwd(), '.mail')

function valuesFor(routeId: string, senderEmail: string) {
  const route = BASELINE_INQUIRY_ROUTES.find((candidate) => candidate.routeId === routeId)!
  const values: Record<string, unknown> = {}
  for (const field of route.fields) {
    if (!field.required) continue
    if (field.type === 'email') values[field.name] = senderEmail
    else if (field.type === 'date') values[field.name] = '2027-03-01'
    else if (field.type === 'select') values[field.name] = field.options![0].value
    else values[field.name] = `E2E value for ${field.name}`
  }
  return values
}

function capturedFilesSince(existing: Set<string>): string[] {
  if (!fs.existsSync(mailDirectory)) return []
  return fs.readdirSync(mailDirectory).filter((name) => name.endsWith('.eml') && !existing.has(name))
}

function hasCapturedMessage(files: string[], recipient: string, marker: string): boolean {
  const safeRecipient = recipient.replace(/[^a-zA-Z0-9._@-]/g, '_').slice(0, 80).toLowerCase()
  return files.some((name) => {
    if (!name.toLowerCase().includes(safeRecipient)) return false
    return fs.readFileSync(path.join(mailDirectory, name), 'utf8').includes(marker)
  })
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to run smoke submissions in production.')

  const payload = await getPayload({ config })
  const runId = `FORM-E2E-${Date.now()}`
  const senderEmail = `${runId.toLowerCase()}@localhost.test`
  const newsletterEmail = `${runId.toLowerCase()}-newsletter@localhost.test`
  const existingMail = new Set(fs.existsSync(mailDirectory) ? fs.readdirSync(mailDirectory) : [])
  const results: Result[] = []
  const submissions: Array<{ routeId: string; reference: string; routeConfig: Record<string, unknown> }> = []

  for (const route of BASELINE_INQUIRY_ROUTES) {
    const configs = await payload.find({
      collection: 'inquiry-routes',
      where: { routeId: { equals: route.routeId } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    })
    const routeConfig = configs.docs[0] as unknown as Record<string, unknown> | undefined
    if (!routeConfig?.primaryRecipient || !routeConfig?.backupRecipient) {
      results.push({ caseId: `E2E-${route.routeId}`, status: 'FAIL', evidence: 'Primary or backup recipient is not configured.' })
      continue
    }

    const outcome = await submitInquiry(payload, {
      routeId: route.routeId,
      values: valuesFor(route.routeId, senderEmail),
      privacyAccepted: true,
      sourcePage: '/connect',
      idempotencyKey: `${runId}-${route.routeId}`,
      clientIdentifier: `${runId}-${route.routeId}`,
    })
    if (outcome.status !== 'pending') {
      results.push({ caseId: `E2E-${route.routeId}`, status: 'FAIL', evidence: `Submission returned ${outcome.status}.` })
      continue
    }
    submissions.push({ routeId: route.routeId, reference: outcome.reference, routeConfig })
  }

  await runDeliveryPass(payload, { batchSize: 1000 })
  const captured = capturedFilesSince(existingMail)

  for (const submission of submissions) {
    const leads = await payload.find({
      collection: 'inquiries',
      where: { reference: { equals: submission.reference } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    })
    const lead = leads.docs[0]
    const attempts = await payload.find({
      collection: 'delivery-attempts',
      where: { inquiry: { equals: lead.id } },
      pagination: false,
      overrideAccess: true,
    })
    const expected = [
      String(submission.routeConfig.primaryRecipient),
      String(submission.routeConfig.backupRecipient),
      senderEmail,
    ]
    const destinationsCorrect = expected.every((recipient) =>
      attempts.docs.some((attempt) => attempt.recipient === recipient && attempt.state === 'sent' && attempt.providerMessageId),
    )
    const mailCaptured = expected.every((recipient) => hasCapturedMessage(captured, recipient, submission.reference))
    const passed = lead.deliveryState === 'delivered' && destinationsCorrect && mailCaptured
    results.push({
      caseId: `E2E-${submission.routeId}`,
      status: passed ? 'PASS' : 'FAIL',
      evidence: `${submission.reference}; lead=${lead.deliveryState}; recipients=${expected.join(',')}; smtpCaptured=${mailCaptured}`,
    })
  }

  const newsletterOutcome = await subscribeToNewsletter(payload, {
    email: newsletterEmail,
    sourcePage: '/ideas',
    privacyAccepted: true,
    clientIdentifier: `${runId}-newsletter`,
  })
  const subscriptions = await payload.find({
    collection: 'newsletter-subscriptions',
    where: { email: { equals: newsletterEmail } },
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })
  const subscription = subscriptions.docs[0]
  const token = String(subscription?.confirmationToken ?? '')
  const firstConfirmation = token ? await confirmNewsletterSubscription(payload, token) : false
  const secondConfirmation = token ? await confirmNewsletterSubscription(payload, token) : false
  const confirmed = subscription
    ? await payload.findByID({ collection: 'newsletter-subscriptions', id: subscription.id, overrideAccess: true })
    : null
  const newsletterMailCaptured = hasCapturedMessage(
    capturedFilesSince(existingMail),
    newsletterEmail,
    'Confirm your subscription',
  )
  const newsletterPassed =
    newsletterOutcome.status === 'success' &&
    Boolean(subscription?.confirmationMessageId) &&
    newsletterMailCaptured &&
    firstConfirmation &&
    !secondConfirmation &&
    confirmed?.state === 'subscribed'
  results.push({
    caseId: 'E2E-newsletter',
    status: newsletterPassed ? 'PASS' : 'FAIL',
    evidence: `submit=${newsletterOutcome.status}; smtpCaptured=${newsletterMailCaptured}; firstConfirm=${firstConfirmation}; tokenReuse=${secondConfirmation}; state=${confirmed?.state ?? 'missing'}`,
  })

  console.log(`\n${runId}`)
  for (const result of results) console.log(`${result.status.padEnd(4)} ${result.caseId.padEnd(28)} ${result.evidence}`)
  const failed = results.filter((result) => result.status === 'FAIL')
  console.log(`\n${results.length - failed.length}/${results.length} end-to-end cases passed; captured ${capturedFilesSince(existingMail).length} new messages.`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
