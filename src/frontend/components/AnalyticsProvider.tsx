'use client'

import { useEffect, useSyncExternalStore, useRef, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Script from 'next/script'

import {
  readConsent,
  CONSENT_CHANGE_EVENT,
  resolvePageId,
  track,
  type ConsentState,
} from '@/lib/analytics/adapter'

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

const serverSnapshot = (): ConsentState => 'unset'

function NavigationTracker({ measurementId }: { measurementId?: string | null }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const consent = useSyncExternalStore(subscribe, readConsent, serverSnapshot)
  const lastTrackedPath = useRef<string | null>(null)

  useEffect(() => {
    if (consent !== 'granted' || !pathname) return

    // Avoid double firing for the exact same path
    if (lastTrackedPath.current === pathname) return
    lastTrackedPath.current = pathname

    const pageId = resolvePageId(pathname)
    track('page_view', {
      page_id: pageId,
      page_path: pathname,
    })
  }, [consent, pathname, searchParams])

  return null
}

export function AnalyticsProvider({ measurementId }: { measurementId?: string | null }) {
  const effectiveId = measurementId?.trim() || process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim()
  const consent = useSyncExternalStore(subscribe, readConsent, serverSnapshot)

  // Strictly inert unless both visitor consent is granted and a valid measurement ID exists
  const isEnabled = consent === 'granted' && Boolean(effectiveId)

  return (
    <>
      {isEnabled && effectiveId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(effectiveId)}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${effectiveId}', {
                send_page_view: false,
                transport_type: 'beacon'
              });
            `}
          </Script>
        </>
      ) : null}

      <Suspense fallback={null}>
        <NavigationTracker measurementId={effectiveId} />
      </Suspense>
    </>
  )
}
