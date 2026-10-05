import Link from 'next/link'

import { getBaselinePage } from '@/baseline/pages'
import { getPayloadClient, publishedOnly } from '@/lib/payload'
import { resolveAssetImage } from '@/lib/articles'
import { ArticleMedia } from './ArticleMedia'
import { Breadcrumbs } from './Breadcrumbs'
import { CtaLink } from './CtaLink'
import { RichTextRenderer } from './RichTextRenderer'
import styles from './ArticleDetail.module.css'

type Doc = Record<string, unknown>
type RecordCollection = 'entities' | 'projects' | 'initiatives'

const META: Record<RecordCollection, { eyebrow: string; basePath: string; listLabel: string; related: string }> = {
  entities: { eyebrow: 'Enterprise & Investments', basePath: '/enterprise-investments', listLabel: 'All enterprise & investments', related: 'More from the portfolio' },
  projects: { eyebrow: 'Film & Culture', basePath: '/film-culture', listLabel: 'All film & culture', related: 'More creative work' },
  initiatives: { eyebrow: 'Impact', basePath: '/impact', listLabel: 'All impact', related: 'More initiatives' },
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/**
 * Detail page for an entity, project or initiative: header with the approved relationship or
 * credit wording, the body, an "at a glance" column with only the facts that exist, an official
 * destination, and related records. Every record reaching this page has already cleared the
 * evidence gate, so nothing here invents or pads content; empty fields simply do not render.
 */
export async function RecordDetail({ collection, doc, pageId }: { collection: RecordCollection; doc: Doc; pageId: string }) {
  const baseline = getBaselinePage(pageId)
  const meta = META[collection]
  const title = String(doc.name ?? doc.title ?? '')
  const summary = str(doc.summary)
  const officialUrl = str(doc.officialUrl)
  const wording = str(doc.relationshipWording) ?? str(doc.creditWording)
  const body = doc.body && typeof doc.body === 'object' ? (doc.body as Record<string, unknown>) : null
  const image = resolveAssetImage(doc.logo ?? doc.keyArt)

  const facts: [string, string][] = []
  if (collection === 'projects') {
    if (doc.releaseYear) facts.push(['Release year', String(doc.releaseYear)])
    if (doc.runtimeMinutes) facts.push(['Runtime', `${doc.runtimeMinutes} minutes`])
  }
  if (collection === 'initiatives') {
    const focus = str(doc.focusArea)
    const geography = str(doc.geography)
    if (focus) facts.push(['Focus area', focus])
    if (geography) facts.push(['Geography', geography])
  }

  const outcomes = collection === 'initiatives' && Array.isArray(doc.outcomes) ? (doc.outcomes as Doc[]).filter((o) => str(o.measure)) : []
  const partners =
    collection === 'initiatives' && Array.isArray(doc.partners)
      ? (doc.partners as Doc[]).filter((p) => str(p.name) && p.permissionOnFile === true)
      : []
  const participation = collection === 'initiatives' ? str(doc.participationCriteria) : null

  let related: Doc[] = []
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection,
      where: { and: [publishedOnly, { id: { not_equals: doc.id as string } }] },
      sort: 'displayOrder',
      limit: 3,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    related = result.docs as unknown as Doc[]
  } catch {
    related = []
  }

  return (
    <div className="container">
      <Breadcrumbs pageId={pageId} detail={{ label: title }} />

      <div className={styles.layout}>
        <article className={styles.main}>
          <header className={styles.header}>
            <div className={styles.headerTop}>
              <span className={styles.chip}>{meta.eyebrow}</span>
            </div>
            <h1 className={styles.title}>{title}</h1>
            {wording && <p className={styles.lede} style={{ fontWeight: 650, color: 'var(--color-navy)' }}>{wording}</p>}
            {summary && <p className={styles.lede}>{summary}</p>}
          </header>

          {image && (
            <figure className={styles.cover}>
              <ArticleMedia image={image} sizes="(min-width: 1100px) 760px, 100vw" priority className={styles.coverImage} />
              {!image.cleared && (
                <figcaption className={styles.previewNote}>Preview only: image rights are not cleared yet, so it will not show on the live site.</figcaption>
              )}
            </figure>
          )}

          {body && (
            <div className={styles.body}>
              <RichTextRenderer data={body} />
            </div>
          )}

          {outcomes.length > 0 && (
            <section aria-label="Outcomes" style={{ marginTop: '2.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-navy)' }}>Outcomes</h2>
              <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.7 }}>
                {outcomes.map((o, i) => (
                  <li key={i}>
                    <strong>{str(o.measure)}</strong>
                    {str(o.methodologyNote) && <span style={{ display: 'block', color: 'var(--color-muted)' }}>{str(o.methodologyNote)}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        <aside className={styles.sidebar} aria-label="At a glance">
          {(facts.length > 0 || partners.length > 0 || participation || officialUrl) && (
            <section className={styles.card}>
              <h2 className={styles.cardHeading}>At a glance</h2>
              {facts.length > 0 && (
                <dl style={{ margin: 0, display: 'grid', gap: '0.75rem' }}>
                  {facts.map(([label, value]) => (
                    <div key={label}>
                      <dt style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>{label}</dt>
                      <dd style={{ margin: 0, fontWeight: 650 }}>{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {partners.length > 0 && (
                <p style={{ margin: '1rem 0 0' }}>
                  <strong>Partners:</strong> {partners.map((p) => str(p.name)).join(', ')}
                </p>
              )}
              {participation && (
                <p style={{ margin: '1rem 0 0' }}>
                  <strong>How to take part:</strong> {participation}
                </p>
              )}
              {officialUrl && (
                <p style={{ margin: '1.25rem 0 0' }}>
                  <CtaLink
                    pageId={pageId}
                    ctaId={baseline?.primaryCtaId ?? 'CTA-DETAIL-PRIMARY'}
                    label={baseline?.primaryCta ?? 'Official destination'}
                    destination={officialUrl}
                    destinationType="external"
                    emphasis="primary"
                  />
                </p>
              )}
            </section>
          )}

          <section className={`${styles.card} ${styles.cardDark}`} aria-label="Start a conversation">
            <h2 className={styles.cardHeading}>Start a conversation</h2>
            <p style={{ margin: '0 0 1rem', color: '#cbd5e1', lineHeight: 1.6 }}>
              Interested in this work? Choose the route that matches your request and the right owner will respond.
            </p>
            <Link href={collection === 'entities' ? '/connect?route=strategic-partnership' : collection === 'projects' ? '/connect?route=creative' : '/connect?route=impact'} className={styles.textLink} style={{ color: '#dfc07e' }}>
              Open the inquiry route <span aria-hidden="true">&rarr;</span>
            </Link>
          </section>
        </aside>
      </div>

      {related.length > 0 && (
        <section className={styles.more} aria-labelledby="related-heading">
          <h2 id="related-heading" className={styles.moreHeading}>
            {meta.related}
          </h2>
          <div className={styles.moreGrid}>
            {related.map((r) => (
              <article className="editorial-card" key={String(r.id)}>
                <h3>{String(r.name ?? r.title ?? '')}</h3>
                {str(r.summary) && <p>{str(r.summary)}</p>}
                <Link href={`${meta.basePath}/${String(r.slug)}`} className="text-link">
                  View <span aria-hidden="true">&rarr;</span>
                </Link>
              </article>
            ))}
          </div>
          <p style={{ marginTop: '1.5rem' }}>
            <Link href={meta.basePath} className="text-link">{meta.listLabel} <span aria-hidden="true">&rarr;</span></Link>
          </p>
        </section>
      )}
    </div>
  )
}
