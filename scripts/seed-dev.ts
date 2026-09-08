/**
 * Development seeding.
 *
 * Refuses to run unless NODE_ENV === 'development'.
 *
 * What it creates, and deliberately what it does NOT:
 *  - All 15 page/template records as DRAFTS. Nothing is published, because no copy has
 *    cleared G1 and nothing has approved evidence.
 *  - All 7 inquiry route configuration records, with LOCAL test recipients only and
 *    acceptanceStatus 'unassigned'. No real person's address is invented.
 *  - The six high-risk evidence topics from Section 9 as BLOCKED claims, so they exist as
 *    tracked tasks and can never be published by accident. They are NOT public facts.
 *  - Navigation, footer and site settings globals with indexing OFF.
 *
 * It creates no fake published entities, projects, initiatives, articles, awards,
 * testimonials, logos or portraits.
 */
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import { BASELINE_PAGES } from '../src/baseline/pages'
import { BASELINE_INQUIRY_ROUTES } from '../src/baseline/inquiry-routes'

/** Section 9 - Initial High-Risk Evidence Queue. Seeded blocked, never as facts. */
const HIGH_RISK_CLAIMS = [
  {
    claimId: 'CLAIM-001',
    exactWording: 'Kyyba was founded in [YEAR - CONTESTED].',
    qualifier: 'Formation year',
    blockingReason:
      'Conflicting 1998 / 2005 references. Requires the formation record and approved corporate history. Hold until one dated wording is approved. Owner: Business Owner + Legal.',
  },
  {
    claimId: 'CLAIM-002',
    exactWording: 'Kyyba has 700+ [employees or associates - UNDEFINED].',
    qualifier: 'Workforce scale',
    blockingReason:
      'Not scoped or dated. Requires a dated HR/operations report defining employees versus associates. No approximate marketing number may be published. Owner: Business Owner.',
  },
  {
    claimId: 'CLAIM-003',
    exactWording: 'Trap City was #1 on Starz.',
    qualifier: 'Region, category and period all unspecified',
    blockingReason:
      'Lacks region/category/period proof. Requires dated official platform evidence. Only qualified exact wording may be used. Owner: Business Owner + Legal.',
  },
  {
    claimId: 'CLAIM-004',
    exactWording: 'Tel K. Ganesan holds the executive role of [ROLE] at [ORGANIZATION].',
    qualifier: 'Current versus former status',
    blockingReason:
      'Current/former status may conflict. Requires an official organization/board record with term dates. Historical roles must be labeled as former. Owner: Legal.',
  },
  {
    claimId: 'CLAIM-005',
    exactWording: 'Tel K. Ganesan served as [PRODUCER/DISTRIBUTION ROLE] on [TITLE].',
    qualifier: 'Exact screen credit',
    blockingReason:
      'Producer/distribution roles require the exact credit. Requires a contract, screen credit or official distributor record. No inferred role. Owner: Creative Producer + Legal.',
  },
  {
    claimId: 'CLAIM-006',
    exactWording: 'Impact programs have served [NUMBER] people.',
    qualifier: 'Legal status and outcome methodology',
    blockingReason:
      'Legal status and people-served claims need definition. Requires a formation/tax record and an auditable outcome methodology. No charitable or cumulative implication without proof. Owner: Business Owner + Legal.',
  },
]

