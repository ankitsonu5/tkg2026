import { articleTags, resolveFeaturedImage } from '../articles'
import { extractFaqPairs } from './faq'
import { getBaselinePage } from '@/baseline/pages'

/**
 * Structured data / Schema.org builder (FR-SEO-01).
 *
 * Implements Google Search Rich Results compliant JSON-LD across:
 * - Sitewide entities: Person (Tel K. Ganesan), Organization (Kyyba), WebSite (SearchAction)
 * - Page types: ProfilePage, AboutPage, ContactPage, CollectionPage, SearchResultsPage, WebPage
 * - Template entities: Article (authored ideas), Organization (portfolio entities),
 *   Movie/CreativeWork (film projects), Project (impact initiatives)
 * - Navigation: BreadcrumbList matching the verified IA hierarchy
 *
 * All fields strictly restate verified website copy and baseline records; never inventing facts.
 */

const SOCIAL_PROFILES = [
  'https://www.linkedin.com/in/telkganesan/',
  'https://twitter.com/TelKGanesan',
  'https://www.instagram.com/telkganesan/',
  'https://www.youtube.com/@TelKGanesan',
  'https://www.imdb.com/name/nm10609355/',
]

function getCleanOrigin(origin?: string): string {
  const o =
    origin?.trim() ||
    process.env.PRODUCTION_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_SERVER_URL?.trim() ||
    'https://telkganesan.com'
  return o.replace(/\/+$/, '')
}

/**
 * Sitewide structured data graph rendered from the root layout.
 * Establishes identity for Tel K. Ganesan, Kyyba, and the website search action.
 */
export function buildSitewideSchema(customOrigin?: string): Record<string, unknown>[] {
  const origin = getCleanOrigin(customOrigin)

  const personSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${origin}/#person-tel-k-ganesan`,
    name: 'Tel K. Ganesan',
    jobTitle: 'Executive Chairman',
    description: 'Executive Chairman, enterprise builder, investor, and producer.',
    url: `${origin}/`,
    image: `${origin}/images/og/tel-k-ganesan-default-og.jpg`,
    worksFor: {
      '@type': 'Organization',
      '@id': `${origin}/#org-kyyba`,
      name: 'Kyyba',
    },
    sameAs: SOCIAL_PROFILES,
  }

  const organizationSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${origin}/#org-kyyba`,
    name: 'Kyyba',
    url: 'https://www.kyyba.com',
    description: 'Global technology and engineering solutions company founded by Tel K. Ganesan.',
    founder: {
      '@type': 'Person',
      '@id': `${origin}/#person-tel-k-ganesan`,
      name: 'Tel K. Ganesan',
    },
  }

  const webSiteSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    url: `${origin}/`,
    name: 'Tel K. Ganesan',
    description:
      'Tel K. Ganesan builds enterprises, leaders, and platforms across technology, ideas, culture, and community impact.',
    publisher: {
      '@id': `${origin}/#person-tel-k-ganesan`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${origin}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return [personSchema, organizationSchema, webSiteSchema]
}

/**
 * Builds Schema.org BreadcrumbList for any route.
 */
export function buildBreadcrumbsSchema(
  pageId: string,
  routePath: string,
  detailLabel?: string,
  customOrigin?: string,
): Record<string, unknown> | null {
  if (pageId === 'HOME' || routePath === '/') return null

  const origin = getCleanOrigin(customOrigin)
  const page = getBaselinePage(pageId)

  const parentId =
    pageId === 'ARTICLE'
      ? 'IDEAS'
      : pageId === 'ENTITY'
        ? 'ENTERPRISE'
        : pageId === 'PROJECT'
          ? 'CULTURE'
          : pageId === 'INITIATIVE'
            ? 'IMPACT'
            : null

  const parent = parentId ? getBaselinePage(parentId) : null

  const items: Record<string, unknown>[] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: `${origin}/`,
    },
  ]

  if (parent) {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: parent.title,
      item: `${origin}${parent.path}`,
    })
    items.push({
      '@type': 'ListItem',
      position: 3,
      name: detailLabel ?? page?.title ?? 'Detail',
      item: `${origin}${routePath}`,
    })
  } else {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: detailLabel ?? page?.title ?? 'Page',
      item: `${origin}${routePath}`,
    })
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${origin}${routePath}#breadcrumbs`,
    itemListElement: items,
  }
}

/**
 * Builds schema for static and utility pages.
 */
