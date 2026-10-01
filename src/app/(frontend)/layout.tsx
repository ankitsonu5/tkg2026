import type { Metadata } from 'next'
import { Inter, Source_Serif_4 } from 'next/font/google'

import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { ConsentBanner } from '@/components/ConsentBanner'
import { AnalyticsProvider } from '@/components/AnalyticsProvider'
import { getPayloadClient } from '@/lib/payload'
import { buildSitewideSchema } from '@/lib/seo/schema'

import './tokens.css'
import '@/components/layout.css'
import '@/components/homepage.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-source-serif',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getPayloadClient()
  const settings = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true }).catch(() => null)
  const origin = settings?.productionOrigin?.trim() || process.env.PRODUCTION_ORIGIN?.trim()
  const fallbackBase = origin || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

  return {
    metadataBase: new URL(fallbackBase),
    title: {
      template: '%s | Tel K. Ganesan',
      default: 'Tel K. Ganesan | Executive Chairman and Enterprise Builder',
    },
    description: 'Tel K. Ganesan builds enterprises, leaders, and platforms that turn possibility into lasting value.',
  }
}

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayloadClient().catch(() => null)
  const settings = payload ? await payload.findGlobal({ slug: 'site-settings', overrideAccess: true }).catch(() => null) : null
  const ga4MeasurementId = settings?.analytics?.ga4MeasurementId?.trim() || process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim()
  const schema = buildSitewideSchema()

  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body>
        <AnalyticsProvider measurementId={ga4MeasurementId} />
        {schema.map((entry) => (
          <script
            key={String(entry['@id'])}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(entry).replace(/</g, '\\u003c') }}
          />
        ))}
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
        <ConsentBanner />
      </body>
    </html>
  )
}
