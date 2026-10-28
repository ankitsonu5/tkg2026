import type { MetadataRoute } from 'next'

import { getApiClient, hasOwnPage, publishedOnly } from '@/lib/api'
import { BASELINE_PAGES } from '@/baseline/pages'
import { listCustomPages } from '@/lib/custom-pages'

/**
 * XML sitemap (Section 11.1).
 *
 * Lists all canonical, indexable production pages and published detail records.
 * Deliberate suppression: returns empty until a verified production origin
 * is configured AND indexing is enabled, ensuring staging or preview deployments
 * are never crawled or indexed with guessed absolute URLs.
 */
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const api = await getApiClient()
  const settings = await api.findGlobal({ slug: 'site-settings', overrideAccess: true }).catch(() => null)

  const origin = settings?.productionOrigin?.trim() || process.env.PRODUCTION_ORIGIN?.trim()
  const allowIndexing = settings?.allowIndexing === true || process.env.ALLOW_INDEXING === 'true'

  if (!origin || !allowIndexing) return []

  const cleanOrigin = origin.replace(/\/+$/, '')
  const entries: MetadataRoute.Sitemap = []

  // 1. Static and utility baseline pages (indexable only, excluding templates and noindex pages)
  for (const page of BASELINE_PAGES) {
    if (!page.indexable || page.kind === 'template') continue

    // Query for optional CMS page override to get exact updatedAt timestamp
    const published = await api
      .find({
        collection: 'pages',
        where: { and: [{ pageId: { equals: page.pageId } }, publishedOnly] },
        limit: 1,
        depth: 0,
        pagination: false,
        overrideAccess: true,
      })
      .catch(() => ({ docs: [] }))

    const lastModified = published.docs[0]?.updatedAt
      ? new Date(String(published.docs[0].updatedAt))
      : undefined

    const cleanPath = page.path.startsWith('/') ? page.path : `/${page.path}`
    const pageUrl = cleanPath === '/' ? `${cleanOrigin}/` : `${cleanOrigin}${cleanPath}`

    entries.push({
      url: pageUrl,
      lastModified,
      changeFrequency: page.path === '/' ? 'weekly' : page.kind === 'utility' ? 'monthly' : 'weekly',
      priority: page.path === '/' ? 1.0 : page.kind === 'utility' ? 0.4 : 0.8,
    })
  }

  // 2. Published detail items across all 4 public-eligible collections
  const detailSources = [
    { collection: 'articles' as const, prefix: '/ideas' },
    { collection: 'entities' as const, prefix: '/enterprise-investments' },
    { collection: 'projects' as const, prefix: '/film-culture' },
    { collection: 'initiatives' as const, prefix: '/impact' },
  ]

  for (const source of detailSources) {
    const docs = await api
      .find({
        collection: source.collection,
        where: { and: [publishedOnly, hasOwnPage] },
        limit: 100,
        depth: 0,
        pagination: false,
        overrideAccess: true,
      })
      .catch(() => ({ docs: [] }))

    for (const doc of docs.docs) {
      if (!doc.slug) continue
      entries.push({
        url: `${cleanOrigin}${source.prefix}/${doc.slug}`,
        lastModified: doc.updatedAt ? new Date(String(doc.updatedAt)) : undefined,
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }
  }

  // 3. Custom pages added from the admin (published and not set to noindex)
  for (const page of await listCustomPages()) {
    entries.push({
      url: `${cleanOrigin}${page.path}`,
      lastModified: page.updatedAt ? new Date(String(page.updatedAt)) : undefined,
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  }

  return entries
}
