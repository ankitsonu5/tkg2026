import type { MetadataRoute } from 'next'

import { getPayloadClient, publishedOnly } from '@/lib/payload'
import { BASELINE_PAGES } from '@/baseline/pages'

/**
 * XML sitemap (Section 11.1).
 *
 * Lists only published, indexable content. Returns empty until a verified production origin
 * exists, because a sitemap of guessed absolute URLs is worse than no sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayloadClient()
  const settings = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true }).catch(() => null)

  const origin = settings?.productionOrigin?.trim()
  if (!origin || settings?.allowIndexing !== true) return []

  const entries: MetadataRoute.Sitemap = []

  for (const page of BASELINE_PAGES) {
    if (!page.indexable || page.kind === 'template') continue
    const published = await payload.find({
      collection: 'pages',
      where: { and: [{ pageId: { equals: page.pageId } }, publishedOnly] },
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    if (published.docs.length === 0) continue
    entries.push({
      url: new URL(page.path, origin).toString(),
      lastModified: published.docs[0].updatedAt ? new Date(String(published.docs[0].updatedAt)) : undefined,
    })
  }

  const detailSources = [
    { collection: 'articles' as const, prefix: '/ideas' },
    { collection: 'entities' as const, prefix: '/enterprise-investments' },
    { collection: 'projects' as const, prefix: '/film-culture' },
    { collection: 'initiatives' as const, prefix: '/impact' },
  ]

  for (const source of detailSources) {
    const docs = await payload.find({
      collection: source.collection,
      where: publishedOnly,
      limit: 0,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    for (const doc of docs.docs) {
      entries.push({
        url: new URL(`${source.prefix}/${doc.slug}`, origin).toString(),
        lastModified: doc.updatedAt ? new Date(String(doc.updatedAt)) : undefined,
      })
    }
  }

  return entries
}
