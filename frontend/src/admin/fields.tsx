'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

import { assetPreview, getDoc, listDocs, type AdminDoc } from './api'
import { useAdmin } from './AdminShell'
import { MediaPicker } from './MediaLibrary'
import { collectionDef, type Field, type Option } from './schema'

const RichTextEditor = dynamic(() => import('./editor/RichTextEditor').then((m) => m.RichTextEditor), {
  ssr: false,
  loading: () => <div className="wpa-editor wpa-loading">Loading editor…</div>,
})

export type Values = Record<string, any>

/** Relationship values arrive populated (objects) from the API; forms keep ids. */
export function idOf(value: unknown): string | null {
  if (value && typeof value === 'object' && 'id' in value) return String((value as { id: unknown }).id)
  return typeof value === 'string' && value ? value : null
}

function useOptions(field: Field): Option[] {
  const { meta } = useAdmin()
  if (Array.isArray(field.options)) return field.options
  switch (field.options) {
    case 'roles':
      return meta.roles
    case 'inquiryRoutes':
      return meta.inquiryRoutes
    case 'pageIds':
      return meta.pageIds.map((v) => ({ value: v, label: v }))
    case 'moduleIds':
      return meta.moduleIds.map((v) => ({ value: v, label: v }))
    default:
      return []
  }
}

function toLocalInput(value: unknown, withTime: boolean): string {
  if (!value) return ''
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return withTime ? `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}` : date
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

export function FieldList({ fields, values, onChange, disabled }: { fields: Field[]; values: Values; onChange: (name: string, value: unknown) => void; disabled?: boolean }) {
  return (
    <>
      {fields
        .filter((f) => !f.condition || f.condition(values))
        .map((field) => (
          <FieldInput key={field.name} field={field} value={values?.[field.name]} values={values} onChange={(v) => onChange(field.name, v)} disabled={disabled} />
        ))}
    </>
  )
}

export function FieldInput({
  field,
  value,
  values,
  onChange,
  disabled,
}: {
  field: Field
  value: any
  values: Values
  onChange: (value: unknown) => void
  disabled?: boolean
}) {
  const id = `f-${field.name}-${Math.abs(hashCode(field.label))}`
  const readOnly = disabled || field.readOnly
  const label = (
    <label htmlFor={id}>
      {field.label} {field.required && <span className="wpa-req">*</span>}
    </label>
  )
  const help = field.help ? <p className="wpa-field__help">{field.help}</p> : null

  switch (field.type) {
    case 'checkbox':
      return (
        <div className="wpa-field">
          <label className="wpa-checkbox">
            <input id={id} type="checkbox" checked={Boolean(value)} disabled={readOnly} onChange={(e) => onChange(e.target.checked)} />
            {field.label}
          </label>
          {help}
        </div>
      )
    case 'textarea':
      return (
        <div className="wpa-field">
          {label}
          <textarea id={id} value={value ?? ''} readOnly={readOnly} rows={field.sidebar ? 3 : 4} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
          {help}
        </div>
      )
    case 'number':
      return (
        <div className="wpa-field">
          {label}
          <input id={id} type="number" value={value ?? ''} readOnly={readOnly} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
          {help}
        </div>
      )
    case 'date':
    case 'datetime': {
      const withTime = field.type === 'datetime'
      return (
        <div className="wpa-field">
          {label}
          <input
            id={id}
            type={withTime ? 'datetime-local' : 'date'}
            value={toLocalInput(value, withTime)}
            readOnly={readOnly}
            onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
          />
          {help}
        </div>
      )
    }
    case 'select':
      return <SelectField field={field} id={id} label={label} help={help} value={value} onChange={onChange} readOnly={readOnly} />
    case 'tags':
      return <TagsField field={field} id={id} label={label} help={help} value={value} onChange={onChange} readOnly={readOnly} />
    case 'relationship':
      return <RelationshipField field={field} label={label} help={help} value={value} onChange={onChange} readOnly={readOnly} />
    case 'upload':
      return <UploadField field={field} help={help} value={value} onChange={onChange} readOnly={readOnly} />
    case 'richText':
      return (
        <div className="wpa-field">
          <RichTextEditor value={value} onChange={onChange} readOnly={readOnly} />
          {help}
        </div>
      )
    case 'group':
      return (
        <div className="wpa-field">
          <div className="wpa-field__label">{field.label}</div>
          <div className="wpa-group">
            <FieldList
              fields={field.fields ?? []}
              values={value ?? {}}
              disabled={readOnly}
              onChange={(name, v) => onChange({ ...(value ?? {}), [name]: v })}
            />
          </div>
          {help}
        </div>
      )
    case 'array':
      return <ArrayField field={field} help={help} value={value} onChange={onChange} readOnly={readOnly} />
    case 'json':
      return <JsonField field={field} id={id} label={label} help={help} value={value} onChange={onChange} readOnly={readOnly} />
    case 'password':
      return (
        <div className="wpa-field">
          {label}
          <input id={id} type="password" autoComplete="new-password" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
          {help}
        </div>
      )
    default:
      return (
        <div className="wpa-field">
          {label}
          <input
            id={id}
            type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
            value={value ?? ''}
            readOnly={readOnly}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
          {help}
        </div>
      )
  }
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

type SubProps = { field: Field; id?: string; label?: React.ReactNode; help: React.ReactNode; value: any; onChange: (v: unknown) => void; readOnly?: boolean }

function SelectField({ field, id, label, help, value, onChange, readOnly }: SubProps) {
  const options = useOptions(field)
  if (field.many) {
    const selected: string[] = Array.isArray(value) ? value : []
    return (
      <div className="wpa-field">
        <div className="wpa-field__label">{label}</div>
        {options.map((o) => (
          <label key={o.value} className="wpa-checkbox">
            <input
              type="checkbox"
              disabled={readOnly}
              checked={selected.includes(o.value)}
              onChange={(e) => onChange(e.target.checked ? [...selected, o.value] : selected.filter((v) => v !== o.value))}
            />
            {o.label}
          </label>
        ))}
        {help}
      </div>
    )
  }
  return (
    <div className="wpa-field">
      {label}
      <select id={id} value={value ?? ''} disabled={readOnly} onChange={(e) => onChange(e.target.value || null)}>
        {!field.required && <option value="">— Select —</option>}
        {field.required && !value && <option value="">— Select —</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {help}
    </div>
  )
}

function TagsField({ id, label, help, value, onChange, readOnly }: SubProps) {
  const [draft, setDraft] = useState('')
  const tags: string[] = Array.isArray(value) ? value : []
  const add = () => {
    const next = draft
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && !tags.includes(t))
    if (next.length) onChange([...tags, ...next])
    setDraft('')
  }
  return (
    <div className="wpa-field">
      {label}
      {!readOnly && (
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            id={id}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
          />
          <button type="button" className="wpa-btn" onClick={add}>
            Add
          </button>
        </div>
      )}
      <p className="wpa-field__help">Separate tags with commas</p>
      <div className="wpa-tags">
        {tags.map((t) => (
          <span key={t} className="wpa-tag">
            {!readOnly && (
              <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))}>
                ⊗
              </button>
            )}
            {t}
          </span>
        ))}
      </div>
      {help}
    </div>
  )
}

