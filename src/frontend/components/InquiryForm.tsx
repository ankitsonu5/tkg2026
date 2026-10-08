'use client'

import { useEffect, useRef, useState } from 'react'

import type { BaselineInquiryRoute } from '@/baseline/inquiry-routes'
import type { SubmitOutcome } from '@/lib/inquiries/submit'
import { submitInquiryAction } from '@/app/(frontend)/connect/actions'
import { track } from '@/lib/analytics/adapter'
import { readConsent } from '@/lib/analytics/adapter'
import { ATTRIBUTION_STORAGE_KEY } from '@/lib/inquiries/attribution'
import { ThankYouModal, type ThankYouDetails } from './ThankYouModal'

/**
 * Route-specific qualification form (FR-FORM-01).
 *
 * Truthful outcomes: a success message appears only when an owner delivery actually
 * succeeded. Pending delivery gets an honest pending state, and failed delivery gets a
 * recoverable error with the reference - never a false success.
 */
export function InquiryForm({ route }: { route: BaselineInquiryRoute }) {
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [thanks, setThanks] = useState<ThankYouDetails | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const idempotencyKey = useRef<string>('')
  const startedRef = useRef(false)
  const statusRef = useRef<HTMLDivElement>(null)

  const newAttemptKey = () => {
    // One key per form attempt, so a retry of the same attempt cannot create a second lead.
    idempotencyKey.current =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : String(Date.now())
  }

  useEffect(() => {
    newAttemptKey()
  }, [route.routeId])

  const onFirstInteraction = () => {
    if (startedRef.current) return
    startedRef.current = true
    track(
      'form_start',
      { form_id: route.formId, inquiry_type: route.routeId, source_page: window.location.pathname },
      { once: `form_start:${route.formId}:${idempotencyKey.current}` },
    )
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setOutcome(null)

    const form = event.currentTarget
    const formData = new FormData(form)
    formData.set('routeId', route.routeId)
    formData.set('idempotencyKey', idempotencyKey.current)
    formData.set('sourcePage', window.location.pathname)

    const consentGranted = readConsent() === 'granted'
    formData.set('analyticsConsent', String(consentGranted))

    if (consentGranted) {
      try {
        const stored = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, string>
          for (const [key, value] of Object.entries(parsed)) formData.set(key, value)
        }
      } catch {
        /* attribution is best-effort; never block a submission on it */
      }
    }

    try {
      const result = await submitInquiryAction(formData)

      if (result.status === 'success' || result.status === 'pending') {
        // Show the thank-you popup and leave a clean form behind, ready for another inquiry.
        setOutcome(null)
        setThanks({
          status: result.status,
          reference: result.reference,
          ownerRole: route.ownerRole,
          slaHours: result.slaHours,
          newsletter: result.newsletter,
        })
        form.reset()
        startedRef.current = false
        newAttemptKey()
      } else {
        setOutcome(result)
      }

      if (result.status === 'success' || result.status === 'pending') {
        track('form_submit', {
          form_id: route.formId,
          route_id: route.routeId,
          reference_id: result.reference,
        })
      } else if (result.status === 'invalid') {
        track('form_error', {
          form_id: route.formId,
          route_id: route.routeId,
          error_class: result.errors.map((e) => e.errorClass).join('|'),
        })
      } else {
        track('form_error', {
          form_id: route.formId,
          route_id: route.routeId,
          error_class: result.status,
        })
      }
    } catch {
      setOutcome({
        status: 'failed',
        reference: '-',
        message: 'The submission could not be completed. Please try again.',
      })
      track('form_error', {
        form_id: route.formId,
        route_id: route.routeId,
        error_class: 'exception',
      })
    } finally {
      setSubmitting(false)
      // Move focus to the result so screen reader users hear the outcome (the thank-you popup
      // manages its own focus).
      requestAnimationFrame(() => statusRef.current?.focus())
    }
  }

  const fieldErrors =
    outcome?.status === 'invalid'
      ? Object.fromEntries(outcome.errors.map((e) => [e.field, e.message]))
      : {}

  return (
    <>
      <div ref={statusRef} tabIndex={-1} role="status" aria-live="polite">
        {outcome && <Outcome outcome={outcome} route={route} />}
      </div>

      {thanks && <ThankYouModal details={thanks} onClose={() => setThanks(null)} />}

      {
        <form
          ref={formRef}
          className="form"
          onSubmit={onSubmit}
          onFocusCapture={onFirstInteraction}
          noValidate
        >
          <h2>{route.label}</h2>
          <p className="section__lede">{route.minimumQualification}.</p>

          {route.fields.map((field) => {
            const id = `field-${field.name}`
            const error = fieldErrors[field.name]
            return (
              <div className={error ? 'field field--invalid' : 'field'} key={field.name}>
                <label htmlFor={id}>
                  {field.label}
                  {field.required && <span aria-hidden="true"> *</span>}
                  <span className="field__purpose">{field.purpose}</span>
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    id={id}
                    name={`field.${field.name}`}
                    required={field.required}
                    maxLength={field.maxLength}
                    aria-describedby={error ? `${id}-error` : undefined}
                    aria-invalid={error ? true : undefined}
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={id}
                    name={`field.${field.name}`}
                    required={field.required}
                    defaultValue=""
                    aria-describedby={error ? `${id}-error` : undefined}
                    aria-invalid={error ? true : undefined}
                  >
                    <option value="" disabled>
                      Select an option
                    </option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={id}
                    type={
                      field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'
                    }
                    name={`field.${field.name}`}
                    required={field.required}
                    maxLength={field.maxLength}
                    aria-describedby={error ? `${id}-error` : undefined}
                    aria-invalid={error ? true : undefined}
                  />
                )}

                {error && (
                  <p className="field__error" id={`${id}-error`}>
                    {error}
                  </p>
                )}
              </div>
            )
          })}

          <div className="field field--checkbox">
            <input
              type="checkbox"
              id="privacyAccepted"
              name="privacyAccepted"
              required
              aria-describedby={fieldErrors.privacyAccepted ? 'privacyAccepted-error' : undefined}
              aria-invalid={fieldErrors.privacyAccepted ? true : undefined}
            />
            <label htmlFor="privacyAccepted">
              I have read the privacy notice.
              <span className="field__purpose">
                Your details are used to route and answer this inquiry. See the{' '}
                <a href="/privacy">Privacy Policy</a>.
              </span>
            </label>
          </div>

          <div className="field field--checkbox">
            <input type="checkbox" id="marketingOptIn" name="marketingOptIn" />
            <label htmlFor="marketingOptIn">
              Also subscribe me to Tel&rsquo;s Ideas.
              <span className="field__purpose">
                Optional and separate. Submitting this inquiry alone never subscribes you.
              </span>
            </label>
          </div>

          {fieldErrors.privacyAccepted && (
            <p className="field__error" id="privacyAccepted-error" role="alert">
              {fieldErrors.privacyAccepted}
            </p>
          )}

          <button type="submit" className="cta cta--primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Qualified Inquiry'}
          </button>
        </form>
      }
    </>
  )
}

