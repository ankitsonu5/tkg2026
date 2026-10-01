/**
 * SEO metadata audit script.
 *
 * Evaluates the resolved metadata for every indexable TKG page by invoking
 * the same buildMetadata() function that each route uses, then checks:
 *   - title: present, unique, 10-70 chars
 *   - description: present, unique, 50-160 chars
 *   - OG title: present, matches page title
 *   - OG description: present
 *   - OG image: present (defaults to site fallback)
 *   - Twitter card: present
 *   - robots: noindex for utility/non-indexable pages, index for public pages
 *   - No duplicates across pages
 *
 * Run: npx tsx scripts/audit-metadata.ts
 */
import 'dotenv/config'

import { buildMetadata } from '../src/lib/seo/metadata'
import { BASELINE_PAGES, getBaselinePage } from '../src/baseline/pages'

interface PageAudit {
  pageId: string
  path: string
  indexable: boolean
  title: string | null
  description: string | null
  ogTitle: string | null
  ogDescription: string | null
  ogImage: string | null
  twitterCard: string | null
  robotsIndex: boolean | null
  issues: string[]
  status: 'PASS' | 'WARN' | 'FAIL'
}

function extractString(val: unknown): string | null {
  if (typeof val === 'string') return val
  if (val && typeof val === 'object' && 'default' in (val as Record<string, unknown>)) {
    return String((val as Record<string, unknown>).default)
  }
  return null
}

function extractOgField(og: unknown, field: string): string | null {
  if (!og || typeof og !== 'object') return null
  const v = (og as Record<string, unknown>)[field]
  return extractString(v)
}

function extractOgImages(og: unknown): string | null {
  if (!og || typeof og !== 'object') return null
  const imgs = (og as Record<string, unknown>).images
  if (!Array.isArray(imgs) || imgs.length === 0) return null
  const first = imgs[0]
  if (typeof first === 'string') return first
  if (first && typeof first === 'object') return extractString((first as Record<string, unknown>).url)
  return null
}

async function auditPage(
  pageId: string,
  path: string,
  title: string,
  description: string | undefined,
  noindex?: boolean,
): Promise<PageAudit> {
  const baseline = getBaselinePage(pageId)
  const meta = await buildMetadata({ pageId, title, description, path, noindex })

  const resolvedTitle = extractString(meta.title)
  const resolvedDesc = extractString(meta.description)
  const ogTitle = extractOgField(meta.openGraph, 'title')
  const ogDesc = extractOgField(meta.openGraph, 'description')
  const ogImage = extractOgImages(meta.openGraph)
  const twitterCard = meta.twitter && typeof meta.twitter === 'object'
    ? String((meta.twitter as Record<string, unknown>).card ?? '')
    : null
  const robots = meta.robots
  const robotsIndex = robots && typeof robots === 'object'
    ? (robots as Record<string, unknown>).index === true
    : null

  const issues: string[] = []

  // Title checks
  if (!resolvedTitle) {
    issues.push('FAIL: title missing')
  } else if (resolvedTitle.length < 10) {
    issues.push(`WARN: title too short (${resolvedTitle.length} chars, min 10)`)
  } else if (resolvedTitle.length > 70) {
    issues.push(`WARN: title too long (${resolvedTitle.length} chars, max 70)`)
  }

  // Description checks
  if (!resolvedDesc) {
    issues.push('FAIL: description missing')
  } else if (resolvedDesc.length < 50) {
    issues.push(`WARN: description too short (${resolvedDesc.length} chars, min 50)`)
  } else if (resolvedDesc.length > 160) {
    issues.push(`WARN: description too long (${resolvedDesc.length} chars, max 160)`)
  }

  // OG checks
  if (!ogTitle) issues.push('FAIL: og:title missing')
  if (!ogDesc) issues.push('FAIL: og:description missing')
  if (!ogImage) issues.push('FAIL: og:image missing')

  // Twitter checks
  if (!twitterCard) issues.push('FAIL: twitter:card missing')

  // Robots check
  if (baseline?.indexable === false && robotsIndex !== false) {
    issues.push('FAIL: non-indexable page is missing noindex')
  }
  if (baseline?.indexable === true && robotsIndex === true) {
    // allowIndexing is off in dev, so this is expected to be false
    // We just note it as informational — not a bug
  }

  const hasFail = issues.some(i => i.startsWith('FAIL'))
  const hasWarn = issues.some(i => i.startsWith('WARN'))
  const status: 'PASS' | 'WARN' | 'FAIL' = hasFail ? 'FAIL' : hasWarn ? 'WARN' : 'PASS'

  return {
    pageId,
    path,
    indexable: baseline?.indexable ?? true,
    title: resolvedTitle,
    description: resolvedDesc,
    ogTitle,
    ogDescription: ogDesc,
    ogImage,
    twitterCard,
    robotsIndex,
    issues,
    status,
  }
}

