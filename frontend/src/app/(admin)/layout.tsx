import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import '@/admin/admin.css'
import '@/admin/admin-premium.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-admin', display: 'swap' })

export const metadata: Metadata = {
  title: { template: '%s ‹ Tel K. Ganesan — Admin', default: 'Dashboard ‹ Tel K. Ganesan — Admin' },
  robots: { index: false, follow: false },
}

/** Root layout for the admin panel: none of the public site's chrome or styles. */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="wpa" style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  )
}
