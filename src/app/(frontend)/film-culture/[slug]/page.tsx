import type { Metadata } from 'next'

import { DetailTemplate } from '@/components/DetailTemplate'
import { buildMetadata } from '@/lib/seo/metadata'
import { getPayloadClient, publishedOnly } from '@/lib/payload'

const PAGE_ID = 'PROJECT'
const COLLECTION = 'projects' as const

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: COLLECTION,
    where: { and: [{ slug: { equals: slug } }, publishedOnly] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const doc = result.docs[0] as unknown as Record<string, unknown> | undefined
  const title = String(doc?.title ?? doc?.name ?? slug)
  const description = typeof doc?.summary === 'string' ? doc.summary : undefined
  return buildMetadata({ pageId: PAGE_ID, title, description, path: `/film-culture/${slug}` })
}

export default async function Route({ params }: Props) {
  const { slug } = await params
  return <DetailTemplate collection={COLLECTION} slug={slug} pageId={PAGE_ID} />
}
