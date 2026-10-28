import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ArticleMedia } from '@/components/ArticleMedia'
import { JsonLd } from '@/components/JsonLd'
import { PreviewNotice } from '@/components/PreviewNotice'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import styles from '@/components/ArticleDetail.module.css'
import { resolveAssetImage } from '@/lib/articles'
import { findCustomPage } from '@/lib/custom-pages'
import { isStaffPreview } from '@/lib/preview'
import { buildMetadata } from '@/lib/seo/metadata'
import { buildCustomPageSchema } from '@/lib/seo/schema'

/**
 * Custom pages added from the admin (Pages records with no baseline Page ID). Every built-in
 * route is more specific than this catch-all, so it only answers paths nothing else serves.
 */

type Props = { params: Promise<{ path: string[] }> }

const pathOf = (segments: string[]) => `/${segments.map((s) => decodeURIComponent(s)).join('/')}`
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = pathOf((await params).path)
  const doc = await findCustomPage(path, await isStaffPreview())
  if (!doc) return {}

  // Social image: the dedicated SEO image, else the featured image (rights-cleared only).
  const asset = [doc.seo?.ogImage, doc.heroImage].find((a) => a && typeof a === 'object' && a.rightsStatus === 'cleared' && a.url)
  const ogImageUrl = asset ? new URL(asset.sizes?.social?.url || asset.url, 'http://local.invalid').pathname : undefined

  return buildMetadata({
    pageId: 'CUSTOM',
    title: String(doc.title ?? ''),
    description: str(doc.purpose) ?? undefined,
    path,
    seo: doc.seo ?? null,
    ogImageUrl,
    modifiedTime: doc.updatedAt,
  })
}

export default async function Route({ params }: Props) {
  const path = pathOf((await params).path)
  const preview = await isStaffPreview()
  const doc = await findCustomPage(path, preview)
  if (!doc) notFound()

  const title = String(doc.title ?? '')
  const summary = str(doc.purpose)
  const body = doc.body && typeof doc.body === 'object' ? (doc.body as Record<string, unknown>) : null
  const image = resolveAssetImage(doc.heroImage)

  return (
    <>
      <JsonLd schema={buildCustomPageSchema(path, str(doc.seo?.title) ?? title, str(doc.seo?.description) ?? summary ?? '')} />
      {preview && <PreviewNotice path={path} draft={doc._status !== 'published'} />}
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li aria-current="page">{title}</li>
          </ol>
        </nav>

        <article className={styles.main} style={{ maxWidth: 768, margin: '0 auto' }}>
          <header className={styles.header}>
            <h1 className={styles.title}>{title}</h1>
            {summary && <p className={styles.lede}>{summary}</p>}
          </header>

          {image && (
            <figure className={styles.cover}>
              <ArticleMedia image={image} sizes="(min-width: 800px) 768px, 100vw" priority className={styles.coverImage} />
              {!image.cleared && <figcaption className={styles.previewNote}>Preview only: image rights are not cleared yet, so it will not show on the live site.</figcaption>}
            </figure>
          )}

          {body && (
            <div className={styles.body}>
              <RichTextRenderer data={body} />
            </div>
          )}
        </article>
      </div>
    </>
  )
}
