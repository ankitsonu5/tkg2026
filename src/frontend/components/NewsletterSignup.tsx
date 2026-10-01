'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import styles from './SiteFooter.module.css'
import { subscribeToNewsletterAction } from '@/app/(frontend)/newsletter/actions'
import type { NewsletterOutcome } from '@/lib/newsletter/subscribe'

interface NewsletterSignupProps {
  variant?: 'stacked' | 'inline'
}

const OUTCOME_MESSAGES: Record<Exclude<NewsletterOutcome['status'], 'success'>, string> = {
  invalid: 'Please add a valid email and accept the Privacy Policy.',
  'already-subscribed': "You're already subscribed to Tel's Ideas.",
  'rate-limited': 'Too many attempts. Please wait a few minutes and try again.',
  failed: 'Your email was saved, but the confirmation message could not be sent. Please try again shortly.',
}

export function NewsletterSignup({ variant = 'stacked' }: NewsletterSignupProps) {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [outcome, setOutcome] = useState<NewsletterOutcome | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || !consent) {
      setOutcome({ status: 'invalid', message: 'Please add your email and accept the Privacy Policy.' })
      return
    }

    setSubmitting(true)
    setOutcome(null)

    try {
      const formData = new FormData()
      formData.set('email', email.trim())
      formData.set('sourcePage', window.location.pathname)
      formData.set('privacyAccepted', String(consent))
      const result = await subscribeToNewsletterAction(formData)
      setOutcome(result)
    } catch {
      setOutcome({ status: 'failed', message: 'The submission could not be completed. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const errorMessage = outcome && outcome.status !== 'success' ? OUTCOME_MESSAGES[outcome.status] : null

  if (variant === 'inline') {
    if (outcome?.status === 'success') {
      return (
        <p className={styles.newsletterSuccessInline}>
          Almost there &mdash; confirm your subscription using the email we just sent.
        </p>
      )
    }
    return (
      <form className={styles.newsletterFormInline} onSubmit={handleSubmit} noValidate>
        <div className={styles.newsletterRowInline}>
          <input
            id="newsletter-email-inline"
            name="email"
            type="email"
            required
            aria-label="Email address"
            placeholder="Enter your email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={styles.newsletterInputInline}
          />
          <button type="submit" className={styles.newsletterSubmitInline} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Subscribe'}
          </button>
        </div>
        <label className={styles.newsletterConsentInline}>
          <input
            name="privacyAccepted"
            type="checkbox"
            required
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
          <span>
            I agree to the <Link href="/privacy">Privacy Policy</Link>
          </span>
        </label>
        {errorMessage && (
          <p className={styles.newsletterErrorInline} role="alert">
            {errorMessage}
          </p>
        )}
      </form>
    )
  }

  return (
    <div className={styles.newsletterBlock}>
      <h3 className={styles.columnHeading}>Newsletter</h3>

      {outcome?.status === 'success' ? (
        <p className={styles.newsletterSuccess}>
          You&rsquo;re almost there. Please confirm your subscription using the email we just sent.
        </p>
      ) : (
        <>
          <p className={styles.newsletterBlurb}>
            Ideas on leadership, enterprise and Mind Trap &mdash; straight to your inbox.
          </p>
          <form className={styles.newsletterForm} onSubmit={handleSubmit} noValidate>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              required
              aria-label="Email address"
              placeholder="Enter your email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={styles.newsletterInput}
            />
            <label className={styles.newsletterConsent}>
              <input
                name="privacyAccepted"
                type="checkbox"
                required
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>
                I agree to the <Link href="/privacy">Privacy Policy</Link>
              </span>
            </label>
            {errorMessage && (
              <p className={styles.newsletterError} role="alert">
                {errorMessage}
              </p>
            )}
            <button type="submit" className={styles.newsletterSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Subscribe'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
