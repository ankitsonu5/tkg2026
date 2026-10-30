import type { Metadata } from 'next'

import { PageTemplate } from '@/components/PageTemplate'
import { buildMetadata } from '@/lib/seo/metadata'
import { getBaselinePage } from '@/baseline/pages'

const PAGE_ID = 'MEDIA'

export async function generateMetadata(): Promise<Metadata> {
  const page = getBaselinePage(PAGE_ID)!
  return buildMetadata({ pageId: PAGE_ID, title: page.title, description: page.purpose, path: page.path })
}

export default async function Route() {
  return <PageTemplate pageId={PAGE_ID} />
}
