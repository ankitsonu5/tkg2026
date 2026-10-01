import React from 'react'
import Link from 'next/link'
import { getPayloadClient, publishedOnly } from '@/lib/payload'

export async function IdeasArticlesSection() {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'articles',
      where: publishedOnly,
      sort: '-publishedDate',
      limit: 10,
      depth: 1,
      overrideAccess: true,
    })

    const articles = result.docs as any[]
    if (!articles || articles.length === 0) {
      return null
    }

    return (
      <section className="section section--spacious" id="published-articles" style={{ background: '#070d14', color: '#f7f4ec' }}>
        <div className="container">
          <div style={{ maxWidth: '780px', marginBottom: '3rem' }}>
            <p className="eyebrow eyebrow--gold" style={{ letterSpacing: '0.14em' }}>Authored Articles &amp; Insights</p>
            <h2 style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.5rem)', color: '#ffffff', lineHeight: 1.25, margin: '0.5rem 0 1rem' }}>
              Perspectives on Leadership, Enterprise &amp; Human Systems
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.65 }}>
              Original essays, operational frameworks, and deep observations by Tel K. Ganesan on building durable organizations and navigating change.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '2rem',
            }}
          >
            {articles.map((art) => {
              const rawDate = art.publishedDate || art.createdAt
              const formattedDate = rawDate
                ? new Date(rawDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : null
              const topic = typeof art.topic === 'string' ? art.topic.replace('-', ' ') : 'Perspective'
              const summary = art.excerpt || 'Read this in-depth perspective on leadership, purpose, and narrative alignment.'

              return (
                <article
                  key={art.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '2.25rem',
                    borderRadius: '16px',
                    background: 'rgba(15, 25, 40, 0.7)',
                    border: '1px solid rgba(200, 164, 91, 0.25)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '1.25rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          background: 'rgba(200, 164, 91, 0.15)',
                          border: '1px solid rgba(200, 164, 91, 0.35)',
                          color: '#dfc07e',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        {topic}
                      </span>
                      {formattedDate && (
                        <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 550 }}>
                          {formattedDate}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.4rem', color: '#ffffff', lineHeight: 1.35, marginBottom: '1rem', fontWeight: 650 }}>
                      <Link
                        href={`/ideas/${art.slug}`}
                        style={{ color: '#ffffff', textDecoration: 'none', transition: 'color 0.2s ease' }}
                      >
                        {art.title}
                      </Link>
                    </h3>

                    <p
                      style={{
                        color: '#94a3b8',
                        fontSize: '0.94rem',
                        lineHeight: 1.6,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        marginBottom: '1.75rem',
                      }}
                    >
                      {summary}
                    </p>
                  </div>

                  <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <Link
                      href={`/ideas/${art.slug}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#dfc07e',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        transition: 'gap 0.2s ease',
                      }}
                    >
                      <span>Read Perspective</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    )
  } catch (error) {
    console.error('Failed to load published articles for Ideas section:', error)
    return null
  }
}
