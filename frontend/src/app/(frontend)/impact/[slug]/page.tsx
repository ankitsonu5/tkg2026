import type { Metadata } from 'next'

import { DetailTemplate } from '@/components/DetailTemplate'
import { buildMetadata, type BuildMetadataArgs } from '@/lib/seo/metadata'
import { getApiClient, hasOwnPage, publishedOnly } from '@/lib/api'
import { isStaffPreview } from '@/lib/preview'

const PAGE_ID = 'INITIATIVE'
const COLLECTION = 'initiatives' as const

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const api = await getApiClient()
  const result = await api.find({
    collection: COLLECTION,
    // Staff previewing a draft (Draft Mode) get its real title/description too.
    where: (await isStaffPreview()) ? { and: [{ slug: { equals: slug } }, hasOwnPage] } : { and: [{ slug: { equals: slug } }, publishedOnly, hasOwnPage] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const doc = result.docs[0] as unknown as Record<string, unknown> | undefined
  const title = String(doc?.title ?? doc?.name ?? slug)
  const description = typeof doc?.summary === 'string' ? doc.summary : undefined
  return buildMetadata({ pageId: PAGE_ID, title, description, path: `/impact/${slug}`, seo: (doc?.seo as BuildMetadataArgs['seo']) ?? null })
}

export default async function Route({ params }: Props) {
  const { slug } = await params
  return <DetailTemplate collection={COLLECTION} slug={slug} pageId={PAGE_ID} />
}
