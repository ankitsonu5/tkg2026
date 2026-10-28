'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { confirmDelete, confirmDialog, toast } from './alerts'
import { AdminApiError, deleteDoc, getDoc, saveDoc, type AdminDoc } from './api'
import { Notice, useAdmin } from './AdminShell'
import { FieldInput, FieldList, idOf, slugify, type Values } from './fields'
import { formatDate, StatusBadge } from './ListView'
import { collectionDef, type Field } from './schema'
import { SeoPanel } from './SeoPanel'

/** Turns populated relationships back into ids, following the form schema. */
export function normalize(fields: Field[], values: Values): Values {
  const out: Values = {}
  for (const field of fields) {
    if (field.readOnly || !(field.name in values)) continue
    const value = values[field.name]
    if (field.type === 'password') {
      if (value) out[field.name] = value
      continue
    }
    if (field.type === 'relationship' || field.type === 'upload') {
      out[field.name] = field.many ? (Array.isArray(value) ? value.map(idOf).filter(Boolean) : []) : idOf(value)
    } else if (field.type === 'group') {
      out[field.name] = { ...(value ?? {}), ...normalize(field.fields ?? [], value ?? {}) }
    } else if (field.type === 'array') {
      out[field.name] = Array.isArray(value)
        ? value.map((row: Values) => ({ ...(row.id ? { id: row.id } : {}), ...normalize(field.fields ?? [], row ?? {}) }))
        : value
    } else {
      out[field.name] = value
    }
  }
  return out
}

