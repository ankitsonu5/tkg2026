import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'

import { Router } from 'express'

import { config } from '../config'
import { Asset } from '../models'

/**
 * GET /api/assets/file/:filename — public media.
 *
 * An asset is only served once its rights are cleared (the same rule Payload's read access
 * enforced), so an uncleared file cannot be fetched even if its name is guessed. The
 * filename may be the original or any generated size (`name-400x300.png`).
 */
export const assetsRouter = Router()

const FORBIDDEN = { errors: [{ message: 'You are not allowed to perform this action.' }] }
const NOT_FOUND = { errors: [{ message: 'Not Found' }] }

/** Public base URL of the Vercel Blob store, derived from its read-write token. */
function blobBaseUrl(): string | null {
  const storeId = config.blobToken.split('_')[3]
  return storeId ? `https://${storeId.toLowerCase()}.public.blob.vercel-storage.com` : null
}

assetsRouter.get('/file/:filename', async (req, res) => {
  const filename = req.params.filename
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return res.status(404).json(NOT_FOUND)
  }

  const sizeFilters = ['thumbnail', 'card', 'featured', 'hero', 'social'].map((size) => ({
    [`sizes.${size}.filename`]: filename,
  }))
  const asset = await Asset.findOne({ $or: [{ filename }, ...sizeFilters] }).lean().exec()
  if (!asset) return res.status(404).json(NOT_FOUND)
  // Uncleared files are never public in production. Local development serves them so editors
  // can see their layout (the site flags them "Preview only").
  if (asset.rightsStatus !== 'cleared' && config.isProduction) return res.status(403).json(FORBIDDEN)

  const mimeType = (() => {
    if (asset.filename === filename) return String(asset.mimeType ?? '')
    const sizes = (asset.sizes ?? {}) as Record<string, { filename?: string; mimeType?: string }>
    return Object.values(sizes).find((s) => s?.filename === filename)?.mimeType ?? ''
  })()

  const localPath = path.join(config.mediaDir, filename)
  if (fs.existsSync(localPath)) {
    if (mimeType) res.type(mimeType)
    return res.sendFile(localPath)
  }

  // Production stores files in Vercel Blob; stream them through so the rights check above
  // still applies.
  const base = config.blobToken ? blobBaseUrl() : null
  if (base) {
    const prefix = typeof asset.prefix === 'string' && asset.prefix ? `${asset.prefix.replace(/\/+$/, '')}/` : ''
    const upstream = await fetch(`${base}/${prefix}${encodeURIComponent(filename)}`)
    if (upstream.ok && upstream.body) {
      res.status(200)
      res.type(mimeType || upstream.headers.get('content-type') || 'application/octet-stream')
      const length = upstream.headers.get('content-length')
      if (length) res.setHeader('Content-Length', length)
      Readable.fromWeb(upstream.body as import('node:stream/web').ReadableStream).pipe(res)
      return
    }
  }

  return res.status(404).json(NOT_FOUND)
})
