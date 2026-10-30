'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { confirmDelete, toast } from './alerts'
import { AdminApiError, assetPreview, deleteDoc, listDocs, mediaUrl, saveDoc, uploadMedia, type AdminDoc } from './api'
import { Notice, useAdmin } from './AdminShell'
import { FieldList } from './fields'
import { ASSET_FIELDS } from './schema'

function formatBytes(n: unknown): string {
  const v = Number(n)
  if (!v) return '—'
  return v > 1024 * 1024 ? `${(v / 1024 / 1024).toFixed(1)} MB` : `${Math.round(v / 1024)} KB`
}

function rightsBadge(status: unknown) {
  const s = String(status ?? 'unverified')
  const cls = s === 'cleared' ? 'wpa-badge--good' : s === 'refused' ? 'wpa-badge--bad' : 'wpa-badge--warn'
  return <span className={`wpa-badge ${cls} wpa-media-tile__flag`}>{s}</span>
}

/** Upload drop zone + grid. `onPick` turns it into a chooser (used by the picker modal). */
export function MediaBrowser({ onPick, selectedId }: { onPick?: (doc: AdminDoc) => void; selectedId?: string | null }) {
  const { me } = useAdmin()
  const canUpload = me.permissions.assets?.create
  const [docs, setDocs] = useState<AdminDoc[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [rights, setRights] = useState('')
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [details, setDetails] = useState<AdminDoc | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = useCallback(
    (p = 1) => {
      const where = rights ? JSON.stringify({ rightsStatus: { equals: rights } }) : undefined
      listDocs('assets', { page: p, limit: 40, search, where, sort: '-createdAt' })
        .then((r) => {
          setDocs((prev) => (p === 1 ? r.docs : [...prev, ...r.docs]))
          setPage(r.page)
          setTotalPages(r.totalPages)
        })
        .catch((e) => setNotice({ kind: 'error', text: e.message }))
    },
    [search, rights],
  )

  useEffect(() => {
    const t = setTimeout(() => load(1), 200)
    return () => clearTimeout(t)
  }, [load])

  const upload = async (files: FileList | File[]) => {
    setBusy(true)
    setNotice(null)
    const uploaded: AdminDoc[] = []
    for (const file of Array.from(files)) {
      try {
        uploaded.push(await uploadMedia(file))
      } catch (e) {
        setNotice({ kind: 'error', text: `${file.name}: ${(e as Error).message}` })
      }
    }
    setBusy(false)
    if (uploaded.length) {
      setDocs((prev) => [...uploaded, ...prev])
      toast(`${uploaded.length} file${uploaded.length === 1 ? '' : 's'} uploaded — add alt text and clear the rights before using publicly`)
      if (onPick && uploaded.length === 1) setDetails(uploaded[0])
    }
  }

  return (
    <div>
      {notice && (
        <Notice kind={notice.kind} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}
      {canUpload && (
        <div
          className={`wpa-dropzone${over ? ' is-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            if (e.dataTransfer.files.length) upload(e.dataTransfer.files)
          }}
        >
          <p>{busy ? 'Uploading…' : 'Drop files to upload'}</p>
          <p className="wpa-muted" style={{ fontSize: 13 }}>
            or
          </p>
          <button type="button" className="wpa-btn wpa-btn--large" disabled={busy} onClick={() => fileInput.current?.click()}>
            Select Files
          </button>
          <p className="wpa-muted" style={{ fontSize: 12, marginTop: 10 }}>
            Maximum upload file size: 25 MB. Images, PDF, MP4/WebM video, MP3/WAV audio.
          </p>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            accept="image/*,application/pdf,video/mp4,video/webm,audio/*"
            onChange={(e) => {
              if (e.target.files?.length) upload(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
      )}

      <div className="wpa-tablenav">
        <div style={{ display: 'flex', gap: 6 }}>
          <select value={rights} onChange={(e) => setRights(e.target.value)} style={{ width: 'auto' }}>
            <option value="">All rights states</option>
            <option value="cleared">Cleared</option>
            <option value="unverified">Unverified</option>
            <option value="requested">Requested</option>
            <option value="refused">Refused</option>
          </select>
        </div>
        <div className="wpa-search">
          <input type="search" placeholder="Search media" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="wpa-media-grid">
        {docs.map((doc) => {
          const preview = assetPreview(doc)
          return (
            <button
              key={doc.id}
              type="button"
              className={`wpa-media-tile${selectedId === doc.id ? ' is-selected' : ''}`}
              onClick={() => setDetails(doc)}
              onDoubleClick={() => onPick?.(doc)}
              title={doc.filename}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {preview ? <img src={preview} alt={doc.alt ?? ''} loading="lazy" /> : <span className="wpa-media-tile__file">{doc.filename}</span>}
              {rightsBadge(doc.rightsStatus)}
            </button>
          )
        })}
      </div>
      {docs.length === 0 && <p className="wpa-muted">No media found.</p>}
      {page < totalPages && (
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <button type="button" className="wpa-btn" onClick={() => load(page + 1)}>
            Load more
          </button>
        </p>
      )}

      {details && (
        <AttachmentDetails
          key={`${details.id}:${details.updatedAt}`}
          doc={details}
          onClose={() => setDetails(null)}
          onPick={onPick}
          onSaved={(saved) => {
            setDocs((prev) => prev.map((d) => (d.id === saved.id ? saved : d)))
            setDetails(saved)
          }}
          onDeleted={(id) => {
            setDocs((prev) => prev.filter((d) => d.id !== id))
            setDetails(null)
          }}
        />
      )}
    </div>
  )
}

function AttachmentDetails({
  doc,
  onClose,
  onSaved,
  onDeleted,
  onPick,
}: {
  doc: AdminDoc
  onClose: () => void
  onSaved: (doc: AdminDoc) => void
  onDeleted: (id: string) => void
  onPick?: (doc: AdminDoc) => void
}) {
  const { me } = useAdmin()
  const [values, setValues] = useState<AdminDoc>(doc)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const canEdit = me.permissions.assets?.update
  const canDelete = me.permissions.assets?.delete
  const full = mediaUrl(doc.filename)
  const isImage = String(doc.mimeType ?? '').startsWith('image/')

  const save = async () => {
    setError(null)
    try {
      const patch = Object.fromEntries(ASSET_FIELDS.map((f) => [f.name, values[f.name]]))
      const result = await saveDoc('assets', doc.id, patch)
      onSaved(result)
      setSaved(true)
      toast('Attachment details saved')
      setTimeout(() => setSaved(false), 2000)
      return result
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Could not save.')
      return null
    }
  }

  return (
    <div className="wpa-modal" role="dialog" aria-modal="true" aria-label="Attachment details" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wpa-modal__box">
        <div className="wpa-modal__head">
          <h2>Attachment details</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="wpa-modal__body">
          {error && <Notice kind="error">{error}</Notice>}
          <div className="wpa-attachment">
            <div className="wpa-attachment__preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {isImage && full ? <img src={full} alt={doc.alt ?? ''} /> : <a href={full ?? '#'} target="_blank" rel="noreferrer">{doc.filename}</a>}
            </div>
            <div>
              <div className="wpa-attachment__meta">
                <strong>File name:</strong> {doc.filename}
                <br />
                <strong>File type:</strong> {doc.mimeType}
                <br />
                <strong>Uploaded on:</strong> {doc.createdAt ? new Date(doc.createdAt).toLocaleString() : '—'}
                <br />
                <strong>File size:</strong> {formatBytes(doc.filesize)}
                {doc.width ? (
                  <>
                    <br />
                    <strong>Dimensions:</strong> {doc.width} by {doc.height} pixels
                  </>
                ) : null}
                <br />
                <strong>Public URL:</strong> <span className="wpa-mono">{doc.url}</span>
              </div>
              <FieldList fields={ASSET_FIELDS} values={values} disabled={!canEdit} onChange={(name, v) => setValues((s) => ({ ...s, [name]: v }))} />
            </div>
          </div>
        </div>
        <div className="wpa-modal__foot">
          {canDelete && (
            <button
              type="button"
              className="wpa-link-danger"
              style={{ marginRight: 'auto' }}
              onClick={async () => {
                if (!(await confirmDelete(`“${doc.filename}”`))) return
                try {
                  await deleteDoc('assets', doc.id)
                  toast('File deleted')
                  onDeleted(doc.id)
                } catch (e) {
                  setError((e as Error).message)
                }
              }}
            >
              Delete permanently
            </button>
          )}
          {saved && <span className="wpa-muted">Saved.</span>}
          {canEdit && (
            <button type="button" className="wpa-btn" onClick={save}>
              Save
            </button>
          )}
          {onPick && (
            <button
              type="button"
              className="wpa-btn wpa-btn--primary"
              onClick={async () => {
                const result = canEdit ? await save() : doc
                if (result) onPick(result)
              }}
            >
              Select
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** "Set featured image" / "Add Media" modal. */
export function MediaPicker({ title, onClose, onSelect }: { title: string; onClose: () => void; onSelect: (doc: AdminDoc) => void }) {
  return (
    <div className="wpa-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wpa-modal__box">
        <div className="wpa-modal__head">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="wpa-modal__body">
          <p className="wpa-muted" style={{ marginTop: 0 }}>
            Click a file to see its details, then “Select”. Double-click to select straight away.
          </p>
          <MediaBrowser onPick={onSelect} />
        </div>
      </div>
    </div>
  )
}