export function EditView({ slug, id }: { slug: string; id: string | null }) {
  const def = collectionDef(slug)
  const router = useRouter()
  const { me, refreshCounts } = useAdmin()
  const perms = me.permissions[slug]
  const [doc, setDoc] = useState<AdminDoc | null>(null)
  const [values, setValues] = useState<Values>(() => ({ ...(def?.defaults ?? {}) }))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const slugTouched = useRef(Boolean(id))
  /** Latest score from the SEO box; stored on save for records scored from their rendered page. */
  const seoScore = useRef<number | null>(null)
  const onSeoScore = useCallback((score: number | null) => {
    seoScore.current = score
  }, [])

  useEffect(() => {
    if (!id) return
    getDoc(slug, id)
      .then((d) => {
        setDoc(d)
        setValues(d)
      })
      .catch((e) => setNotice({ kind: 'error', text: e.message }))
      .finally(() => setLoading(false))
  }, [slug, id])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const slugField = def?.fields.find((f) => f.slugFrom)

  const setField = useCallback(
    (name: string, value: unknown) => {
      setDirty(true)
      setValues((v) => {
        const next = { ...v, [name]: value }
        if (slugField && name === slugField.slugFrom && !slugTouched.current) next[slugField.name] = slugify(String(value ?? ''))
        if (slugField && name === slugField.name) slugTouched.current = true
        return next
      })
    },
    [slugField],
  )

  const editable = Boolean(id ? perms?.update : perms?.create)
  const mainFields = useMemo(() => def?.fields.filter((f) => !f.sidebar && f !== slugField) ?? [], [def, slugField])
  const sideFields = useMemo(() => def?.fields.filter((f) => f.sidebar) ?? [], [def])

  if (!def) return <Notice kind="error">Unknown section.</Notice>
  if (!perms?.read) return <Notice kind="error">Sorry, you are not allowed to access this page.</Notice>
  if (loading) return <div className="wpa-loading">Loading…</div>

  const titleField: Field = { name: def.titleField, label: 'Title', type: 'text', readOnly: ['inquiries', 'audit-events', 'delivery-attempts', 'newsletter-subscriptions'].includes(slug) }
  const titleEditable = editable && !titleField.readOnly && !(slug === 'inquiry-routes')

  const save = async (status?: 'draft' | 'published'): Promise<AdminDoc | null> => {
    setSaving(true)
    setNotice(null)
    try {
      const body: Values = normalize(def.fields, values)
      if (titleEditable) body[def.titleField] = values[def.titleField]
      if (slug === 'users') body.email = values.email
      if (def.drafts) body._status = status ?? values._status ?? 'draft'
      if (slug !== 'articles' && 'seoAnalysis' in body && seoScore.current !== null) body.seoAnalysis = { ...(body.seoAnalysis ?? {}), score: seoScore.current }
      const saved = await saveDoc(slug, id, body)
      setDirty(false)
      if (slug === 'inquiries') refreshCounts()
      if (!id) {
        router.replace(`/admin/${slug}/${saved.id}?created=1`)
        return saved
      }
      setDoc(saved)
      setValues(saved)
      const verb = def.drafts ? (saved._status === 'published' ? (doc?._status === 'published' ? 'updated' : 'published') : 'saved as draft') : 'updated'
      toast(`${def.singular} ${verb}`)
      return saved
    } catch (e) {
      setNotice({ kind: 'error', text: e instanceof AdminApiError ? e.message : 'Could not save. Please try again.' })
      return null
    } finally {
      setSaving(false)
    }
  }

  /**
   * WordPress-style Preview: opens the real page in a new tab with staff Draft Mode on. An
   * unpublished draft with unsaved changes is saved first so the preview matches the editor.
   */
  const preview = async () => {
    if (!def.viewPath) return
    let target: Values | null = values
    if (values._status === 'published' && dirty) {
      const go = await confirmDialog({
        title: 'Preview the saved version?',
        text: 'Your unsaved changes are not included in the preview — they go live only when you click Update.',
        confirmText: 'Open preview',
        icon: 'info',
      })
      if (!go) return
    }
    // Open the tab now, inside the click, so popup blockers allow it.
    const tab = window.open('about:blank', '_blank')
    if ((!id || dirty) && values._status !== 'published') target = await save('draft')
    const path = target ? def.viewPath(target) : null
    if (!path) {
      tab?.close()
      if (target) setNotice({ kind: 'warning', text: 'Add a slug (permalink) before previewing.' })
      return
    }
    const url = `/admin/preview?path=${encodeURIComponent(path)}`
    if (tab) tab.location.href = url
    else window.open(url, '_blank')
  }

  const remove = async () => {
    if (!id || !(await confirmDelete(`this ${def.singular.toLowerCase()}`))) return
    try {
      await deleteDoc(slug, id)
      setDirty(false)
      toast(`${def.singular} deleted`)
      router.replace(`/admin/${slug}`)
    } catch (e) {
      setNotice({ kind: 'error', text: (e as Error).message })
    }
  }

  const view = doc ? def.viewPath?.(doc) : null
  const isPublished = values._status === 'published'
  const created = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('created')

  return (
    <>
      <div className="wpa-heading">
        <h1>{id ? `${editable ? 'Edit' : 'View'} ${def.singular}` : `Add New ${def.singular}`}</h1>
        {id && perms.create && def.canCreate !== false && (
          <Link className="wpa-btn" href={`/admin/${slug}/new`}>
            Add New {def.singular}
          </Link>
        )}
      </div>

      {created && !notice && <Notice>{def.singular} created.</Notice>}
      {slug === 'pages' && Boolean(values.pageId) && id && !(Array.isArray(values.modules) && values.modules.length) && (
        <Notice kind="info">
          This page is <strong>live on the website with its built-in design</strong>. This record only holds its SEO and call-to-action settings; the
          status below stays “Draft” because no custom modules have been added. Publishing it without modules changes nothing on the site.
        </Notice>
      )}
      {notice && (
        <Notice kind={notice.kind} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      <div className="wpa-edit">
        <div>
          {slug === 'users' ? (
            <FieldInput field={{ name: 'email', label: 'Email', type: 'email', help: 'Used for login and notifications. Optional if a username is set.' }} value={values.email} values={values} onChange={(v) => setField('email', v)} disabled={!editable} />
          ) : (
            <input
              className="wpa-title-input"
              aria-label="Title"
              placeholder="Add title"
              value={values[def.titleField] ?? ''}
              readOnly={!titleEditable}
              onChange={(e) => setField(def.titleField, e.target.value)}
            />
          )}

          {slugField && (
            <div className="wpa-permalink">
              <strong>Permalink:</strong>
              <span className="wpa-mono">{def.viewPath?.({ ...values, slug: '__slug__' })?.replace('__slug__', '') ?? '/'}</span>
              <input
                type="text"
                style={{ width: 260 }}
                value={values[slugField.name] ?? ''}
                readOnly={!editable}
                aria-label="Slug"
                onChange={(e) => setField(slugField.name, slugify(e.target.value))}
              />
              {view && isPublished && (
                <a href={view} target="_blank" rel="noreferrer" className="wpa-btn">
                  View
                </a>
              )}
            </div>
          )}

          {mainFields.length > 0 && (
            <div className={mainFields.some((f) => f.type === 'richText') ? '' : 'wpa-postbox'}>
              <div className={mainFields.some((f) => f.type === 'richText') ? '' : 'wpa-postbox__body'}>
                {mainFields.map((field) =>
                  !field.condition || field.condition(values) ? (
                    field.type === 'group' || (field.type === 'json' && !field.readOnly) ? (
                      <div key={field.name} className="wpa-postbox" style={{ marginTop: 20 }}>
                        <div className="wpa-postbox__head">
                          <h2>{field.label}</h2>
                        </div>
                        <div className="wpa-postbox__body">
                          {field.type === 'group' ? (
                            <FieldList fields={field.fields ?? []} values={values[field.name] ?? {}} disabled={!editable} onChange={(n, v) => setField(field.name, { ...(values[field.name] ?? {}), [n]: v })} />
                          ) : (
                            <FieldInput field={{ ...field, label: '' }} value={values[field.name]} values={values} onChange={(v) => setField(field.name, v)} disabled={!editable} />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div key={field.name} className={field.type === 'richText' ? '' : 'wpa-postbox'} style={field.type === 'richText' ? { marginBottom: 20 } : undefined}>
                        <div className={field.type === 'richText' ? '' : 'wpa-postbox__body'}>
                          <FieldInput field={field} value={values[field.name]} values={values} onChange={(v) => setField(field.name, v)} disabled={!editable} />
                        </div>
                      </div>
                    )
                  ) : null,
                )}
              </div>
            </div>
          )}
        </div>

        <aside>
          <div className="wpa-postbox">
            <div className="wpa-postbox__head">
              <h2>{def.drafts ? 'Publish' : 'Save'}</h2>
            </div>
            <div className="wpa-postbox__body wpa-pubmeta">
              {def.drafts && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                    {editable && !isPublished ? (
                      <button type="button" className="wpa-btn" disabled={saving} onClick={() => save('draft')}>
                        Save Draft
                      </button>
                    ) : (
                      <span />
                    )}
                    {def.viewPath && (
                      <button type="button" className="wpa-btn" disabled={saving} onClick={preview}>
                        Preview
                      </button>
                    )}
                  </div>
                  <div>
                    <span>Status:</span> <StatusBadge value={values._status ?? 'draft'} />
                  </div>
                </>
              )}
              {doc?.createdAt && (
                <div>
                  <span>Created:</span> {formatDate(doc.createdAt)}
                </div>
              )}
              {doc?.updatedAt && (
                <div>
                  <span>Last modified:</span> {formatDate(doc.updatedAt)}
                </div>
              )}
              {def.drafts && !me.canPublish && <p className="wpa-field__help">Your role can save drafts. A Publisher publishes after the evidence check.</p>}
              {dirty && <p className="wpa-field__help">You have unsaved changes.</p>}
            </div>
            {editable && (
              <div className="wpa-postbox__foot">
                {id && perms.delete ? (
                  <button type="button" className="wpa-link-danger" onClick={remove}>
                    Move to Trash
                  </button>
                ) : (
                  <span />
                )}
                {def.drafts ? (
                  isPublished ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {me.canPublish && (
                        <button
                          type="button"
                          className="wpa-btn"
                          disabled={saving}
                          onClick={async () => {
                            const ok = await confirmDialog({
                              title: 'Unpublish this?',
                              text: 'It will be taken off the public website and kept as a draft.',
                              confirmText: 'Yes, unpublish',
                              danger: true,
                            })
                            if (ok) save('draft')
                          }}
                        >
                          Unpublish
                        </button>
                      )}
                      <button type="button" className="wpa-btn wpa-btn--primary wpa-btn--large" disabled={saving || !me.canPublish} onClick={() => save('published')}>
                        {saving ? 'Saving…' : 'Update'}
                      </button>
                    </div>
                  ) : (
                    me.canPublish && (
                      <button type="button" className="wpa-btn wpa-btn--primary wpa-btn--large" disabled={saving} onClick={() => save('published')}>
                        {saving ? 'Publishing…' : 'Publish'}
                      </button>
                    )
                  )
                ) : (
                  <button type="button" className="wpa-btn wpa-btn--primary wpa-btn--large" disabled={saving} onClick={() => save()}>
                    {saving ? 'Saving…' : id ? 'Update' : 'Save'}
                  </button>
                )}
              </div>
            )}
          </div>

          {def.fields.some((f) => f.name === 'seoAnalysis') && (
            <SeoPanel slug={slug} id={id} values={values} path={values.displayAs === 'card' ? null : (def.viewPath?.(values) ?? null)} onScore={onSeoScore} />
          )}

          {sideFields.length > 0 && (
            <div className="wpa-postbox">
              <div className="wpa-postbox__head">
                <h2>{slug === 'inquiries' ? 'Handling' : 'Details'}</h2>
              </div>
              <div className="wpa-postbox__body">
                <FieldList fields={sideFields} values={values} onChange={setField} disabled={!editable} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
