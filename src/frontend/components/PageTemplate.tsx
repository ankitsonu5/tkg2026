import { notFound } from 'next/navigation'

import type { Page } from '@/payload-types'
import { getPayloadClient, publishedOnly } from '@/lib/payload'
import { getBaselinePage } from '@/baseline/pages'
import { buildPageSchema } from '@/lib/seo/schema'
import { Blocks } from './Blocks'
import { BaselinePage } from './BaselinePage'
import { JsonLd } from './JsonLd'

/**
 * Shared renderer for the eight fixed pages plus the three utility pages.
 *
 * `preview` is honoured only for an authenticated request; an anonymous visitor always gets
 * the published-only query, so a draft cannot be read by adding ?preview=1 to the URL.
 */
export async function PageTemplate({
  pageId,
  preview = false,
  articlesPage,
  articlesTag,
  articlesTopic,
}: {
  pageId: string
  preview?: boolean
  /** Current page of the blog listing (IDEAS only). */
  articlesPage?: number
  /** Active tag filter on the blog listing (IDEAS only). */
  articlesTag?: string
  /** Active topic filter on the blog listing (IDEAS only). */
  articlesTopic?: string
}) {
  const baseline = getBaselinePage(pageId)
  if (!baseline) notFound()

  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'pages',
    where: preview ? { pageId: { equals: pageId } } : { and: [{ pageId: { equals: pageId } }, publishedOnly] },
    limit: 1,
    depth: 2,
    draft: preview,
    pagination: false,
    overrideAccess: true,
  })

  const page = result.docs[0] as Page | undefined
  const pageSchema = buildPageSchema(pageId, baseline.path)

  return (
    <>
      <JsonLd schema={pageSchema} />
      {!page ? (
        <BaselinePage pageId={pageId} articlesPage={articlesPage} articlesTag={articlesTag} articlesTopic={articlesTopic} />
      ) : (
        <>
          {preview && page._status !== 'published' && (
            <div className="container">
              <div className="notice">
                <p className="notice__title">Draft preview</p>
                <p>You are viewing unpublished content. It is not visible to the public.</p>
              </div>
            </div>
          )}
          <Blocks modules={page.modules} pageId={pageId} />
        </>
      )}
    </>
  )
}
