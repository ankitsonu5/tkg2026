import { draftMode } from 'next/headers'

import { hasStaffSession } from '@/lib/preview'

/** Only same-site paths may be previewed (no open redirect). */
function safePath(value: string | null): string {
  return value && /^\/(?![/\\])/.test(value) ? value : '/'
}

/**
 * GET /admin/preview?path=/ideas/my-draft — staff only. Turns on Draft Mode, then opens the
 * page, which now shows unpublished content (see src/lib/preview.ts).
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const path = safePath(url.searchParams.get('path'))
  if (!(await hasStaffSession(request.headers.get('cookie')))) {
    return Response.redirect(new URL(`/admin/login?next=${encodeURIComponent(`/admin/preview?path=${path}`)}`, url), 307)
  }
  ;(await draftMode()).enable()
  return new Response(null, { status: 307, headers: { Location: path, 'Cache-Control': 'no-store' } })
}