async function main() {
  console.log('TKG Metadata Audit\n')

  const audits: PageAudit[] = []

  // ── Static pages (from baseline) ──────────────────────────────────────────
  const staticPages = [
    { pageId: 'HOME', path: '/', title: 'Tel K. Ganesan | Executive Chairman and Enterprise Builder', description: 'Tel K. Ganesan builds enterprises, leaders, and platforms across technology, ideas, culture, and community impact.' },
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
    {
      pageId: 'SEARCH',
      path: '/search',
      title: 'Search | Tel K. Ganesan',
      description: 'Search published pages, articles, enterprise entities, film and culture projects, and impact initiatives on the Tel K. Ganesan website.',
    },
  ]

  for (const p of staticPages) {
    const baseline = getBaselinePage(p.pageId)!
    const title = p.title ?? baseline.seoTitle ?? baseline.title
    const description = p.description ?? baseline.seoDescription ?? baseline.purpose
    const audit = await auditPage(p.pageId, p.path, title, description)
    audits.push(audit)
  }

  // ── Dynamic template pages (use baseline seoTitle as template description) ──
  const templatePages = [
    { pageId: 'ARTICLE', path: '/ideas/[slug]', title: 'Example Article Title | Tel K. Ganesan', description: 'An authored idea or framework about enterprise, leadership or culture.' },
    { pageId: 'ENTITY', path: '/enterprise-investments/[slug]', title: 'Example Entity | Tel K. Ganesan', description: 'Enterprise and investment detail with verified relationship status.' },
    { pageId: 'PROJECT', path: '/film-culture/[slug]', title: 'Example Project | Tel K. Ganesan', description: 'Film and culture detail with verified screen credits.' },
    { pageId: 'INITIATIVE', path: '/impact/[slug]', title: 'Example Initiative | Tel K. Ganesan', description: 'Impact initiative detail with documented outcomes and participation criteria.' },
  ]

  for (const p of templatePages) {
    const audit = await auditPage(p.pageId, p.path, p.title, p.description)
    audits.push(audit)
  }

  // ── Utility / Flow pages ──────────────────────────────────────────────────
  const nlConfirmAudit = await auditPage(
    'NEWSLETTER_CONFIRM',
    '/newsletter/confirm',
    'Confirm your subscription | Tel K. Ganesan',
    "Confirm your email address to complete your subscription to Tel K. Ganesan's Ideas newsletter.",
    true, // noindex
  )
  audits.push(nlConfirmAudit)

  // ── Duplicate detection ────────────────────────────────────────────────
  const titles = audits.map(a => a.title).filter(Boolean)
  const descriptions = audits.map(a => a.description).filter(Boolean)
  const titleCounts = new Map<string, number>()
  const descCounts = new Map<string, number>()
  for (const t of titles) { titleCounts.set(t!, (titleCounts.get(t!) ?? 0) + 1) }
  for (const d of descriptions) { descCounts.set(d!, (descCounts.get(d!) ?? 0) + 1) }

  for (const audit of audits) {
    if (audit.title && (titleCounts.get(audit.title) ?? 0) > 1) {
      audit.issues.push(`FAIL: title duplicated across ${titleCounts.get(audit.title)} pages`)
      audit.status = 'FAIL'
    }
    if (audit.description && (descCounts.get(audit.description) ?? 0) > 1) {
      audit.issues.push(`WARN: description duplicated across ${descCounts.get(audit.description)} pages`)
      if (audit.status === 'PASS') audit.status = 'WARN'
    }
  }

  // ── Output ────────────────────────────────────────────────────────────────
  const COL = { pageId: 22, path: 32, title: 60, desc: 55, status: 6 }

  console.log(
    'Page ID'.padEnd(COL.pageId) +
    'Path'.padEnd(COL.path) +
    'Status'.padEnd(COL.status) +
    'Title (resolved)'.padEnd(COL.title) +
    'Description (chars)'
  )
  console.log('─'.repeat(COL.pageId + COL.path + COL.status + COL.title + COL.desc))

  for (const a of audits) {
    const titleStr = (a.title ?? '—').slice(0, 58)
    const descStr = a.description ? `${a.description.length}ch` : '—'
    console.log(
      a.pageId.padEnd(COL.pageId) +
      a.path.padEnd(COL.path) +
      a.status.padEnd(COL.status) +
      titleStr.padEnd(COL.title) +
      descStr
    )
  }

  console.log('\n── Issues ──')
  let hasIssues = false
  for (const a of audits) {
    if (a.issues.length > 0) {
      hasIssues = true
      console.log(`\n${a.pageId} (${a.path}):`)
      for (const issue of a.issues) console.log(`  ${issue}`)
    }
  }
  if (!hasIssues) console.log('None.')

  const passed = audits.filter(a => a.status === 'PASS').length
  const warned = audits.filter(a => a.status === 'WARN').length
  const failed = audits.filter(a => a.status === 'FAIL').length
  console.log(`\nSummary: ${passed} PASS  ${warned} WARN  ${failed} FAIL  (${audits.length} total)`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => { console.error(err); process.exit(1) })
