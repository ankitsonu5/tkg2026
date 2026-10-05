/**
 * Production provisioning for a FRESH, EMPTY production database.
 *
 * Creates only what the live site needs to function, with the real values you pass in:
 *   - site settings, navigation and footer
 *   - the seven inquiry routes (recipients and written acceptance recorded exactly as given)
 *   - the first administrator and, optionally, a route-owner user
 * It creates no pages, claims, assets, articles or test data, and it is safe to re-run: records
 * that already exist are left untouched (nothing is overwritten).
 *
 * Passwords are generated, printed once and never stored in the repository.
 *
 * Usage (point DATABASE_URI at the PRODUCTION database first):
 *   npx tsx scripts/seed-production.ts --confirm-production \
 *     --admin-email you@kyyba.com --admin-name "Your Name" \
 *     --primary sakshi@kyybamusic.com --backup ankits@kyyba.com \
 *     --accepted-by "Sakshi Singh" \
 *     --owner-email sakshi@kyybamusic.com --owner-name "Sakshi Singh" \
 *     --origin https://telkganesan.com --privacy-version 2026-10-v1
 *
 * Recipients must be real mailboxes. Pass --accepted-by only when that person has actually
 * accepted the routes in writing; without it the routes are created as "assigned" (not accepted)
 * and the site's forms stay closed in production until acceptance is recorded in the admin.
 */
import 'dotenv/config'

import { randomBytes } from 'node:crypto'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import { BASELINE_INQUIRY_ROUTES } from '../src/baseline/inquiry-routes'
import { BASELINE_PAGES } from '../src/baseline/pages'
import { isPlaceholderRecipient } from '../src/lib/inquiries/routing-readiness'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const has = (name: string) => process.argv.includes(`--${name}`)

function fail(message: string): never {
  console.error(`\nERROR: ${message}\n`)
  process.exit(1)
}

