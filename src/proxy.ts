import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Legacy-URL handling (Section 11.1).
 *
 * Applies the decisions recorded in the `redirects` collection. The matcher below excludes every
 * real route, so this only runs for paths the app does not serve (old-site URLs, typos, probes)
 * and costs nothing on normal page views.
 *
 * Decisions: 301/302 redirect to `toPath`; 410 returns Gone; `undecided` or no record falls
 * through to the normal 404 (the baseline forbids blanket-redirecting unknown URLs to Home).
 */

interface RedirectRule {
  decision: string
  toPath?: string | null
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, { rule: RedirectRule | null; expires: number }>()

async function lookup(origin: string, path: string): Promise<RedirectRule | null> {
  const hit = cache.get(path)
  if (hit && hit.expires > Date.now()) return hit.rule

  let rule: RedirectRule | null = null
  try {
    const url = new URL('/api/redirects', origin)
    url.searchParams.set('where[fromPath][equals]', path)
    url.searchParams.set('limit', '1')
    url.searchParams.set('depth', '0')
    const res = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' })
    if (res.ok) {
      const body = (await res.json()) as { docs?: RedirectRule[] }
      rule = body.docs?.[0] ?? null
    }
  } catch {
    // A lookup failure must never break the request; fall through to the normal 404.
    return null
  }

  if (cache.size > 500) cache.clear()
  cache.set(path, { rule, expires: Date.now() + CACHE_TTL_MS })
  return rule
}

export async function proxy(request: NextRequest) {
  const { pathname, origin } = request.nextUrl
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  const rule = await lookup(origin, path)
  if (!rule) return NextResponse.next()

  if (rule.decision === '410') return new NextResponse('Gone', { status: 410 })

  if ((rule.decision === '301' || rule.decision === '302') && rule.toPath) {
    const target = new URL(rule.toPath, origin)
    // Never bounce back to the same URL.
    if (target.pathname === pathname) return NextResponse.next()
    return NextResponse.redirect(target, Number(rule.decision))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!(?:api|admin|_next|images|downloads|about|enterprise-investments|ideas|film-culture|impact|media-speaking|connect|privacy|terms|accessibility|search|newsletter|robots\.txt|sitemap\.xml|favicon\.ico)(?:/|$)).+)',
  ],
}
