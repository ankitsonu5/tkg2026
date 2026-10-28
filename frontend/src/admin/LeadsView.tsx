'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { toast } from './alerts'
import { adminFetch } from './api'
import { Notice, useAdmin } from './AdminShell'
import { formatDate } from './ListView'

interface Lead {
  id: string
  type: 'inquiry' | 'newsletter'
  source: string
  route: string | null
  name: string
  email: string
  status: string
  delivery: string | null
  reference: string | null
  createdAt: string
  replyDueAt: string | null
  sourcePage: string | null
  marketingOptIn: boolean | null
  details: { label: string; value: string }[]
  attribution: Record<string, string>
  notes: string | null
}

interface Stats {
  total: number
  today: number
  last7Days: number
  inquiries: number
  newsletter: number
  awaitingReply: number
  overdue: number
}

interface LeadsResponse {
  docs: Lead[]
  totalDocs: number
  totalPages: number
  page: number
  stats: Stats
  filteredStats: Stats
  canSeeNewsletter: boolean
}

const STATUS_OPTIONS = {
  inquiry: ['new', 'acknowledged', 'responded', 'closed', 'reclassified'],
  newsletter: ['pending-confirmation', 'subscribed', 'unsubscribed'],
}

const AVATAR_COLORS = ['#0a1a2b', '#2271b1', '#7a5c1e', '#00704a', '#8a2be2', '#b4462d', '#1e6f8a']

function initials(lead: Lead): string {
  const source = lead.name || lead.email
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (lead.name ? (parts[1]?.[0] ?? '') : '')).toUpperCase()
}

