'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export function AdminLogoutButton() {
  const pathname = usePathname()

  // Do not show on login / logout pages
  if (!pathname || pathname.includes('/login') || pathname.includes('/logout')) {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '15px',
        right: '72px',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      {/* Executive Status Badge */}
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
          backdropFilter: 'blur(10px)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px #10b981',
          }}
        />
        <span
          style={{
            color: '#c8a45b',
            fontSize: '0.72rem',
            fontWeight: 750,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
          }}
        >
          Executive Suite
        </span>
      </div>

      {/* Luxury Compact Log Out Button */}
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
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #c8a45b 0%, #ab8438 100%)'
          e.currentTarget.style.color = '#050a0f'
          e.currentTarget.style.borderColor = '#c8a45b'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(200, 164, 91, 0.35)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(200, 164, 91, 0.1)'
          e.currentTarget.style.color = '#dfc07e'
          e.currentTarget.style.borderColor = 'rgba(200, 164, 91, 0.35)'
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Log Out
      </Link>
    </div>
  )
}
