import { draftMode } from 'next/headers'

/** GET /admin/preview/exit?path=/ideas/x — leaves Draft Mode and returns to the page. */
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get('path')
  ;(await draftMode()).disable()
  const target = path && /^\/(?![/\\])/.test(path) ? path : '/'
  return new Response(null, { status: 307, headers: { Location: target, 'Cache-Control': 'no-store' } })
}
