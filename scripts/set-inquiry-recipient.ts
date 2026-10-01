/**
 * Point every inquiry route's primary recipient at a single real inbox.
 *
 * seed-dev.ts only sets recipients when a route document doesn't exist yet, so it can't
 * update a database that has already been seeded (any local dev DB from before this
 * change, and — later — production, which is never seeded by seed-dev.ts at all). This
 * script updates existing `inquiry-routes` documents directly, and is safe to re-run.
 *
 * It does not touch acceptanceStatus: a shared inbox is not a named route owner, so
 * routes stay 'unassigned'/'assigned' until a real person accepts each route in writing
 * (R-03). This only makes delivery land somewhere real instead of nowhere.
 *
 * Usage: npx tsx scripts/set-inquiry-recipient.ts [email]
 *   Defaults to telganesanofficial@gmail.com when no email is given.
 */
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import { INQUIRY_ROUTE_IDS } from '../src/baseline/inquiry-routes'

async function main() {
  const email = process.argv[2] ?? 'telganesanofficial@gmail.com'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`Refusing to set an invalid-looking email address: "${email}"`)
    process.exit(1)
  }

  const payload = await getPayload({ config })

  let updated = 0
  let missing = 0

  for (const routeId of INQUIRY_ROUTE_IDS) {
    const existing = await payload.find({
      collection: 'inquiry-routes',
      where: { routeId: { equals: routeId } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    })

    const doc = existing.docs[0]
    if (!doc) {
      missing += 1
      console.log(`skip: no "${routeId}" route document exists yet (run seed-dev or create it in /admin first)`)
      continue
    }

    if (doc.primaryRecipient === email) {
      console.log(`unchanged: ${routeId} already points to ${email}`)
      continue
    }

    await payload.update({
      collection: 'inquiry-routes',
      id: doc.id,
      data: { primaryRecipient: email },
      overrideAccess: true,
    })
    updated += 1
    console.log(`updated: ${routeId} primaryRecipient -> ${email}`)
  }

  console.log(`\n${updated} updated, ${missing} missing, ${INQUIRY_ROUTE_IDS.length - updated - missing} already correct.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