function colorFor(text: string): string {
  let h = 0
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function relative(iso: string, now: number): string {
  const diff = now - Date.parse(iso)
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d < 30 ? `${d} day${d === 1 ? '' : 's'} ago` : formatDate(iso, false)
}

function Pill({ status }: { status: string }) {
  return <span className={`wpa-pill wpa-pill--${status}`}>{status.replace(/-/g, ' ')}</span>
}

export function LeadsView() {
  const { me, meta } = useAdmin()
  const router = useRouter()
  const params = useSearchParams()
  const [data, setData] = useState<LeadsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Lead | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  // Time of the last load, so "overdue" and "2 h ago" stay stable between renders.
  const [now, setNow] = useState(0)

  const filters = {
    type: params.get('type') ?? 'all',
    route: params.get('route') ?? '',
    status: params.get('status') ?? '',
    search: params.get('search') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
  }
  const page = Number(params.get('page') ?? 1)
  const [searchInput, setSearchInput] = useState(filters.search)
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v && v !== 'all')).toString()

  const setFilter = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (!v || v === 'all') next.delete(k)
        else next.set(k, v)
      }
      if (!('page' in patch)) next.delete('page')
      router.push(`/admin/leads${next.toString() ? `?${next}` : ''}`)
    },
    [params, router],
  )

  useEffect(() => {
    adminFetch<LeadsResponse>(`/leads?${query}&page=${page}&limit=25`)
      .then((result) => {
        setData(result)
        setNow(Date.now())
      })
      .catch((e) => setError(e.message))
  }, [query, page])

  const stats = data?.stats
  const kpis: { label: string; value: number | undefined; hint: string; tone?: string; onClick?: () => void }[] = [
    { label: 'Total leads', value: stats?.total, hint: 'All forms, all time', onClick: () => setFilter({ type: null, status: null }) },
    { label: 'Today', value: stats?.today, hint: 'Received since midnight' },
    { label: 'Last 7 days', value: stats?.last7Days, hint: 'Rolling week' },
    { label: 'Inquiries', value: stats?.inquiries, hint: 'Connect forms', onClick: () => setFilter({ type: 'inquiry' }) },
    ...(data?.canSeeNewsletter ? [{ label: 'Newsletter', value: stats?.newsletter, hint: 'Signups', onClick: () => setFilter({ type: 'newsletter' }) }] : []),
    { label: 'Awaiting reply', value: stats?.awaitingReply, hint: 'Status: new', tone: 'warn', onClick: () => setFilter({ type: 'inquiry', status: 'new' }) },
    { label: 'Past deadline', value: stats?.overdue, hint: 'Reply SLA missed', tone: (stats?.overdue ?? 0) > 0 ? 'bad' : undefined },
  ]

  const statusChoices = filters.type === 'newsletter' ? STATUS_OPTIONS.newsletter : filters.type === 'inquiry' ? STATUS_OPTIONS.inquiry : [...STATUS_OPTIONS.inquiry, ...STATUS_OPTIONS.newsletter]
  const hasFilters = Boolean(filters.route || filters.status || filters.search || filters.from || filters.to)

  return (
    <>
      <div className="wpa-page-head">
        <div>
          <h1>Leads</h1>
          <p className="wpa-page-sub">Every form submitted on the website — Connect inquiries{data?.canSeeNewsletter ? ' and newsletter signups' : ''} — in one place.</p>
        </div>
        <div className="wpa-export">
          <button type="button" className="wpa-btn wpa-btn--primary wpa-btn--large" onClick={() => setExportOpen((o) => !o)} aria-expanded={exportOpen}>
            ⬇ Export {hasFilters || filters.type !== 'all' ? 'filtered' : 'all'} ▾
          </button>
          {exportOpen && (
            <div className="wpa-export__menu" role="menu">
              <a role="menuitem" href={`/api/admin/leads/export?format=xlsx&${query}`} onClick={() => setExportOpen(false)}>
                <strong>Excel workbook (.xlsx)</strong>
                <span>Branded report: summary, all leads, every inquiry answer in its own column</span>
              </a>
              <a role="menuitem" href={`/api/admin/leads/export?format=csv&${query}`} onClick={() => setExportOpen(false)}>
                <strong>CSV (.csv)</strong>
                <span>Plain table for Google Sheets, CRMs and mail tools</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {error && (
        <Notice kind="error" onClose={() => setError(null)}>
          {error}
        </Notice>
      )}

      <div className="wpa-kpis">
        {kpis.map((k) => (
          <button key={k.label} type="button" className={`wpa-kpi${k.tone ? ` wpa-kpi--${k.tone}` : ''}`} onClick={k.onClick} disabled={!k.onClick}>
            <span className="wpa-kpi__label">{k.label}</span>
            <span className="wpa-kpi__value">{k.value ?? '—'}</span>
            <span className="wpa-kpi__hint">{k.hint}</span>
          </button>
        ))}
      </div>

      <div className="wpa-card">
        <div className="wpa-tabs" role="tablist">
          {[
            ['all', 'All leads'],
            ['inquiry', 'Inquiries'],
            ...(data?.canSeeNewsletter ? [['newsletter', 'Newsletter']] : []),
          ].map(([value, text]) => (
            <button key={value} type="button" role="tab" aria-selected={filters.type === value} className={filters.type === value ? 'is-active' : ''} onClick={() => setFilter({ type: value, status: null })}>
              {text}
            </button>
          ))}
        </div>

        <form
          className="wpa-filters"
          onSubmit={(e) => {
            e.preventDefault()
            setFilter({ search: searchInput.trim() || null })
          }}
        >
          <input type="search" placeholder="Search name, email or reference…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} aria-label="Search leads" />
          {filters.type !== 'newsletter' && (
            <select value={filters.route} onChange={(e) => setFilter({ route: e.target.value || null })} aria-label="Form">
              <option value="">All inquiry forms</option>
              {meta.inquiryRoutes.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
          <select value={filters.status} onChange={(e) => setFilter({ status: e.target.value || null })} aria-label="Status">
            <option value="">Any status</option>
            {statusChoices.map((s) => (
              <option key={s} value={s}>
                {s.replace(/-/g, ' ')}
              </option>
            ))}
          </select>
          <label className="wpa-filters__date">
            From <input type="date" value={filters.from} onChange={(e) => setFilter({ from: e.target.value || null })} />
          </label>
          <label className="wpa-filters__date">
            To <input type="date" value={filters.to} onChange={(e) => setFilter({ to: e.target.value || null })} />
          </label>
          <button type="submit" className="wpa-btn">
            Search
          </button>
          {hasFilters && (
            <button
              type="button"
              className="wpa-link-plain"
              onClick={() => {
                setSearchInput('')
                router.push(filters.type !== 'all' ? `/admin/leads?type=${filters.type}` : '/admin/leads')
              }}
            >
              Clear filters
            </button>
          )}
        </form>

        <div className="wpa-leads-meta">
          {data ? `${data.totalDocs} lead${data.totalDocs === 1 ? '' : 's'}${hasFilters ? ' match your filters' : ''}` : 'Loading…'}
        </div>

        <div className="wpa-table-scroll">
          <table className="wpa-ltable">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Form</th>
                <th>Status</th>
                <th>Received</th>
                <th>Reply due</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data?.docs.length === 0 && (
                <tr>
                  <td colSpan={6} className="wpa-ltable__empty">
                    <div className="wpa-empty-art" aria-hidden="true">
                      ✉
                    </div>
                    <strong>No leads {hasFilters ? 'match these filters' : 'yet'}</strong>
                    <span>{hasFilters ? 'Try clearing a filter.' : 'Every form submitted on the website will appear here automatically.'}</span>
                  </td>
                </tr>
              )}
              {data?.docs.map((lead) => {
                const overdue = lead.type === 'inquiry' && lead.status === 'new' && lead.replyDueAt && Date.parse(lead.replyDueAt) < now
                return (
                  <tr key={`${lead.type}-${lead.id}`} onClick={() => setOpen(lead)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(lead)}>
                    <td>
                      <div className="wpa-lead">
                        <span className="wpa-avatar" style={{ background: colorFor(lead.email) }}>
                          {initials(lead)}
                        </span>
                        <span>
                          <strong>{lead.name || lead.email}</strong>
                          {lead.name && <span className="wpa-lead__email">{lead.email}</span>}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`wpa-source wpa-source--${lead.type}`}>{lead.source}</span>
                      {lead.reference && <div className="wpa-mono wpa-muted">{lead.reference}</div>}
                    </td>
                    <td>
                      <Pill status={lead.status} />
                    </td>
                    <td title={formatDate(lead.createdAt)}>
                      {relative(lead.createdAt, now)}
                      <div className="wpa-muted" style={{ fontSize: 12 }}>
                        {formatDate(lead.createdAt)}
                      </div>
                    </td>
                    <td className={overdue ? 'wpa-overdue' : ''}>{lead.replyDueAt ? (overdue ? `Overdue · ${formatDate(lead.replyDueAt)}` : formatDate(lead.replyDueAt)) : <span className="wpa-muted">—</span>}</td>
                    <td className="wpa-ltable__go">›</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="wpa-pager">
            <button type="button" className="wpa-btn" disabled={page <= 1} onClick={() => setFilter({ page: String(page - 1) })}>
              ‹ Previous
            </button>
            <span>
              Page {page} of {data.totalPages}
            </span>
            <button type="button" className="wpa-btn" disabled={page >= data.totalPages} onClick={() => setFilter({ page: String(page + 1) })}>
              Next ›
            </button>
          </div>
        )}
      </div>

      {open && (
        <LeadDrawer
          key={`${open.type}-${open.id}`}
          lead={open}
          canEdit={Boolean(me.permissions.inquiries?.update)}
          canReply={open.type === 'inquiry' ? Boolean(me.permissions.inquiries?.update) : me.isAdmin}
          staffName={me.user.name || me.user.username || me.user.email}
          onClose={() => setOpen(null)}
          onUpdated={(updated) => {
            setOpen(updated)
            setData((d) => (d ? { ...d, docs: d.docs.map((x) => (x.type === updated.type && x.id === updated.id ? updated : x)) } : d))
          }}
        />
      )}
    </>
  )
}

function LeadDrawer({
  lead,
  canEdit,
  canReply,
  staffName,
  onClose,
  onUpdated,
}: {
  lead: Lead
  canEdit: boolean
  canReply: boolean
  staffName: string
  onClose: () => void
  onUpdated: (lead: Lead) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const firstName = (lead.name || '').split(' ')[0]
  const [replying, setReplying] = useState(false)
  const [replySubject, setReplySubject] = useState(lead.reference ? `Re: [${lead.reference}] ${lead.source}` : 'Thank you for subscribing')
  const [replyBody, setReplyBody] = useState(`Hi ${firstName || 'there'},\n\n\n\nBest regards,\n${staffName}\nOffice of Tel K. Ganesan`)
  const [sending, setSending] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  return (
    <div className="wpa-drawer-backdrop" onClick={onClose}>
      <aside className="wpa-drawer" role="dialog" aria-modal="true" aria-label="Lead details" onClick={(e) => e.stopPropagation()}>
        <header className="wpa-drawer__head">
          <span className="wpa-avatar wpa-avatar--lg" style={{ background: colorFor(lead.email) }}>
            {initials(lead)}
          </span>
          <div>
            <h2>{lead.name || lead.email}</h2>
            <a href={`mailto:${lead.email}`}>{lead.email}</a>
          </div>
          <button type="button" className="wpa-drawer__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="wpa-drawer__body">
          {sentTo && (
            <div className="wpa-notice wpa-notice--success" role="status">
              <div>
                Reply sent to <strong>{sentTo}</strong>
                {lead.type === 'inquiry' ? ' and the lead is marked responded.' : '.'}
              </div>
            </div>
          )}
          <div className="wpa-drawer__chips">
            <span className={`wpa-source wpa-source--${lead.type}`}>{lead.source}</span>
            <Pill status={lead.status} />
            {lead.delivery && <span className="wpa-chip">Email: {lead.delivery}</span>}
            {lead.marketingOptIn && lead.type === 'inquiry' && <span className="wpa-chip">Newsletter opt-in</span>}
          </div>

          <dl className="wpa-facts">
            {lead.reference && (
              <>
                <dt>Reference</dt>
                <dd className="wpa-mono">{lead.reference}</dd>
              </>
            )}
            <dt>Received</dt>
            <dd>{formatDate(lead.createdAt)}</dd>
            {lead.replyDueAt && (
              <>
                <dt>Reply due</dt>
                <dd>{formatDate(lead.replyDueAt)}</dd>
              </>
            )}
            {lead.sourcePage && (
              <>
                <dt>Submitted on</dt>
                <dd className="wpa-mono">{lead.sourcePage}</dd>
              </>
            )}
          </dl>

          {lead.details.length > 0 && (
            <section>
              <h3>{lead.type === 'inquiry' ? 'What they told us' : 'Subscription'}</h3>
              <dl className="wpa-answers">
                {lead.details.map((d) => (
                  <div key={d.label}>
                    <dt>{d.label}</dt>
                    <dd>{d.value || '—'}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {Object.keys(lead.attribution).length > 0 && (
            <section>
              <h3>Where they came from</h3>
              <dl className="wpa-facts">
                {Object.entries(lead.attribution).map(([k, v]) => (
                  <div key={k} style={{ display: 'contents' }}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {lead.notes && (
            <section>
              <h3>Internal notes</h3>
              <p className="wpa-note">{lead.notes}</p>
            </section>
          )}
        </div>
        {replying && (
          <form
            className="wpa-reply"
            onSubmit={async (e) => {
              e.preventDefault()
              setSending(true)
              setReplyError(null)
              try {
                const result = await adminFetch<{ lead: Lead }>(`/leads/${lead.type}/${lead.id}/reply`, { method: 'POST', body: { subject: replySubject, message: replyBody } })
                setReplying(false)
                setSentTo(lead.email)
                toast(`Reply sent to ${lead.email}`)
                onUpdated(result.lead)
              } catch (err) {
                setReplyError((err as Error).message)
              } finally {
                setSending(false)
              }
            }}
          >
            <div className="wpa-reply__to">
              To: <strong>{lead.email}</strong>
            </div>
            <input type="text" aria-label="Subject" value={replySubject} onChange={(e) => setReplySubject(e.target.value)} required />
            <textarea aria-label="Message" rows={9} value={replyBody} onChange={(e) => setReplyBody(e.target.value)} required autoFocus />
            {replyError && <p className="wpa-reply__error">{replyError}</p>}
            <div className="wpa-reply__actions">
              <a className="wpa-link-plain" href={`mailto:${lead.email}?subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(replyBody)}`}>
                Open in my email app instead
              </a>
              <button type="button" className="wpa-btn" onClick={() => setReplying(false)} disabled={sending}>
                Cancel
              </button>
              <button type="submit" className="wpa-btn wpa-btn--primary" disabled={sending}>
                {sending ? 'Sending…' : 'Send reply'}
              </button>
            </div>
          </form>
        )}
        <footer className="wpa-drawer__foot">
          {canReply && !replying && (
            <button type="button" className="wpa-btn wpa-btn--primary wpa-btn--large" onClick={() => setReplying(true)}>
              ✉ Reply by email
            </button>
          )}
          {lead.type === 'inquiry' && (
            <Link className="wpa-btn wpa-btn--large" href={`/admin/inquiries/${lead.id}`}>
              {canEdit ? 'Update status & notes' : 'Open inquiry'}
            </Link>
          )}
          {lead.type === 'newsletter' && (
            <Link className="wpa-btn wpa-btn--large" href={`/admin/newsletter-subscriptions/${lead.id}`}>
              Open subscriber
            </Link>
          )}
        </footer>
      </aside>
    </div>
  )
}
