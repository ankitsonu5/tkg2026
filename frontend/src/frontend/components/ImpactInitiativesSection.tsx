import Link from 'next/link'

import { getApiClient, hasOwnPage, publishedOnly } from '@/lib/api'

type Initiative = { id: string | number; title: string; slug: string; summary?: string | null; focusArea?: string | null; geography?: string | null }

/**
 * MOD-IMPACT-INITIATIVES. Lists published initiatives. Every record has already cleared the
 * evidence gate, and the section is omitted entirely until at least one exists, so the page never
 * shows an empty placeholder (FR-EVD-05).
 */
export async function ImpactInitiativesSection() {
  let items: Initiative[] = []
  try {
    const api = await getApiClient()
    const result = await api.find({
      collection: 'initiatives',
      // Focus-area cards (card only) are shown by the focus-area tabs, not as programs.
      where: { and: [publishedOnly, hasOwnPage] },
      sort: 'displayOrder',
      limit: 12,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    items = result.docs as unknown as Initiative[]
  } catch {
    return null
  }
  if (items.length === 0) return null

  return (
    <section className="section section--spacious" id="initiatives" aria-labelledby="initiatives-heading">
      <div className="container">
        <div className="section-intro">
          <p className="eyebrow">Initiatives</p>
          <h2 id="initiatives-heading">Programs with a clear purpose and owner</h2>
        </div>
        <div className="editorial-grid editorial-grid--three">
          {items.map((item, index) => (
            <article className="editorial-card" key={String(item.id)}>
              <span className="editorial-card__index">{String(index + 1).padStart(2, '0')}</span>
              <h3>{item.title}</h3>
              {item.summary && <p>{item.summary}</p>}
              {(item.focusArea || item.geography) && (
                <p className="field__purpose">{[item.focusArea, item.geography].filter(Boolean).join(' \u00b7 ')}</p>
              )}
              <Link href={`/impact/${item.slug}`} className="text-link">
                View initiative <span aria-hidden="true">&rarr;</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
