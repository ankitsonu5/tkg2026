import { films as fallbackFilms, type FilmItem } from '@/frontend/data/films'
import { impactPillars as fallbackPillars, type ImpactPillar } from '@/frontend/data/impact'

import { getApiClient, publishedOnly } from './api'
import { isStaffPreview } from './preview'

/**
 * Homepage / interior-page cards that are managed in the admin:
 *   Film & Culture -> projects, Impact -> initiatives, Enterprises -> entities.
 *
 * Only published records are shown, in their display order. If none are published (or the
 * API is unreachable) the original built-in content is used, so these sections are never
 * empty.
 */

type Doc = Record<string, any>

/** A cleared uploaded image wins; otherwise the static image path typed in the admin. */
function imageOf(asset: unknown, path: unknown): string {
  const a = asset as Doc | null
  if (a && typeof a === 'object' && a.rightsStatus === 'cleared' && typeof a.url === 'string') return a.url
  return typeof path === 'string' ? path : ''
}

async function published(collection: 'projects' | 'initiatives' | 'entities', extra?: Record<string, unknown>): Promise<Doc[]> {
  try {
    const api = await getApiClient()
    // Staff previewing from the admin also see drafts.
    const base = (await isStaffPreview()) ? null : publishedOnly
    const where = base && extra ? { and: [base, extra] } : (base ?? extra ?? {})
    const result = await api.find({ collection, where, sort: 'displayOrder', limit: 50, depth: 1, pagination: false })
    return result.docs as unknown as Doc[]
  } catch {
    return []
  }
}

export async function getFilms(): Promise<FilmItem[]> {
  const docs = await published('projects')
  if (!docs.length) return fallbackFilms
  return docs.map((d) => ({
    id: String(d.slug),
    title: String(d.title ?? ''),
    category: String(d.category ?? ''),
    role: String(d.creditWording ?? ''),
    tagline: String(d.tagline ?? d.summary ?? ''),
    cast: String(d.cast ?? ''),
    image: imageOf(d.keyArt, d.posterPath),
    alt: String(d.posterAlt ?? d.title ?? ''),
    href: String(d.cardHref || '/film-culture'),
    ...(d.imdbUrl ? { imdbUrl: String(d.imdbUrl) } : {}),
    ...(d.officialUrl ? { officialUrl: String(d.officialUrl) } : {}),
  }))
}

export async function getImpactPillars(): Promise<ImpactPillar[]> {
  // Focus-area tabs are the "card only" initiatives; full programs appear in their own section.
  const docs = await published('initiatives', { displayAs: { equals: 'card' } })
  if (!docs.length) return fallbackPillars
  return docs.map((d) => ({
    id: String(d.slug),
    tag: String(d.tag ?? ''),
    shortLabel: String(d.shortLabel || d.title || ''),
    title: String(d.title ?? ''),
    description: String(d.summary ?? ''),
    focusArea: String(d.focusArea ?? ''),
  }))
}

export interface VentureCard {
  id: string
  tag: string
  title: string
  description: string
  href: string
  image?: string
  alt?: string
  pills: string[]
  span: string
  theme: string
}

export const FALLBACK_VENTURES: VentureCard[] = [
  {
    id: 'kyyba',
    tag: '01 / Flagship enterprise',
    title: 'Kyyba Group',
    description: 'Technology, engineering innovation, and global talent working across borders to create value.',
    href: '/enterprise-investments',
    image: '/images/ventures/kyyba-logo-official.png',
    alt: 'Kyyba Group Official Logo',
    pills: ['IT & Engineering', 'Global Talent', 'Scale'],
    span: 'hero',
    theme: 'light',
  },
  {
    id: 'strategic-investments',
    tag: '02 / Ventures & capital',
    title: 'Strategic Investments',
    description: 'Backing exceptional founders, scalable platforms, and disruptive next-generation systems.',
    href: '/enterprise-investments',
    pills: ['Seed to Growth', 'Founder-First', 'Ecosystem'],
    span: 'wide',
    theme: 'dark',
  },
  {
    id: 'new-ventures',
    tag: '03 / Media & studios',
    title: 'New Ventures',
    description: 'Expanding frontiers across film production, music, and culture-shaping creative IP.',
    href: '/enterprise-investments',
    pills: ['Kyyba Films', 'Trap City'],
    span: 'regular',
    theme: 'dark',
  },
  {
    id: 'global-opportunities',
    tag: '04 / Smart ecosystems',
    title: 'Global Opportunities',
    description: 'Crossing international markets, revitalizing urban centers, and driving long-term value.',
    href: '/enterprise-investments',
    pills: ['Vision 2030', 'Urban Tech'],
    span: 'regular',
    theme: 'dark',
  },
]

export async function getVentures(): Promise<VentureCard[]> {
  const docs = await published('entities')
  if (!docs.length) return FALLBACK_VENTURES
  return docs.map((d) => {
    const image = imageOf(d.logo, d.cardImagePath)
    return {
      id: String(d.slug),
      tag: String(d.cardTag ?? ''),
      title: String(d.name ?? ''),
      description: String(d.summary ?? ''),
      href: String(d.cardHref || '/enterprise-investments'),
      ...(image ? { image, alt: String(d.cardImageAlt ?? d.name ?? '') } : {}),
      pills: Array.isArray(d.cardPills) ? d.cardPills.map(String) : [],
      span: String(d.cardSize || 'regular'),
      theme: String(d.cardTheme || 'dark'),
    }
  })
}
