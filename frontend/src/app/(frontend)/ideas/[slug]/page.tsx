import type { Metadata } from 'next'

import { DetailTemplate } from '@/components/DetailTemplate'
import { buildMetadata } from '@/lib/seo/metadata'
import { getApiClient, publishedOnly } from '@/lib/api'
import { isStaffPreview } from '@/lib/preview'

const PAGE_ID = 'ARTICLE'
const COLLECTION = 'articles' as const

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const api = await getApiClient()
  const result = await api.find({
    collection: COLLECTION,
    // Staff previewing a draft (Draft Mode) get its real title/description too.
    where: (await isStaffPreview()) ? { slug: { equals: slug } } : { and: [{ slug: { equals: slug } }, publishedOnly] },
    limit: 1,
    depth: 1,
    pagination: false,
    overrideAccess: true,
  })
  const doc = result.docs[0] as unknown as Record<string, any> | undefined

  // The editor's SEO fields drive the page's search and social metadata.
  const title = String(doc?.seo?.title?.trim() || doc?.title || slug)
  // Search results cut snippets at about 155 characters, so a long excerpt fallback is trimmed at a word boundary.
  const excerpt = String(doc?.excerpt || '').replace(/\s+/g, ' ').trim()
  const shortExcerpt = excerpt.length > 155 ? `${excerpt.slice(0, 154).replace(/\s+\S*$/, '')}…` : excerpt
  const description = String(doc?.seo?.description?.trim() || shortExcerpt || '') || undefined

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
    // SEO fields are already applied above; skip the Pages-record lookup.
    seo: null,
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
