import { notFound } from 'next/navigation'

import { getPayloadClient, publishedOnly } from '@/lib/payload'
import { getBaselinePage } from '@/baseline/pages'
import { Breadcrumbs } from './Breadcrumbs'
import { CtaLink } from './CtaLink'

type DetailCollection = 'articles' | 'entities' | 'projects' | 'initiatives'

/**
 * Shared renderer for the four detail templates (ARTICLE, ENTITY, PROJECT, INITIATIVE).
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
  const baseline = getBaselinePage(pageId)
  if (!baseline) notFound()

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

  const title = String(doc.title ?? doc.name ?? slug)
  const summary = typeof doc.summary === 'string' ? doc.summary : typeof doc.excerpt === 'string' ? doc.excerpt : null
  const officialUrl = typeof doc.officialUrl === 'string' ? doc.officialUrl : null

  return (
    <>
      <div className="container">
        <Breadcrumbs pageId={pageId} detail={{ label: title }} />
        <header className="page-header">
          <p className="page-header__eyebrow">{baseline.title}</p>
          <h1>{title}</h1>
          {summary && <p className="section__lede">{summary}</p>}
        </header>

        <StatusLine doc={doc} />

        {officialUrl && (
          <p>
            <CtaLink
              pageId={pageId}
              ctaId={baseline.primaryCtaId}
              label={baseline.primaryCta ?? 'Official destination'}
              destination={officialUrl}
              destinationType="external"
              emphasis="primary"
            />
          </p>
        )}
      </div>
    </>
  )
}

/** Surfaces the exact approved relationship/credit wording rather than an inferred label. */
function StatusLine({ doc }: { doc: Record<string, unknown> }) {
  const wording =
    (typeof doc.relationshipWording === 'string' && doc.relationshipWording) ||
    (typeof doc.creditWording === 'string' && doc.creditWording) ||
    null

  if (!wording) return null

  return (
    <p>
      <strong>{wording}</strong>
    </p>
  )
}
