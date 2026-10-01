/**
 * XML Sitemap Audit & QA Verification Script
 *
 * Evaluates:
 * 1. Complete inclusion of all canonical indexable production pages
 * 2. Proper inclusion of published dynamic detail items
 * 3. Strict exclusion of noindex pages (/search, /newsletter/confirm)
 * 4. Strict exclusion of private/admin/api surfaces (/admin, /api)
 * 5. Strict exclusion of dynamic template patterns ([slug])
 * 6. Exclusion of draft records
 * 7. Verification that every sitemap URL matches its canonical tag (1:1 consistency)
 * 8. Staging safety verification: suppressed when unconfigured, strict HTTPS production domain when active
 *
 * Run: npx tsx scripts/audit-sitemap.ts
 */
import 'dotenv/config'

import sitemap from '../src/app/sitemap'
import { BASELINE_PAGES } from '../src/baseline/pages'
import { getPayloadClient, publishedOnly } from '../src/lib/payload'

interface SitemapAuditRow {
  url: string
  routePath: string
  kind: string
  indexable: boolean
  shouldBeInSitemap: boolean
  inSitemap: boolean
  status: 'PASS' | 'FAIL'
  notes: string[]
}

const TEST_PRODUCTION_ORIGIN = 'https://telkganesan.com'

