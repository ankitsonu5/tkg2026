'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Marks the active route with aria-current so the state is conveyed to assistive technology,
 * not only through colour.
 */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={href === '/connect' ? 'nav__link nav__link--connect' : 'nav__link'}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}
