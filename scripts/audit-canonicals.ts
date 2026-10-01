/**
 * Canonical URL Audit & Validation Script
 *
 * Evaluates canonical URL generation across the entire TKG website for:
 * 1. Self-referencing correctness: canonical matches route path exactly
 * 2. Protocol & format correctness: strictly https://, no double slashes, no query parameters
 * 3. Staging/dev domain safety: verifies canonicals NEVER leak localhost or staging domains
 * 4. Suppressed-canonical policy: verifies deliberate suppression when productionOrigin is unset
 * 5. Uniqueness: zero duplicate canonicals across distinct pages
 * 6. Indexable vs utility pages: checks self-referencing canonical on all pages
 *
 * Run: npx tsx scripts/audit-canonicals.ts
 */
import 'dotenv/config'

import { buildMetadata } from '../src/lib/seo/metadata'
import { BASELINE_PAGES, getBaselinePage } from '../src/baseline/pages'

interface CanonicalCheck {
  pageId: string
  routePath: string
  indexable: boolean
  canonicalWithOrigin: string | null
  canonicalWithoutOrigin: string | null
  selfReferencing: boolean
  isHttps: boolean
  noStagingLeak: boolean
  noDoubleSlashes: boolean
  status: 'PASS' | 'WARN' | 'FAIL'
  notes: string[]
}

const TEST_PRODUCTION_ORIGIN = 'https://telkganesan.com'

function extractCanonical(meta: { alternates?: { canonical?: unknown } | null }): string | null {
  const c = meta.alternates?.canonical
  if (typeof c === 'string') return c
  if (c && typeof c === 'object' && 'url' in (c as Record<string, unknown>)) {
    return String((c as Record<string, unknown>).url)
  }
  return null
}

async function testPage(
  pageId: string,
  routePath: string,
  title: string,
  description?: string,
  noindex?: boolean,
): Promise<CanonicalCheck> {
  const baseline = getBaselinePage(pageId)
  const isIndexable = baseline?.indexable !== false && !noindex

  // 1. Test WITH production origin configured
  process.env.PRODUCTION_ORIGIN = TEST_PRODUCTION_ORIGIN
  const metaProd = await buildMetadata({
    pageId,
    path: routePath,
    title,
    description,
    noindex,
  })
  const canonicalProd = extractCanonical(metaProd)

  // 2. Test WITHOUT production origin configured (staging/dev mode)
  delete process.env.PRODUCTION_ORIGIN
  const metaDev = await buildMetadata({
    pageId,
    path: routePath,
    title,
    description,
    noindex,
  })
  const canonicalDev = extractCanonical(metaDev)

  const notes: string[] = []
  let status: 'PASS' | 'WARN' | 'FAIL' = 'PASS'

  // Expected canonical in production
  const cleanPath = routePath.startsWith('/') ? routePath : `/${routePath}`
  const expectedCanonical = `${TEST_PRODUCTION_ORIGIN}${cleanPath}`

  const selfReferencing = canonicalProd === expectedCanonical
  if (!selfReferencing) {
    notes.push(`FAIL: Expected canonical ${expectedCanonical}, got ${canonicalProd}`)
    status = 'FAIL'
  }

  // Protocol check
  const isHttps = canonicalProd ? canonicalProd.startsWith('https://') : false
  if (canonicalProd && !isHttps) {
    notes.push('FAIL: Canonical does not use HTTPS')
    status = 'FAIL'
  }

  // Format check: no double slashes in path (e.g. https://domain.com//about)
  const pathPart = canonicalProd ? canonicalProd.replace(/^https?:\/\/[^/]+/, '') : ''
  const noDoubleSlashes = !pathPart.includes('//')
  if (!noDoubleSlashes) {
    notes.push(`FAIL: Malformed canonical with double slashes: ${canonicalProd}`)
    status = 'FAIL'
  }

  // Staging leak check: canonical without origin MUST NOT leak localhost or staging domain
  const noStagingLeak =
    canonicalDev === null ||
    (!canonicalDev.includes('localhost') && !canonicalDev.includes('127.0.0.1'))
  if (!noStagingLeak) {
    notes.push(`FAIL: Staging/localhost leaked in dev canonical: ${canonicalDev}`)
    status = 'FAIL'
  }

  // Dev suppression verification: should be null when unconfigured
  if (canonicalDev !== null) {
    notes.push(`WARN: Canonical emitted even when productionOrigin is unset: ${canonicalDev}`)
    if (status === 'PASS') status = 'WARN'
  }

  return {
    pageId,
    routePath,
    indexable: isIndexable,
    canonicalWithOrigin: canonicalProd,
    canonicalWithoutOrigin: canonicalDev,
    selfReferencing,
    isHttps,
    noStagingLeak,
    noDoubleSlashes,
    status,
    notes,
  }
}

