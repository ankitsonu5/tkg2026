'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

import { NavLink } from './NavLink'

type NavigationItem = {
  pageId?: string | null
  label: string
  path: string
}

export function MobileNav({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname()
  const menuRef = useRef<HTMLDetailsElement>(null)
  const toggleRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const menu = menuRef.current
    if (!menu?.open) return

    const focusIsInsideMenu = menu.contains(document.activeElement)
    menu.open = false
    if (focusIsInsideMenu) toggleRef.current?.focus()
  }, [pathname])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !menuRef.current?.open) return

      event.preventDefault()
      menuRef.current.open = false
      toggleRef.current?.focus()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <details className="mobile-nav" ref={menuRef}>
      <summary ref={toggleRef} aria-label="Toggle navigation menu">
        <span>Menu</span>
        <span className="mobile-nav__icon" aria-hidden="true" />
      </summary>
      <nav
        aria-label="Mobile primary"
        onClick={(event) => {
          if (!(event.target instanceof Element) || !event.target.closest('a[href]')) return

          if (menuRef.current) menuRef.current.open = false
          toggleRef.current?.focus()
        }}
      >
        <ul className="mobile-nav__list">
          {items.map((item, index) => (
            <li key={item.pageId ?? item.path}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <NavLink href={item.path}>{item.label}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  )
}
