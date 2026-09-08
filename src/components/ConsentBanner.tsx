'use client'

import { useSyncExternalStore } from 'react'

import {
  readConsent,
  writeConsent,
  CONSENT_CHANGE_EVENT,
  type ConsentState,
} from '@/lib/analytics/adapter'

/**
 * Consent gate (FR-PRIV-01).
 *
 * Analytics and attribution storage stay inert until a visitor makes a choice. Declining is
 * as easy as accepting, and withdrawal clears stored attribution. Nothing third-party loads
 * before a choice is made.
 *
 * Consent lives in localStorage, which is an external store: `useSyncExternalStore` is the
 * correct primitive for it. It renders the server snapshot ('unset') during hydration and
 * then syncs, so there is no hydration mismatch and no setState-inside-effect.
 */
function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange)
  // Keeps other tabs in step.
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** The server cannot know the visitor's stored choice; treat it as not yet made. */
const serverSnapshot = (): ConsentState => 'unset'

function useConsent(): ConsentState {
  return useSyncExternalStore(subscribe, readConsent, serverSnapshot)
}

export function ConsentBanner() {
  const state = useConsent()

  if (state !== 'unset') return null

  return (
    <div role="region" aria-label="Privacy and analytics choices" className="container">
      <div className="notice">
        <p className="notice__title">Analytics choice</p>
        <p>
          We use measurement only to understand which journeys work. Nothing is collected until you
          choose. Read the <a href="/privacy">Privacy Policy</a>.
        </p>
        <p>
          <button
            type="button"
            className="cta cta--primary"
            onClick={() => writeConsent('granted')}
          >
            Accept analytics
          </button>{' '}
          <button
            type="button"
            className="cta cta--secondary"
            onClick={() => writeConsent('denied')}
          >
            Decline
          </button>
        </p>
      </div>
    </div>
  )
}

/** Footer entry point so a visitor can change or withdraw consent at any time. */
export function ConsentSettingsLink() {
  const state = useConsent()

  if (state === 'granted') {
    return (
      <button
        type="button"
        onClick={() => writeConsent('denied')}
        className="site-footer__consent-button"
      >
        Withdraw analytics consent
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => writeConsent('granted')}
      className="site-footer__consent-button"
    >
      Analytics: currently off
    </button>
  )
}
