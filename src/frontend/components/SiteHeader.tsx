import Link from 'next/link'

import { getPayloadClientSafe } from '@/lib/payload'
import { PRIMARY_NAVIGATION } from '@/baseline/pages'
import { NavLink } from './NavLink'
import { MobileNav } from './MobileNav'

const Arrow = () => <span aria-hidden="true">&rarr;</span>

const SearchIcon = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor">
    <circle cx="8.5" cy="8.5" r="5.5" strokeWidth="1.6" />
    <line x1="12.8" y1="12.8" x2="17.5" y2="17.5" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

export async function SiteHeader() {
  const payload = await getPayloadClientSafe()
  const [nav, settings] = payload
    ? await Promise.all([
        payload.findGlobal({ slug: 'navigation', overrideAccess: true }).catch(() => null),
        payload.findGlobal({ slug: 'site-settings', overrideAccess: true }).catch(() => null),
      ])
    : [null, null]

  const sourceItems =
    nav?.primary && nav.primary.length > 0
      ? nav.primary
      : PRIMARY_NAVIGATION.map((p) => ({ id: p.pageId, label: p.title, path: p.path, pageId: p.pageId }))

  const shortLabels: Record<string, string> = {
    '/film-culture': 'Film & Culture',
    '/media-speaking': 'Media & Speaking',
  }

  const items = [
    { id: 'HOME', pageId: 'HOME', label: 'Home', path: '/' },
    ...sourceItems
      .filter((item) => item.path !== '/')
      .map((item) => ({ ...item, label: shortLabels[item.path] ?? item.label })),
  ]

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="site-header__brand">
          <span className="site-header__brand-text">
            <strong className="site-header__name">{settings?.siteName ?? 'Tel K. Ganesan'}</strong>
            <span className="site-header__positioning">
              EXECUTIVE CHAIRMAN | ENTERPRISE BUILDER
              <br />
              INVESTOR | PRODUCER
            </span>
          </span>
        </Link>

        <div className="site-header__actions">
          <nav className="nav nav--desktop" aria-label="Primary">
            <ul className="nav__list">
              {items.map((item) => (
                <li key={item.pageId ?? item.path}>
                  <NavLink href={item.path}>{item.label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <Link href="/search" className="site-header__search" aria-label="Search the site">
            <SearchIcon />
          </Link>

          <Link href="/connect?route=general" className="cta site-header__cta">
            Submit Qualified Inquiry <Arrow />
          </Link>

          <MobileNav items={items} />
        </div>
      </div>
    </header>
  )
}

