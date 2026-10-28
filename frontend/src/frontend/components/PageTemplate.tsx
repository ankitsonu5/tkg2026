import { notFound } from 'next/navigation'

import type { Page } from '@/lib/content-types'
import { getApiClient, publishedOnly } from '@/lib/api'
import { isStaffPreview } from '@/lib/preview'
import { PreviewNotice } from './PreviewNotice'
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
  preview: previewProp,
  articlesPage,
  articlesTag,
  articlesTopic,
}: {
  pageId: string
  /** Defaults to staff Draft Mode (see src/lib/preview.ts). */
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

  const preview = previewProp ?? (await isStaffPreview())
  const api = await getApiClient()
  const result = await api.find({
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
      {/* A page record without modules (e.g. the seeded placeholders) keeps the built-in design
          rather than rendering an empty page. */}
      {!page || !page.modules?.length ? (
        <BaselinePage pageId={pageId} articlesPage={articlesPage} articlesTag={articlesTag} articlesTopic={articlesTopic} />
      ) : (
        <>
          {preview && page._status !== 'published' && <PreviewNotice path={baseline.path} draft />}
          <Blocks modules={page.modules} pageId={pageId} />
        </>
      )}
    </>
  )
}