export function buildPageSchema(
  pageId: string,
  routePath: string,
  customOrigin?: string,
): Record<string, unknown>[] {
  const origin = getCleanOrigin(customOrigin)
  const baseline = getBaselinePage(pageId)
  const pageUrl = `${origin}${routePath}`
  const schemas: Record<string, unknown>[] = []

  const title = baseline?.seoTitle ?? baseline?.title ?? 'Tel K. Ganesan'
  const description = baseline?.seoDescription ?? baseline?.purpose ?? ''

  switch (pageId) {
    case 'HOME':
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        '@id': `${pageUrl}#profilepage`,
        url: pageUrl,
        name: title,
        description,
        isPartOf: { '@id': `${origin}/#website` },
        mainEntity: { '@id': `${origin}/#person-tel-k-ganesan` },
      })
      break

    case 'ABOUT':
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        '@id': `${pageUrl}#aboutpage`,
        url: pageUrl,
        name: title,
        description,
        isPartOf: { '@id': `${origin}/#website` },
        mainEntity: { '@id': `${origin}/#person-tel-k-ganesan` },
      })
      break

    case 'MEDIA':
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        '@id': `${pageUrl}#profilepage`,
        url: pageUrl,
        name: title,
        description,
        isPartOf: { '@id': `${origin}/#website` },
        mainEntity: { '@id': `${origin}/#person-tel-k-ganesan` },
      })
      break

    case 'CONNECT':
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        '@id': `${pageUrl}#contactpage`,
        url: pageUrl,
        name: title,
        description,
        isPartOf: { '@id': `${origin}/#website` },
        mainEntity: { '@id': `${origin}/#person-tel-k-ganesan` },
      })
      break

    case 'ENTERPRISE':
    case 'IDEAS':
    case 'CULTURE':
    case 'IMPACT':
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#collectionpage`,
        url: pageUrl,
        name: title,
        description,
        isPartOf: { '@id': `${origin}/#website` },
      })
      break

    case 'SEARCH':
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'SearchResultsPage',
        '@id': `${pageUrl}#searchpage`,
        url: pageUrl,
        name: title,
        description,
        isPartOf: { '@id': `${origin}/#website` },
      })
      break

    default:
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: title,
        description,
        isPartOf: { '@id': `${origin}/#website` },
      })
      break
  }

  const breadcrumbs = buildBreadcrumbsSchema(pageId, routePath, undefined, origin)
  if (breadcrumbs) schemas.push(breadcrumbs)

  return schemas
}

/**
 * Builds schema for dynamic detail templates:
 * - ARTICLE -> Article
 * - ENTITY -> Organization
 * - PROJECT -> Movie / CreativeWork
 * - INITIATIVE -> Project
 */
export function buildDetailSchema(
  collection: 'articles' | 'entities' | 'projects' | 'initiatives',
  slug: string,
  pageId: string,
  doc: Record<string, unknown>,
  customOrigin?: string,
): Record<string, unknown>[] {
  const origin = getCleanOrigin(customOrigin)
  const schemas: Record<string, unknown>[] = []

  const title = String(doc.title ?? doc.name ?? slug)
  const summary =
    typeof doc.summary === 'string'
      ? doc.summary
      : typeof doc.excerpt === 'string'
        ? doc.excerpt
        : typeof doc.purpose === 'string'
          ? doc.purpose
          : ''
  const officialUrl = typeof doc.officialUrl === 'string' ? doc.officialUrl : null

  let routePath = `/${slug}`
  if (collection === 'articles') routePath = `/ideas/${slug}`
  else if (collection === 'entities') routePath = `/enterprise-investments/${slug}`
  else if (collection === 'projects') routePath = `/film-culture/${slug}`
  else if (collection === 'initiatives') routePath = `/impact/${slug}`

  const detailUrl = `${origin}${routePath}`

  if (collection === 'articles') {
    const rawDate = doc.publishedDate || doc.createdAt
    const datePublished = rawDate ? new Date(String(rawDate)).toISOString() : undefined
    const dateModified = doc.updatedAt ? new Date(String(doc.updatedAt)).toISOString() : datePublished

    const seo = (doc.seo ?? {}) as { title?: string; description?: string }
    const focusKeyword = (doc.seoAnalysis as { focusKeyword?: string } | undefined)?.focusKeyword?.trim()
    const featured = resolveFeaturedImage(doc)
    const imageUrl = featured?.cleared ? `${origin}${featured.src}` : undefined

    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${detailUrl}#article`,
      headline: seo.title?.trim() || title,
      description: seo.description?.trim() || summary,
      ...(imageUrl ? { image: [imageUrl] } : {}),
      ...(focusKeyword || articleTags(doc).length > 0
        ? { keywords: [focusKeyword, ...articleTags(doc).map((t) => t.label)].filter(Boolean).join(', ') }
        : {}),
      mainEntityOfPage: detailUrl,
      datePublished,
      dateModified,
      inLanguage: 'en-US',
      author: {
        '@type': 'Person',
        '@id': `${origin}/#person-tel-k-ganesan`,
        name: 'Tel K. Ganesan',
        url: `${origin}/`,
      },
      publisher: {
        '@type': 'Person',
        '@id': `${origin}/#person-tel-k-ganesan`,
        name: 'Tel K. Ganesan',
        url: `${origin}/`,
      },
    })

    // FAQ blocks authored in the editor become FAQPage structured data automatically.
    const faqPairs = extractFaqPairs(doc.body)
    if (faqPairs.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${detailUrl}#faq`,
        mainEntity: faqPairs.map((pair) => ({
          '@type': 'Question',
          name: pair.question,
          acceptedAnswer: { '@type': 'Answer', text: pair.answer },
        })),
      })
    }
  } else if (collection === 'entities') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${detailUrl}#organization`,
      name: title,
      description: summary,
      url: officialUrl || detailUrl,
      founder: {
        '@type': 'Person',
        '@id': `${origin}/#person-tel-k-ganesan`,
        name: 'Tel K. Ganesan',
      },
    })
  } else if (collection === 'projects') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Movie',
      '@id': `${detailUrl}#movie`,
      name: title,
      description: summary,
      url: officialUrl || detailUrl,
      producer: {
        '@type': 'Person',
        '@id': `${origin}/#person-tel-k-ganesan`,
        name: 'Tel K. Ganesan',
      },
    })
  } else if (collection === 'initiatives') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Project',
      '@id': `${detailUrl}#project`,
      name: title,
      description: summary,
      url: detailUrl,
      sponsor: {
        '@type': 'Person',
        '@id': `${origin}/#person-tel-k-ganesan`,
        name: 'Tel K. Ganesan',
      },
    })
  }

  const breadcrumbs = buildBreadcrumbsSchema(pageId, routePath, title, origin)
  if (breadcrumbs) schemas.push(breadcrumbs)

  return schemas
}
