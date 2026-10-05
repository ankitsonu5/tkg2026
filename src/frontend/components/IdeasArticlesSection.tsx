import Link from 'next/link'
import { notFound } from 'next/navigation'

import { articleTags, tagSlug } from '@/lib/articles'
import { getPayloadClient, publishedOnly } from '@/lib/payload'
import { ArticleCard, type ArticleDoc } from './ArticleCard'
import styles from './Articles.module.css'

export const ARTICLES_PER_PAGE = 6

async function loadArticles(): Promise<ArticleDoc[]> {
  try {
    const payload = await getPayloadClient()
    // The blog is small, so we fetch the published set once and page it in memory. That keeps
    // ordering correct for posts that have no explicit published date (they fall back to the
    // created date), which a database sort cannot do.
    const result = await payload.find({
      collection: 'articles',
      where: publishedOnly,
      limit: 500,
      depth: 1,
      pagination: false,
      overrideAccess: true,
    })
    const docs = result.docs as unknown as ArticleDoc[]
    const stamp = (d: ArticleDoc) => new Date(String(d.publishedDate || d.createdAt || 0)).getTime()
    return [...docs].sort((a, b) => stamp(b) - stamp(a))
  } catch (error) {
    console.error('Failed to load published articles for Ideas section:', error)
    return []
  }
}

/** Total number of listing pages for a given article count. */
export function totalArticlePages(count: number): number {
  return Math.max(1, Math.ceil(count / ARTICLES_PER_PAGE))
}

function hrefFor(page: number, tag?: string): string {
  const params = new URLSearchParams()
  if (tag) params.set('tag', tag)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `/ideas?${query}` : '/ideas'
}

function Pagination({ current, total, tag }: { current: number; total: number; tag?: string }) {
  if (total <= 1) return null
  const pages = Array.from({ length: total }, (_, i) => i + 1)
  return (
    <nav className={styles.pagination} aria-label="Blog pages">
      {current > 1 ? (
        <Link href={hrefFor(current - 1, tag)} className={styles.pageStep} rel="prev">
          <span aria-hidden="true">&larr;</span> Previous
        </Link>
      ) : (
        <span className={`${styles.pageStep} ${styles.pageDisabled}`} aria-hidden="true">
          &larr; Previous
        </span>
      )}

      <ul className={styles.pageList}>
        {pages.map((n) => (
          <li key={n}>
            {n === current ? (
              <span className={`${styles.pageNum} ${styles.pageCurrent}`} aria-current="page">
                {n}
              </span>
            ) : (
              <Link href={hrefFor(n, tag)} className={styles.pageNum} aria-label={`Page ${n}`}>
                {n}
              </Link>
            )}
          </li>
        ))}
      </ul>

      {current < total ? (
        <Link href={hrefFor(current + 1, tag)} className={styles.pageStep} rel="next">
          Next <span aria-hidden="true">&rarr;</span>
        </Link>
      ) : (
        <span className={`${styles.pageStep} ${styles.pageDisabled}`} aria-hidden="true">
          Next &rarr;
        </span>
      )}
    </nav>
  )
}

export async function IdeasArticlesSection({ page = 1, tag }: { page?: number; tag?: string }) {
  const all = await loadArticles()
  if (all.length === 0) return null

  const activeTag = tag ? tagSlug(tag) : ''
  const articles = activeTag ? all.filter((a) => articleTags(a).some((t) => t.slug === activeTag)) : all
  const activeLabel = activeTag
    ? (all.flatMap((a) => articleTags(a)).find((t) => t.slug === activeTag)?.label ?? tag)
    : null

  const total = totalArticlePages(articles.length)
  if (page > total) notFound()

  const start = (page - 1) * ARTICLES_PER_PAGE
  const visible = articles.slice(start, start + ARTICLES_PER_PAGE)

  return (
    <section className={styles.section} id="published-articles" aria-label="Latest articles">
      <div className="container">
        {activeLabel && (
          <p className={styles.filterBar}>
            Showing posts tagged <strong>{activeLabel}</strong>
            <Link href="/ideas" className={styles.filterClear}>
              Clear filter
            </Link>
          </p>
        )}
        {articles.length === 0 && <p className={styles.empty}>No articles use this tag yet.</p>}
        <div className={styles.grid}>
          {visible.map((doc, index) => (
            <ArticleCard key={String(doc.id)} doc={doc} priority={index < 3} />
          ))}
        </div>
        <Pagination current={page} total={total} tag={activeTag || undefined} />
      </div>
    </section>
  )
}