function docTitle(slug: string, doc: AdminDoc | null | undefined): string {
  if (!doc) return ''
  const def = collectionDef(slug)
  const field = slug === 'assets' ? 'assetId' : (def?.titleField ?? 'title')
  return String(doc[field] ?? doc.title ?? doc.name ?? doc.id)
}

function RelationshipField({ field, label, help, value, onChange, readOnly }: SubProps) {
  const slug = field.relationTo!
  const ids: string[] = (field.many ? (Array.isArray(value) ? value : []) : [value]).map(idOf).filter((v): v is string => Boolean(v))
  const [fetched, setKnown] = useState<Record<string, AdminDoc>>({})
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<AdminDoc[]>([])

  // Titles for linked records: values may arrive populated (use them) or as bare ids (fetch).
  const populated = (field.many ? (Array.isArray(value) ? value : []) : [value]).filter((v: unknown) => v && typeof v === 'object') as AdminDoc[]
  const known: Record<string, AdminDoc> = { ...fetched, ...Object.fromEntries(populated.map((d) => [d.id, d])) }

  useEffect(() => {
    const missing = ids.filter((id) => !known[id])
    missing.forEach((id) =>
      getDoc(slug, id)
        .then((d) => setKnown((k) => ({ ...k, [id]: d })))
        .catch(() => undefined),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(ids)])

  useEffect(() => {
    if (readOnly) return
    const t = setTimeout(() => {
      listDocs(slug, { search, limit: 20 })
        .then((r) => setResults(r.docs))
        .catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(t)
  }, [search, slug, readOnly])

  const choose = (id: string) => {
    if (!id) return
    const doc = results.find((r) => r.id === id)
    if (doc) setKnown((k) => ({ ...k, [id]: doc }))
    onChange(field.many ? Array.from(new Set([...ids, id])) : id)
  }

  return (
    <div className="wpa-field">
      <div className="wpa-field__label">{label}</div>
      {ids.length > 0 && (
        <div className="wpa-relation-list">
          {ids.map((id) => (
            <div key={id} className="wpa-relation-item">
              <span>{docTitle(slug, known[id]) || <span className="wpa-muted">{id}</span>}</span>
              {!readOnly && (
                <button type="button" className="wpa-link-danger" onClick={() => onChange(field.many ? ids.filter((x) => x !== id) : null)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {!readOnly && (field.many || ids.length === 0) && (
        <div style={{ display: 'grid', gap: 4 }}>
          <input type="search" placeholder={`Search ${collectionDef(slug)?.label.toLowerCase() ?? slug}…`} value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value="" onChange={(e) => choose(e.target.value)}>
            <option value="">— Choose —</option>
            {results
              .filter((r) => !ids.includes(r.id))
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {docTitle(slug, r)}
                </option>
              ))}
          </select>
        </div>
      )}
      {help}
    </div>
  )
}

function UploadField({ field, help, value, onChange, readOnly }: SubProps) {
  const [open, setOpen] = useState(false)
  const [fetched, setAsset] = useState<AdminDoc | null>(null)
  const id = idOf(value)
  // Prefer the populated value; otherwise whatever was fetched for the current id.
  const asset: AdminDoc | null = value && typeof value === 'object' ? (value as AdminDoc) : fetched?.id === id ? fetched : null

  useEffect(() => {
    if (!id || asset) return
    getDoc('assets', id)
      .then(setAsset)
      .catch(() => setAsset(null))
  }, [id, asset])

  const preview = assetPreview(asset)
  return (
    <div className="wpa-field wpa-featured">
      <div className="wpa-field__label">{field.label}</div>
      {id ? (
        <>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={asset?.alt ?? ''} />
          ) : (
            <p className="wpa-mono">{asset?.filename ?? id}</p>
          )}
          {asset && asset.rightsStatus !== 'cleared' && (
            <p className="wpa-field__help">Rights are “{asset.rightsStatus}”: this file stays hidden on the public site until cleared.</p>
          )}
          {!readOnly && (
            <p style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="wpa-btn" onClick={() => setOpen(true)}>
                Replace
              </button>
              <button type="button" className="wpa-link-danger" onClick={() => onChange(null)}>
                Remove
              </button>
            </p>
          )}
        </>
      ) : (
        !readOnly && (
          <button type="button" className="wpa-btn" onClick={() => setOpen(true)}>
            Set {field.label.toLowerCase()}
          </button>
        )
      )}
      {help}
      {open && (
        <MediaPicker
          title={field.label}
          onClose={() => setOpen(false)}
          onSelect={(doc) => {
            setAsset(doc)
            onChange(doc.id)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

function ArrayField({ field, help, value, onChange, readOnly }: SubProps) {
  const rows: Values[] = Array.isArray(value) ? value : []
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
  const update = (i: number, row: Values) => onChange(rows.map((r, j) => (j === i ? row : r)))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const titleOf = (row: Values, i: number) => {
    const first = field.fields?.find((f) => f.type === 'text')
    return (first && row?.[first.name]) || `${field.rowLabel ?? 'Item'} ${i + 1}`
  }
  return (
    <div className="wpa-field">
      <div className="wpa-field__label">{field.label}</div>
      {rows.map((row, i) => (
        <div key={row.id ?? i} className="wpa-array__row">
          <div className="wpa-array__head">
            <span>{titleOf(row, i)}</span>
            <div>
              {!readOnly && (
                <>
                  <button type="button" onClick={() => move(i, -1)} aria-label="Move up">
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="Move down">
                    ↓
                  </button>
                  <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="Remove">
                    ✕
                  </button>
                </>
              )}
              <button type="button" onClick={() => setCollapsed((c) => ({ ...c, [i]: !c[i] }))} aria-label="Toggle">
                {collapsed[i] ? '▸' : '▾'}
              </button>
            </div>
          </div>
          {!collapsed[i] && (
            <div className="wpa-array__body">
              <FieldList fields={field.fields ?? []} values={row ?? {}} disabled={readOnly} onChange={(name, v) => update(i, { ...row, [name]: v })} />
            </div>
          )}
        </div>
      ))}
      {!readOnly && (
        <button type="button" className="wpa-btn" onClick={() => onChange([...rows, {}])}>
          + Add {field.rowLabel?.toLowerCase() ?? 'item'}
        </button>
      )}
      {help}
    </div>
  )
}

function JsonField({ id, label, help, value, onChange, readOnly }: SubProps) {
  // Seeded once; the edit screen remounts per document, and re-syncing while typing would
  // reformat the text under the cursor.
  const [text, setText] = useState(() => (value === undefined || value === null ? '' : JSON.stringify(value, null, 2)))
  const [error, setError] = useState<string | null>(null)

  if (readOnly && value && typeof value === 'object' && !Array.isArray(value)) {
    return (
      <div className="wpa-field">
        <div className="wpa-field__label">{label}</div>
        <table className="wpa-table">
          <tbody>
            {Object.entries(value).map(([k, v]) => (
              <tr key={k}>
                <th style={{ width: '30%' }}>{k}</th>
                <td>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {help}
      </div>
    )
  }

  return (
    <div className="wpa-field">
      {label}
      <textarea
        id={id}
        className="wpa-mono"
        rows={8}
        value={text}
        readOnly={readOnly}
        onChange={(e) => {
          setText(e.target.value)
          if (!e.target.value.trim()) {
            setError(null)
            return onChange(null)
          }
          try {
            onChange(JSON.parse(e.target.value))
            setError(null)
          } catch {
            setError('Not valid JSON yet — changes are kept only once it parses.')
          }
        }}
      />
      {error && <p className="wpa-field__help" style={{ color: '#d63638' }}>{error}</p>}
      {help}
    </div>
  )
}
