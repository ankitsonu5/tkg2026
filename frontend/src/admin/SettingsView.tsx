'use client'

import { useEffect, useState } from 'react'

import { toast } from './alerts'
import { adminFetch, AdminApiError, type AdminDoc } from './api'
import { Notice, useAdmin } from './AdminShell'
import { normalize } from './EditView'
import { FieldList, type Values } from './fields'
import { GLOBALS } from './schema'

/** Settings → General / Menus / Footer. */
export function SettingsView({ slug }: { slug: string }) {
  const def = GLOBALS.find((g) => g.slug === slug)
  const { me } = useAdmin()
  const [values, setValues] = useState<Values | null>(null)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminFetch<AdminDoc>(`/globals/${slug}`)
      .then(setValues)
      .catch((e) => setNotice({ kind: 'error', text: e.message }))
  }, [slug])

  if (!def) return <Notice kind="error">Unknown settings page.</Notice>
  if (!me.isAdmin) return <Notice kind="error">Only administrators can change site settings.</Notice>

  return (
    <>
      <div className="wpa-heading">
        <h1>{def.label} Settings</h1>
      </div>
      {notice && (
        <Notice kind={notice.kind} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}
      {!values ? (
        <div className="wpa-loading">Loading…</div>
      ) : (
        <form
          style={{ maxWidth: 760 }}
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            try {
              setValues(await adminFetch<AdminDoc>(`/globals/${slug}`, { method: 'PUT', body: normalize(def.fields, values) }))
              toast('Settings saved')
            } catch (err) {
              setNotice({ kind: 'error', text: err instanceof AdminApiError ? err.message : 'Could not save.' })
            } finally {
              setSaving(false)
            }
          }}
        >
          <div className="wpa-postbox">
            <div className="wpa-postbox__body">
              <FieldList fields={def.fields} values={values} onChange={(name, v) => setValues((s) => ({ ...(s ?? {}), [name]: v }))} />
            </div>
          </div>
          <button type="submit" className="wpa-btn wpa-btn--primary wpa-btn--large" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      )}
    </>
  )
}

/** Profile: own name and password. */
export function ProfileView() {
  const { me } = useAdmin()
  const [name, setName] = useState(me.user.name)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  return (
    <>
      <div className="wpa-heading">
        <h1>Profile</h1>
      </div>
      {notice && (
        <Notice kind={notice.kind} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}
      <form
        style={{ maxWidth: 560 }}
        onSubmit={async (e) => {
          e.preventDefault()
          if (newPassword && newPassword !== confirm) return setNotice({ kind: 'error', text: 'The new passwords do not match.' })
          try {
            await adminFetch('/auth/me', { method: 'PATCH', body: { name, currentPassword, newPassword: newPassword || undefined } })
            setCurrentPassword('')
            setNewPassword('')
            setConfirm('')
            toast('Profile updated')
          } catch (err) {
            setNotice({ kind: 'error', text: (err as Error).message })
          }
        }}
      >
        <div className="wpa-postbox">
          <div className="wpa-postbox__head">
            <h2>Account</h2>
          </div>
          <div className="wpa-postbox__body">
            <div className="wpa-field">
              <label>Email</label>
              <input type="email" value={me.user.email} readOnly />
            </div>
            <div className="wpa-field">
              <label htmlFor="p-name">Name</label>
              <input id="p-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="wpa-field">
              <label>Roles</label>
              <p style={{ margin: 0 }}>{me.user.roles.join(', ') || '—'}</p>
            </div>
          </div>
        </div>
        <div className="wpa-postbox">
          <div className="wpa-postbox__head">
            <h2>Change password</h2>
          </div>
          <div className="wpa-postbox__body">
            <div className="wpa-field">
              <label htmlFor="p-cur">Current password</label>
              <input id="p-cur" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="wpa-field">
              <label htmlFor="p-new">New password</label>
              <input id="p-new" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <p className="wpa-field__help">At least 8 characters.</p>
            </div>
            <div className="wpa-field">
              <label htmlFor="p-conf">Confirm new password</label>
              <input id="p-conf" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
          </div>
        </div>
        <button type="submit" className="wpa-btn wpa-btn--primary wpa-btn--large">
          Update Profile
        </button>
      </form>
    </>
  )
}
