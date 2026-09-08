'use client'

import { useEffect } from 'react'

/**
 * Route error boundary. Shows a recoverable message and never leaks internal detail to the
 * visitor; the digest is enough for an operator to correlate with server logs.
 */
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('route error', error.digest ?? error.message)
  }, [error])

  return (
    <div className="container">
      <header className="page-header">
        <h1>Something went wrong</h1>
      </header>
      <div className="notice notice--error">
        <p className="notice__title">This page could not be displayed</p>
        <p>The problem has been logged. You can try again, or use the navigation above.</p>
        {error.digest && <p>Reference: {error.digest}</p>}
      </div>
      <button type="button" className="cta cta--primary" onClick={reset}>
        Try again
      </button>
    </div>
  )
}