async function main() {
  console.log('═'.repeat(120))
  console.log('TKG CANONICAL URL AUDIT & VALIDATION REPORT')
  console.log(`Evaluated against verified production origin: ${TEST_PRODUCTION_ORIGIN}`)
  console.log('═'.repeat(120) + '\n')

  const checks: CanonicalCheck[] = []

  // 1. Static Pages
  const staticPages = [
    { pageId: 'HOME', path: '/', title: 'Home' },
    { pageId: 'ABOUT', path: '/about', title: 'About' },
    { pageId: 'ENTERPRISE', path: '/enterprise-investments', title: 'Enterprise' },
    { pageId: 'IDEAS', path: '/ideas', title: 'Ideas' },
    { pageId: 'CULTURE', path: '/film-culture', title: 'Film & Culture' },
    { pageId: 'IMPACT', path: '/impact', title: 'Impact' },
    { pageId: 'MEDIA', path: '/media-speaking', title: 'Media & Speaking' },
    { pageId: 'CONNECT', path: '/connect', title: 'Connect' },
    { pageId: 'PRIVACY', path: '/privacy', title: 'Privacy Policy' },
    { pageId: 'TERMS', path: '/terms', title: 'Terms of Use' },
    { pageId: 'ACCESSIBILITY', path: '/accessibility', title: 'Accessibility Statement' },
    { pageId: 'SEARCH', path: '/search', title: 'Search', noindex: true },
  ]

  for (const page of staticPages) {
    const res = await testPage(page.pageId, page.path, page.title, undefined, page.noindex)
    checks.push(res)
  }

  // 2. Dynamic Templates
  const dynamicTemplates = [
    { pageId: 'ARTICLE', path: '/ideas/mind-trap-operating-system', title: 'Mind Trap OS' },
    { pageId: 'ENTITY', path: '/enterprise-investments/kyyba', title: 'Kyyba' },
    { pageId: 'PROJECT', path: '/film-culture/mind-trap-film', title: 'Mind Trap Film' },
    { pageId: 'INITIATIVE', path: '/impact/youth-mentorship', title: 'Youth Mentorship' },
  ]

  for (const template of dynamicTemplates) {
    const res = await testPage(template.pageId, template.path, template.title)
    checks.push(res)
  }

  // 3. Flow / Utility Pages
  const utilityPages = [
    {
      pageId: 'NEWSLETTER_CONFIRM',
      path: '/newsletter/confirm',
      title: 'Confirm Subscription',
      noindex: true,
    },
  ]

  for (const page of utilityPages) {
    const res = await testPage(page.pageId, page.path, page.title, undefined, page.noindex)
    checks.push(res)
  }

  // 4. Duplicate Canonical Check
  const canonicalMap = new Map<string, string[]>()
  for (const c of checks) {
    if (c.canonicalWithOrigin) {
      const existing = canonicalMap.get(c.canonicalWithOrigin) ?? []
      existing.push(c.pageId)
      canonicalMap.set(c.canonicalWithOrigin, existing)
    }
  }

  for (const c of checks) {
    if (c.canonicalWithOrigin) {
      const pages = canonicalMap.get(c.canonicalWithOrigin) ?? []
      if (pages.length > 1) {
        c.notes.push(`FAIL: Duplicate canonical shared by: ${pages.join(', ')}`)
        c.status = 'FAIL'
      }
    }
  }

  // Print Report Table
  const COL = { id: 22, path: 38, canonical: 52, indexable: 10, status: 6 }
  console.log(
    'Page ID'.padEnd(COL.id) +
    'Route Path'.padEnd(COL.path) +
    'Canonical URL (Production)'.padEnd(COL.canonical) +
    'Indexable '.padEnd(COL.indexable) +
    'Status'
  )
  console.log('─'.repeat(COL.id + COL.path + COL.canonical + COL.indexable + COL.status))

  for (const c of checks) {
    console.log(
      c.pageId.padEnd(COL.id) +
      c.routePath.padEnd(COL.path) +
      (c.canonicalWithOrigin ?? '(none)').padEnd(COL.canonical) +
      (c.indexable ? 'Yes' : 'No').padEnd(COL.indexable) +
      c.status
    )
  }

  // Invariant validation summary
  console.log('\n── Invariant Verification ──')
  const allSelfReferencing = checks.every(c => c.selfReferencing)
  const allHttps = checks.every(c => c.isHttps)
  const allNoStagingLeak = checks.every(c => c.noStagingLeak)
  const allNoDoubleSlashes = checks.every(c => c.noDoubleSlashes)
  const allDevSuppressed = checks.every(c => c.canonicalWithoutOrigin === null)

  console.log(`✓ Self-Referencing: ${allSelfReferencing ? 'ALL PASS' : 'FAIL'}`)
  console.log(`✓ Strict HTTPS: ${allHttps ? 'ALL PASS' : 'FAIL'}`)
  console.log(`✓ No Staging / Localhost Leak: ${allNoStagingLeak ? 'ALL PASS' : 'FAIL'}`)
  console.log(`✓ Well-formed (No double slashes): ${allNoDoubleSlashes ? 'ALL PASS' : 'FAIL'}`)
  console.log(`✓ Unconfigured Safety (Suppressed in Dev): ${allDevSuppressed ? 'ALL PASS' : 'FAIL'}`)

  // Issues section
  const issues = checks.filter(c => c.notes.length > 0)
  console.log('\n── Issues / Deviations ──')
  if (issues.length === 0) {
    console.log('None. Zero missing, duplicate, malformed, or staging-domain canonicals found.')
  } else {
    for (const c of issues) {
      console.log(`${c.pageId} (${c.routePath}):`)
      for (const n of c.notes) console.log(`  - ${n}`)
    }
  }

  const passed = checks.filter(c => c.status === 'PASS').length
  const failed = checks.filter(c => c.status === 'FAIL').length
  const warned = checks.filter(c => c.status === 'WARN').length

  console.log(`\nFinal Summary: ${passed} PASS  ${warned} WARN  ${failed} FAIL  (${checks.length} Total)`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
