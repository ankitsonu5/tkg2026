import { BASELINE_PAGES, getBaselinePage } from '../../baseline/pages'

/**
 * Custom pages: Pages records with no baseline Page ID, added from the admin. The website serves
 * them at their own path through a catch-all route, so the path must not shadow a built-in route.
 */

/** First path segments the website already owns (baseline pages, the admin, the API, static files). */
const RESERVED_SEGMENTS = new Set([
  ...BASELINE_PAGES.map((p) => p.path.split('/')[1]).filter(Boolean),
  'admin',
  'api',
  '_next',
  'images',
  'downloads',
  'media',
  'robots.txt',
  'sitemap.xml',
])

export function isCustomPage(doc: Record<string, unknown>): boolean {
  return !getBaselinePage(String(doc.pageId ?? ''))
}

/** "About Our Team" or "about/our-team/" -> "/about-our-team" / "/about/our-team". */
export function normalizePagePath(value: string): string {
  const segments = value
    .split('/')
    .map((s) =>
      s
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    )
    .filter(Boolean)
  return `/${segments.join('/')}`
}

/** Why a custom page cannot use this path, or null when it can. */
export function customPathProblem(path: string): string | null {
  if (!/^\/[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(path)) return 'Set a path for the page, e.g. /my-new-page.'
  if (path.length > 120) return 'The path is too long (120 characters at most).'
  const first = path.split('/')[1]
  if (RESERVED_SEGMENTS.has(first)) return `"/${first}" is already used by a built-in page of the website. Choose another path.`
  return null
}
