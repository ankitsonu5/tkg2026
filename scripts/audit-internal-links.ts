/**
 * Internal-Linking QA Audit
 *
 * Statically scans every frontend component and app route for `href` values and
 * verifies each internal one resolves to a real destination:
 *   - a known baseline page path (src/baseline/pages.ts)
 *   - a known dynamic detail-template prefix (/ideas/[slug] etc.)
 *   - a real file under /public (e.g. /downloads/*.pdf)
 *   - a /connect?route=<id> pointing at a real inquiry route id
 *   - an in-page anchor (#id) that exists somewhere in the scanned source
 *
 * It also flags "orphan" baseline pages: indexable, non-template, non-utility
 * pages that no scanned component actually links to (so a visitor — and a
 * crawler — has no path to reach them other than typing the URL).
 *
 * This complements the existing audits (sitemap, canonicals, indexability),
 * which check the *sitemap*, not whether pages are actually reachable by click.
 *
 * Run: npx tsx scripts/audit-internal-links.ts
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BASELINE_PAGES } from '../src/baseline/pages'
import { INQUIRY_ROUTE_IDS } from '../src/baseline/inquiry-routes'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SCAN_DIRS = ['src/frontend', 'src/app/(frontend)']

interface LinkOccurrence {
  file: string
  line: number
  raw: string
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, out)
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

function collectHrefs(files: string[]): LinkOccurrence[] {
  const results: LinkOccurrence[] = []
  const pattern = /href=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/g

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    const lines = text.split('\n')
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text))) {
      const raw = match[1] ?? match[2] ?? match[3] ?? ''
      const upto = text.slice(0, match.index)
      const line = upto.split('\n').length
      results.push({ file: path.relative(ROOT, file), line, raw })
    }
    void lines
  }
  return results
}

type Classification = 'PASS' | 'FAIL' | 'EXTERNAL' | 'ANCHOR' | 'DYNAMIC'

interface AuditRow {
  file: string
  line: number
  raw: string
  classification: Classification
  reason: string
}

async function main() {
  console.log('═'.repeat(120))
  console.log('TKG INTERNAL-LINKING QA AUDIT')
  console.log('═'.repeat(120) + '\n')

  const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)))
  const occurrences = collectHrefs(files)
  const sourceText = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n')

  const staticPaths = new Set(
    BASELINE_PAGES.filter((p) => p.kind !== 'template').map((p) => p.path),
  )
  // Utility routes that exist as real app routes but are intentionally absent from
  // the baseline page registry (they are not indexable content pages).
  staticPaths.add('/newsletter')
  staticPaths.add('/newsletter/confirm')

  const templatePrefixes = BASELINE_PAGES.filter((p) => p.kind === 'template').map((p) =>
    p.path.replace(/\/\[slug\]$/, ''),
  )

  const routeIds = new Set(INQUIRY_ROUTE_IDS as string[])

  const rows: AuditRow[] = []

  for (const occ of occurrences) {
    const { raw } = occ
    if (/^(https?:)?\/\//i.test(raw)) {
      rows.push({ ...occ, classification: 'EXTERNAL', reason: 'external destination — not audited here' })
      continue
    }
    if (/^(mailto|tel):/i.test(raw)) {
      rows.push({ ...occ, classification: 'EXTERNAL', reason: 'mailto/tel — not audited here' })
      continue
    }
    if (raw.startsWith('#')) {
      if (raw.includes('${')) {
        rows.push({
          ...occ,
          classification: 'ANCHOR',
          reason: 'dynamic heading anchor generated at runtime',
        })
        continue
      }
      const id = raw.slice(1)
      const found = id.length > 0 && new RegExp(`id=(\\{?["'\`])${id}\\1|id="${id}"`).test(sourceText)
      rows.push({
        ...occ,
        classification: 'ANCHOR',
        reason: found ? `anchor target id="${id}" found` : `FAIL: no element with id="${id}" found in scanned source`,
      })
      continue
    }

    // Template-literal href whose route-determining segment is itself a runtime
    // value (e.g. `/connect?route=${encodeURIComponent(destination)}`) can't be
    // statically resolved — it's validated at runtime instead (getBaselineRoute()
    // in src/lib/inquiries/submit.ts rejects unknown routeIds server-side).
    if (raw.includes('${')) {
      const staticPrefix = raw.split('${')[0]
      const looksInternal =
        staticPrefix.startsWith('/connect') ||
        staticPrefix.startsWith('/ideas') ||
        raw.includes('meta.basePath') ||
        templatePrefixes.some((prefix) => staticPrefix.startsWith(`${prefix}/`))
      rows.push({
        ...occ,
        classification: 'DYNAMIC',
        reason: looksInternal
          ? 'dynamic segment — not statically verifiable, runtime-validated elsewhere'
          : `FAIL: dynamic href with unrecognized static prefix "${staticPrefix}"`,
      })
      continue
    }

    // Internal path — split query/hash
    const [pathAndQuery] = raw.split('#')
    const [pathPart, query] = pathAndQuery.split('?')
    const normalizedPath = pathPart === '' ? '/' : pathPart

    if (normalizedPath.startsWith('/downloads/')) {
      const filePath = path.join(ROOT, 'public', normalizedPath)
      const exists = fs.existsSync(filePath)
      rows.push({
        ...occ,
        classification: exists ? 'PASS' : 'FAIL',
        reason: exists ? 'static file exists under /public' : `FAIL: no file at public${normalizedPath}`,
      })
      continue
    }

    if (normalizedPath === '/connect') {
      if (!query) {
        rows.push({ ...occ, classification: 'PASS', reason: 'general connect page, no route param' })
        continue
      }
      const params = new URLSearchParams(query)
      const routeParam = params.get('route')
      const valid = !routeParam || routeIds.has(routeParam)
      rows.push({
        ...occ,
        classification: valid ? 'PASS' : 'FAIL',
        reason: valid
          ? `route="${routeParam}" is a known inquiry route`
          : `FAIL: route="${routeParam}" is not in INQUIRY_ROUTE_IDS (${[...routeIds].join(', ')})`,
      })
      continue
    }

    if (staticPaths.has(normalizedPath)) {
      rows.push({ ...occ, classification: 'PASS', reason: 'matches a known baseline page path' })
      continue
    }

    if (templatePrefixes.some((prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`))) {
      rows.push({ ...occ, classification: 'PASS', reason: 'matches a known dynamic detail-template prefix' })
      continue
    }

    rows.push({
      ...occ,
      classification: 'FAIL',
      reason: `FAIL: "${normalizedPath}" does not match any known baseline page, template prefix, or static asset`,
    })
  }

  // ── Print results ──
  const COL = { file: 46, line: 6, href: 40 }
  console.log(
    'File'.padEnd(COL.file) + 'Line'.padEnd(COL.line) + 'href'.padEnd(COL.href) + 'Result',
  )
  console.log('─'.repeat(COL.file + COL.line + COL.href + 40))
  for (const r of rows) {
    console.log(
      r.file.padEnd(COL.file) +
        String(r.line).padEnd(COL.line) +
        r.raw.slice(0, COL.href - 1).padEnd(COL.href) +
        `${r.classification}${r.reason.startsWith('FAIL') ? '  ' + r.reason : ''}`,
    )
  }

  // ── Orphan page check ──
  console.log('\n── Orphan Page Check (indexable content pages with no discovered internal link) ──')
  const linkedPaths = new Set(
    rows
      .filter((r) => r.classification === 'PASS')
      .map((r) => {
        const [pathAndQuery] = r.raw.split('#')
        const [p] = pathAndQuery.split('?')
        return p === '' ? '/' : p
      }),
  )

  const discoverablePages = BASELINE_PAGES.filter(
    (p) => p.kind === 'page' && p.indexable && p.path !== '/',
  )
  const orphans = discoverablePages.filter((p) => !linkedPaths.has(p.path))

  if (orphans.length === 0) {
    console.log('✓ PASS — every indexable content page is linked from at least one component.')
  } else {
    for (const o of orphans) {
      console.log(`✗ FAIL — "${o.pageId}" (${o.path}) has no discovered internal link pointing to it`)
    }
  }

  const failCount = rows.filter((r) => r.classification === 'FAIL' || r.reason.startsWith('FAIL')).length + orphans.length
  const passCount = rows.filter((r) => r.classification === 'PASS').length

  console.log('\n── Summary ──')
  console.log(`Total href occurrences scanned: ${occurrences.length}`)
  console.log(`PASS: ${passCount}`)
  console.log(`EXTERNAL/ANCHOR/DYNAMIC (not scored): ${rows.filter((r) => (r.classification === 'EXTERNAL' || r.classification === 'ANCHOR' || r.classification === 'DYNAMIC') && !r.reason.startsWith('FAIL')).length}`)
  console.log(`FAIL: ${failCount}`)
  console.log(`Orphan indexable pages: ${orphans.length}`)
  console.log(`\nFinal Result: ${failCount === 0 ? 'PASS — internal-linking QA closed' : 'FAIL — see rows above'}`)

  process.exit(failCount === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
