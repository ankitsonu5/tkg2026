'use client'

import { useEffect, type ReactNode } from 'react'

const MARK = 'data-pw-eye'

const EYE =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'
const EYE_OFF =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'

function place(button: HTMLButtonElement, input: HTMLInputElement) {
  const size = 36
  button.style.top = `${input.offsetTop + (input.offsetHeight - size) / 2}px`
  button.style.left = `${input.offsetLeft + input.offsetWidth - size - 8}px`
}

function enhance(input: HTMLInputElement) {
  if (input.getAttribute(MARK) || !input.parentElement) return
  input.setAttribute(MARK, '1')

  const parent = input.parentElement
  if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative'
  input.style.paddingRight = '48px'

  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-label', 'Show password')
  button.setAttribute('aria-pressed', 'false')
  button.title = 'Show password'
  button.innerHTML = EYE
  Object.assign(button.style, {
    position: 'absolute',
    width: '36px',
    height: '36px',
    display: 'grid',
    placeItems: 'center',
    border: '0',
    background: 'transparent',
    color: 'inherit',
    opacity: '0.7',
    cursor: 'pointer',
    borderRadius: '6px',
    padding: '0',
  } as Partial<CSSStyleDeclaration>)

  button.addEventListener('mouseenter', () => (button.style.opacity = '1'))
  button.addEventListener('mouseleave', () => (button.style.opacity = '0.7'))
  button.addEventListener('click', () => {
    const show = input.type === 'password'
    input.type = show ? 'text' : 'password'
    button.innerHTML = show ? EYE_OFF : EYE
    button.setAttribute('aria-pressed', String(show))
    const label = show ? 'Hide password' : 'Show password'
    button.setAttribute('aria-label', label)
    button.title = label
    input.focus()
  })

  parent.appendChild(button)
  place(button, input)
  new ResizeObserver(() => place(button, input)).observe(input)
}

function scan() {
  document.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(enhance)
}

/**
 * Adds a show/hide (eye) button to every password field in the admin: login, create user and
 * reset password. Payload's built-in password field has none, so this watches the page for new
 * password inputs and decorates each one once.
 */
export function PasswordEyeProvider({ children }: { children?: ReactNode }) {
  useEffect(() => {
    scan()
    let frame = 0
    const observer = new MutationObserver(() => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        scan()
      })
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return <>{children}</>
}
