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

  if (state !== 'unset') {
    return null
  }

  return (
    <aside
      className="consent-shell"
      role="region"
      aria-label="Privacy and analytics consent"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(12, 18, 24, 0.96)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(216, 170, 99, 0.3)',
        padding: '1.1rem 1.5rem',
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
        }}
      >
        <div style={{ flex: '1 1 500px', fontSize: '0.88rem', lineHeight: 1.55, color: '#c4ccd4' }}>
          <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0.2rem', fontSize: '0.92rem' }}>
            Privacy &amp; Analytics
          </strong>
          We use privacy-friendly analytics to observe engagement with Tel K. Ganesan’s platforms and ideas.
          No personal data is collected or sold. Read our{' '}
          <a
            href="/privacy"
            style={{ color: '#d8aa63', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          >
            Privacy Policy
          </a>
          .
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => writeConsent('denied')}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '6px',
              border: '1px solid rgba(196, 204, 212, 0.3)',
              background: 'transparent',
              color: '#c4ccd4',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => writeConsent('granted')}
            style={{
              padding: '0.55rem 1.4rem',
              borderRadius: '6px',
              border: '1px solid #d8aa63',
              background: 'linear-gradient(135deg, #d3a246 0%, #b88628 100%)',
              color: '#0c1218',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(184, 134, 40, 0.25)',
              transition: 'all 0.2s ease',
            }}
          >
            Accept Analytics
          </button>
        </div>
      </div>
    </aside>
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
      Analytics off &middot; Turn on
    </button>
  )
}
