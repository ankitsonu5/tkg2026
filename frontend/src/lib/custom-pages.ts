import { cache } from 'react'

import { getBaselinePage } from '@/baseline/pages'
import { getApiClient, publishedOnly } from '@/lib/api'

/**
 * Custom pages: Pages records added from the admin with no baseline Page ID. They are served at
 * their own `path` by the catch-all route and carry the same SEO fields as every other page.
 */

export type CustomPageDoc = Record<string, any>

/** The custom page at this path (drafts too when `preview`), or null. */
export const findCustomPage = cache(async (path: string, preview: boolean): Promise<CustomPageDoc | null> => {
  const api = await getApiClient()
  const result = await api
    .find({
      collection: 'pages',
      where: { and: [{ path: { equals: path } }, ...(preview ? [] : [publishedOnly])] },
      limit: 1,
      depth: 2,
      draft: preview,
      pagination: false,
      overrideAccess: true,
    })
    .catch(() => null)
  const doc = result?.docs[0] as CustomPageDoc | undefined
  // A built-in page's record only holds settings; its route renders it.
  if (!doc || getBaselinePage(String(doc.pageId ?? ''))) return null
  return doc
})

/** Published, indexable custom pages (for the sitemap). */
export async function listCustomPages(): Promise<CustomPageDoc[]> {
  const api = await getApiClient()
  const result = await api
    .find({ collection: 'pages', where: publishedOnly, limit: 500, depth: 0, pagination: false, overrideAccess: true })
    .catch(() => ({ docs: [] }))
  return (result.docs as CustomPageDoc[]).filter((d) => !getBaselinePage(String(d.pageId ?? '')) && d.seo?.noindex !== true && typeof d.path === 'string')
}