function Outcome({ outcome, route }: { outcome: SubmitOutcome; route: BaselineInquiryRoute }) {
  switch (outcome.status) {
    case 'success':
      return (
        <div className="notice notice--success">
          <p className="notice__title">Delivered to the {route.ownerRole}</p>
          <p>
            Your reference is <strong>{outcome.reference}</strong>. The owner aims to respond within{' '}
            {outcome.slaHours} hours.
          </p>
          <NewsletterOptInNotice status={outcome.newsletter} />
        </div>
      )

    case 'pending':
      return (
        <div className="notice">
          <p className="notice__title">Received — delivery in progress</p>
          <p>
            Your reference is <strong>{outcome.reference}</strong>. Your message is stored and
            queued for the {route.ownerRole}; we are confirming delivery now. The response window is{' '}
            {outcome.slaHours} hours.
          </p>
          <NewsletterOptInNotice status={outcome.newsletter} />
        </div>
      )

    case 'failed':
      return (
        <div className="notice notice--error">
          <p className="notice__title">Saved, but not yet delivered</p>
          <p>{outcome.message}</p>
          <p>
            Reference: <strong>{outcome.reference}</strong>
          </p>
        </div>
      )

    case 'rate-limited':
      return (
        <div className="notice notice--error">
          <p className="notice__title">Too many submissions</p>
          <p>
            Please wait about {Math.ceil(outcome.retryAfterSeconds / 60)} minute(s) and try again.
          </p>
        </div>
      )

    case 'route-unavailable':
      return (
        <div className="notice notice--error">
          <p className="notice__title">Route unavailable</p>
          <p>{outcome.message}</p>
        </div>
      )

    case 'invalid':
      return (
        <div className="notice notice--error">
          <p className="notice__title">Please check the highlighted fields</p>
          <ul>
            {outcome.errors.map((error) => (
              <li key={error.field}>{error.message}</li>
            ))}
          </ul>
        </div>
      )
  }
}

function NewsletterOptInNotice({
  status,
}: {
  status?: 'confirmation-sent' | 'already-subscribed' | 'failed'
}) {
  if (!status) return null
  if (status === 'confirmation-sent') return <p>We also sent your newsletter confirmation email.</p>
  if (status === 'already-subscribed')
    return <p>This email is already subscribed to Tel&rsquo;s Ideas.</p>
  return (
    <p>
      Your inquiry was received, but the newsletter confirmation email could not be sent. Please use
      the newsletter form to retry.
    </p>
  )
}
