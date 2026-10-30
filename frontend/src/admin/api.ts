'use client'

/**
 * Browser client for the admin API. Calls go to /api/admin/* on this site, which Next
 * rewrites to the backend; the staff session is an httpOnly cookie the browser sends along.
 */

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
    /** The full error body (e.g. retryAfterSeconds, attemptsLeft on login). */
    readonly body: Record<string, unknown> = {},
  ) {
    super(message)
  }
}

export async function adminFetch<T>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    method: init.method ?? 'GET',
    credentials: 'same-origin',
    headers: init.body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
    cache: 'no-store',
  })
  const text = await res.text()
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
      window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`
    }
    throw new AdminApiError(String(payload.error ?? `Request failed (${res.status})`), res.status, payload.details, payload)
  }
  return payload as T
}

export interface ListResult<T = AdminDoc> {
  docs: T[]
  totalDocs: number
  totalPages: number
  page: number
  limit: number
}

export type AdminDoc = Record<string, any> & { id: string }

export interface Permissions {
  read: boolean
  create: boolean
  update: boolean
  delete: boolean
}

export interface Me {
  user: { id: string; email: string; username?: string; name: string; roles: string[]; assignedRoutes: string[] }
  permissions: Record<string, Permissions>
  canPublish: boolean
  isAdmin: boolean
}

export interface Meta {
  roles: { value: string; label: string }[]
  inquiryRoutes: { value: string; label: string }[]
  pageIds: string[]
  moduleIds: string[]
}

export function listDocs(slug: string, params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') query.set(key, String(value))
  return adminFetch<ListResult>(`/collections/${slug}?${query}`)
}

export function getDoc(slug: string, id: string) {
  return adminFetch<AdminDoc>(`/collections/${slug}/${id}`)
}

export function saveDoc(slug: string, id: string | null, body: Record<string, unknown>) {
  return id
    ? adminFetch<AdminDoc>(`/collections/${slug}/${id}`, { method: 'PATCH', body })
    : adminFetch<AdminDoc>(`/collections/${slug}`, { method: 'POST', body })
}

export function deleteDoc(slug: string, id: string) {
  return adminFetch<{ ok: true }>(`/collections/${slug}/${id}`, { method: 'DELETE' })
}

export function uploadMedia(file: File, extra: { alt?: string; assetId?: string } = {}) {
  const form = new FormData()
  form.append('file', file)
  if (extra.alt) form.append('alt', extra.alt)
  if (extra.assetId) form.append('assetId', extra.assetId)
  return adminFetch<AdminDoc>('/media', { method: 'POST', form })
}

/** Staff-only file URL (works for assets whose rights are not cleared yet). */
export function mediaUrl(filename: string | null | undefined): string | null {
  return filename ? `/api/admin/media/file/${encodeURIComponent(filename)}` : null
}

/** Best small preview for an asset document. */
export function assetPreview(asset: AdminDoc | null | undefined): string | null {
  if (!asset || typeof asset !== 'object') return null
  if (!String(asset.mimeType ?? '').startsWith('image/')) return null
  return mediaUrl(asset.sizes?.thumbnail?.filename || asset.filename)
}
