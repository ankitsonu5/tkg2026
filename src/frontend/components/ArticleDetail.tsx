import Image from 'next/image'
import Link from 'next/link'

import { getPayloadClient, publishedOnly } from '@/lib/payload'
import {
  formatArticleDate,
  prepareArticleBody,
  readingTimeMinutes,
  resolveFeaturedImage,
  articleTags,
  topicLabel,
  TOPIC_LABELS,
} from '@/lib/articles'
import { ArticleCard, type ArticleDoc } from './ArticleCard'
import { ArticleMedia } from './ArticleMedia'
import { Breadcrumbs } from './Breadcrumbs'
import { ReadingProgress } from './ReadingProgress'
import { RichTextRenderer } from './RichTextRenderer'
import styles from './ArticleDetail.module.css'

type Doc = Record<string, unknown>

async function loadRelated(currentId: unknown, topic: unknown): Promise<Doc[]> {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'articles',
      where: { and: [publishedOnly, { id: { not_equals: currentId as string } }] },
      limit: 12,
      depth: 1,
      pagination: false,
      overrideAccess: true,
    })
    const docs = result.docs as unknown as Doc[]
    // Same topic first, then newest.
    const stamp = (d: Doc) => new Date(String(d.publishedDate || d.createdAt || 0)).getTime()
    return [...docs]
      .sort((a, b) => Number(b.topic === topic) - Number(a.topic === topic) || stamp(b) - stamp(a))
      .slice(0, 3)
  } catch {
    return []
  }
}

async function loadLatest(currentId: unknown): Promise<Doc[]> {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'articles',
      where: { and: [publishedOnly, { id: { not_equals: currentId as string } }] },
      limit: 10,
      depth: 1,
      pagination: false,
      overrideAccess: true,
    })
    const docs = result.docs as unknown as Doc[]
    const stamp = (d: Doc) => new Date(String(d.publishedDate || d.createdAt || 0)).getTime()
    return [...docs].sort((a, b) => stamp(b) - stamp(a)).slice(0, 4)
  } catch {
    return []
  }
}

