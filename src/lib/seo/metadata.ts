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
}

export async function buildMetadata(args: BuildMetadataArgs): Promise<Metadata> {
  const payload = await getPayloadClient()
  const settings = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true }).catch(() => null)

  const baselinePage = getBaselinePage(args.pageId)
  const origin = settings?.productionOrigin?.trim()
  const siteName = settings?.siteName ?? 'Tel K. Ganesan'

  const pageAllowsIndex = baselinePage?.indexable !== false && !args.noindex
  const siteAllowsIndex = settings?.allowIndexing === true
  const shouldIndex = pageAllowsIndex && siteAllowsIndex

  const metadata: Metadata = {
    title: args.title,
    description: args.description,
    robots: shouldIndex
      ? { index: true, follow: true }
      : // Explicit rather than relying on the absence of a directive.
        { index: false, follow: false, nocache: true },
    openGraph: {
      title: args.title,
      description: args.description,
      siteName,
      type: 'website',
      ...(origin ? { url: new URL(args.path, origin).toString() } : {}),
      ...(args.ogImageUrl
        ? { images: [{ url: args.ogImageUrl, width: 1200, height: 630, alt: args.title }] }
        : {}),
    },
    twitter: {
      card: args.ogImageUrl ? 'summary_large_image' : 'summary',
      title: args.title,
      description: args.description,
    },
  }

  // Absolute self-referential canonical, only when the origin is verified.
  if (origin) {
    metadata.metadataBase = new URL(origin)
    metadata.alternates = { canonical: new URL(args.path, origin).toString() }
  }

  return metadata
}
