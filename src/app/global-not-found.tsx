import type { Metadata } from 'next'
import { Inter, Source_Serif_4 } from 'next/font/google'

import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import NotFound from './(frontend)/not-found'

import './(frontend)/tokens.css'
import '@/components/layout.css'
import '@/components/homepage.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const sourceSerif = Source_Serif_4({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-source-serif', display: 'swap' })

export const metadata: Metadata = {
  title: { absolute: 'Page not found | Tel K. Ganesan' },
  description: 'This page could not be found. Use the main sections of the Tel K. Ganesan website to continue.',
  robots: { index: false, follow: false },
}

/**
 * Used by Next for any URL that matches no route. It bypasses the normal layout, so the document
 * shell, fonts and site chrome are rebuilt here to match the frontend layout.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          <NotFound />
        </main>
        <SiteFooter />
      </body>
    </html>
  )
}
