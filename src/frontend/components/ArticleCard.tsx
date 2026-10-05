import Link from 'next/link'

import { formatArticleDate, readingTimeMinutes, resolveFeaturedImage, topicLabel } from '@/lib/articles'
import { ArticleMedia } from './ArticleMedia'
import styles from './Articles.module.css'

export type ArticleDoc = Record<string, unknown> & { id: string | number; slug: string; title: string }

function metaOf(doc: ArticleDoc) {
  return {
    date: formatArticleDate(doc.publishedDate || doc.createdAt),
    minutes: readingTimeMinutes(doc.body),
    topic: topicLabel(doc.topic),
    excerpt: typeof doc.excerpt === 'string' ? doc.excerpt : '',
  }
}

function Visual({ doc, topic, sizes, priority }: { doc: ArticleDoc; topic: string | null; sizes: string; priority?: boolean }) {
  const image = resolveFeaturedImage(doc)
  if (image) return <ArticleMedia image={image} variant="card" sizes={sizes} priority={priority} className={styles.cardImage} />
  return (
    <div className={styles.fallbackVisual} aria-hidden="true">
      <span>{topic ?? 'Ideas'}</span>
    </div>
  )
}

export function ArticleCard({ doc, priority = false }: { doc: ArticleDoc; priority?: boolean }) {
  const { date, minutes, topic, excerpt } = metaOf(doc)
  return (
    <article className={styles.card}>
      <div className={styles.cardMedia}>
        <Visual doc={doc} topic={topic} sizes="(min-width: 960px) 30vw, (min-width: 640px) 45vw, 100vw" priority={priority} />
      </div>
      <div className={styles.cardBody}>
        {topic && <span className={styles.chip}>{topic}</span>}
        <h3 className={styles.cardTitle}>
          <Link href={`/ideas/${doc.slug}`} className={styles.stretched}>
            {doc.title}
          </Link>
        </h3>
        {excerpt && <p className={styles.cardExcerpt}>{excerpt}</p>}
        <div className={styles.meta}>
          {date && <span>{date}</span>}
          {date && <span aria-hidden="true">&bull;</span>}
          <span>{minutes} min read</span>
        </div>
      </div>
    </article>
  )
}
