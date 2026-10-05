import { notFound } from 'next/navigation'

import { getPayloadClient, publishedOnly } from '@/lib/payload'
import { getBaselinePage } from '@/baseline/pages'
import { buildDetailSchema } from '@/lib/seo/schema'
import { ArticleDetail } from './ArticleDetail'
import { JsonLd } from './JsonLd'
import { RecordDetail } from './RecordDetail'

type DetailCollection = 'articles' | 'entities' | 'projects' | 'initiatives'

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
  preview = false,
}: {
  collection: DetailCollection
  slug: string
  pageId: string
  preview?: boolean
}) {
  if (!getBaselinePage(pageId)) notFound()

  const payload = await getPayloadClient()
  const result = await payload.find({
    collection,
    where: preview ? { slug: { equals: slug } } : { and: [{ slug: { equals: slug } }, publishedOnly] },
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
      {collection === 'articles' ? (
        <ArticleDetail doc={doc} pageId={pageId} />
      ) : (
        <RecordDetail collection={collection} doc={doc} pageId={pageId} />
      )}
    </>
  )
}
