import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { buildMetadata } from '@/lib/seo/metadata'
import { buildPageSchema } from '@/lib/seo/schema'
import { JsonLd } from '@/frontend/components/JsonLd'
import { SearchTracker } from '@/frontend/components/SearchTracker'
import { BASELINE_PAGES } from '@/baseline/pages'
import { getPayloadClient, publishedOnly } from '@/lib/payload'

const PAGE_ID = 'SEARCH'

/**
 * FR-SEARCH-01 (P1). Searches only published, public-eligible content.
 * Evidence records, claims, inquiries and drafts are never searched, and the page is always
 * noindex regardless of site settings.
 */
export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    pageId: PAGE_ID,
    title: 'Search | Tel K. Ganesan',
    description: 'Search published pages, articles, enterprise entities, film and culture projects, and impact initiatives on the Tel K. Ganesan website.',
    path: '/search',
    noindex: true,
  })
}

/**
 * The site's core pages are rendered from code, not stored as CMS records, so searching only the
 * CMS would return nothing for the most obvious terms ("Kyyba", "film", "speaking"). These
 * keywords make the fixed pages findable. They are plain navigation aids, not claims.
 */
const PAGE_KEYWORDS: Record<string, string[]> = {
  ABOUT: ['biography', 'bio', 'journey', 'principles', 'detroit'],
  ENTERPRISE: ['kyyba', 'investment', 'investing', 'venture', 'partnership', 'portfolio', 'enterprise'],
  IDEAS: ['mind trap', 'mindtrap', 'performance stack', 'leadership', 'framework', 'podcast', 'blog', 'article', 'essay', 'newsletter'],
  CULTURE: ['film', 'movie', 'trap city', '18', 'celebrity crush', 'kyyba films', 'producer', 'culture'],
  IMPACT: ['community', 'mentorship', 'education', 'stem', 'philanthropy', 'nonprofit', 'initiative'],
  MEDIA: ['speaker', 'speaking', 'keynote', 'press', 'media kit', 'interview', 'television'],
  CONNECT: ['contact', 'inquiry', 'enquiry', 'partner', 'book', 'reach'],
  PRIVACY: ['privacy', 'data', 'cookies', 'analytics', 'consent'],
  TERMS: ['terms', 'legal', 'copyright', 'liability'],
  ACCESSIBILITY: ['accessibility', 'wcag', 'screen reader', 'assistance'],
}

function searchFixedPages(query: string): { title: string; path: string; kind: string }[] {
  const needle = query.toLowerCase()
  return BASELINE_PAGES.filter(
    (page) => page.kind !== 'template' && page.indexable && page.pageId !== 'SEARCH' && page.pageId !== 'NEWSLETTER_CONFIRM',
  )
    .filter((page) => {
      const haystack = [page.title, page.purpose, page.seoTitle, page.seoDescription, ...(PAGE_KEYWORDS[page.pageId] ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
    .map((page) => ({ title: page.title, path: page.path, kind: 'page' }))
}

const SEARCHABLE = [
  { collection: 'pages' as const, titleField: 'title', pathOf: (d: Record<string, unknown>) => String(d.path ?? '/') },
  { collection: 'articles' as const, titleField: 'title', pathOf: (d: Record<string, unknown>) => `/ideas/${d.slug}` },
  { collection: 'entities' as const, titleField: 'name', pathOf: (d: Record<string, unknown>) => `/enterprise-investments/${d.slug}` },
  { collection: 'projects' as const, titleField: 'title', pathOf: (d: Record<string, unknown>) => `/film-culture/${d.slug}` },
  { collection: 'initiatives' as const, titleField: 'title', pathOf: (d: Record<string, unknown>) => `/impact/${d.slug}` },
]

export default async function SearchRoute({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = (q ?? '').trim().slice(0, 120)

  let results: { title: string; path: string; kind: string }[] = []

  if (query) {
    const payload = await getPayloadClient()
    const found = await Promise.all(
      SEARCHABLE.map(async (target) => {
        const res = await payload.find({
          collection: target.collection,
          where: {
            and: [
              publishedOnly,
              {
                or: [
                  { [target.titleField]: { like: query } },
                  ...(target.collection === 'articles' ? [{ excerpt: { like: query } }] : []),
                  ...(['entities', 'projects', 'initiatives'].includes(target.collection) ? [{ summary: { like: query } }] : []),
                ],
              },
            ],
          },
          limit: 10,
          depth: 0,
          pagination: false,
          overrideAccess: true,
        })
        return res.docs.map((doc) => ({
          title: String((doc as unknown as Record<string, unknown>)[target.titleField] ?? ''),
          path: target.pathOf(doc as unknown as Record<string, unknown>),
          kind: target.collection,
        }))
      }),
    )
    const seen = new Set<string>()
    results = [...searchFixedPages(query), ...found.flat()].filter((r) => {
      if (seen.has(r.path)) return false
      seen.add(r.path)
      return true
    })
  }

  return (
    <div className="container">
      {query ? <SearchTracker query={query} resultCount={results.length} /> : null}
      <JsonLd schema={buildPageSchema(PAGE_ID, '/search')} />
      <Breadcrumbs pageId={PAGE_ID} />
      <header className="page-header">
        <h1>Search</h1>
      </header>

      <form className="form" method="get" action="/search" role="search">
        <div className="field">
          <label htmlFor="q">Search published content</label>
          <input id="q" name="q" type="search" defaultValue={query} maxLength={120} />
        </div>
        <button type="submit" className="cta cta--primary">
          Search
        </button>
      </form>

      {query && (
        <section className="section">
          <h2>
            {results.length} result{results.length === 1 ? '' : 's'}
          </h2>
          {results.length === 0 ? (
            <div className="empty-state">
              <p>No published content matches that search.</p>
              <p>Try a different term, or browse the primary navigation.</p>
            </div>
          ) : (
            <ul className="card-grid">
              {results.map((result) => (
                <li className="card" key={`${result.kind}:${result.path}`}>
                  <h3>
                    <Link href={result.path}>{result.title}</Link>
                  </h3>
                  <p>{result.kind}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
