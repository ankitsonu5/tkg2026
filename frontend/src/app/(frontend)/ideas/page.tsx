import type { Metadata } from 'next'

import { PageTemplate } from '@/components/PageTemplate'
import { buildMetadata } from '@/lib/seo/metadata'
import { getBaselinePage } from '@/baseline/pages'

const PAGE_ID = 'IDEAS'

type Props = { searchParams: Promise<{ page?: string; tag?: string; topic?: string }> }

/** ?page=abc, 0 or negative all fall back to page 1. */
function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '1', 10)
  return Number.isFinite(n) && n >= 1 ? n : 1
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const page = getBaselinePage(PAGE_ID)!
  const params = await searchParams
  const current = parsePage(params.page)
  const tag = params.tag?.trim()
  // Each listing page is its own canonical URL and gets a distinct title.
  return buildMetadata({
    pageId: PAGE_ID,
    title: current > 1 ? `${page.title} - Page ${current}` : page.title,
    description: page.purpose,
    path: current > 1 ? `/ideas?page=${current}` : page.path,
    // Filtered lists (tag or topic) are thin duplicates of the main listing; keep them out of the index.
    noindex: Boolean(tag || params.topic),
  })
}

export default async function Route({ searchParams }: Props) {
  const params = await searchParams
  const current = parsePage(params.page)
  return <PageTemplate pageId={PAGE_ID} articlesPage={current} articlesTag={params.tag?.trim() || undefined} articlesTopic={params.topic?.trim() || undefined} />
}
