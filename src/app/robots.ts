import type { MetadataRoute } from 'next'

import { getPayloadClient } from '@/lib/payload'

/**
 * robots.txt (Section 11.1).
 *
 * Defaults to disallowing everything. Crawling is permitted only when a verified production
 * origin is configured AND indexing is explicitly enabled in site settings, so a staging or
 * preview deployment stays private without anyone remembering to change a file.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const payload = await getPayloadClient()
  const settings = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true }).catch(() => null)

  const origin = settings?.productionOrigin?.trim()
  const allowIndexing = settings?.allowIndexing === true

  if (!allowIndexing || !origin) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Never index search results, the admin, or the API surface.
        disallow: ['/search', '/admin', '/api/'],
      },
    ],
    sitemap: new URL('/sitemap.xml', origin).toString(),
  }
}
