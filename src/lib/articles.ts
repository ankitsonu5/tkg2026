/**
 * Presentation helpers for blog articles: reading time, heading anchors for the on-page
 * contents list, topic labels and featured-image resolution.
 */

type LexicalNode = {
  type?: string
  text?: string
  tag?: string
  anchorId?: string
  children?: LexicalNode[]
  fields?: Record<string, unknown>
  [key: string]: unknown
}

export const TOPIC_LABELS: Record<string, string> = {
  enterprise: 'Enterprise building',
  leadership: 'Leadership',
  investing: 'Investing',
  'mind-trap': 'Mind Trap',
  culture: 'Culture',
  impact: 'Impact',
}

export function topicLabel(topic: unknown): string | null {
  if (typeof topic !== 'string' || !topic) return null
  return TOPIC_LABELS[topic] ?? topic.replace(/-/g, ' ')
}

export function formatArticleDate(raw: unknown): string | null {
  if (!raw) return null
  const date = new Date(String(raw))
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function nodeText(node: LexicalNode | undefined): string {
  if (!node) return ''
  if (typeof node.text === 'string') return node.text
  return (node.children ?? []).map(nodeText).join('')
}

/** Plain text of every readable node, including FAQ and takeaway blocks. */
function collectText(node: unknown, out: string[]): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((child) => collectText(child, out))
    return
  }
  const record = node as LexicalNode
  if (typeof record.text === 'string') out.push(record.text)
  if (record.fields && typeof record.fields === 'object') {
    for (const value of Object.values(record.fields)) {
      if (typeof value === 'string') out.push(value)
      else if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object') {
            for (const inner of Object.values(item as Record<string, unknown>)) {
              if (typeof inner === 'string') out.push(inner)
            }
          }
        }
      }
    }
  }
  if (Array.isArray(record.children)) record.children.forEach((child) => collectText(child, out))
  if (record.root) collectText(record.root, out)
}

export function readingTimeMinutes(body: unknown): number {
  const parts: string[] = []
  collectText(body, parts)
  const words = parts.join(' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'section'
  )
}

export interface TocHeading {
  id: string
  text: string
  level: 2 | 3
}

/**
 * Returns a copy of the Lexical document in which every heading carries a unique `anchorId`,
 * plus the h2/h3 list used for the "On this page" navigation. One pass keeps the ids used by
 * the rendered headings and by the contents list identical.
 */
export function prepareArticleBody(body: unknown): { body: Record<string, unknown> | null; headings: TocHeading[] } {
  if (!body || typeof body !== 'object') return { body: null, headings: [] }
  const clone = JSON.parse(JSON.stringify(body)) as { root?: LexicalNode }
  const headings: TocHeading[] = []
  const used = new Map<string, number>()

  const walk = (node: LexicalNode | undefined): void => {
    if (!node) return
    if (node.type === 'heading') {
      const text = nodeText(node).trim()
      if (text) {
        const base = slugifyHeading(text)
        const count = used.get(base) ?? 0
        used.set(base, count + 1)
        const id = count === 0 ? base : `${base}-${count + 1}`
        node.anchorId = id
        if (node.tag === 'h2' || node.tag === 'h3') {
          headings.push({ id, text, level: node.tag === 'h2' ? 2 : 3 })
        }
      }
    }
    node.children?.forEach(walk)
  }
  walk(clone.root)
  return { body: clone as Record<string, unknown>, headings }
}

export interface FeaturedImage {
  /** Full-size, same-origin path. */
  src: string
  /** Smaller rendition for cards, falling back to `src`. */
  cardSrc: string
  alt: string
  width: number
  height: number
  /** False when rights are not cleared; shown in development preview only. */
  cleared: boolean
}

function toPath(url: string): string {
  try {
    const parsed = new URL(url, 'http://local.invalid')
    return parsed.pathname + parsed.search
  } catch {
    return url
  }
}

/**
 * Resolves an article's featured image. In production only rights-cleared assets are ever
 * used, because the media route refuses to serve anything else to the public. In development
 * an uncleared asset is returned (flagged) so editors can preview their layout.
 */
export function resolveFeaturedImage(doc: Record<string, unknown>): FeaturedImage | null {
  return resolveAssetImage(doc.heroImage)
}

/** Same rules for any populated asset field (hero image, logo, key art). */
export function resolveAssetImage(hero: unknown): FeaturedImage | null {
  if (!hero || typeof hero !== 'object') return null
  const asset = hero as {
    url?: string
    alt?: string
    width?: number
    height?: number
    rightsStatus?: string
    decorative?: boolean
    sizes?: Record<string, { url?: string } | undefined>
  }
  if (!asset.url) return null

  const cleared = asset.rightsStatus === 'cleared'
  if (!cleared && process.env.NODE_ENV === 'production') return null

  const src = toPath(asset.url)
  const card = asset.sizes?.card?.url
  return {
    src,
    cardSrc: card ? toPath(card) : src,
    alt: asset.decorative ? '' : (asset.alt ?? ''),
    width: asset.width && asset.width > 0 ? asset.width : 1200,
    height: asset.height && asset.height > 0 ? asset.height : 750,
    cleared,
  }
}

export interface ArticleTag {
  label: string
  slug: string
}

/** URL-safe form of a tag, used in /ideas?tag=<slug>. */
export function tagSlug(tag: string): string {
  return (
    tag
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
  )
}

/** The article's tags, trimmed, de-duplicated and ready to render. */
export function articleTags(doc: Record<string, unknown>): ArticleTag[] {
  const raw = Array.isArray(doc.tags) ? doc.tags : []
  const seen = new Set<string>()
  const tags: ArticleTag[] = []
  for (const item of raw) {
    const label = typeof item === 'string' ? item.trim() : ''
    const slug = tagSlug(label)
    if (!label || !slug || seen.has(slug)) continue
    seen.add(slug)
    tags.push({ label, slug })
  }
  return tags
}
