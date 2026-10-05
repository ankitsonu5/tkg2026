'use client'

import Link from 'next/link'

/**
 * Status badge and Log Out button, rendered by Payload inside its own admin header
 * (admin.components.actions). Because they sit in the header's flow they can never cover the
 * account menu, the Save button or page titles, which the previous fixed-position version did.
 */
export function HeaderActions() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '4px' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          height: '32px',
          padding: '0 12px',
          borderRadius: '16px',
          background: 'rgba(11, 20, 32, 0.9)',
          border: '1px solid rgba(200, 164, 91, 0.3)',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          aria-hidden="true"
          style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}
        />
        <span
          style={{
            color: '#c8a45b',
            fontSize: '0.72rem',
            fontWeight: 750,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Executive Suite
        </span>
      </div>

      <Link
        href="/admin/logout"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          height: '32px',
          padding: '0 12px',
          borderRadius: '8px',
          background: 'rgba(200, 164, 91, 0.1)',
          border: '1px solid rgba(200, 164, 91, 0.35)',
          color: '#dfc07e',
          fontSize: '0.78rem',
          fontWeight: 650,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Log Out
      </Link>
    </div>
  )
}
