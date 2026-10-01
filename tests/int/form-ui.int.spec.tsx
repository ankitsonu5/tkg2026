// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getBaselineRoute } from '@/baseline/inquiry-routes'
import { InquiryForm } from '@/frontend/components/InquiryForm'
import { NewsletterSignup } from '@/frontend/components/NewsletterSignup'

const actionMocks = vi.hoisted(() => ({
  inquiry: vi.fn(),
  newsletter: vi.fn(),
}))

vi.mock('@/app/(frontend)/connect/actions', () => ({ submitInquiryAction: actionMocks.inquiry }))
vi.mock('@/app/(frontend)/newsletter/actions', () => ({ subscribeToNewsletterAction: actionMocks.newsletter }))

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('Public form browser states', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    actionMocks.inquiry.mockReset()
    actionMocks.newsletter.mockReset()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it('QA-UI-01: newsletter required-field error is visible and does not call the backend', async () => {
    await act(async () => root.render(<NewsletterSignup variant="inline" />))
    const form = container.querySelector('form')!

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(actionMocks.newsletter).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Please add a valid email and accept the Privacy Policy.')
    expect(container.querySelector('[role="alert"]')).toBeTruthy()
  })

  it('QA-UI-02: newsletter success replaces the form with an email-confirmation state', async () => {
    actionMocks.newsletter.mockResolvedValue({ status: 'success' })
    await act(async () => root.render(<NewsletterSignup variant="inline" />))

    const email = container.querySelector<HTMLInputElement>('input[type="email"]')!
    const consent = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    await act(async () => {
      setInputValue(email, 'reader@example.com')
      consent.click()
    })
    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(actionMocks.newsletter).toHaveBeenCalledOnce()
    const submitted = actionMocks.newsletter.mock.calls[0][0] as FormData
    expect(submitted.get('email')).toBe('reader@example.com')
    expect(submitted.get('privacyAccepted')).toBe('true')
    expect(container.querySelector('form')).toBeNull()
    expect(container.textContent).toContain('confirm your subscription using the email we just sent')
  })

  it('QA-UI-03: qualified inquiry submission shows the reference, route confirmation and newsletter result', async () => {
    actionMocks.inquiry.mockResolvedValue({
      status: 'pending',
      reference: 'GENE-2026-ABC12345',
      deliveryState: 'pending',
      slaHours: 48,
      slaDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      newsletter: 'confirmation-sent',
    })
    const route = getBaselineRoute('general')!
    await act(async () => root.render(<InquiryForm route={route} />))

    for (const input of container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[name^="field."], textarea[name^="field."]')) {
      setInputValue(input, input.type === 'email' ? 'sender@example.com' : `Value for ${input.name}`)
    }
    await act(async () => {
      container.querySelector<HTMLInputElement>('#privacyAccepted')!.click()
      container.querySelector<HTMLInputElement>('#marketingOptIn')!.click()
    })
    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(actionMocks.inquiry).toHaveBeenCalledOnce()
    const submitted = actionMocks.inquiry.mock.calls[0][0] as FormData
    expect(submitted.get('routeId')).toBe('general')
    expect(submitted.get('privacyAccepted')).toBe('on')
    expect(submitted.get('marketingOptIn')).toBe('on')
    expect(container.querySelector('form')).toBeNull()
    expect(container.textContent).toContain('Received')
    expect(container.textContent).toContain('GENE-2026-ABC12345')
    expect(container.textContent).toContain('newsletter confirmation email')
  })
})

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}
