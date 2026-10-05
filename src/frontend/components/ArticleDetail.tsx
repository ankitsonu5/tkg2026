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
} from '@/lib/articles'
import { ArticleCard, type ArticleDoc } from './ArticleCard'
import { ArticleMedia } from './ArticleMedia'
import { Breadcrumbs } from './Breadcrumbs'
import { NewsletterSignup } from './NewsletterSignup'
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

  const [related, origin] = await Promise.all([loadRelated(doc.id, doc.topic), siteOrigin()])
  const url = `${origin}/ideas/${slug}`
  const enc = encodeURIComponent

  return (
    <>
      <ReadingProgress targetId="article-body" />
      <div className="container">
        <Breadcrumbs pageId={pageId} detail={{ label: title }} />


        <div className={styles.layout}>
          <article className={styles.main}>
          <header className={styles.header}>
            <div className={styles.headerTop}>
              {topic && <span className={styles.chip}>{topic}</span>}
              <span className={styles.readTime}>{minutes} min read</span>
            </div>
            <h1 className={styles.title}>{title}</h1>
            {excerpt && <p className={styles.lede}>{excerpt}</p>}
            <div className={styles.byline}>
              <Image
                src="/images/tel-k-ganesan-casual.jpg"
                alt=""
                width={48}
                height={48}
                className={styles.bylineAvatar}
              />
              <div>
                <div className={styles.bylineName}>Tel K. Ganesan</div>
                {date && <time className={styles.bylineDate}>{date}</time>}
              </div>
            </div>
          </header>

            {image && (
              <figure className={styles.cover}>
                <ArticleMedia image={image} sizes="(min-width: 1100px) 760px, 100vw" priority className={styles.coverImage} />
                {!image.cleared && (
                  <figcaption className={styles.previewNote}>
                    Preview only: image rights are not cleared yet, so it will not show on the live site.
                  </figcaption>
                )}
              </figure>
            )}

            <div id="article-body" className={styles.body}>
              {body && <RichTextRenderer data={body} />}
            </div>

            <footer className={styles.closing}>
              <span className={styles.closingEyebrow}>Tel K. Ganesan Perspectives</span>
              <h2 className={styles.closingTitle}>Enjoyed this perspective?</h2>
              <p>Explore more frameworks on founder leadership, cross-cultural enterprise, and mental freedom.</p>
              <div className={styles.closingActions}>
                <Link href="/ideas" className="cta cta--primary">
                  &larr; View all ideas
                </Link>
                <Link href="/connect" className="cta cta--secondary">
                  Start an inquiry
                </Link>
              </div>
            </footer>
          </article>

          <aside className={styles.sidebar} aria-label="Article sidebar">
            <section className={styles.card} aria-label="About the author">
              <div className={styles.author}>
                <Image
                  src="/images/tel-k-ganesan-casual.jpg"
                  alt="Tel K. Ganesan"
                  width={56}
                  height={56}
                  className={styles.authorAvatar}
                />
                <div>
                  <div className={styles.authorName}>Tel K. Ganesan</div>
                  <div className={styles.authorRole}>Executive Chairman | Enterprise Builder | Investor | Producer</div>
                </div>
              </div>
              <div className={styles.share} aria-label="Share this article">
                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
                <a href={`https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`} target="_blank" rel="noopener noreferrer">
                  X
                </a>
                <a href={`mailto:?subject=${enc(title)}&body=${enc(url)}`}>Email</a>
              </div>
            </section>

            {tags.length > 0 && (
              <section className={styles.card} aria-label="Tags">
                <h2 className={styles.cardHeading}>Tags</h2>
                <ul className={styles.tagList}>
                  {tags.map((t) => (
                    <li key={t.slug}>
                      <Link href={`/ideas?tag=${t.slug}`} className={styles.tag}>
                        {t.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {headings.length > 0 && (
              <nav className={styles.card} aria-label="On this page">
                <h2 className={styles.cardHeading}>On this page</h2>
                <ol className={styles.toc}>
                  {headings.slice(0, 8).map((h) => (
                    <li key={h.id} className={h.level === 3 ? styles.tocSub : undefined}>
                      <a href={`#${h.id}`}>{h.text}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            <section className={`${styles.card} ${styles.cardDark}`} aria-label="Newsletter">
              <NewsletterSignup />
            </section>
          </aside>
        </div>

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
