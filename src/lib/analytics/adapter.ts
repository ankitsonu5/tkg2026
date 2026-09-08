'use client'

import { ANALYTICS_EVENTS, scrubParams, type AnalyticsEventName } from './events'

/**
 * Provider-independent analytics adapter.
 *
 * Nothing is sent unless BOTH are true: the visitor granted analytics consent, and a
 * measurement ID is configured. With no provider configured the adapter still runs its
 * validation and scrubbing so the taxonomy can be exercised in development without a live
 * GA4 property.
 */

export type ConsentState = 'granted' | 'denied' | 'unset'

export const CONSENT_STORAGE_KEY = 'tkg.consent.v1'

/** Notifies subscribers in this tab; the native `storage` event covers other tabs. */
export const CONSENT_CHANGE_EVENT = 'tkg:consent-change'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function readConsent(): ConsentState {
  if (typeof window === 'undefined') return 'unset'
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (raw === 'granted' || raw === 'denied') return raw
    return 'unset'
  } catch {
    // Storage throws in some private modes; treat as no consent rather than assuming yes.
    return 'unset'
  }
}

export function writeConsent(state: Exclude<ConsentState, 'unset'>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, state)
  } catch {
    /* non-fatal */
  }
  if (state === 'denied') {
    // Withdrawal must also clear attribution already stored.
    try {
      window.localStorage.removeItem('tkg.attribution.v1')
      window.sessionStorage.removeItem('tkg.attribution.v1')
    } catch {
      /* non-fatal */
    }
  }
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT))
}

const seenOnce = new Set<string>()

/**
 * @param opts.once Guards events that must fire exactly once per attempt (form_start,
 *                  download) and prevents duplicate page_view on client-side navigation.
 */
export function track(
  event: AnalyticsEventName,
  params: Record<string, unknown> = {},
  opts: { once?: string } = {},
): void {
  if (typeof window === 'undefined') return

  if (opts.once) {
    if (seenOnce.has(opts.once)) return
    seenOnce.add(opts.once)
  }

  if (readConsent() !== 'granted') return

  const payload = scrubParams(params)

  if (process.env.NODE_ENV === 'development') {
    const required = ANALYTICS_EVENTS[event] as readonly string[]
    const missing = required.filter((key) => !(key in payload))
    if (missing.length > 0) {
      console.warn('[analytics] ' + event + ' missing baseline parameters: ' + missing.join(', '))
    }
  }

  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
  if (!measurementId) return

  window.dataLayer = window.dataLayer || []
  window.gtag?.('event', event, payload)
}
