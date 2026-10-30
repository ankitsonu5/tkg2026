'use client'

import { useRef, useState } from 'react'

/** Copies a block of text to the clipboard and confirms it for screen-reader and sighted users. */
export function CopyButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      // Clipboard access can be refused (older browsers, insecure origin). Tell the visitor.
      setState('failed')
    }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2500)
  }

  return (
    <>
      <button type="button" className={className} onClick={onClick}>
        {state === 'copied' ? 'Copied ✓' : label}
      </button>
      <span className="visually-hidden" role="status" aria-live="polite">
        {state === 'copied' ? 'Copied to clipboard' : state === 'failed' ? 'Could not copy. Please select the text and copy it manually.' : ''}
      </span>
    </>
  )
}
