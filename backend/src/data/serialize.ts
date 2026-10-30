import { Types } from 'mongoose'

import { ASSET_IMAGE_SIZES } from '../models'

/**
 * Converts a raw MongoDB document into the JSON shape the site has always consumed:
 * `_id` becomes a string `id`, ObjectIds become strings, dates become ISO strings and the
 * Mongoose version key is dropped.
 */
export function toPlain(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (value instanceof Types.ObjectId) return value.toHexString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(toPlain)
  if (typeof value === 'object') {
    // BSON values other than ObjectId/Date (Decimal128, Binary...) are not used by this schema.
    const out: Record<string, unknown> = {}
    const source = value as Record<string, unknown>
    if ('_id' in source && source._id !== undefined) out.id = toPlain(source._id)
    for (const [key, inner] of Object.entries(source)) {
      if (key === '_id' || key === '__v') continue
      out[key] = toPlain(inner)
    }
    return out
  }
  return value
}

export function fileUrl(filename: string): string {
  return `/api/assets/file/${encodeURIComponent(filename)}`
}

/** Adds the public file URLs to an asset document (Payload generated these on read). */
export function decorateUpload(doc: Record<string, unknown>): void {
  doc.url = typeof doc.filename === 'string' && doc.filename ? fileUrl(doc.filename) : null
  doc.thumbnailURL = null
  const sizes = (doc.sizes && typeof doc.sizes === 'object' ? doc.sizes : {}) as Record<string, Record<string, unknown>>
  for (const name of ASSET_IMAGE_SIZES) {
    const size = sizes[name] ?? {}
    sizes[name] = {
      ...size,
      url: typeof size.filename === 'string' && size.filename ? fileUrl(size.filename) : null,
    }
  }
  doc.sizes = sizes
}
