/**
 * Article SEO analysis in the style of Rank Math: a focus keyword, a set of weighted pass/fail
 * checks across four groups, and a 0-100 score with a good / okay / needs-work grade.
 *
 * Pure and dependency-free so the same function runs in the admin editor (live, as the author
 * types) and on the server (the score stored on save and shown in the article list).
 */

export type SeoGroup = 'basic' | 'additional' | 'title' | 'readability'
export type SeoGrade = 'good' | 'ok' | 'poor'

export interface SeoInput {
  title: string
  slug: string
  excerpt?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  focusKeyword?: string | null
  /** Lexical editor state (the article body). */
  body: unknown
  hasFeaturedImage: boolean
  featuredImageAlt?: string | null
  /** Site origin, used to tell internal links from external ones. */
  origin?: string | null
}

export interface SeoCheck {
  id: string
  group: SeoGroup
  label: string
  pass: boolean
  weight: number
  detail: string
}

export interface SeoResult {
  score: number
  grade: SeoGrade
  checks: SeoCheck[]
  stats: {
    words: number
    keywordCount: number
    density: number
    headings: number
    internalLinks: number
    externalLinks: number
    images: number
    longestParagraph: number
  }
}

export const GROUP_LABELS: Record<SeoGroup, string> = {
  basic: 'Basic SEO',
  additional: 'Additional',
  title: 'Title & snippet',
  readability: 'Content readability',
}

type LNode = {
  type?: string
  tag?: string
  text?: string
  url?: string
  children?: LNode[]
  fields?: Record<string, unknown>
  [key: string]: unknown
}

interface Parsed {
  /** Text of each paragraph-like block in reading order. */
  paragraphs: string[]
  headings: { level: number; text: string }[]
  internalLinks: number
  externalLinks: number
  images: number
  videos: number
}

function textOf(node: LNode | undefined): string {
  if (!node) return ''
  if (typeof node.text === 'string') return node.text
  return (node.children ?? []).map(textOf).join('')
}

function parseBody(body: unknown, origin: string | null): Parsed {
  const out: Parsed = { paragraphs: [], headings: [], internalLinks: 0, externalLinks: 0, images: 0, videos: 0 }
  const root = (body as { root?: LNode } | null)?.root
  if (!root) return out

  let host = ''
  try {
    host = origin ? new URL(origin).hostname.replace(/^www\./, '') : ''
  } catch {
    host = ''
  }

  const classifyLink = (url: string, linkType?: unknown) => {
    const u = url.trim()
    if (!u || u.startsWith('#') || u.startsWith('mailto:') || u.startsWith('tel:')) return
    if (linkType === 'internal' || u.startsWith('/')) {
      out.internalLinks += 1
      return
    }
    if (/^https?:\/\//i.test(u)) {
      try {
        const h = new URL(u).hostname.replace(/^www\./, '')
        if (host && h === host) out.internalLinks += 1
        else out.externalLinks += 1
      } catch {
        // ignore malformed
      }
    }
  }

  const walk = (node: LNode): void => {
    switch (node.type) {
      case 'heading': {
        const text = textOf(node).trim()
        if (text) out.headings.push({ level: Number(String(node.tag ?? 'h2').slice(1)) || 2, text })
        break
      }
      case 'paragraph':
      case 'quote': {
        const text = textOf(node).trim()
        if (text) out.paragraphs.push(text)
        break
      }
      case 'listitem': {
        const text = textOf(node).trim()
        if (text) out.paragraphs.push(text)
        break
      }
      case 'link':
      case 'autolink': {
        const f = node.fields as { url?: string; linkType?: unknown } | undefined
        classifyLink(String(f?.url ?? node.url ?? ''), f?.linkType)
        break
      }
      case 'upload':
        out.images += 1
        break
      case 'block': {
        const f = node.fields as Record<string, unknown> | undefined
        const type = f?.blockType
        if (type === 'videoEmbed') out.videos += 1
        if (type === 'pullQuote' && typeof f?.quote === 'string') out.paragraphs.push(f.quote)
        if (type === 'calloutBox' && typeof f?.content === 'string') out.paragraphs.push(f.content)
        if (type === 'faq' && Array.isArray(f?.items)) {
          for (const item of f.items as { question?: string; answer?: string }[]) {
            if (item?.answer) out.paragraphs.push(item.answer)
          }
        }
        if (type === 'keyTakeaways' && Array.isArray(f?.points)) {
          for (const p of f.points as { text?: string }[]) if (p?.text) out.paragraphs.push(p.text)
        }
        if (type === 'ctaButton' && typeof f?.url === 'string') classifyLink(f.url)
        break
      }
      default:
        break
    }
    node.children?.forEach(walk)
  }

  root.children?.forEach(walk)
  return out
}

const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const wordsOf = (s: string) => normalise(s).split(' ').filter(Boolean)

