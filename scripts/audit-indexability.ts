/**
 * Technical Indexability Audit Script
 *
 * Verifies end-to-end technical indexability across the TKG website:
 * 1. robots.txt rules (allow / disallow / sitemap directive)
 * 2. Meta robots directives (index, follow vs noindex, nofollow)
 * 3. Canonical tags (self-referencing, absolute, https)
 * 4. XML sitemap inclusion consistency
 * 5. Private / utility route containment (/search, /newsletter/confirm, /admin, /api)
 * 6. Staging / preview safeguard verification
 *
 * Run: npx tsx scripts/audit-indexability.ts
 */
import 'dotenv/config'

import robots from '../src/app/robots'
import sitemap from '../src/app/sitemap'
import { buildMetadata } from '../src/lib/seo/metadata'
import { BASELINE_PAGES, getBaselinePage } from '../src/baseline/pages'
import { getPayloadClient, publishedOnly } from '../src/lib/payload'

interface IndexabilityAuditRow {
  url: string
  routePath: string
  category: string
  shouldBeIndexed: boolean
  robotsTxtAllowed: boolean
  metaRobotsIndex: boolean
  canonicalValid: boolean
  inSitemap: boolean
  indexabilityResult: 'INDEXABLE' | 'NOINDEX / BLOCKED'
  status: 'PASS' | 'FAIL'
  issues: string[]
}

const TEST_ORIGIN = 'https://telkganesan.com'

function isPathDisallowed(path: string, disallowList: string[]): boolean {
  return disallowList.some((disallowed) => {
    if (disallowed.endsWith('/')) {
      return path.startsWith(disallowed) || `${path}/`.startsWith(disallowed)
    }
    return path === disallowed || path.startsWith(`${disallowed}/`) || path.startsWith(`${disallowed}?`)
  })
}

