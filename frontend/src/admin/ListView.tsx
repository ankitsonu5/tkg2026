'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { confirmDelete, toast } from './alerts'
import { adminFetch, assetPreview, deleteDoc, listDocs, type AdminDoc } from './api'
import { Notice, useAdmin } from './AdminShell'
import { Icon } from './icons'
import { collectionDef, type Column } from './schema'

function get(doc: AdminDoc, path: string): any {
  return path.split('.').reduce<any>((v, k) => (v == null ? v : v[k]), doc)
}

export function formatDate(value: unknown, withTime = true): string {
  if (!value) return '—'
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return '—'
  return withTime
    ? d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const GOOD = new Set(['published', 'ready', 'cleared', 'subscribed', 'sent', 'delivered', 'accepted', 'responded', 'closed', 'authoritative', 'current', 'verified', 'registered'])
const BAD = new Set(['blocked', 'refused', 'dead', 'failed', 'unresolved', 'withdrawn', 'unsubscribed'])

export function StatusBadge({ value }: { value: unknown }) {
  const v = String(value ?? '')
  if (!v) return <span className="wpa-muted">—</span>
  const cls = GOOD.has(v) ? 'wpa-badge--good' : BAD.has(v) ? 'wpa-badge--bad' : 'wpa-badge--warn'
  return <span className={`wpa-badge ${cls}`}>{v.replace(/-/g, ' ')}</span>
}

function Cell({ column, doc }: { column: Column; doc: AdminDoc }) {
  const value = get(doc, column.name)
  switch (column.kind) {
    case 'date':
      return <>{formatDate(value)}</>
    case 'status':
      return <StatusBadge value={value} />
    case 'badge':
      return value ? <span className="wpa-badge">{String(value)}</span> : <span className="wpa-muted">—</span>
    case 'bool':
      return value ? <>✔</> : <span className="wpa-muted">—</span>
    case 'list':
      return Array.isArray(value) && value.length ? <>{value.join(', ')}</> : <span className="wpa-muted">—</span>
    case 'score': {
      if (typeof value !== 'number') return <span className="wpa-muted">—</span>
      const cls = value >= 80 ? 'wpa-badge--good' : value >= 50 ? 'wpa-badge--warn' : 'wpa-badge--bad'
      return <span className={`wpa-badge ${cls}`}>{value} / 100</span>
    }
    case 'thumb': {
      const src = assetPreview(value)
      // eslint-disable-next-line @next/next/no-img-element
      return src ? <img className="wpa-thumb" src={src} alt="" /> : null
    }
    default:
      return <>{value == null || value === '' ? <span className="wpa-muted">—</span> : String(value).slice(0, 120)}</>
  }
}

export function ListView({ slug }: { slug: string }) {
  const def = collectionDef(slug)
  const { me, refreshCounts } = useAdmin()
  const router = useRouter()
  const params = useSearchParams()
  const perms = me.permissions[slug]

  const page = Number(params.get('page') ?? 1)
  const status = params.get('status') ?? ''
  const search = params.get('s') ?? ''
  const sort = params.get('sort') ?? def?.defaultSort ?? '-updatedAt'

  const [result, setResult] = useState<{ docs: AdminDoc[]; totalDocs: number; totalPages: number } | null>(null)
  const [counts, setCounts] = useState<{ all: number; by: Record<string, number> } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState(search)

  const setQuery = useCallback(
    (patch: Record<string, string | number | null>) => {
      const next = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') next.delete(k)
        else next.set(k, String(v))
      }
      if (!('page' in patch)) next.delete('page')
      router.push(`/admin/${slug}${next.toString() ? `?${next}` : ''}`)
    },
    [params, router, slug],
  )

  const load = useCallback(() => {
    if (!def) return
    const where = status && def.statusField ? JSON.stringify({ [def.statusField]: { equals: status } }) : undefined
    listDocs(slug, { page, limit: 20, search, sort, where })
      .then(setResult)
      .catch((e) => setError(e.message))
    if (def.statusField) {
      adminFetch<{ all: number; by: Record<string, number> }>(`/collections/${slug}/counts`)
        .then(setCounts)
        .catch(() => setCounts(null))
    }
  }, [def, slug, page, search, sort, status])

  useEffect(() => {
    load()
  }, [load])

  if (!def) return <Notice kind="error">Unknown section.</Notice>
  if (!perms?.read) return <Notice kind="error">Sorry, you are not allowed to access this page.</Notice>

  const trash = async (doc: AdminDoc) => {
    const title = get(doc, def.titleField) ?? 'this item'
    if (!(await confirmDelete(`“${title}”`))) return
    try {
      await deleteDoc(slug, doc.id)
      toast(`${def.singular} deleted`)
      load()
      if (slug === 'inquiries') refreshCounts()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const sortBy = (name: string) => setQuery({ sort: sort === name ? `-${name}` : name })
  const sortMark = (name: string) => (sort === name ? ' ▲' : sort === `-${name}` ? ' ▼' : '')
  const canCreate = perms.create && def.canCreate !== false
  const hasActions = Boolean(def.viewPath) || perms.delete

  return (
    <>
      <div className="wpa-heading">
        <h1>{def.label}</h1>
        {canCreate && (
          <Link className="wpa-btn" href={`/admin/${slug}/new`}>
            Add New {def.singular}
          </Link>
        )}
      </div>
      {notice && (
        <Notice onClose={() => setNotice(null)}>{notice}</Notice>
      )}
      {error && (
        <Notice kind="error" onClose={() => setError(null)}>
          {error}
        </Notice>
      )}

      {def.statusField && counts && (
        <ul className="wpa-subsubsub">
          <li>
            <a href="#" className={!status ? 'is-current' : ''} onClick={(e) => (e.preventDefault(), setQuery({ status: null }))}>
              All <span className="count">({counts.all})</span>
            </a>
          </li>
          {Object.entries(def.statusLabels ?? {})
            .filter(([key]) => counts.by[key])
            .map(([key, label]) => (
              <li key={key}>
                <a href="#" className={status === key ? 'is-current' : ''} onClick={(e) => (e.preventDefault(), setQuery({ status: key }))}>
                  {label} <span className="count">({counts.by[key]})</span>
                </a>
              </li>
            ))}
        </ul>
      )}

      <div className="wpa-tablenav">
        <form
          className="wpa-search"
          onSubmit={(e) => {
            e.preventDefault()
            setQuery({ s: searchInput.trim() || null })
          }}
        >
          <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} aria-label={`Search ${def.label}`} />
          <button type="submit" className="wpa-btn">
            Search {def.label}
          </button>
        </form>
        {result && (
          <div className="wpa-pagination">
            <span>{result.totalDocs} items</span>
            <button type="button" disabled={page <= 1} onClick={() => setQuery({ page: 1 })} aria-label="First page">
              «
            </button>
            <button type="button" disabled={page <= 1} onClick={() => setQuery({ page: page - 1 })} aria-label="Previous page">
              ‹
            </button>
            <span>
              {page} of {result.totalPages}
            </span>
            <button type="button" disabled={page >= result.totalPages} onClick={() => setQuery({ page: page + 1 })} aria-label="Next page">
              ›
            </button>
            <button type="button" disabled={page >= result.totalPages} onClick={() => setQuery({ page: result.totalPages })} aria-label="Last page">
              »
            </button>
          </div>
        )}
      </div>

      <table className="wpa-table">
        <thead>
          <tr>
            {def.columns.map((c) => (
              <th key={c.name} scope="col">
                <button type="button" onClick={() => sortBy(c.name)}>
                  {c.label}
                  {sortMark(c.name)}
                </button>
              </th>
            ))}
            {hasActions && (
              <th scope="col" className="wpa-col-actions">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {!result && (
            <tr>
              <td colSpan={def.columns.length + (hasActions ? 1 : 0)} className="wpa-empty">
                Loading…
              </td>
            </tr>
          )}
          {result?.docs.length === 0 && (
            <tr>
              <td colSpan={def.columns.length + (hasActions ? 1 : 0)} className="wpa-empty">
                No {def.label.toLowerCase()} found.
              </td>
            </tr>
          )}
          {result?.docs.map((doc) => {
            const view = def.viewPath?.(doc)
            return (
              <tr key={doc.id}>
                {def.columns.map((c, i) =>
                  i === 0 ? (
                    <td key={c.name} className="wpa-col-title">
                      <Link className="wpa-row-title" href={`/admin/${slug}/${doc.id}`}>
                        {String(get(doc, c.name) || doc.username || doc.name || '(no title)')}
                      </Link>
                      {slug === 'pages' && Boolean(doc.pageId) && !(Array.isArray(doc.modules) && doc.modules.length) ? (
                        <span className="wpa-post-state wpa-post-state--live" title="The website shows this page's built-in design. This record only holds SEO and CTA settings until custom modules are added.">
                          {' '}
                          — Live · built-in design
                        </span>
                      ) : (
                        def.drafts && doc._status !== 'published' && <span className="wpa-post-state"> — Draft</span>
                      )}
                      <div className="wpa-row-actions">
                        <Link href={`/admin/${slug}/${doc.id}`}>{perms.update ? 'Edit' : 'View details'}</Link>
                        {perms.delete && (
                          <button type="button" className="wpa-link-danger" style={{ textDecoration: 'none' }} onClick={() => trash(doc)}>
                            Delete
                          </button>
                        )}
                        {view && (!def.drafts || doc._status === 'published') && (
                          <a href={view} target="_blank" rel="noreferrer">
                            View
                          </a>
                        )}
                      </div>
                    </td>
                  ) : (
                    <td key={c.name}>
                      <Cell column={c} doc={doc} />
                    </td>
                  ),
                )}
                {hasActions && (
                  <td className="wpa-col-actions">
                    <div className="wpa-icon-actions">
                      {view && (
                        <a
                          className="wpa-icon-btn"
                          // Unpublished records open through staff preview (Draft Mode).
                          href={!def.drafts || doc._status === 'published' ? view : `/admin/preview?path=${encodeURIComponent(view)}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Preview"
                          aria-label={`Preview “${String(get(doc, def.titleField) ?? '')}”`}
                        >
                          <Icon name="eye" size={18} />
                        </a>
                      )}
                      {perms.delete && (
                        <button
                          type="button"
                          className="wpa-icon-btn wpa-icon-btn--danger"
                          title="Delete"
                          aria-label={`Delete “${String(get(doc, def.titleField) ?? '')}”`}
                          onClick={() => trash(doc)}
                        >
                          <Icon name="trash" size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}