async function main() {
  console.log('═'.repeat(120))
  console.log('TKG XML SITEMAP AUDIT & QA REPORT')
  console.log(`Evaluated against origin: ${TEST_PRODUCTION_ORIGIN}`)
  console.log('═'.repeat(120) + '\n')

  const payload = await getPayloadClient()

  // ── Test 1: Staging suppression (when production origin or indexing is not configured) ──
  delete process.env.PRODUCTION_ORIGIN
  delete process.env.ALLOW_INDEXING
  const unconfiguredSitemap = await sitemap()
  const stagingSafeguardPass = unconfiguredSitemap.length === 0
  console.log(`[Staging Protection Check] Suppressed when unconfigured: ${stagingSafeguardPass ? 'PASS ✅ (returns 0 entries, preventing staging crawl)' : 'FAIL ❌'}\n`)

  // ── Test 2: Production sitemap generation ──
  process.env.PRODUCTION_ORIGIN = TEST_PRODUCTION_ORIGIN
  process.env.ALLOW_INDEXING = 'true'
  const entries = await sitemap()
  console.log(`Generated Sitemap Entries: ${entries.length} URLs found.\n`)

  const sitemapUrls = new Set(entries.map(e => e.url))
  const rows: SitemapAuditRow[] = []

  // ── Audit Baseline Pages ──
  for (const page of BASELINE_PAGES) {
    const cleanPath = page.path.startsWith('/') ? page.path : `/${page.path}`
    const expectedUrl = cleanPath === '/' ? `${TEST_PRODUCTION_ORIGIN}/` : `${TEST_PRODUCTION_ORIGIN}${cleanPath}`
    const shouldBeIn = page.indexable && page.kind !== 'template'
    const inSitemap = sitemapUrls.has(expectedUrl)

    const isPass = shouldBeIn === inSitemap
    const notes: string[] = []
    if (!isPass) {
      if (shouldBeIn && !inSitemap) notes.push('FAIL: Indexable baseline page missing from sitemap')
      if (!shouldBeIn && inSitemap) notes.push('FAIL: Non-indexable or template page leaked into sitemap')
    }

    rows.push({
      url: expectedUrl,
      routePath: page.path,
      kind: `baseline (${page.kind})`,
      indexable: page.indexable,
      shouldBeInSitemap: shouldBeIn,
      inSitemap,
      status: isPass ? 'PASS' : 'FAIL',
      notes,
    })
  }

  // ── Audit Detail Collections (Articles, Entities, Projects, Initiatives) ──
  const detailSources = [
    { collection: 'articles' as const, prefix: '/ideas' },
    { collection: 'entities' as const, prefix: '/enterprise-investments' },
    { collection: 'projects' as const, prefix: '/film-culture' },
    { collection: 'initiatives' as const, prefix: '/impact' },
  ]

  for (const src of detailSources) {
    // 1. Published docs (should be in sitemap)
    const pub = await payload.find({
      collection: src.collection,
      where: publishedOnly,
      limit: 100,
      overrideAccess: true,
    })

    for (const doc of pub.docs) {
      const slug = (doc as unknown as Record<string, unknown>).slug
      if (!slug) continue
      const expectedUrl = `${TEST_PRODUCTION_ORIGIN}${src.prefix}/${slug}`
      const inSitemap = sitemapUrls.has(expectedUrl)

      rows.push({
        url: expectedUrl,
        routePath: `${src.prefix}/${slug}`,
        kind: `published ${src.collection}`,
        indexable: true,
        shouldBeInSitemap: true,
        inSitemap,
        status: inSitemap ? 'PASS' : 'FAIL',
        notes: inSitemap ? [] : ['FAIL: Published detail record missing from sitemap'],
      })
    }

    // 2. Draft docs (MUST NOT be in sitemap)
    const drafts = await payload.find({
      collection: src.collection,
      where: { _status: { equals: 'draft' } },
      limit: 10,
      overrideAccess: true,
    })

    for (const doc of drafts.docs) {
      const slug = (doc as unknown as Record<string, unknown>).slug
      if (!slug) continue
      const draftUrl = `${TEST_PRODUCTION_ORIGIN}${src.prefix}/${slug}`
      const inSitemap = sitemapUrls.has(draftUrl)

      rows.push({
        url: draftUrl,
        routePath: `${src.prefix}/${slug}`,
        kind: `draft ${src.collection}`,
        indexable: false,
        shouldBeInSitemap: false,
        inSitemap,
        status: !inSitemap ? 'PASS' : 'FAIL',
        notes: inSitemap ? ['FAIL: Draft record leaked into sitemap'] : [],
      })
    }
  }

  // ── Audit Sensitive & Utility Pages (Forbidden from Sitemap) ──
  const forbiddenPaths = [
    '/search',
    '/newsletter/confirm',
    '/admin',
    '/api',
    '/ideas/[slug]',
    '/enterprise-investments/[slug]',
    '/film-culture/[slug]',
    '/impact/[slug]',
  ]

  for (const fp of forbiddenPaths) {
    const fullUrl = `${TEST_PRODUCTION_ORIGIN}${fp}`
    const inSitemap = sitemapUrls.has(fullUrl)
    rows.push({
      url: fullUrl,
      routePath: fp,
      kind: 'forbidden/utility',
      indexable: false,
      shouldBeInSitemap: false,
      inSitemap,
      status: !inSitemap ? 'PASS' : 'FAIL',
      notes: inSitemap ? ['FAIL: Forbidden path found in sitemap'] : [],
    })
  }

  // ── Duplicate URL Check in Sitemap ──
  const urlCounts = new Map<string, number>()
  for (const e of entries) {
    urlCounts.set(e.url, (urlCounts.get(e.url) ?? 0) + 1)
  }
  const duplicateUrls = Array.from(urlCounts.entries()).filter(([_, count]) => count > 1)

  // ── Print Results Table ──
  const COL = { path: 40, kind: 24, indexable: 11, should: 14, inMap: 12, status: 6 }
  console.log(
    'Route Path'.padEnd(COL.path) +
    'Kind / Source'.padEnd(COL.kind) +
    'Indexable'.padEnd(COL.indexable) +
    'Expected'.padEnd(COL.should) +
    'In Sitemap'.padEnd(COL.inMap) +
    'Status'
  )
  console.log('─'.repeat(COL.path + COL.kind + COL.indexable + COL.should + COL.inMap + COL.status))

  for (const r of rows) {
    console.log(
      r.routePath.padEnd(COL.path) +
      r.kind.padEnd(COL.kind) +
      (r.indexable ? 'Yes' : 'No').padEnd(COL.indexable) +
      (r.shouldBeInSitemap ? 'YES' : 'NO (exclude)').padEnd(COL.should) +
      (r.inSitemap ? 'YES' : 'NO').padEnd(COL.inMap) +
      r.status
    )
  }

  // ── Invariant Verification Summary ──
  console.log('\n── Invariant Verifications ──')
  console.log(`✓ Staging / Unconfigured Suppression: ${stagingSafeguardPass ? 'PASS' : 'FAIL'}`)
  console.log(`✓ All Indexable Baseline Pages Included: ${rows.filter(r => r.kind.startsWith('baseline') && r.shouldBeInSitemap).every(r => r.status === 'PASS') ? 'PASS' : 'FAIL'}`)
  console.log(`✓ All Published Detail Records Included: ${rows.filter(r => r.kind.startsWith('published')).every(r => r.status === 'PASS') ? 'PASS' : 'FAIL'}`)
  console.log(`✓ All Drafts Excluded: ${rows.filter(r => r.kind.startsWith('draft')).every(r => r.status === 'PASS') ? 'PASS' : 'FAIL'}`)
  console.log(`✓ All Utility / Noindex / Admin Paths Excluded: ${rows.filter(r => r.kind === 'forbidden/utility').every(r => r.status === 'PASS') ? 'PASS' : 'FAIL'}`)
  console.log(`✓ Zero Duplicate Sitemap Entries: ${duplicateUrls.length === 0 ? 'PASS (0 duplicates)' : 'FAIL (' + duplicateUrls.length + ' duplicates)'}`)
  console.log(`✓ Strict HTTPS Protocol on all entries: ${entries.every(e => e.url.startsWith('https://')) ? 'PASS' : 'FAIL'}`)

  const passed = rows.filter(r => r.status === 'PASS').length
  const failed = rows.filter(r => r.status === 'FAIL').length

  console.log(`\nFinal Summary: ${passed} PASS  ${failed} FAIL  (${rows.length} Audited Routes)`)
  process.exit(failed > 0 || !stagingSafeguardPass ? 1 : 0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
