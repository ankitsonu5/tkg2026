import type { Metadata } from 'next'

import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { ConsentBanner } from '@/components/ConsentBanner'
import { buildMetadata } from '@/lib/seo/metadata'

import './tokens.css'
import '@/components/layout.css'

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    pageId: 'HOME',
    title: 'Tel K. Ganesan',
    description: 'Executive Chairman, enterprise builder, investor and producer.',
    path: '/',
  })
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <ConsentBanner />
        <SiteFooter />
      </body>
    </html>
  )
}
