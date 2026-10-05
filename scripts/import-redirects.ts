/**
 * Imports approved legacy-URL decisions into the `redirects` collection.
 *
 * Reads docs/WP_REDIRECT_INVENTORY.csv. Only rows whose "decision" column is filled
 * (301, 302 or 410) are imported; empty rows stay "undecided" and are skipped, because the
 * baseline forbids guessing or redirecting every unknown URL to Home.
 *
 * Usage:
 *   npx tsx scripts/import-redirects.ts            # dry run, prints what would change
 *   npx tsx scripts/import-redirects.ts --apply    # writes to the database in DATABASE_URI
 */
import 'dotenv/config'

import { readFileSync } from 'node:fs'

import { getPayload } from 'payload'

import config from '../src/payload.config'

const FILE = 'docs/WP_REDIRECT_INVENTORY.csv'
const apply = process.argv.includes('--apply')

/** Minimal CSV parser (quoted fields, commas and newlines inside quotes). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((v) => v !== '')) rows.push(row)
      row = []
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Matches how src/proxy.ts normalises a request path: no trailing slash, except for "/". */
const normalise = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p)

async function main() {
  const [header, ...rows] = parseCsv(readFileSync(FILE, 'utf8'))
  const col = (name: string) => header.findIndex((h) => h.toLowerCase().startsWith(name))
  const iPath = col('old_path')
  const iDecision = col('decision')
  const iTo = col('to_path')
  const iEvidence = col('evidence')

  const ready: { fromPath: string; decision: string; toPath?: string; evidence?: string }[] = []
  let undecided = 0
  for (const r of rows) {
    const decision = (r[iDecision] ?? '').trim()
    if (!decision) {
      undecided += 1
      continue
    }
    if (!['301', '302', '410'].includes(decision)) {
      console.error(`Skipping ${r[iPath]}: decision "${decision}" must be 301, 302 or 410.`)
      continue
    }
    const to = (r[iTo] ?? '').trim()
    if (decision !== '410' && !to.startsWith('/')) {
      console.error(`Skipping ${r[iPath]}: a ${decision} needs a to_path that starts with "/".`)
      continue
    }
    ready.push({
      fromPath: normalise(r[iPath].trim()),
      decision,
      toPath: decision === '410' ? undefined : normalise(to),
      evidence: r[iEvidence]?.trim() || undefined,
    })
  }

  console.log(`${rows.length} legacy URLs: ${ready.length} decided, ${undecided} still undecided (skipped).`)
  if (!apply) {
    for (const r of ready.slice(0, 20)) console.log(`  ${r.decision}  ${r.fromPath}${r.toPath ? '  ->  ' + r.toPath : ''}`)
    console.log('Dry run only. Re-run with --apply to write these to the database.')
    process.exit(0)
  }

  const payload = await getPayload({ config })
  let created = 0
  let updated = 0
  for (const r of ready) {
    const existing = await payload.find({
      collection: 'redirects',
      where: { fromPath: { equals: r.fromPath } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    })
    const data = { fromPath: r.fromPath, decision: r.decision as '301' | '302' | '410', toPath: r.toPath, evidence: r.evidence }
    if (existing.docs[0]) {
      await payload.update({ collection: 'redirects', id: existing.docs[0].id, data, overrideAccess: true })
      updated += 1
    } else {
      await payload.create({ collection: 'redirects', data, overrideAccess: true })
      created += 1
    }
  }
  console.log(`Imported: ${created} created, ${updated} updated.`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
