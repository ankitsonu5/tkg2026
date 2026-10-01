import { notFound } from 'next/navigation'

import { getPayloadClient, publishedOnly } from '@/lib/payload'
import { getBaselinePage } from '@/baseline/pages'
import { buildDetailSchema } from '@/lib/seo/schema'
import { Breadcrumbs } from './Breadcrumbs'
import { CtaLink } from './CtaLink'
import { RichTextRenderer } from './RichTextRenderer'
import { JsonLd } from './JsonLd'

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

  const rawDate = doc.publishedDate || doc.createdAt
  const formattedDate = rawDate ? new Date(String(rawDate)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null
  const topic = typeof doc.topic === 'string' ? doc.topic.replace('-', ' ') : null
  const body = (doc.body && typeof doc.body === 'object') ? (doc.body as Record<string, unknown>) : null

  const detailSchemas = buildDetailSchema(collection, slug, pageId, doc)

  return (
    <>
      <JsonLd schema={detailSchemas} />
      <div className="container">
        <Breadcrumbs pageId={pageId} detail={{ label: title }} />
        <header className="page-header" style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <span className="page-header__eyebrow" style={{ margin: 0 }}>{baseline.title}</span>
            {topic && (
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: 'rgba(200, 164, 91, 0.15)',
                  border: '1px solid rgba(200, 164, 91, 0.35)',
                  color: '#a47c2d',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {topic}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', lineHeight: 1.2, marginBottom: '1.25rem' }}>{title}</h1>
          
          {Boolean(formattedDate || doc.authorshipStatus) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                color: '#718096',
                fontSize: '0.88rem',
                borderBottom: '1px solid rgba(11, 20, 32, 0.08)',
                paddingBottom: '1.25rem',
                marginBottom: '1.75rem',
              }}
            >
              <span>By <strong>Tel K. Ganesan</strong></span>
              {formattedDate && <span>&bull;</span>}
              {formattedDate && <span>{formattedDate}</span>}
            </div>
          )}

          {summary && <p className="section__lede" style={{ fontSize: '1.2rem', lineHeight: 1.6, color: '#4a5568' }}>{summary}</p>}
        </header>

        <StatusLine doc={doc} />

        {body && (
          <section style={{ padding: '1rem 0 4rem' }}>
            <RichTextRenderer data={body} />
          </section>
        )}

        {officialUrl && (
          <p style={{ maxWidth: '820px', margin: '2rem auto' }}>
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

        {/* Closing Editorial Box */}
        {collection === 'articles' && (
          <div
            style={{
              maxWidth: '820px',
              margin: '3rem auto 5rem',
              padding: '2.5rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #0b1420 0%, #101d2d 100%)',
              border: '1px solid rgba(200, 164, 91, 0.3)',
              boxShadow: '0 20px 40px rgba(11, 20, 32, 0.15)',
              color: '#f7f4ec',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <span style={{ color: '#c8a45b', fontSize: '0.78rem', fontWeight: 750, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Tel K. Ganesan Perspectives
            </span>
            <h3 style={{ fontSize: '1.45rem', color: '#ffffff', margin: 0 }}>
              Enjoyed this perspective?
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.98rem', margin: 0, lineHeight: 1.6 }}>
              Explore more frameworks on founder leadership, cross-cultural enterprise, and mental freedom.
            </p>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <a
                href="/ideas"
                className="cta cta--primary"
                style={{ fontSize: '0.84rem' }}
              >
                &larr; View All Ideas
              </a>
              <a
                href="/connect"
                className="cta cta--secondary"
                style={{ fontSize: '0.84rem', borderColor: 'rgba(200, 164, 91, 0.4)', color: '#dfc07e' }}
              >
                Start an Inquiry
              </a>
            </div>
          </div>
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
