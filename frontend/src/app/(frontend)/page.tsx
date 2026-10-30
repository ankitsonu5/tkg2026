import type { Metadata } from 'next'

import { PremiumHomePage } from '@/components/PremiumHomePage'
import { buildMetadata } from '@/lib/seo/metadata'
import { buildPageSchema } from '@/lib/seo/schema'
import { JsonLd } from '@/frontend/components/JsonLd'

const PAGE_ID = 'HOME'

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    pageId: PAGE_ID,
    title: 'Tel K. Ganesan | Executive Chairman and Enterprise Builder',
    description: 'Tel K. Ganesan builds enterprises, leaders, and platforms across technology, ideas, culture, and community impact. Explore his journey and work.',
    path: '/',
  })
}

export default async function HomeRoute() {
  const homeSchema = buildPageSchema('HOME', '/')
  return (
    <>
      <JsonLd schema={homeSchema} />
      <PremiumHomePage />
    </>
  )
}
