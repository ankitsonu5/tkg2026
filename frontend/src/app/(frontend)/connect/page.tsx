import type { Metadata } from 'next'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { IntentSelector } from '@/components/IntentSelector'
import { buildMetadata } from '@/lib/seo/metadata'
import { buildPageSchema } from '@/lib/seo/schema'
import { JsonLd } from '@/frontend/components/JsonLd'
import { getBaselinePage } from '@/baseline/pages'
import { getInquiryRouteStatus } from '@/lib/forms'
import { BASELINE_INQUIRY_ROUTES } from '@/baseline/inquiry-routes'

const PAGE_ID = 'CONNECT'

/** The inquiry server action runs under this route: allow time for the post-response email send. */
export const maxDuration = 30

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
  // The backend checks recipients and owner acceptance; only the verdicts come back.
  const configured = await getInquiryRouteStatus()

  const productionReady = Object.fromEntries(configured.map((r) => [r.routeId, r.productionReady]))

  // Only enabled, configured routes are offered. Production additionally hides routes that
  // cannot reach two real, accepted owner mailboxes; the backend enforces the same gate.
  const enabled = new Set(
    configured
      .filter((r) => r.enabled && (process.env.NODE_ENV !== 'production' || productionReady[r.routeId]))
      .map((r) => r.routeId),
  )
  const routes = BASELINE_INQUIRY_ROUTES.filter((r) => enabled.has(r.routeId))

  return (
    <>
      <JsonLd schema={buildPageSchema(PAGE_ID, '/connect')} />
      {/* ── Premium hero section ── */}
      <header className="inner-hero inner-hero--compact">
        <div className="container">
          <Breadcrumbs pageId={PAGE_ID} />
          <div className="inner-hero__grid">
            <div>
              <p className="eyebrow eyebrow--gold">Connect</p>
              <h1>Start a qualified{'\n'}conversation.</h1>
            </div>
            <div className="inner-hero__aside">
              <p>
                Choose the route that matches your request. Each route asks only for the context
                its owner needs to respond accountably, and states the response window before you submit.
              </p>
              <a href="#inquiry-selector" className="cta cta--secondary">
                Submit Qualified Inquiry <span aria-hidden="true">&darr;</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ── Inquiry selector below hero ── */}
      <section className="section connect-selector-section" id="inquiry-selector">
        <div className="container">
          {routes.length === 0 ? (
            <div className="empty-state">
              <p>
                <strong>No inquiry routes are currently accepting submissions.</strong>
              </p>
              <p>Route records must be seeded and enabled before the intent selector appears.</p>
            </div>
          ) : (
            <IntentSelector routes={routes} initialRouteId={route} productionReady={productionReady} />
          )}
        </div>
      </section>
    </>
  )
}