async function siteOrigin(): Promise<string> {
  try {
    const payload = await getPayloadClient()
    const settings = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true })
    const fromCms = settings?.productionOrigin?.trim()
    if (fromCms) return fromCms.replace(/\/+$/, '')
  } catch {
    // fall through to environment
  }
  return (process.env.PRODUCTION_ORIGIN || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/+$/, '')
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export async function ArticleDetail({ doc, pageId }: { doc: Doc; pageId: string }) {
  const title = String(doc.title ?? '')
  const slug = String(doc.slug ?? '')
  const excerpt = typeof doc.excerpt === 'string' ? doc.excerpt : null
  const topic = topicLabel(doc.topic)
  const date = formatArticleDate(doc.publishedDate || doc.createdAt)
  const minutes = readingTimeMinutes(doc.body)
  const image = resolveFeaturedImage(doc)
  const tags = articleTags(doc)
  const { body, headings } = prepareArticleBody(doc.body)

  const [related, latest, origin] = await Promise.all([
    loadRelated(doc.id, doc.topic),
    loadLatest(doc.id),
    siteOrigin(),
  ])
  const url = `${origin}/ideas/${slug}`
  const enc = encodeURIComponent

  return (
    <>
      <ReadingProgress targetId="article-body" />
      <div className="container">
        {/* Centered Editorial Hero Section (Preva Kitchen style) */}
        <header className={styles.heroSection}>
          <div className={styles.heroBreadcrumbWrap}>
            <Breadcrumbs pageId={pageId} detail={{ label: title }} />
          </div>

          <h1 className={styles.heroTitle}>{title}</h1>

          <div className={styles.heroMetaRow}>
            {date && (
              <span className={styles.heroMetaItem}>
                <CalendarIcon />
                <time dateTime={String(doc.publishedDate || doc.createdAt)}>{date}</time>
              </span>
            )}
            {minutes > 0 && (
              <span className={styles.heroMetaItem}>
                <ClockIcon />
                <span>{minutes} min read</span>
              </span>
            )}
            {topic && <span className={styles.heroCategoryBadge}>{topic}</span>}
          </div>
        </header>

        {/* 2-Column Layout */}
        <div className={styles.layout}>
          <article className={styles.main}>
            {image && (
              <figure className={styles.cover}>
                <ArticleMedia image={image} sizes="(min-width: 1100px) 768px, 100vw" priority className={styles.coverImage} />
                {!image.cleared && (
                  <figcaption className={styles.previewNote}>
                    Preview only: image rights are not cleared yet, so it will not show on the live site.
                  </figcaption>
                )}
              </figure>
            )}

            {excerpt && <p className={styles.lede}>{excerpt}</p>}

            <div id="article-body" className={styles.body}>
              {body && <RichTextRenderer data={body} />}
            </div>

            {tags.length > 0 && (
              <div className={styles.articleTagsWrap}>
                <span className={styles.tagsHeading}>Tags:</span>
                <div className={styles.tagChips}>
                  {tags.map((t) => (
                    <Link key={t.slug} href={`/ideas?tag=${t.slug}`} className={styles.tag}>
                      #{t.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <footer className={styles.closing}>
              <span className={styles.closingEyebrow}>Tel K. Ganesan Perspectives</span>
              <h2 className={styles.closingTitle}>Enjoyed this perspective?</h2>
              <p>Explore more frameworks on founder leadership, cross-cultural enterprise, and mental freedom.</p>
              <div className={styles.closingActions}>
                <Link href="/ideas" className="cta cta--primary">
                  &larr; View all ideas
                </Link>
                <Link href="/connect?route=general" className="cta cta--secondary">
                  Start an inquiry
                </Link>
              </div>
            </footer>
          </article>

          {/* Sticky Sidebar with 4 Preva Kitchen style cards */}
          <aside className={styles.sidebar} aria-label="Article sidebar">
            {/* 1. Author Profile Card */}
            <section className={styles.authorWidget} aria-label="About the author">
              <Image
                src="/images/tel-k-ganesan-casual.jpg"
                alt="Tel K. Ganesan"
                width={80}
                height={80}
                className={styles.authorAvatar}
              />
              <div className={styles.authorName}>Tel K. Ganesan</div>
              <div className={styles.authorTagline}>Executive Chairman &bull; Enterprise Builder</div>
              <p className={styles.authorBio}>
                Founder, investor, film producer, and mentor. Tel builds cross-border enterprises, champions high-impact leadership, and unlocks human potential.
              </p>
              <Link href="/about" className={styles.authorBtn}>
                About Tel K. Ganesan &rarr;
              </Link>
              <div className={styles.authorShareRow} aria-label="Share this article">
                <span className={styles.shareLabel}>Share:</span>
                <div className={styles.shareLinks}>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.shareLink}
                    aria-label="Share on LinkedIn"
                  >
                    LinkedIn
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.shareLink}
                    aria-label="Share on X"
                  >
                    X
                  </a>
                  <a href={`mailto:?subject=${enc(title)}&body=${enc(url)}`} className={styles.shareLink} aria-label="Share via Email">
                    Email
                  </a>
                </div>
              </div>
            </section>

            {/* 2. Latest Perspectives Widget */}
            {latest.length > 0 && (
              <section className={styles.card} aria-label="Latest Perspectives">
                <h2 className={styles.sidebarHeading}>Latest Perspectives</h2>
                <ul className={styles.recentList}>
                  {latest.map((item) => {
                    const itemImage = resolveFeaturedImage(item)
                    const itemDate = formatArticleDate(item.publishedDate || item.createdAt)
                    const itemTitle = String(item.title ?? '')
                    const itemSlug = String(item.slug ?? '')
                    return (
                      <li key={String(item.id)}>
                        <Link href={`/ideas/${itemSlug}`} className={styles.recentItem}>
                          <div className={styles.recentThumb}>
                            {itemImage ? (
                              <ArticleMedia image={itemImage} variant="card" sizes="72px" className={styles.recentThumbImg} />
                            ) : (
                              <div className={styles.recentFallback}>{itemTitle.charAt(0)}</div>
                            )}
                          </div>
                          <div className={styles.recentInfo}>
                            <h3 className={styles.recentTitle}>{itemTitle}</h3>
                            {itemDate && <time className={styles.recentDate}>{itemDate}</time>}
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {/* 3. Explore Topics Widget */}
            <section className={styles.card} aria-label="Explore Topics">
              <h2 className={styles.sidebarHeading}>Explore Topics</h2>
              <div className={styles.topicsList}>
                {Object.entries(TOPIC_LABELS).map(([topicKey, topicName]) => (
                  <Link key={topicKey} href={`/ideas?topic=${topicKey}`} className={styles.topicChip}>
                    {topicName}
                  </Link>
                ))}
              </div>
            </section>

            {/* 4. On This Page (Table of contents if headings exist) */}
            {headings.length > 0 && (
              <nav className={styles.card} aria-label="On this page">
                <h2 className={styles.sidebarHeading}>On this page</h2>
                <ol className={styles.toc}>
                  {headings.slice(0, 8).map((h) => (
                    <li key={h.id} className={h.level === 3 ? styles.tocSub : undefined}>
                      <a href={`#${h.id}`}>{h.text}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {/* 5. VIP Direct Inquiry CTA Card */}
            <section className={styles.ctaWidget} aria-label="Start a conversation">
              <span className={styles.ctaBadge}>Direct Connect</span>
              <h2 className={styles.ctaWidgetTitle}>Start a Conversation</h2>
              <p className={styles.ctaWidgetDesc}>
                Explore strategic enterprise ventures, co-investments, or keynote speaking engagements with Tel K. Ganesan.
              </p>
              <Link href="/connect?route=general" className={styles.ctaWidgetBtn}>
                Get in Touch &rarr;
              </Link>
            </section>
          </aside>
        </div>

        {/* Keep Reading Grid */}
        {related.length > 0 && (
          <section className={styles.more} aria-labelledby="keep-reading">
            <h2 id="keep-reading" className={styles.moreHeading}>
              Keep reading
            </h2>
            <div className={styles.moreGrid}>
              {related.map((r) => (
                <ArticleCard key={String(r.id)} doc={r as ArticleDoc} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
