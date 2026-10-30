import type { Metadata } from 'next'

import { getApiClient } from '@/lib/api'
import { getBaselinePage } from '@/baseline/pages'

/**
 * Metadata builder (FR-SEO-01 / Section 11.1).
 *
 * Two deliberate refusals:
 *  1. A canonical is emitted ONLY when a verified production origin is configured. The
 *     production domain is an open Appendix C decision, so guessing an origin would bake a
 *     wrong absolute URL into every page.
 *  2. Indexation is OFF unless the site settings explicitly allow it AND the page is
 *     indexable. Staging therefore stays private and noindex by default, and search results
 *     are never indexable regardless of settings.
 */

export interface BuildMetadataArgs {
  pageId: string
  title: string
  description?: string
  path: string
  /** Overrides the baseline indexable flag, e.g. for a draft preview. */
  noindex?: boolean
  ogImageUrl?: string
  /** Use 'article' for blog posts so the social card carries publish dates. */
  ogType?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  /**
   * The record's SEO fields from the admin. When omitted, the Pages record whose path matches
   * `path` is used, so the fixed pages pick up their admin SEO settings.
   */
  seo?: { title?: string | null; description?: string | null; noindex?: boolean | null; ogImage?: unknown } | null
}

type SeoFields = NonNullable<BuildMetadataArgs['seo']>

/** The admin SEO fields of the Pages record at this path (pages keep them even as drafts). */
async function pageRecordSeo(path: string): Promise<SeoFields | null> {
  const api = await getApiClient()
  const found = await api
    .find({ collection: 'pages', where: { path: { equals: path } }, limit: 1, depth: 1, pagination: false, overrideAccess: true })
    .catch(() => null)
  const doc = found?.docs[0] as { seo?: SeoFields } | undefined
  return doc?.seo ?? null
}

/**
 * Sitewide fallback share image (1200x630, cropped from an approved executive portrait).
 * Used whenever a call site does not supply a page-specific `ogImageUrl` from the OG
 * register, so every page always has a real, on-brand share image instead of none.
 */
const DEFAULT_OG_IMAGE = '/images/og/tel-k-ganesan-default-og.jpg'

/** Path of the admin's social share image, when it is a rights-cleared asset. */
function ogImagePathOf(asset: unknown): string | undefined {
  const a = asset as { url?: string; rightsStatus?: string; sizes?: { social?: { url?: string } } } | null | undefined
  if (!a || typeof a !== 'object' || a.rightsStatus !== 'cleared' || !a.url) return undefined
  return new URL(a.sizes?.social?.url || a.url, 'http://local.invalid').pathname
}

export async function buildMetadata(args: BuildMetadataArgs): Promise<Metadata> {
  const api = await getApiClient()
  const settings = await api.findGlobal({ slug: 'site-settings', overrideAccess: true }).catch(() => null)

  const baselinePage = getBaselinePage(args.pageId)
  const origin = settings?.productionOrigin?.trim() || process.env.PRODUCTION_ORIGIN?.trim()
  const siteName = settings?.siteName ?? 'Tel K. Ganesan'
  const seo = args.seo !== undefined ? args.seo : await pageRecordSeo(args.path)
  const ogImagePath = args.ogImageUrl ?? ogImagePathOf(seo?.ogImage) ?? DEFAULT_OG_IMAGE
  const ogImageUrl = origin ? new URL(ogImagePath, origin).toString() : ogImagePath
  const seoTitle = seo?.title?.trim() || null
  const seoDescription = seo?.description?.trim() || null

  const pageAllowsIndex = baselinePage?.indexable !== false && !args.noindex && seo?.noindex !== true
  const siteAllowsIndex = settings?.allowIndexing === true || process.env.ALLOW_INDEXING === 'true'
  const shouldIndex = pageAllowsIndex && siteAllowsIndex

  // Admin SEO fields win over the baseline copy, which wins over the record's own title/summary.
  const resolvedTitle = seoTitle ?? baselinePage?.seoTitle ?? args.title
  const resolvedDescription = seoDescription ?? baselinePage?.seoDescription ?? args.description

  // Baseline SEO titles are written as complete titles (most already end with the site name).
  // The root layout adds " | Tel K. Ganesan" to plain titles, so a complete title must bypass that
  // template or the name appears twice.
  const alreadyBranded = (!seoTitle && Boolean(baselinePage?.seoTitle)) || /\|\s*Tel K\. Ganesan\s*$/i.test(resolvedTitle)

  const metadata: Metadata = {
    title: alreadyBranded ? { absolute: resolvedTitle } : resolvedTitle,
    description: resolvedDescription,
    robots: shouldIndex
      ? { index: true, follow: true }
      : // Explicit rather than relying on the absence of a directive.
        { index: false, follow: false, nocache: true },
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      siteName,
      type: args.ogType ?? 'website',
      ...(args.ogType === 'article'
        ? { publishedTime: args.publishedTime, modifiedTime: args.modifiedTime, authors: ['Tel K. Ganesan'] }
        : {}),
      ...(origin ? { url: new URL(args.path, origin).toString() } : {}),
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: resolvedTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description: resolvedDescription,
    },
  }

  // Absolute self-referential canonical, only when the origin is verified.
  if (origin) {
    const cleanOrigin = origin.replace(/\/+$/, '')
    const cleanPath = args.path.startsWith('/') ? args.path : `/${args.path}`
    const canonicalUrl = `${cleanOrigin}${cleanPath}`
    metadata.metadataBase = new URL(cleanOrigin)
    metadata.alternates = { canonical: canonicalUrl }
  } else {
    const fallbackBase = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
    try {
      metadata.metadataBase = new URL(fallbackBase)
    } catch {
      // safe fallback
    }
  }

  return metadata
}
