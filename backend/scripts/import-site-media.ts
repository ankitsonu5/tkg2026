/**
 * One-time import of the website's static media (frontend/public/images and
 * frontend/public/downloads) into the asset register, so it shows up in the admin Media
 * Library and can be picked in posts and pages.
 *
 * Each file is stored exactly as an admin upload would be (media folder + derived sizes) and
 * gets assetId `SITE:<path under public/>`. Files already imported (by assetId) are skipped,
 * so re-running is safe. Rights stay 'unverified': importing a file does not clear it.
 *
 * The site's hardcoded components keep using their /images/... paths; this does not rewire them.
 *
 *   npm run import:site-media            # dry run
 *   npm run import:site-media -- --apply
 */
import fs from 'node:fs/promises'
import path from 'node:path'

import { ALLOWED_MIME, MAX_UPLOAD_BYTES, storeUpload } from '../src/admin/media'
import { data } from '../src/data/client'
import { connectDatabase, disconnectDatabase } from '../src/db'

const apply = process.argv.includes('--apply')

const PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'frontend', 'public')
const FOLDERS = ['images', 'downloads']

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(full)))
    else if (entry.isFile()) files.push(full)
  }
  return files
}

/** "tel/tel-denim-portrait.jpg" -> "Tel denim portrait" */
function altFromName(file: string): string {
  const words = path.basename(file, path.extname(file)).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

async function main() {
  await connectDatabase()
  console.log(apply ? 'Importing site media…' : 'Dry run (pass --apply to write):')

  const files = (await Promise.all(FOLDERS.map((f) => walk(path.join(PUBLIC_DIR, f))))).flat().sort()
  let created = 0
  for (const full of files) {
    const rel = path.relative(PUBLIC_DIR, full).split(path.sep).join('/')
    const mimeType = MIME_BY_EXT[path.extname(full).toLowerCase()]
    if (!mimeType || !ALLOWED_MIME.test(mimeType)) {
      console.log(`  - ${rel} skipped (unsupported type)`)
      continue
    }
    const assetId = `SITE:${rel}`
    const existing = await data.find({ collection: 'assets', where: { assetId: { equals: assetId } }, limit: 1, depth: 0, pagination: false })
    if (existing.docs.length) {
      console.log(`  = ${rel} already imported`)
      continue
    }
    const buffer = await fs.readFile(full)
    if (buffer.length > MAX_UPLOAD_BYTES) {
      console.log(`  - ${rel} skipped (over 25 MB)`)
      continue
    }
    if (!apply) {
      console.log(`  + ${rel} (dry run)`)
      created++
      continue
    }
    const stored = await storeUpload({ originalname: path.basename(full), mimetype: mimeType, buffer, size: buffer.length }).catch((error: Error) => {
      console.log(`  ! ${rel} skipped (${error.message.split('\n')[0]})`)
      return null
    })
    if (!stored) continue
    console.log(`  + ${rel}`)
    created++
    await data.create({
      collection: 'assets',
      data: { ...stored, assetId, alt: altFromName(full), source: `Website static file /${rel}` },
    })
  }

  await disconnectDatabase()
  console.log(`Done. ${created} ${apply ? 'imported' : 'to import'}.`)
}

main().catch(async (error) => {
  console.error(error)
  await disconnectDatabase().catch(() => undefined)
  process.exit(1)
})
