import type { Metadata } from 'next'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { IntentSelector } from '@/components/IntentSelector'
import { buildMetadata } from '@/lib/seo/metadata'
import { getBaselinePage } from '@/baseline/pages'
import { getPayloadClient } from '@/lib/payload'
import { BASELINE_INQUIRY_ROUTES } from '@/baseline/inquiry-routes'

const PAGE_ID = 'CONNECT'

export async function generateMetadata(): Promise<Metadata> {
  const page = getBaselinePage(PAGE_ID)!
  return buildMetadata({ pageId: PAGE_ID, title: page.title, description: page.purpose, path: page.path })
}

export default async function ConnectRoute({
  searchParams,
}: {
  searchParams: Promise<{ route?: string }>
}) {
  const { route } = await searchParams
  const payload = await getPayloadClient()

  const configured = await payload.find({
    collection: 'inquiry-routes',
    limit: 20,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })

  // Only enabled, configured routes are offered. Route availability comes from the CMS, but
  // the field schema and qualification wording come from the baseline constants.
  const enabled = new Set(configured.docs.filter((r) => r.enabled !== false).map((r) => String(r.routeId)))
  const routes = BASELINE_INQUIRY_ROUTES.filter((r) => enabled.has(r.routeId))

  const acceptance = Object.fromEntries(
    configured.docs.map((r) => [String(r.routeId), String(r.acceptanceStatus ?? 'unassigned')]),
  )

  return (
    <div className="container">
      <Breadcrumbs pageId={PAGE_ID} />
      <header className="page-header">
        <p className="page-header__eyebrow">Connect</p>
        <h1>Submit a qualified inquiry</h1>
        <p className="section__lede">
          Choose the route that matches your request. Each route asks only for the context its owner needs to respond
          accountably, and states the response window before you submit.
        </p>
      </header>

      {routes.length === 0 ? (
        <div className="empty-state">
          <p>
            <strong>No inquiry routes are currently accepting submissions.</strong>
          </p>
          <p>Route records must be seeded and enabled before the intent selector appears.</p>
        </div>
      ) : (
        <IntentSelector routes={routes} initialRouteId={route} acceptance={acceptance} />
      )}
    </div>
  )
}
