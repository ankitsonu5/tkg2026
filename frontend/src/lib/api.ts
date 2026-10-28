import { cache } from 'react'

import type { Config } from './content-types'

/**
 * Server-side client for the backend API (backend/, Express + MongoDB).
 *
 * Only server components, route handlers and server actions use this: it sends the shared
 * INTERNAL_API_KEY, which must never reach the browser. Reads mirror the query options the
 * pages always used (`where`, `sort`, `limit`, `depth`, ...), so a page asks for exactly the
 * same data it did when Payload was embedded in the app.
 */

type Collections = Config['collections']
type Globals = Config['globals']

export type ContentCollection = 'pages' | 'articles' | 'entities' | 'projects' | 'initiatives' | 'downloads' | 'redirects'
export type GlobalSlug = 'site-settings' | 'navigation' | 'footer'

export type Where = Record<string, unknown>

export interface FindArgs<C extends ContentCollection> {
  collection: C
  where?: Where
  sort?: string
  limit?: number
  page?: number
  depth?: number
  pagination?: boolean
  /** Accepted for readability at call sites; public reads are always published-only by `where`. */
  overrideAccess?: boolean
  draft?: boolean
}

export interface FindResult<T> {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage: number | null
  nextPage: number | null
}

const BACKEND_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '')

export class BackendError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export async function backendFetch<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${BACKEND_URL}/api/internal${path}`, {
    method: init.method ?? 'GET',
    headers: {
      accept: 'application/json',
      ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(process.env.INTERNAL_API_KEY ? { 'x-internal-key': process.env.INTERNAL_API_KEY } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    // Content changes take effect on the next request, as they did with the embedded CMS.
    cache: 'no-store',
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new BackendError(`Backend ${init.method ?? 'GET'} ${path} failed with ${res.status}: ${detail.slice(0, 300)}`, res.status)
  }
  return (await res.json()) as T
}

// One request per distinct query per render, however many components ask for it (the header,
// footer, layout and metadata all read site-settings).
const cachedFind = cache((body: string) => backendFetch<FindResult<unknown>>('/find', { method: 'POST', body: JSON.parse(body) }))
const cachedGlobal = cache((slug: string) => backendFetch<unknown>(`/globals/${slug}`))

export const api = {
  async find<C extends ContentCollection>(args: FindArgs<C>): Promise<FindResult<Collections[C]>> {
    const { collection, where, sort, limit, page, depth, pagination } = args
    return (await cachedFind(JSON.stringify({ collection, where, sort, limit, page, depth, pagination }))) as FindResult<
      Collections[C]
    >
  },
  async findGlobal<S extends GlobalSlug>(args: { slug: S; overrideAccess?: boolean }): Promise<Globals[S]> {
    return (await cachedGlobal(args.slug)) as Globals[S]
  },
}

export type ApiClient = typeof api

export async function getApiClient(): Promise<ApiClient> {
  return api
}

/** Like getApiClient, but resolves to null instead of throwing (used by the site header). */
export async function getApiClientSafe(): Promise<ApiClient | null> {
  return api
}

/** Constraint for public-facing reads: published only, never drafts. */
export const publishedOnly = { _status: { equals: 'published' } } as const

/**
 * Excludes records marked "card only" in the admin (they appear as homepage/section cards but
 * have no detail page, search result or sitemap entry). Records without the field count as pages.
 */
export const hasOwnPage = { displayAs: { not_equals: 'card' } } as const
