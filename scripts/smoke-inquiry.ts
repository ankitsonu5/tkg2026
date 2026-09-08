/**
 * Traceable end-to-end route test (baseline Section 7.2: "test the complete journey with a
 * traceable test-lead ID before acceptance").
 *
 * Submits one inquiry per route through the real submission path, runs the delivery worker,
 * and reports the resulting delivery state and captured messages. Development only.
 *
 * Usage: npx tsx scripts/smoke-inquiry.ts
 */
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import { submitInquiry } from '../src/lib/inquiries/submit'
import { runDeliveryPass } from '../src/jobs/deliver-inquiries'
import { BASELINE_INQUIRY_ROUTES } from '../src/baseline/inquiry-routes'

function valuesFor(routeId: string) {
  const route = BASELINE_INQUIRY_ROUTES.find((r) => r.routeId === routeId)!
  const values: Record<string, unknown> = {}
  for (const field of route.fields) {
    if (!field.required) continue
    if (field.type === 'email') values[field.name] = 'test-sender@localhost.test'
    else if (field.type === 'date') values[field.name] = '2027-03-01'
    else if (field.type === 'select') values[field.name] = field.options![0].value
    else values[field.name] = `SMOKE TEST value for ${field.name}`
  }
  return values
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run smoke submissions in production.')
    process.exit(1)
  }

  const payload = await getPayload({ config })
  const testRunId = `SMOKE-${Date.now()}`
  const references: { route: string; reference: string; status: string }[] = []

  for (const route of BASELINE_INQUIRY_ROUTES) {
    const outcome = await submitInquiry(payload, {
      routeId: route.routeId,
      values: valuesFor(route.routeId),
      privacyAccepted: true,
      analyticsConsent: true,
      utmSource: 'smoke-test',
      entryPage: '/connect',
      idempotencyKey: `${testRunId}-${route.routeId}`,
      clientIdentifier: `${testRunId}-${route.routeId}`,
    })
    references.push({
      route: route.routeId,
      reference: 'reference' in outcome ? outcome.reference : '-',
      status: outcome.status,
    })
  }

  console.log(`\ntest run ${testRunId} — submissions`)
  for (const r of references) console.log(`  ${r.route.padEnd(24)} ${r.status.padEnd(10)} ${r.reference}`)

  console.log('\nrunning delivery worker...')
  const delivery = await runDeliveryPass(payload, { batchSize: 100 })
  console.log(`  claimed=${delivery.claimed} sent=${delivery.sent} failed=${delivery.failed} dead=${delivery.dead}`)

  console.log('\nfinal delivery state per lead')
  for (const r of references) {
    if (r.reference === '-') continue
    const lead = await payload.find({
      collection: 'inquiries',
      where: { reference: { equals: r.reference } },
      pagination: false,
      overrideAccess: true,
    })
    console.log(`  ${r.route.padEnd(24)} ${String(lead.docs[0]?.deliveryState).padEnd(10)} ${r.reference}`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
