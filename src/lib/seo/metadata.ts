import type { Metadata } from 'next'

import { getPayloadClient } from '@/lib/payload'
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
}

/**
 * Sitewide fallback share image (1200x630, cropped from an approved executive portrait).
 * Used whenever a call site does not supply a page-specific `ogImageUrl` from the OG
 * register, so every page always has a real, on-brand share image instead of none.
 */
const DEFAULT_OG_IMAGE = '/images/og/tel-k-ganesan-default-og.jpg'

export async function buildMetadata(args: BuildMetadataArgs): Promise<Metadata> {
  const payload = await getPayloadClient()
  const settings = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true }).catch(() => null)

  const baselinePage = getBaselinePage(args.pageId)
  const origin = settings?.productionOrigin?.trim() || process.env.PRODUCTION_ORIGIN?.trim()
  const siteName = settings?.siteName ?? 'Tel K. Ganesan'
  const ogImagePath = args.ogImageUrl ?? DEFAULT_OG_IMAGE
  const ogImageUrl = origin ? new URL(ogImagePath, origin).toString() : ogImagePath

  const pageAllowsIndex = baselinePage?.indexable !== false && !args.noindex
  const siteAllowsIndex = settings?.allowIndexing === true || process.env.ALLOW_INDEXING === 'true'
  const shouldIndex = pageAllowsIndex && siteAllowsIndex

  const resolvedTitle = baselinePage?.seoTitle ?? args.title
  const resolvedDescription = baselinePage?.seoDescription ?? args.description

  const metadata: Metadata = {
    title: resolvedTitle,
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
