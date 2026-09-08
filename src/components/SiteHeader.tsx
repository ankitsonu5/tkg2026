import Link from 'next/link'

import { getPayloadClient } from '@/lib/payload'
import { PRIMARY_NAVIGATION } from '@/baseline/pages'
import { NavLink } from './NavLink'

/**
 * Global navigation (FR-IA-01). Reads the approved hierarchy from the `navigation` global,
 * falling back to the baseline constant if the global has not been seeded yet, so the shell
 * is never broken by an empty CMS.
 */
export async function SiteHeader() {
  const payload = await getPayloadClient()
  const [nav, settings] = await Promise.all([
    payload.findGlobal({ slug: 'navigation', overrideAccess: true }).catch(() => null),
    payload.findGlobal({ slug: 'site-settings', overrideAccess: true }).catch(() => null),
  ])

  const items =
    nav?.primary && nav.primary.length > 0
      ? nav.primary
      : PRIMARY_NAVIGATION.map((p) => ({ id: p.pageId, label: p.title, path: p.path, pageId: p.pageId }))

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="site-header__brand">
          {settings?.siteName ?? 'Tel K. Ganesan'}
          <span className="site-header__positioning">
            {settings?.positioningLine ?? 'Executive Chairman | Enterprise Builder | Investor | Producer'}
          </span>
        </Link>

        <nav className="nav" aria-label="Primary">
          <ul className="nav__list">
            {items.map((item) => (
              <li key={item.pageId ?? item.path}>
                <NavLink href={item.path}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
