'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { adminFetch, AdminApiError } from './api'

function mmss(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /** Seconds until another attempt is allowed (after too many failures). */
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const next = params.get('next')
  const target = next && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin'
  const locked = wait > 0

  return (
    <div className="wpa-login">
      <div className="wpa-login__logo" aria-hidden="true">
        TKG
      </div>
      {params.get('reset') && !error && !locked && (
        <div className="wpa-notice wpa-notice--success" style={{ width: 320, maxWidth: '100%' }} role="status">
          <div>Your password has been reset. You can log in now.</div>
        </div>
      )}
      {locked ? (
        <div className="wpa-notice wpa-notice--error wpa-login__lock" style={{ width: 320, maxWidth: '100%' }} role="alert">
          <div>
            <strong>Too many failed login attempts.</strong>
            <br />
            For security, logging in is paused. Try again in <span className="wpa-login__timer">{mmss(wait)}</span>
          </div>
        </div>
      ) : (
        error && (
          <div className="wpa-notice wpa-notice--error" style={{ width: 320, maxWidth: '100%' }} role="alert">
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (locked) return
          setBusy(true)
          setError(null)
          try {
            await adminFetch('/auth/login', { method: 'POST', body: { email, password } })
            router.replace(target)
          } catch (err) {
            const body = err instanceof AdminApiError ? err.body : {}
            const retry = Number(body.retryAfterSeconds ?? 0)
            const left = Number(body.attemptsLeft ?? NaN)
            if (retry > 0) {
              setWait(retry)
              setPassword('')
            } else {
              setError(
                `${(err as Error).message}${Number.isFinite(left) ? ` ${left} attempt${left === 1 ? '' : 's'} left before logging in is paused for 30 seconds.` : ''}`,
              )
            }
            setBusy(false)
          }
        }}
      >
        <label htmlFor="user_login">Username or Email Address</label>
        <input id="user_login" type="text" autoCapitalize="none" spellCheck={false} autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus disabled={locked} />
        <label htmlFor="user_pass">Password</label>
        <div className="wpa-pass">
          <input id="user_pass" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={locked} />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        <div className="wpa-login__actions">
          <span className="wpa-muted">Staff only</span>
          <button type="submit" className="wpa-btn wpa-btn--primary wpa-btn--large" disabled={busy || locked}>
            {locked ? `Wait ${mmss(wait)}` : busy ? 'Logging in…' : 'Log In'}
          </button>
        </div>
      </form>
      <p className="wpa-login__nav">
        <Link href="/admin/forgot">Lost your password?</Link>
        <br />
        <Link href="/">← Go to Tel K. Ganesan</Link>
      </p>
    </div>
  )
}
