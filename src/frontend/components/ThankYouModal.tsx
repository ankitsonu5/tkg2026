'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface ThankYouDetails {
  /** 'success' = delivered to the owner; 'pending' = stored and queued for delivery. */
  status: 'success' | 'pending'
  reference: string
  ownerRole: string
  slaHours: number
  newsletter?: 'confirmation-sent' | 'already-subscribed' | 'failed'
}

const NEWSLETTER_TEXT: Record<NonNullable<ThankYouDetails['newsletter']>, string> = {
  'confirmation-sent': 'We also sent your newsletter confirmation email.',
  'already-subscribed': 'This email is already subscribed to Tel’s Ideas.',
  failed: 'Your inquiry was received, but the newsletter confirmation email could not be sent. Please use the newsletter form to retry.',
}

/**
 * Centered "thank you" popup shown after a successful inquiry (SweetAlert-style).
 * Accessible dialog: focus moves in, Escape / backdrop / button close it, and focus is
 * returned to whatever opened it. The form behind it stays on the page, reset and ready.
 */
export function ThankYouModal({ details, onClose }: { details: ThankYouDetails; onClose: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    buttonRef.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      // Keep Tab inside the dialog: it has a single control.
      if (event.key === 'Tab') {
        event.preventDefault()
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  const delivered = details.status === 'success'

  return createPortal(
    <div
      className="thanks"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="thanks__card" role="alertdialog" aria-modal="true" aria-labelledby="thanks-title" aria-describedby="thanks-body">
        <svg className="thanks__check" viewBox="0 0 52 52" aria-hidden="true">
          <circle className="thanks__check-ring" cx="26" cy="26" r="24" fill="none" />
          <path className="thanks__check-mark" fill="none" d="M15 27l8 8 15-17" />
        </svg>

        <h2 id="thanks-title" className="thanks__title">
          Thank you!
        </h2>

        <div id="thanks-body" className="thanks__body">
          <p>
            {delivered
              ? `Your inquiry has been delivered to the ${details.ownerRole}.`
              : `We have received your inquiry and it is being delivered to the ${details.ownerRole}.`}
          </p>
          <p className="thanks__ref">
            Reference <strong>{details.reference}</strong>
          </p>
          <p>The owner aims to respond within {details.slaHours} hours.</p>
          {details.newsletter && <p>{NEWSLETTER_TEXT[details.newsletter]}</p>}
        </div>

        <button ref={buttonRef} type="button" className="thanks__button" onClick={onClose}>
          Done
        </button>
      </div>
    </div>,
    document.body,
  )
}
