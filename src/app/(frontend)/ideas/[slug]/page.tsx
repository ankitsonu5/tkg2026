import type { Metadata } from 'next'

import { DetailTemplate } from '@/components/DetailTemplate'
import { buildMetadata } from '@/lib/seo/metadata'
import { getPayloadClient, publishedOnly } from '@/lib/payload'

const PAGE_ID = 'ARTICLE'
const COLLECTION = 'articles' as const

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: COLLECTION,
    where: { and: [{ slug: { equals: slug } }, publishedOnly] },
    limit: 1,
    depth: 1,
    pagination: false,
    overrideAccess: true,
  })
  const doc = result.docs[0] as unknown as Record<string, any> | undefined

  // The editor's SEO fields drive the page's search and social metadata.
  const title = String(doc?.seo?.title?.trim() || doc?.title || slug)
  const description = String(doc?.seo?.description?.trim() || doc?.excerpt || '') || undefined

  // Social image: the dedicated SEO image, else the featured image. Only rights-cleared
  // assets are ever used, because the media route will not serve anything else publicly.
  const asset = [doc?.seo?.ogImage, doc?.heroImage].find(
    (a) => a && typeof a === 'object' && a.rightsStatus === 'cleared' && a.url,
  )
  const ogImageUrl = asset ? new URL(asset.sizes?.social?.url || asset.url, 'http://local.invalid').pathname : undefined

  return buildMetadata({
    pageId: PAGE_ID,
    title,
    description,
    path: `/ideas/${slug}`,
    noindex: doc?.seo?.noindex === true,
    ogImageUrl,
    ogType: 'article',
    publishedTime: doc?.publishedDate || doc?.createdAt,
    modifiedTime: doc?.updatedAt,
  })
}

export default async function Route({ params }: Props) {
  const { slug } = await params
  return <DetailTemplate collection={COLLECTION} slug={slug} pageId={PAGE_ID} />
}
