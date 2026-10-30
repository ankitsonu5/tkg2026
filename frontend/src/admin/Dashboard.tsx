'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { adminFetch, type AdminDoc } from './api'
import { Notice, useAdmin } from './AdminShell'
import { formatDate, StatusBadge } from './ListView'

interface DashboardData {
  counts: Record<string, number | null>
  recentInquiries: AdminDoc[]
  recentArticles: AdminDoc[]
}

export function Dashboard() {
  const { me } = useAdmin()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminFetch<DashboardData>('/dashboard')
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  const c = data?.counts ?? {}
  const glance: { label: string; value: number | null | undefined; href: string }[] = [
    { label: 'Published posts', value: c.articlesPublished, href: '/admin/articles?status=published' },
    { label: 'Draft posts', value: c.articlesDraft, href: '/admin/articles?status=draft' },
    { label: 'Pages', value: c.pages, href: '/admin/pages' },
    { label: 'Media files', value: c.media, href: '/admin/media' },
    { label: 'New inquiries', value: c.inquiriesNew, href: '/admin/inquiries?status=new' },
    { label: 'Subscribers', value: c.subscribers, href: '/admin/newsletter-subscriptions?status=subscribed' },
    { label: 'Claims not ready', value: c.claimsBlocked, href: '/admin/claims' },
  ]

  return (
    <>
      <div className="wpa-heading">
        <h1>Dashboard</h1>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {(c.inquiriesOverdue ?? 0) > 0 && (
        <Notice kind="warning">
          {c.inquiriesOverdue} inquiry(ies) are past their reply deadline. <Link href="/admin/inquiries?status=new">Review now</Link>.
        </Notice>
      )}
      {(c.deliveryFailed ?? 0) > 0 && (
        <Notice kind="error">
          {c.deliveryFailed} email(s) could not be delivered after all retries. <Link href="/admin/delivery-attempts?status=dead">Open the delivery log</Link>.
        </Notice>
      )}

      <div className="wpa-welcome">
        <h2>Welcome, {me.user.name?.split(' ')[0] || 'there'}!</h2>
        <p>Manage the Tel K. Ganesan website: write and publish ideas, update pages, answer inquiries and keep the evidence register current.</p>
        <div className="wpa-welcome__cols">
          <div>
            <strong>Get started</strong>
            {me.permissions.articles?.create && <Link href="/admin/articles/new">Write a new post</Link>}
            {me.permissions.assets?.create && <Link href="/admin/media">Upload media</Link>}
          </div>
          <div>
            <strong>Next steps</strong>
            {me.permissions.inquiries?.read && <Link href="/admin/leads">See all leads</Link>}
            <a href="/" target="_blank" rel="noreferrer">
              View your site
            </a>
          </div>
          {me.isAdmin && (
            <div>
              <strong>More actions</strong>
              <Link href="/admin/settings/navigation">Manage menus</Link>
              <Link href="/admin/users">Manage users</Link>
            </div>
          )}
        </div>
      </div>

      <h2 className="wpa-section-title">At a Glance</h2>
      <div className="wpa-kpis">
        {glance
          .filter((g) => !data || (g.value !== null && g.value !== undefined))
          .map((g) => (
            <Link key={g.label} href={g.href} className="wpa-kpi">
              <span className="wpa-kpi__label">{g.label}</span>
              <span className="wpa-kpi__value">{data ? g.value : '—'}</span>
            </Link>
          ))}
      </div>

      <div className="wpa-dash">

        {me.permissions.inquiries?.read && (
          <div className="wpa-postbox wpa-activity">
            <div className="wpa-postbox__head">
              <h2>Recent inquiries</h2>
              <Link href="/admin/inquiries">View all</Link>
            </div>
            <div className="wpa-postbox__body">
              {data?.recentInquiries.length ? (
                <ul>
                  {data.recentInquiries.map((q) => (
                    <li key={q.id}>
                      <time>{formatDate(q.createdAt)}</time>
                      <span>
                        <Link href={`/admin/inquiries/${q.id}`}>{q.fullName}</Link> <span className="wpa-muted">({q.route})</span> <StatusBadge value={q.workState} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="wpa-muted">{data ? 'No inquiries yet.' : 'Loading…'}</p>
              )}
            </div>
          </div>
        )}

        <div className="wpa-postbox wpa-activity">
          <div className="wpa-postbox__head">
            <h2>Activity</h2>
            <Link href="/admin/articles">All posts</Link>
          </div>
          <div className="wpa-postbox__body">
            {data?.recentArticles.length ? (
              <ul>
                {data.recentArticles.map((a) => (
                  <li key={a.id}>
                    <time>{formatDate(a.updatedAt)}</time>
                    <span>
                      <Link href={`/admin/articles/${a.id}`}>{a.title}</Link> <StatusBadge value={a._status} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="wpa-muted">{data ? 'No posts yet.' : 'Loading…'}</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
