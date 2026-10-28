'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { adminFetch, AdminApiError } from './api'

/** WordPress-style "Lost your password?": email a 6-digit code, then set a new password. */
export function ForgotPassword() {
  const router = useRouter()
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [login, setLogin] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const sendCode = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await adminFetch<{ message: string }>('/auth/forgot', { method: 'POST', body: { login } })
      setMessage(result.message)
      setStep('reset')
      setResendIn(60)
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wpa-login">
      <div className="wpa-login__logo" aria-hidden="true">
        TKG
      </div>

      {error && (
        <div className="wpa-notice wpa-notice--error" style={{ width: 320, maxWidth: '100%' }} role="alert">
          <div>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}
      {!error && (
        <div className="wpa-notice" style={{ width: 320, maxWidth: '100%' }} role="status">
          <div>{step === 'request' ? 'Please enter your username or email address. You will receive a 6-digit code by email to create a new password.' : message}</div>
        </div>
      )}

      {step === 'request' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendCode()
          }}
        >
          <label htmlFor="user_login">Username or Email Address</label>
          <input id="user_login" type="text" autoCapitalize="none" spellCheck={false} autoComplete="username" required autoFocus value={login} onChange={(e) => setLogin(e.target.value)} />
          <div className="wpa-login__actions" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="wpa-btn wpa-btn--primary wpa-btn--large" disabled={busy}>
              {busy ? 'Sending…' : 'Get New Password'}
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (password !== confirm) return setError('The two passwords do not match.')
            setBusy(true)
            setError(null)
            try {
              await adminFetch('/auth/reset', { method: 'POST', body: { login, code: code.trim(), password } })
              router.replace('/admin/login?reset=1')
            } catch (err) {
              setError(err instanceof AdminApiError ? err.message : 'Something went wrong. Please try again.')
              setBusy(false)
            }
          }}
        >
          <label htmlFor="reset_code">6-digit code</label>
          <input
            id="reset_code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="\d{6}"
            required
            autoFocus
            className="wpa-otp"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <label htmlFor="new_pass">New password</label>
          <div className="wpa-pass">
            <input id="new_pass" type={show ? 'text' : 'password'} autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <label htmlFor="confirm_pass">Confirm new password</label>
          <input id="confirm_pass" type={show ? 'text' : 'password'} autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <p className="wpa-field__help" style={{ marginTop: -8, marginBottom: 14 }}>
            At least 8 characters.
          </p>
          <div className="wpa-login__actions">
            <button type="button" className="wpa-link-plain" disabled={resendIn > 0 || busy} onClick={sendCode}>
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </button>
            <button type="submit" className="wpa-btn wpa-btn--primary wpa-btn--large" disabled={busy}>
              {busy ? 'Saving…' : 'Save Password'}
            </button>
          </div>
        </form>
      )}

      <p className="wpa-login__nav">
        <Link href="/admin/login">Log in</Link>
        {' | '}
        <Link href="/">← Go to Tel K. Ganesan</Link>
      </p>
    </div>
  )
}
