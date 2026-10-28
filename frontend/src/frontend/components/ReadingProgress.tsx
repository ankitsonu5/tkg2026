'use client'

import { useEffect, useRef } from 'react'

/** Thin gold bar under the site header showing how far through the article the reader is. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = document.getElementById(targetId)
    const bar = barRef.current
    if (!target || !bar) return

    let frame = 0
    const update = () => {
      frame = 0
      const rect = target.getBoundingClientRect()
      const total = rect.height - window.innerHeight * 0.6
      const done = Math.min(1, Math.max(0, -rect.top / Math.max(total, 1)))
      bar.style.transform = `scaleX(${done})`
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [targetId])

  return (
    <div className="reading-progress" aria-hidden="true">
      <div ref={barRef} className="reading-progress__bar" />
    </div>
  )
}
