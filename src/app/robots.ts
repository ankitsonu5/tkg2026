import type { MetadataRoute } from 'next'

import { getPayloadClient } from '@/lib/payload'

/**
 * robots.txt (Section 11.1).
 *
 * Defaults to disallowing everything. Crawling is permitted only when a verified production
 * origin is configured AND indexing is explicitly enabled in site settings (or environment),
 * so a staging or preview deployment stays private without anyone remembering to change a file.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const payload = await getPayloadClient()
  const settings = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true }).catch(() => null)

  const origin = settings?.productionOrigin?.trim() || process.env.PRODUCTION_ORIGIN?.trim()
  const allowIndexing = settings?.allowIndexing === true || process.env.ALLOW_INDEXING === 'true'

  if (!allowIndexing || !origin) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  const cleanOrigin = origin.replace(/\/+$/, '')

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Never index search results, the admin, the API surface, or confirmation endpoints.
        disallow: ['/search', '/admin', '/api/', '/newsletter/confirm'],
      },
    ],
    sitemap: `${cleanOrigin}/sitemap.xml`,
  }
}