function countOccurrences(haystackWords: string[], needleWords: string[]): number {
  if (needleWords.length === 0 || haystackWords.length < needleWords.length) return 0
  let count = 0
  for (let i = 0; i <= haystackWords.length - needleWords.length; i++) {
    let match = true
    for (let j = 0; j < needleWords.length; j++) {
      if (haystackWords[i + j] !== needleWords[j]) {
        match = false
        break
      }
    }
    if (match) count += 1
  }
  return count
}

export function analyzeArticleSeo(input: SeoInput): SeoResult {
  const parsed = parseBody(input.body, input.origin ?? null)
  const keyword = (input.focusKeyword ?? '').trim()
  const kwWords = wordsOf(keyword)
  const hasKeyword = kwWords.length > 0

  const bodyText = parsed.paragraphs.join(' ')
  const bodyWords = wordsOf(bodyText)
  const wordCount = bodyWords.length

  const effectiveTitle = (input.seoTitle?.trim() || input.title || '').trim()
  const effectiveDescription = (input.seoDescription?.trim() || input.excerpt?.trim() || '').trim()

  const inText = (text: string) => hasKeyword && countOccurrences(wordsOf(text), kwWords) > 0
  const keywordCount = countOccurrences(bodyWords, kwWords)
  const density = wordCount > 0 && hasKeyword ? (keywordCount * kwWords.length * 100) / wordCount : 0

  const slugWords = (input.slug || '').split(/[-_]+/).filter(Boolean)
  const kwInSlug = hasKeyword && countOccurrences(slugWords.map((w) => normalise(w)), kwWords) > 0

  const introWords = bodyWords.slice(0, Math.max(30, Math.ceil(wordCount * 0.1)))
  const kwInIntro = hasKeyword && countOccurrences(introWords, kwWords) > 0

  const kwInSubheading = parsed.headings.some((h) => h.level >= 2 && inText(h.text))
  const longestParagraph = parsed.paragraphs.reduce((max, p) => Math.max(max, wordsOf(p).length), 0)
  const tocHeadings = parsed.headings.filter((h) => h.level === 2 || h.level === 3).length
  const mediaCount = parsed.images + parsed.videos + (input.hasFeaturedImage ? 1 : 0)

  const needKw = 'Set a focus keyword to run this check.'
  const checks: SeoCheck[] = []
  const add = (id: string, group: SeoGroup, label: string, weight: number, pass: boolean, detail: string) =>
    checks.push({ id, group, label, weight, pass, detail })

  // ---- Basic SEO ----
  add(
    'kw-title',
    'basic',
    'Focus keyword in the SEO title',
    6,
    inText(effectiveTitle),
    !hasKeyword ? needKw : inText(effectiveTitle) ? 'The SEO title contains your focus keyword.' : 'Add the focus keyword to the SEO title.',
  )
  add(
    'kw-description',
    'basic',
    'Focus keyword in the meta description',
    5,
    inText(effectiveDescription),
    !hasKeyword
      ? needKw
      : inText(effectiveDescription)
        ? 'The description contains your focus keyword.'
        : 'Add the focus keyword to the meta description (or excerpt).',
  )
  add(
    'kw-slug',
    'basic',
    'Focus keyword in the URL',
    5,
    kwInSlug,
    !hasKeyword ? needKw : kwInSlug ? 'The URL contains your focus keyword.' : 'Use the focus keyword in the slug, e.g. /ideas/' + kwWords.join('-') + '.',
  )
  add(
    'kw-intro',
    'basic',
    'Focus keyword at the beginning of the content',
    5,
    kwInIntro,
    !hasKeyword ? needKw : kwInIntro ? 'The keyword appears early in the content.' : 'Mention the focus keyword in the first 10% of the article.',
  )
  add(
    'kw-content',
    'basic',
    'Focus keyword in the content',
    5,
    keywordCount > 0,
    !hasKeyword ? needKw : keywordCount > 0 ? `The keyword appears ${keywordCount} time${keywordCount === 1 ? '' : 's'}.` : 'The focus keyword is missing from the content.',
  )
  add(
    'word-count',
    'basic',
    'Content length of at least 600 words',
    6,
    wordCount >= 600,
    wordCount >= 600 ? `${wordCount} words. Good length.` : `${wordCount} words. Aim for 600 or more.`,
  )

  // ---- Additional ----
  add(
    'kw-subheading',
    'additional',
    'Focus keyword in a subheading',
    4,
    kwInSubheading,
    !hasKeyword ? needKw : kwInSubheading ? 'A subheading (H2 to H6) contains the keyword.' : 'Use the focus keyword in at least one subheading.',
  )
  const altHasKw = hasKeyword && inText(input.featuredImageAlt ?? '')
  add(
    'kw-image-alt',
    'additional',
    'Focus keyword in the image alt text',
    3,
    altHasKw,
    !hasKeyword
      ? needKw
      : !input.hasFeaturedImage
        ? 'Add a featured image and describe it using the keyword.'
        : altHasKw
          ? 'The featured image alt text contains the keyword.'
          : 'Add the focus keyword to the featured image alt text (Assets).',
  )
  const densityOk = hasKeyword && density >= 0.5 && density <= 2.5
  add(
    'kw-density',
    'additional',
    'Keyword density between 0.5% and 2.5%',
    4,
    densityOk,
    !hasKeyword
      ? needKw
      : densityOk
        ? `Density is ${density.toFixed(1)}%.`
        : density < 0.5
          ? `Density is ${density.toFixed(1)}%. Use the keyword a little more.`
          : `Density is ${density.toFixed(1)}%. Reduce keyword repetition.`,
  )
  const urlLen = `/ideas/${input.slug}`.length
  add('url-length', 'additional', 'Short, readable URL', 2, urlLen > 8 && urlLen <= 75, urlLen <= 75 ? 'The URL length is fine.' : `The URL is ${urlLen} characters. Keep it under 75.`)
  add(
    'external-link',
    'additional',
    'Links to an external source',
    3,
    parsed.externalLinks > 0,
    parsed.externalLinks > 0 ? `${parsed.externalLinks} external link${parsed.externalLinks === 1 ? '' : 's'}.` : 'Link to at least one credible external source.',
  )
  add(
    'internal-link',
    'additional',
    'Links to other pages on the site',
    3,
    parsed.internalLinks > 0,
    parsed.internalLinks > 0 ? `${parsed.internalLinks} internal link${parsed.internalLinks === 1 ? '' : 's'}.` : 'Link to another article or page on this site.',
  )

  // ---- Title & snippet ----
  const tLen = effectiveTitle.length
  add(
    'title-length',
    'title',
    'SEO title length (30 to 60 characters)',
    4,
    tLen >= 30 && tLen <= 60,
    tLen === 0 ? 'Add an SEO title.' : tLen < 30 ? `${tLen} characters. Make it a little longer.` : tLen > 60 ? `${tLen} characters. It may be cut off in search results.` : `${tLen} characters.`,
  )
  const dLen = effectiveDescription.length
  add(
    'description-length',
    'title',
    'Meta description length (120 to 160 characters)',
    4,
    dLen >= 120 && dLen <= 160,
    dLen === 0 ? 'Add a meta description.' : dLen < 120 ? `${dLen} characters. Add more detail.` : dLen > 160 ? `${dLen} characters. It may be cut off.` : `${dLen} characters.`,
  )
  const titleWords = wordsOf(effectiveTitle)
  const kwNearStart = hasKeyword && titleWords.slice(0, Math.max(kwWords.length + 3, 5)).join(' ').includes(kwWords.join(' '))
  add(
    'title-starts-kw',
    'title',
    'Focus keyword near the start of the title',
    3,
    kwNearStart,
    !hasKeyword ? needKw : kwNearStart ? 'The keyword is near the beginning of the title.' : 'Move the focus keyword toward the start of the SEO title.',
  )
  add('title-number', 'title', 'Number in the title', 1, /\d/.test(effectiveTitle), /\d/.test(effectiveTitle) ? 'The title includes a number.' : 'A number in the title can improve click-through (optional).')

  // ---- Content readability ----
  add(
    'short-paragraphs',
    'readability',
    'Short paragraphs (up to 120 words)',
    4,
    parsed.paragraphs.length > 0 && longestParagraph <= 120,
    parsed.paragraphs.length === 0 ? 'Write some content first.' : longestParagraph <= 120 ? 'Paragraphs are easy to scan.' : `A paragraph has ${longestParagraph} words. Split long paragraphs.`,
  )
  add(
    'subheadings',
    'readability',
    'Subheadings break up the text',
    3,
    parsed.headings.length >= 2,
    parsed.headings.length >= 2 ? `${parsed.headings.length} subheadings.` : 'Add at least two subheadings.',
  )
  add('toc', 'readability', 'Table of contents available', 2, tocHeadings >= 2, tocHeadings >= 2 ? 'The "On this page" list is generated from your H2/H3 headings.' : 'Use at least two H2/H3 headings to generate a contents list.')
  add('media', 'readability', 'Images or video in the article', 3, mediaCount > 0, mediaCount > 0 ? 'The article includes media.' : 'Add a featured image, an image or a video.')

  const total = checks.reduce((sum, c) => sum + c.weight, 0)
  const earned = checks.reduce((sum, c) => sum + (c.pass ? c.weight : 0), 0)
  const score = total === 0 ? 0 : Math.round((earned / total) * 100)

  return {
    score,
    grade: score >= 81 ? 'good' : score >= 51 ? 'ok' : 'poor',
    checks,
    stats: {
      words: wordCount,
      keywordCount,
      density: Math.round(density * 100) / 100,
      headings: parsed.headings.length,
      internalLinks: parsed.internalLinks,
      externalLinks: parsed.externalLinks,
      images: parsed.images,
      longestParagraph,
    },
  }
}
