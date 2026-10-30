import { cookies, draftMode } from 'next/headers'
import { cache } from 'react'

/**
 * Draft preview for staff.
 *
 * The admin's "Preview" button goes through /admin/preview, which turns on Next's Draft Mode
 * after the backend confirms the staff session. Draft content is shown only while BOTH hold:
 * Draft Mode is on and the staff session is still valid (so logging out of the admin ends
 * preview too). Everyone else always gets published content.
 */

const BACKEND_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '')
export const STAFF_COOKIE = 'tkg_admin'

/** True when the request carries a valid admin session. */
export async function hasStaffSession(cookieHeader: string | null | undefined): Promise<boolean> {
  if (!cookieHeader || !cookieHeader.includes(`${STAFF_COOKIE}=`)) return false
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/auth/me`, { headers: { cookie: cookieHeader }, cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}

export const isStaffPreview = cache(async (): Promise<boolean> => {
  const { isEnabled } = await draftMode()
  if (!isEnabled) return false
  const jar = await cookies()
  const session = jar.get(STAFF_COOKIE)?.value
  return session ? hasStaffSession(`${STAFF_COOKIE}=${session}`) : false
})
