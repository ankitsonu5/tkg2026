'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { adminFetch, type Me, type Meta } from './api'
import { Icon } from './icons'
import { COLLECTIONS, GLOBALS } from './schema'

interface AdminContextValue {
  me: Me
  meta: Meta
  refreshCounts: () => void
}

const AdminContext = createContext<AdminContextValue | null>(null)

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext)
  if (!value) throw new Error('useAdmin must be used inside <AdminShell>')
  return value
}

type MenuEntry = { href: string; label: string; icon: string; match: string; sub?: { href: string; label: string }[]; bubble?: number }

function buildMenu(me: Me, newInquiries: number): MenuEntry[][] {
  const can = (slug: string) => me.permissions[slug]?.read
  const canCreate = (slug: string) => me.permissions[slug]?.create
  const entry = (slug: string, overrides: Partial<MenuEntry> = {}): MenuEntry | null => {
    const def = COLLECTIONS.find((c) => c.slug === slug)!
    if (!can(slug)) return null
    const sub = [{ href: `/admin/${slug}`, label: `All ${def.label}` }]
    if (canCreate(slug) && def.canCreate !== false) sub.push({ href: `/admin/${slug}/new`, label: 'Add New' })
    return { href: `/admin/${slug}`, label: def.label, icon: def.icon, match: `/admin/${slug}`, sub, ...overrides }
  }
  const groups: (MenuEntry | null)[][] = [
    [{ href: '/admin', label: 'Dashboard', icon: 'dashboard', match: '/admin$' }],
    [
      entry('articles'),
      can('assets') ? { href: '/admin/media', label: 'Media', icon: 'media', match: '/admin/media', sub: [{ href: '/admin/media', label: 'Library' }] } : null,
      entry('pages'),
      entry('entities'),
      entry('projects'),
      entry('initiatives'),
      entry('downloads'),
    ],
    [
      can('inquiries') || can('newsletter-subscriptions')
        ? { href: '/admin/leads', label: 'Leads', icon: 'leads', match: '/admin/leads', bubble: newInquiries }
        : null,
      entry('inquiries', { sub: undefined }),
      entry('newsletter-subscriptions', { sub: undefined }),
    ],
    [entry('claims'), entry('evidence-sources', { sub: undefined })],
    [
      entry('users'),
      { href: '/admin/profile', label: 'Profile', icon: 'user', match: '/admin/profile' },
      me.isAdmin
        ? {
            href: '/admin/settings/site-settings',
            label: 'Settings',
            icon: 'settings',
            match: '/admin/(settings|inquiry-routes|redirects)',
            sub: [
              ...GLOBALS.map((g) => ({ href: `/admin/settings/${g.slug}`, label: g.label })),
              { href: '/admin/inquiry-routes', label: 'Inquiry routes' },
              { href: '/admin/redirects', label: 'Redirects' },
            ],
          }
        : null,
      can('audit-events')
        ? {
            href: '/admin/audit-events',
            label: 'Tools',
            icon: 'list',
            match: '/admin/(audit-events|delivery-attempts)',
            sub: [
              { href: '/admin/audit-events', label: 'Activity log' },
              { href: '/admin/delivery-attempts', label: 'Email delivery log' },
            ],
          }
        : null,
    ],
  ]
  return groups.map((g) => g.filter((e): e is MenuEntry => Boolean(e))).filter((g) => g.length > 0)
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/admin'
  const router = useRouter()
  const [state, setState] = useState<{ me: Me; meta: Meta } | null>(null)
  const [newInquiries, setNewInquiries] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  const refreshCounts = useCallback(() => {
    adminFetch<{ all: number; by: Record<string, number> }>('/collections/inquiries/counts')
      .then((c) => setNewInquiries(c.by.new ?? 0))
      .catch(() => setNewInquiries(0))
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([adminFetch<Me>('/auth/me'), adminFetch<Meta>('/meta')])
      .then(([me, meta]) => {
        if (cancelled) return
        setState({ me, meta })
        if (me.permissions.inquiries?.read) refreshCounts()
      })
      .catch(() => {
        /* adminFetch redirects to the login screen on 401 */
      })
    return () => {
      cancelled = true
    }
  }, [refreshCounts])

  // Close the mobile menu after navigating.
  const [menuPath, setMenuPath] = useState(pathname)
  if (menuPath !== pathname) {
    setMenuPath(pathname)
    setMenuOpen(false)
  }

  if (!state) return <div className="wpa-loading">Loading…</div>

  const logout = async () => {
    await adminFetch('/auth/logout', { method: 'POST' }).catch(() => undefined)
    router.replace('/admin/login')
  }

  const menu = buildMenu(state.me, newInquiries)

  return (
    <AdminContext.Provider value={{ ...state, refreshCounts }}>
      <div className="wpa-bar">
        <div className="wpa-bar__left">
          <button className="wpa-bar__menu-toggle" type="button" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
            <Icon name="menu" />
          </button>
          <Link href="/admin">
            <span className="wpa-bar__logo">TKG</span>
          </Link>
          <a href="/" target="_blank" rel="noreferrer">
            <Icon name="home" size={16} /> <span className="wpa-bar__label">Tel K. Ganesan</span>
          </a>
          {state.me.permissions.articles?.create && <Link href="/admin/articles/new">+ New</Link>}
        </div>
        <div className="wpa-bar__right">
          <Link href="/admin/profile" aria-label="Profile">
            <Icon name="user" size={16} /> <span className="wpa-bar__label">Howdy, {state.me.user.name || state.me.user.email}</span>
          </Link>
          <button type="button" onClick={logout} aria-label="Log Out">
            <Icon name="logout" size={16} /> <span className="wpa-bar__label">Log Out</span>
          </button>
        </div>
      </div>

      <nav className={`wpa-menu${menuOpen ? ' is-open' : ''}`} aria-label="Admin menu">
        {menu.map((group, i) => (
          <ul key={i}>
            {i > 0 && <li className="wpa-menu__sep" aria-hidden="true" />}
            {group.map((item) => {
              const active = item.match.endsWith('$') ? pathname === '/admin' : new RegExp(`^${item.match}(/|$)`).test(pathname)
              return (
                <li key={item.href} className={`wpa-menu__item${active ? ' is-active' : ''}`}>
                  <Link href={item.href}>
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                    {item.bubble ? <span className="wpa-bubble">{item.bubble}</span> : null}
                  </Link>
                  {active && item.sub && (
                    <ul className="wpa-menu__sub">
                      {item.sub.map((s) => (
                        <li key={s.href}>
                          <Link href={s.href} className={pathname === s.href ? 'is-current' : ''}>
                            {s.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        ))}
      </nav>

      <main className="wpa-content">
        <div className="wpa-wrap">{children}</div>
      </main>
    </AdminContext.Provider>
  )
}

/** Dismissible admin notice (success / error / warning). */
export function Notice({ kind = 'success', children, onClose }: { kind?: 'success' | 'error' | 'warning' | 'info'; children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className={`wpa-notice wpa-notice--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <div>{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  )
}