async function main() {
  if (!has('confirm-production')) {
    fail('Refusing to run without --confirm-production. This script writes to the database in DATABASE_URI.')
  }

  const adminEmail = arg('admin-email') ?? fail('--admin-email is required.')
  const adminName = arg('admin-name') ?? fail('--admin-name is required.')
  const primary = arg('primary') ?? fail('--primary (real owner mailbox) is required.')
  const backup = arg('backup') ?? fail('--backup (real backup mailbox) is required.')
  const acceptedBy = arg('accepted-by')
  const ownerEmail = arg('owner-email')
  const ownerName = arg('owner-name')
  const origin = arg('origin') ?? process.env.PRODUCTION_ORIGIN ?? ''
  const privacyVersion = arg('privacy-version') ?? 'draft-unapproved'

  for (const [label, address] of [['--primary', primary], ['--backup', backup]] as const) {
    if (isPlaceholderRecipient(address)) fail(`${label} "${address}" is not a deliverable mailbox.`)
  }
  if (primary.toLowerCase() === backup.toLowerCase()) {
    console.warn('WARNING: primary and backup are the same mailbox, so there is no real fallback.')
  }
  if ((ownerEmail && !ownerName) || (!ownerEmail && ownerName)) fail('--owner-email and --owner-name go together.')
  if (privacyVersion === 'draft-unapproved') {
    console.warn('WARNING: privacy policy version is still "draft-unapproved". Get it approved and pass --privacy-version.')
  }

  const payload = await getPayload({ config })

  // ---- Globals (only filled when still empty, so a re-run never overwrites admin edits) ----
  const settings = (await payload.findGlobal({ slug: 'site-settings', overrideAccess: true })) as unknown as Record<string, unknown>
  // The global already exists with defaults, so fill in only values that are still unset (or
  // still the draft placeholder). A re-run never overwrites something an admin has edited.
  const patch: Record<string, unknown> = {}
  if (!settings.siteName) patch.siteName = 'Tel K. Ganesan'
  if (!settings.positioningLine) patch.positioningLine = 'Executive Chairman | Enterprise Builder | Investor | Producer'
  if (!settings.masterStatement) {
    patch.masterStatement = 'Tel K. Ganesan builds enterprises, leaders, and platforms that turn possibility into lasting value.'
  }
  if (origin && !settings.productionOrigin) patch.productionOrigin = origin
  if (!settings.privacyPolicyVersion || settings.privacyPolicyVersion === 'draft-unapproved') {
    patch.privacyPolicyVersion = privacyVersion
  }
  // Indexing stays OFF until the live checks pass; turn it on in Site Settings (or with
  // ALLOW_INDEXING=true) at go-live.
  if (settings.allowIndexing === undefined || settings.allowIndexing === null) patch.allowIndexing = false

  if (Object.keys(patch).length > 0) {
    await payload.updateGlobal({ slug: 'site-settings', data: patch as never, overrideAccess: true })
    console.log(`site-settings: set ${Object.keys(patch).join(', ')} (indexing stays OFF)`)
  } else {
    console.log('site-settings: already configured, left unchanged')
  }

  const nav = (await payload.findGlobal({ slug: 'navigation', overrideAccess: true })) as unknown as { primary?: unknown[] }
  if (!nav.primary?.length) {
    await payload.updateGlobal({
      slug: 'navigation',
      data: { primary: BASELINE_PAGES.filter((p) => p.inPrimaryNav).map((p) => ({ label: p.title, path: p.path, pageId: p.pageId })) },
      overrideAccess: true,
    })
    console.log('navigation: created')
  }

  const footer = (await payload.findGlobal({ slug: 'footer', overrideAccess: true })) as unknown as { groups?: unknown[] }
  if (!footer.groups?.length) {
    await payload.updateGlobal({
      slug: 'footer',
      data: {
        groups: [
          { title: 'Explore', links: [{ label: 'About', path: '/about' }, { label: 'Enterprise & Investments', path: '/enterprise-investments' }, { label: 'Ideas', path: '/ideas' }] },
          { title: 'Engage', links: [{ label: 'Film & Culture', path: '/film-culture' }, { label: 'Impact', path: '/impact' }, { label: 'Media & Speaking', path: '/media-speaking' }, { label: 'Connect', path: '/connect' }] },
        ],
        socialLinks: [],
        legalLine: `© ${new Date().getFullYear()} Tel K. Ganesan. All rights reserved.`,
      },
      overrideAccess: true,
    })
    console.log('footer: created')
  }

  // ---- Inquiry routes ----
  const acceptedAt = new Date().toISOString()
  let routes = 0
  for (const route of BASELINE_INQUIRY_ROUTES) {
    const existing = await payload.find({ collection: 'inquiry-routes', where: { routeId: { equals: route.routeId } }, limit: 1, pagination: false, overrideAccess: true })
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
        slaTimezone: 'America/Detroit',
        primaryRecipient: primary,
        backupRecipient: backup,
        acceptanceStatus: acceptedBy ? 'accepted' : 'assigned',
        ...(acceptedBy ? { acceptedBy, acceptedAt } : {}),
        escalationCriterion: route.escalationCriterion,
        escalatesToTel: route.escalatesToTel,
        enabled: true,
      },
      overrideAccess: true,
    })
    routes += 1
  }
  console.log(`inquiry-routes: ${routes} created (${acceptedBy ? `accepted by ${acceptedBy}` : 'assigned, NOT accepted'})`)

  // ---- Users ----
  const issued: { email: string; role: string; password: string }[] = []
  const makeUser = async (email: string, name: string, roles: string[], extra: Record<string, unknown> = {}) => {
    const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, pagination: false, overrideAccess: true })
    if (existing.docs.length > 0) {
      console.log(`user ${email}: already exists, left unchanged`)
      return
    }
    const password = randomBytes(18).toString('base64url')
    await payload.create({ collection: 'users', data: { email, name, roles: roles as never, password, ...extra } as never, overrideAccess: true })
    issued.push({ email, role: roles.join(', '), password })
  }

  await makeUser(adminEmail, adminName, ['administrator'])
  if (ownerEmail && ownerName) {
    await makeUser(ownerEmail, ownerName, ['route-owner'], { assignedRoutes: BASELINE_INQUIRY_ROUTES.map((r) => r.routeId) })
  }

  if (issued.length > 0) {
    console.log('\nCredentials (shown ONCE, not stored anywhere). Share them securely and ask each person to change the password after first login:')
    for (const u of issued) console.log(`  ${u.role.padEnd(14)} ${u.email}   ${u.password}`)
  }

  console.log('\nDone. Next: set Primary/Backup/acceptance details in Admin if needed, approve the privacy policy, then run the live checks in docs/PRODUCTION_LAUNCH_RUNBOOK.md.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
