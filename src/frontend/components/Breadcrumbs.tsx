import Link from 'next/link'

import { getBaselinePage } from '@/baseline/pages'

/**
 * Breadcrumbs (FR-IA-01). The trail mirrors the approved hierarchy and the visible URL.
 */
export function Breadcrumbs({
  pageId,
  detail,
}: {
  pageId: string
  detail?: { label: string }
}) {
  const page = getBaselinePage(pageId)
  if (!page || page.pageId === 'HOME') return null

  const parentId =
    pageId === 'ARTICLE' ? 'IDEAS' : pageId === 'ENTITY' ? 'ENTERPRISE' : pageId === 'PROJECT' ? 'CULTURE' : pageId === 'INITIATIVE' ? 'IMPACT' : null
  const parent = parentId ? getBaselinePage(parentId) : null

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link href="/">Home</Link>
        </li>
        {parent && (
          <li>
            <Link href={parent.path}>{parent.title}</Link>
          </li>
        )}
        <li aria-current="page">{detail?.label ?? page.title}</li>
      </ol>
    </nav>
  )
}
