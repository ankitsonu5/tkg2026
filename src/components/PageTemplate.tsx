import { notFound } from 'next/navigation'

import type { Page } from '@/payload-types'
import { getPayloadClient, publishedOnly } from '@/lib/payload'
import { getBaselinePage } from '@/baseline/pages'
import { Blocks } from './Blocks'
import { Breadcrumbs } from './Breadcrumbs'

/**
 * Shared renderer for the eight fixed pages plus the three utility pages.
 *
 * `preview` is honoured only for an authenticated request; an anonymous visitor always gets
 * the published-only query, so a draft cannot be read by adding ?preview=1 to the URL.
 */
export async function PageTemplate({ pageId, preview = false }: { pageId: string; preview?: boolean }) {
  const baseline = getBaselinePage(pageId)
  if (!baseline) notFound()

  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'pages',
    where: preview ? { pageId: { equals: pageId } } : { and: [{ pageId: { equals: pageId } }, publishedOnly] },
    limit: 1,
    depth: 2,
    draft: preview,
    pagination: false,
    overrideAccess: true,
  })

  const page = result.docs[0] as Page | undefined

  return (
    <>
      <div className="container">
        <Breadcrumbs pageId={pageId} />
      </div>

      {!page ? (
        <div className="container">
          <header className="page-header">
            <p className="page-header__eyebrow">{baseline.pageId}</p>
            <h1>{baseline.title}</h1>
            <p className="section__lede">{baseline.purpose}</p>
          </header>
          <div className="empty-state">
            <p>
              <strong>Template built; no published record yet.</strong>
            </p>
            <p>
              This route, its modules and its CTA journey exist. Publishing requires approved copy and evidence
              that clears the publication gate (baseline Section 9).
            </p>
          </div>
        </div>
      ) : (
        <>
          {preview && page._status !== 'published' && (
            <div className="container">
              <div className="notice">
                <p className="notice__title">Draft preview</p>
                <p>You are viewing unpublished content. It is not visible to the public.</p>
              </div>
            </div>
          )}
          <Blocks modules={page.modules} pageId={pageId} />
        </>
      )}
    </>
  )
}
