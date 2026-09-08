import type { Metadata } from 'next'

import { PageTemplate } from '@/components/PageTemplate'
import { buildMetadata } from '@/lib/seo/metadata'
import { getBaselinePage } from '@/baseline/pages'

const PAGE_ID = 'HOME'

export async function generateMetadata(): Promise<Metadata> {
  const page = getBaselinePage(PAGE_ID)!
  return buildMetadata({ pageId: PAGE_ID, title: 'Tel K. Ganesan', description: page.purpose, path: '/' })
}

export default async function HomeRoute() {
  return <PageTemplate pageId={PAGE_ID} />
}
