import fs from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import { config } from '../config'
import { ASSET_IMAGE_SIZES } from '../models'

/**
 * Stores an uploaded file in the media folder and, for images, generates the same derived
 * sizes Payload did (`name-400x300.png`, ...), so stored asset documents keep their shape.
 */

const SIZE_SPECS: Record<(typeof ASSET_IMAGE_SIZES)[number], { width: number; height: number }> = {
  thumbnail: { width: 400, height: 300 },
  card: { width: 768, height: 480 },
  featured: { width: 768, height: 480 },
  hero: { width: 1920, height: 1080 },
  social: { width: 1200, height: 630 },
}

export const ALLOWED_MIME = /^(image\/(png|jpeg|webp|gif|avif|svg\+xml)|application\/pdf|video\/(mp4|webm)|audio\/(mpeg|mp4|wav))$/
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

function safeBase(name: string): { base: string; ext: string } {
  const ext = path.extname(name).toLowerCase().replace(/[^.a-z0-9]/g, '')
  const base =
    path
      .basename(name, path.extname(name))
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'file'
  return { base, ext }
}

async function exists(file: string): Promise<boolean> {
  return fs
    .access(file)
    .then(() => true)
    .catch(() => false)
}

async function uniqueName(base: string, ext: string): Promise<string> {
  let candidate = `${base}${ext}`
  for (let i = 1; await exists(path.join(config.mediaDir, candidate)); i++) candidate = `${base}-${i}${ext}`
  return candidate
}

type SizeRecord = { url: null; width: number | null; height: number | null; mimeType: string | null; filesize: number | null; filename: string | null }

const EMPTY_SIZE: SizeRecord = { url: null, width: null, height: null, mimeType: null, filesize: null, filename: null }

export async function storeUpload(file: { originalname: string; mimetype: string; buffer: Buffer; size: number }) {
  await fs.mkdir(config.mediaDir, { recursive: true })
  const { base, ext } = safeBase(file.originalname)
  const filename = await uniqueName(base, ext)
  await fs.writeFile(path.join(config.mediaDir, filename), file.buffer)

  const doc: Record<string, unknown> = {
    filename,
    mimeType: file.mimetype,
    filesize: file.size,
  }

  const isRaster = file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml'
  if (isRaster) {
    const meta = await sharp(file.buffer).metadata()
    doc.width = meta.width ?? null
    doc.height = meta.height ?? null
    doc.focalX = 50
    doc.focalY = 50
    const sizes: Record<string, SizeRecord> = {}
    for (const [name, spec] of Object.entries(SIZE_SPECS)) {
      // Never upscale: a size larger than the original is left empty.
      if (!meta.width || !meta.height || (meta.width < spec.width && meta.height < spec.height)) {
        sizes[name] = { ...EMPTY_SIZE }
        continue
      }
      const sizeName = `${path.basename(filename, ext)}-${spec.width}x${spec.height}${ext}`
      const output = await sharp(file.buffer).resize(spec.width, spec.height, { fit: 'cover', position: 'centre', withoutEnlargement: true }).toBuffer({ resolveWithObject: true })
      await fs.writeFile(path.join(config.mediaDir, sizeName), output.data)
      sizes[name] = {
        url: null,
        width: output.info.width,
        height: output.info.height,
        mimeType: file.mimetype,
        filesize: output.info.size,
        filename: sizeName,
      }
    }
    doc.sizes = sizes
  }

  return doc
}

/** Removes an asset's original and generated files. Missing files are ignored. */
export async function removeFiles(asset: Record<string, any>) {
  const names = [asset.filename, ...Object.values((asset.sizes ?? {}) as Record<string, { filename?: string }>).map((s) => s?.filename)]
  for (const name of names) {
    if (typeof name !== 'string' || !name || name.includes('/') || name.includes('\\')) continue
    await fs.rm(path.join(config.mediaDir, name), { force: true })
  }
}