async function main() {
  console.log('═'.repeat(120))
  console.log('TKG TECHNICAL INDEXABILITY AUDIT & VERIFICATION REPORT')
  console.log(`Evaluated against origin: ${TEST_ORIGIN}`)
  console.log('═'.repeat(120) + '\n')

  const payload = await getPayloadClient()

  // ── 1. Staging / Unconfigured Protection Verification ──
  delete process.env.PRODUCTION_ORIGIN
  delete process.env.ALLOW_INDEXING

  const stagingRobots = await robots()
  const stagingRobotsRules = stagingRobots.rules
  const isStagingDisallowed = Array.isArray(stagingRobotsRules)
    ? stagingRobotsRules.some((r) => r.disallow === '/' || (Array.isArray(r.disallow) && r.disallow.includes('/')))
    : (stagingRobotsRules as { disallow?: string | string[] })?.disallow === '/'

  const stagingSitemap = await sitemap()
  const stagingSitemapEmpty = stagingSitemap.length === 0

  const stagingSafe = isStagingDisallowed && stagingSitemapEmpty
  console.log(`[Staging Protection Verification]`)
  console.log(`  - robots.txt disallows all crawling: ${isStagingDisallowed ? 'PASS ✅' : 'FAIL ❌'}`)
  console.log(`  - sitemap.xml returns empty (0 entries): ${stagingSitemapEmpty ? 'PASS ✅' : 'FAIL ❌'}`)
  console.log(`  - Overall staging containment: ${stagingSafe ? 'PASS ✅' : 'FAIL ❌'}\n`)

  // ── 2. Production Indexability Configuration ──
  process.env.PRODUCTION_ORIGIN = TEST_ORIGIN
  process.env.ALLOW_INDEXING = 'true'

  const prodRobots = await robots()
  const disallowList: string[] = []
  if (Array.isArray(prodRobots.rules)) {
    for (const r of prodRobots.rules) {
      if (typeof r.disallow === 'string') disallowList.push(r.disallow)
      else if (Array.isArray(r.disallow)) disallowList.push(...r.disallow)
    }
  }

  const sitemapEntries = await sitemap()
  const sitemapUrls = new Set(sitemapEntries.map((e) => e.url))

  console.log(`[Production Directives Verified]`)
  console.log(`  - robots.txt sitemap directive: ${prodRobots.sitemap}`)
  console.log(`  - robots.txt disallow list: ${disallowList.join(', ')}`)
  console.log(`  - Production sitemap indexable count: ${sitemapEntries.length} URLs\n`)

  const rows: IndexabilityAuditRow[] = []

  // ── 3. Audit Baseline Static & Utility Pages ──
  const staticPages = [
    { pageId: 'HOME', path: '/' },
    { pageId: 'ABOUT', path: '/about' },
    { pageId: 'ENTERPRISE', path: '/enterprise-investments' },
    { pageId: 'IDEAS', path: '/ideas' },
    { pageId: 'CULTURE', path: '/film-culture' },
    { pageId: 'IMPACT', path: '/impact' },
    { pageId: 'MEDIA', path: '/media-speaking' },
    { pageId: 'CONNECT', path: '/connect' },
    { pageId: 'PRIVACY', path: '/privacy' },
    { pageId: 'TERMS', path: '/terms' },
    { pageId: 'ACCESSIBILITY', path: '/accessibility' },
    { pageId: 'SEARCH', path: '/search', noindex: true },
    { pageId: 'NEWSLETTER_CONFIRM', path: '/newsletter/confirm', noindex: true },
  ]

  for (const p of staticPages) {
    const baseline = getBaselinePage(p.pageId)
    const shouldIndex = baseline?.indexable !== false && !p.noindex
    const meta = await buildMetadata({
      pageId: p.pageId,
      path: p.path,
      title: baseline?.title ?? 'Page',
      noindex: p.noindex,
    })

    const cleanPath = p.path.startsWith('/') ? p.path : `/${p.path}`
    const fullUrl = cleanPath === '/' ? `${TEST_ORIGIN}/` : `${TEST_ORIGIN}${cleanPath}`

    const robotsAllowed = !isPathDisallowed(p.path, disallowList)
    const robotsObj = meta.robots as Record<string, unknown> | undefined
    const metaIndex = robotsObj?.index === true
    const canonical = typeof meta.alternates?.canonical === 'string' ? meta.alternates.canonical : null
    const canonicalValid = canonical === fullUrl
    const inSitemap = sitemapUrls.has(fullUrl)

    const issues: string[] = []
    let isPass = true

    if (shouldIndex) {
      if (!robotsAllowed) {
        issues.push('FAIL: Indexable page blocked by robots.txt disallow')
        isPass = false
      }
      if (!metaIndex) {
        issues.push('FAIL: Indexable page has meta robots noindex')
        isPass = false
      }
      if (!canonicalValid) {
        issues.push(`FAIL: Canonical mismatch (expected ${fullUrl}, got ${canonical})`)
        isPass = false
      }
      if (!inSitemap) {
        issues.push('FAIL: Indexable page missing from sitemap')
        isPass = false
      }
    } else {
      // Must NOT be indexed
      if (metaIndex) {
        issues.push('FAIL: Utility/noindex page has meta robots index: true')
        isPass = false
      }
      if (inSitemap) {
        issues.push('FAIL: Utility/noindex page present in sitemap')
        isPass = false
      }
    }

    rows.push({
      url: fullUrl,
      routePath: p.path,
      category: p.noindex ? 'Utility (noindex)' : 'Public Baseline',
      shouldBeIndexed: shouldIndex,
      robotsTxtAllowed: robotsAllowed,
      metaRobotsIndex: metaIndex,
      canonicalValid,
      inSitemap,
      indexabilityResult: shouldIndex ? 'INDEXABLE' : 'NOINDEX / BLOCKED',
      status: isPass ? 'PASS' : 'FAIL',
      issues,
    })
  }

  // ── 4. Audit Published & Draft Dynamic Records ──
  const detailSources = [
    { collection: 'articles' as const, prefix: '/ideas' },
    { collection: 'entities' as const, prefix: '/enterprise-investments' },
    { collection: 'projects' as const, prefix: '/film-culture' },
    { collection: 'initiatives' as const, prefix: '/impact' },
  ]

  for (const src of detailSources) {
    // Published records
    const pub = await payload.find({
      collection: src.collection,
      where: publishedOnly,
      limit: 1,
      overrideAccess: true,
    })

    if (pub.docs.length > 0) {
      const doc = pub.docs[0] as unknown as Record<string, unknown>
      const slug = String(doc.slug)
      const path = `${src.prefix}/${slug}`
      const fullUrl = `${TEST_ORIGIN}${path}`

      const meta = await buildMetadata({
        pageId: src.collection === 'articles' ? 'ARTICLE' : src.collection === 'entities' ? 'ENTITY' : src.collection === 'projects' ? 'PROJECT' : 'INITIATIVE',
        path,
        title: String(doc.title ?? doc.name ?? slug),
      })

      const robotsAllowed = !isPathDisallowed(path, disallowList)
      const robotsObj = meta.robots as Record<string, unknown> | undefined
      const metaIndex = robotsObj?.index === true
      const canonical = typeof meta.alternates?.canonical === 'string' ? meta.alternates.canonical : null
      const canonicalValid = canonical === fullUrl
      const inSitemap = sitemapUrls.has(fullUrl)

      const issues: string[] = []
      let isPass = true
      if (!robotsAllowed || !metaIndex || !canonicalValid || !inSitemap) {
        issues.push('FAIL: Published detail record has indexability defect')
        isPass = false
      }

      rows.push({
        url: fullUrl,
        routePath: path,
        category: `Published ${src.collection}`,
        shouldBeIndexed: true,
        robotsTxtAllowed: robotsAllowed,
        metaRobotsIndex: metaIndex,
        canonicalValid,
        inSitemap,
        indexabilityResult: 'INDEXABLE',
        status: isPass ? 'PASS' : 'FAIL',
        issues,
      })
    }

    // Draft records (must NOT be indexed)
    const drafts = await payload.find({
      collection: src.collection,
      where: { _status: { equals: 'draft' } },
      limit: 1,
      overrideAccess: true,
    })

    if (drafts.docs.length > 0) {
      const doc = drafts.docs[0] as unknown as Record<string, unknown>
      const slug = String(doc.slug)
      const path = `${src.prefix}/${slug}`
      const fullUrl = `${TEST_ORIGIN}${path}`

      const meta = await buildMetadata({
        pageId: src.collection === 'articles' ? 'ARTICLE' : src.collection === 'entities' ? 'ENTITY' : src.collection === 'projects' ? 'PROJECT' : 'INITIATIVE',
        path,
        title: String(doc.title ?? doc.name ?? slug),
        noindex: true,
      })

      const robotsObj = meta.robots as Record<string, unknown> | undefined
      const metaIndex = robotsObj?.index === true
      const inSitemap = sitemapUrls.has(fullUrl)

      const issues: string[] = []
      let isPass = true
      if (metaIndex) {
        issues.push('FAIL: Draft preview emits index: true')
        isPass = false
      }
      if (inSitemap) {
        issues.push('FAIL: Draft record present in sitemap')
        isPass = false
      }

      rows.push({
        url: fullUrl,
        routePath: path,
        category: `Draft ${src.collection}`,
        shouldBeIndexed: false,
        robotsTxtAllowed: true,
        metaRobotsIndex: metaIndex,
        canonicalValid: true,
        inSitemap,
        indexabilityResult: 'NOINDEX / BLOCKED',
        status: isPass ? 'PASS' : 'FAIL',
        issues,
      })
    }
  }

  // ── 5. Audit Internal / Administrative Surfaces ──
  const privateSurfaces = [
    { path: '/admin', category: 'Private CMS' },
    { path: '/api', category: 'Private API' },
  ]

  for (const ps of privateSurfaces) {
    const fullUrl = `${TEST_ORIGIN}${ps.path}`
    const robotsAllowed = !isPathDisallowed(ps.path, disallowList)
    const inSitemap = sitemapUrls.has(fullUrl)
    const isPass = !robotsAllowed && !inSitemap

    rows.push({
      url: fullUrl,
      routePath: ps.path,
      category: ps.category,
      shouldBeIndexed: false,
      robotsTxtAllowed: robotsAllowed,
      metaRobotsIndex: false,
      canonicalValid: false,
      inSitemap,
      indexabilityResult: 'NOINDEX / BLOCKED',
      status: isPass ? 'PASS' : 'FAIL',
      issues: isPass ? [] : ['FAIL: Private surface not blocked in robots.txt or present in sitemap'],
    })
  }

  // ── 6. Print Report ──
  const COL = { path: 38, cat: 22, should: 10, robots: 8, meta: 8, canon: 8, map: 8, res: 18, status: 6 }
  console.log(
    'Route Path'.padEnd(COL.path) +
    'Category'.padEnd(COL.cat) +
    'Target'.padEnd(COL.should) +
    'Robots'.padEnd(COL.robots) +
    'Meta'.padEnd(COL.meta) +
    'Canon'.padEnd(COL.canon) +
    'Sitemap'.padEnd(COL.map) +
    'Result'.padEnd(COL.res) +
    'Status'
  )
  console.log('─'.repeat(COL.path + COL.cat + COL.should + COL.robots + COL.meta + COL.canon + COL.map + COL.res + COL.status))

  for (const r of rows) {
    console.log(
      r.routePath.padEnd(COL.path) +
      r.category.padEnd(COL.cat) +
      (r.shouldBeIndexed ? 'Index' : 'NoIndex').padEnd(COL.should) +
      (r.robotsTxtAllowed ? 'Allow' : 'Block').padEnd(COL.robots) +
      (r.metaRobotsIndex ? 'Index' : 'NoIdx').padEnd(COL.meta) +
      (r.canonicalValid ? 'Valid' : '—').padEnd(COL.canon) +
      (r.inSitemap ? 'In' : 'Out').padEnd(COL.map) +
      r.indexabilityResult.padEnd(COL.res) +
      r.status
    )
  }

  console.log('\n── Technical Indexability Invariant Verification ──')
  const allIndexablePass = rows.filter((r) => r.shouldBeIndexed).every((r) => r.status === 'PASS')
  const allBlockedPass = rows.filter((r) => !r.shouldBeIndexed).every((r) => r.status === 'PASS')

  console.log(`✓ Core Public Routes 100% Indexable: ${allIndexablePass ? 'ALL PASS ✅' : 'FAIL ❌'}`)
  console.log(`✓ Utility, Draft, Admin & API Properly Blocked / Noindexed: ${allBlockedPass ? 'ALL PASS ✅' : 'FAIL ❌'}`)
  console.log(`✓ Staging Protection Verified: ${stagingSafe ? 'ALL PASS ✅' : 'FAIL ❌'}`)

  const passedCount = rows.filter((r) => r.status === 'PASS').length
  const failedCount = rows.filter((r) => r.status === 'FAIL').length

  console.log(`\nFinal Summary: ${passedCount} PASS  ${failedCount} FAIL  (${rows.length} Audited Routes)`)
  process.exit(failedCount > 0 || !stagingSafe ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