async function main() {
  if (process.env.NODE_ENV !== 'development') {
    console.error(`Refusing to seed: NODE_ENV is "${process.env.NODE_ENV}", expected "development".`)
    process.exit(1)
  }

  const payload = await getPayload({ config })
  let created = 0
  let skipped = 0

  // ---- Site settings, navigation, footer -----------------------------------
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      siteName: 'Tel K. Ganesan',
      positioningLine: 'Executive Chairman | Enterprise Builder | Investor | Producer',
      masterStatement: 'Tel K. Ganesan builds enterprises, leaders, and platforms that turn possibility into lasting value.',
      // Domain is an open Appendix C decision - left unset rather than guessed.
      productionOrigin: '',
      allowIndexing: false,
      privacyPolicyVersion: 'draft-unapproved',
      analytics: { enabled: false },
    },
    overrideAccess: true,
  })

  await payload.updateGlobal({
    slug: 'navigation',
    data: {
      primary: BASELINE_PAGES.filter((p) => p.inPrimaryNav).map((p) => ({
        label: p.title,
        path: p.path,
        pageId: p.pageId,
      })),
    },
    overrideAccess: true,
  })

  await payload.updateGlobal({
    slug: 'footer',
    data: {
      groups: [
        {
          title: 'Explore',
          links: [
            { label: 'About', path: '/about' },
            { label: 'Enterprise & Investments', path: '/enterprise-investments' },
            { label: 'Ideas', path: '/ideas' },
          ],
        },
        {
          title: 'Engage',
          links: [
            { label: 'Film & Culture', path: '/film-culture' },
            { label: 'Impact', path: '/impact' },
            { label: 'Media & Speaking', path: '/media-speaking' },
            { label: 'Connect', path: '/connect' },
          ],
        },
      ],
      // No social destinations are seeded: the baseline requires VERIFIED destinations.
      socialLinks: [],
      legalLine: `© ${new Date().getFullYear()} Tel K. Ganesan. All rights reserved.`,
    },
    overrideAccess: true,
  })
  console.log('globals: site-settings, navigation, footer updated (indexing OFF)')

  // ---- 15 page/template records, all drafts --------------------------------
  for (const page of BASELINE_PAGES) {
    const existing = await payload.find({
      collection: 'pages',
      where: { pageId: { equals: page.pageId } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    })
    if (existing.docs.length > 0) {
      skipped += 1
      continue
    }

    await payload.create({
      collection: 'pages',
      data: {
        title: page.title,
        pageId: page.pageId as never,
        path: page.path,
        purpose: page.purpose,
        ownerRole: 'Editorial Lead',
        baselineNotes: `Seeded from the approved information architecture. Modules: ${page.modules.join(', ')}.`,
        primaryCta: {
          ctaId: page.primaryCtaId,
          label: page.primaryCta,
          destinationType: page.ctaRouteId ? 'inquiry' : 'internal',
          destination: page.ctaRouteId ?? page.path,
        },
        seo: {
          seoId: `SEO-${page.pageId}`,
          title: page.title,
          description: page.purpose,
          noindex: !page.indexable,
        },
        // Drafts only. Nothing is published: no copy has cleared G1.
        _status: 'draft',
      },
      overrideAccess: true,
    })
    created += 1
  }
  console.log(`pages: ${created} created as drafts, ${skipped} already present`)

  // ---- Seven inquiry routes -------------------------------------------------
  let routesCreated = 0
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
        slaTimezone: 'America/Detroit',
        // LOCAL TEST IDENTITIES ONLY. Real owner mailboxes are an open dependency (R-03).
        primaryRecipient: `route-owner+${route.routeId}@localhost.test`,
        backupRecipient: `route-backup+${route.routeId}@localhost.test`,
        acceptanceStatus: 'unassigned',
        escalationCriterion: route.escalationCriterion,
        escalatesToTel: route.escalatesToTel,
        enabled: true,
      },
      overrideAccess: true,
    })
    routesCreated += 1
  }
  console.log(`inquiry-routes: ${routesCreated} created (local test recipients, acceptance 'unassigned')`)

  // ---- High-risk evidence queue, seeded BLOCKED ----------------------------
  let claimsCreated = 0
  for (const claim of HIGH_RISK_CLAIMS) {
    const existing = await payload.find({
      collection: 'claims',
      where: { claimId: { equals: claim.claimId } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    })
    if (existing.docs.length > 0) continue

    await payload.create({
      collection: 'claims',
      data: {
        claimId: claim.claimId,
        exactWording: claim.exactWording,
        qualifier: claim.qualifier,
        riskLevel: 'material',
        verificationOwnerRole: 'Business Owner',
        riskReviewerRole: 'Legal',
        // Blocked, no approved wording, no sources: cannot pass the gate.
        status: 'blocked',
        blockingReason: claim.blockingReason,
      },
      overrideAccess: true,
    })
    claimsCreated += 1
  }
  console.log(`claims: ${claimsCreated} high-risk topics seeded as BLOCKED evidence tasks (not public facts)`)

  console.log('')
  console.log('Seeding complete. Nothing is published; no fake entities, credits or assets were created.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
