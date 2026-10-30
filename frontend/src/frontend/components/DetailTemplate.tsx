import { notFound } from 'next/navigation'

import { getApiClient, hasOwnPage, publishedOnly } from '@/lib/api'
import { isStaffPreview } from '@/lib/preview'
import { PreviewNotice } from './PreviewNotice'
import { getBaselinePage } from '@/baseline/pages'
import { buildDetailSchema } from '@/lib/seo/schema'
import { ArticleDetail } from './ArticleDetail'
import { JsonLd } from './JsonLd'
import { RecordDetail } from './RecordDetail'

type DetailCollection = 'articles' | 'entities' | 'projects' | 'initiatives'

const DETAIL_PREFIX: Record<DetailCollection, string> = {
  articles: '/ideas/',
  entities: '/enterprise-investments/',
  projects: '/film-culture/',
  initiatives: '/impact/',
}

/**
 * Shared loader for the four detail templates (ARTICLE, ENTITY, PROJECT, INITIATIVE).
 *
 * The baseline requires that "the template blocks publication when required evidence is
 * missing" - that is enforced at write time by the publication gate, so anything reaching
 * this renderer has already cleared it. Here we only ever query published records for
 * anonymous visitors.
 */
export async function DetailTemplate({
  collection,
  slug,
  pageId,
  preview: previewProp,
}: {
  collection: DetailCollection
  slug: string
  pageId: string
  /** Defaults to staff Draft Mode (see src/lib/preview.ts). */
  preview?: boolean
}) {
  if (!getBaselinePage(pageId)) notFound()

  const preview = previewProp ?? (await isStaffPreview())
  const api = await getApiClient()
  const result = await api.find({
    collection,
    // Card-only records (Film & Culture / Impact / Enterprises) have no page of their own.
    where: {
      and: [{ slug: { equals: slug } }, ...(preview ? [] : [publishedOnly]), ...(collection === 'articles' ? [] : [hasOwnPage])],
    },
    limit: 1,
    depth: 2,
    draft: preview,
    pagination: false,
    overrideAccess: true,
  })

  const doc = result.docs[0] as unknown as Record<string, unknown> | undefined
  if (!doc) notFound()

  const detailSchemas = buildDetailSchema(collection, slug, pageId, doc)

  return (
    <>
      <JsonLd schema={detailSchemas} />
      {preview && <PreviewNotice path={DETAIL_PREFIX[collection] + slug} draft={doc._status !== 'published'} />}
      {collection === 'articles' ? (
        <ArticleDetail doc={doc} pageId={pageId} />
      ) : (
        <RecordDetail collection={collection} doc={doc} pageId={pageId} />
      )}
    </>
  )
}
