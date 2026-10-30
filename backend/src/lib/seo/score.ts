/**
 * SEO analysis modelled on Rank Math's content analysis: the same tests, grouped the same way
 * (Basic SEO, Additional, Title Readability, Content Readability), with Rank Math's point
 * weights, which add up to 100. The score is the points earned; 81+ is good, 51-80 okay, 50 or
 * less needs work, as in Rank Math.
 *
 * Content comes in as a neutral ContentModel so the same rules score an article's Lexical body
 * (contentFromLexical) and a rendered page's HTML (extracted in the admin's browser).
 *
 * Pure and dependency-free.
 */

export type SeoGroup = 'basic' | 'additional' | 'title' | 'readability'
export type SeoGrade = 'good' | 'ok' | 'poor'

export interface ContentLink {
  href: string
  /** rel attribute, e.g. "nofollow noopener". */
  rel?: string | null
  /** Lexical link type ('internal' for links to site documents). */
  linkType?: string | null
}

/** What the analysis needs to know about the content, wherever it came from. */
export interface ContentModel {
  /** Text of each paragraph-like block (paragraphs, list items, quotes) in reading order. */
  paragraphs: string[]
  headings: { level: number; text: string }[]
  links: ContentLink[]
  /** Alt text of each image in the content ('' when missing). */
  imageAlts: string[]
  videos: number
  /** A table of contents is present (or generated from the headings). */
  hasToc: boolean
}

export interface SeoInput {
  title: string
  /** Public path of the page, e.g. /ideas/my-post. */
  path: string
  seoTitle?: string | null
  seoDescription?: string | null
  /** Used as the description when no meta description is set. */
  fallbackDescription?: string | null
  /** One keyword, or several separated by commas (the first is the focus keyword). */
  focusKeyword?: string | null
  content: ContentModel
  featuredImage?: { alt?: string | null } | null
  /** Site origin, used to tell internal links from external ones. */
  origin?: string | null
  /** Titles of other records that already use this focus keyword. */
  keywordUsedBy?: string[]
}

export interface SeoCheck {
  id: string
  group: SeoGroup
  label: string
  pass: boolean
  /** Points earned and the most this test can earn. */
  points: number
  weight: number
  detail: string
}

export interface SeoResult {
  score: number
  grade: SeoGrade
  focusKeyword: string
  checks: SeoCheck[]
  snippet: { title: string; titleLength: number; description: string; descriptionLength: number; path: string }
  stats: {
    words: number
    keywordCount: number
    density: number
    headings: number
    internalLinks: number
    externalLinks: number
    dofollowExternalLinks: number
    images: number
    videos: number
    longestParagraph: number
  }
}

export const GROUP_LABELS: Record<SeoGroup, string> = {
  basic: 'Basic SEO',
  additional: 'Additional',
  title: 'Title Readability',
  readability: 'Content Readability',
}

/** The brand suffix the site's root layout adds to titles. */
export const TITLE_SUFFIX = ' | Tel K. Ganesan'

// ---------------------------------------------------------------------------- word lists

/** Rank Math's power-word test: an emotionally strong word in the title. */
const POWER_WORDS = new Set(
  `absolute amazing astonishing authentic awesome backed best blissful bold breakthrough brilliant bulletproof
  captivating certified challenge cheat colossal complete confidential crucial critical daring dazzling definitive
  delightful devastating discover dominate dramatic easy effortless elite empower epic essential exclusive expert
  explosive extraordinary fail fascinating fearless forbidden free fundamental genius genuine guaranteed hidden
  honest huge ignite immediately important incredible insane insider inspiring instant ironclad irresistible
  jaw-dropping killer launch legendary lessons life-changing limited little-known lucrative magic mammoth
  masterclass mind-blowing miracle mistakes must-have mystery never new outstanding overcome painless perfect
  phenomenal pioneering powerful premium priceless proven radical rare remarkable revealed revolutionary rich
  risk secret secrets sensational shocking simple smart spectacular staggering startling strategy strong stunning
  success successful surprising surefire tested thrilling timeless top transform transformative triumph truth
  ultimate unbeatable unbelievable uncover unforgettable unique unlock unstoppable urgent vital warning winning
  wisdom wonderful`.split(/\s+/),
)

/** Sentiment-bearing words (AFINN-style). Rank Math wants a positive or negative title. */
const POSITIVE_WORDS = new Set(
  `achieve achievement admire advantage amazing award awesome beautiful benefit best better bold boost brave
  breakthrough bright brilliant build celebrate champion clear confident courage create creative delight
  discover easy effective empower enjoy excellent exceptional exciting extraordinary fantastic fearless free
  fresh gain generous genius glad good grateful great grow growth happy healthy help hope ideal impact improve
  incredible innovate innovation inspire inspiring insight joy leader leadership legacy love lucky master
  meaningful opportunity optimistic outstanding passion peace perfect positive powerful progress prosper
  prosperity proud remarkable resilient reward rich rise safe smart solution strong succeed success
  successful support thrive top transform triumph trust ultimate unique valuable victory vision win winner
  winning wisdom wise wonderful worth`.split(/\s+/),
)

const NEGATIVE_WORDS = new Set(
  `afraid alarming angry anxiety avoid bad barrier battle beware broke broken burnout chaos collapse crash
  crisis critical danger dangerous dark dead deadly destroy difficult disaster doubt dread fail failure fake
  fall fear fight flaw hard harm hate hidden horrible hurt killer kill lie lose loss mistake mistakes myth
  never pain panic poor problem problems regret risk risky scam scary shock shocking sick stop stress
  struggle stuck terrible threat toxic tragic trap trapped trouble ugly warning waste weak worst wrong`.split(/\s+/),
)

// ---------------------------------------------------------------------------- text helpers

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

/** Word index of the first occurrence, or -1. */
function firstIndex(haystackWords: string[], needleWords: string[]): number {
  if (needleWords.length === 0) return -1
  for (let i = 0; i <= haystackWords.length - needleWords.length; i++) {
    if (needleWords.every((w, j) => haystackWords[i + j] === w)) return i
  }
  return -1
}

/** The focus keyword: the first of a comma-separated list, as in Rank Math. */
export function primaryKeyword(value: string | null | undefined): string {
  return String(value ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)[0] ?? ''
}

/** True when two keywords are the same once case, accents and punctuation are ignored. */
export function sameKeyword(a: string, b: string): boolean {
  const x = normalise(primaryKeyword(a))
  return x !== '' && x === normalise(primaryKeyword(b))
}

// ---------------------------------------------------------------------------- Lexical

type LNode = {
  type?: string
  tag?: string
  text?: string
  url?: string
  rel?: string
  children?: LNode[]
  fields?: Record<string, unknown>
  value?: unknown
  [key: string]: unknown
}

function textOf(node: LNode | undefined): string {
  if (!node) return ''
  if (typeof node.text === 'string') return node.text
  return (node.children ?? []).map(textOf).join('')
}

/**
 * Turns an article's Lexical body into a ContentModel. Article pages render an "On this page"
 * list from two or more H2/H3 headings, so that counts as the table of contents.
 * `altOf` resolves an upload node's asset to its alt text.
 */
export function contentFromLexical(body: unknown, altOf: (assetId: string) => string = () => ''): ContentModel {
  const out: ContentModel = { paragraphs: [], headings: [], links: [], imageAlts: [], videos: 0, hasToc: false }
  const root = (body as { root?: LNode } | null)?.root
  if (!root) return out

  const walk = (node: LNode): void => {
    switch (node.type) {
      case 'heading': {
        const text = textOf(node).trim()
        if (text) out.headings.push({ level: Number(String(node.tag ?? 'h2').slice(1)) || 2, text })
        return
      }
      case 'paragraph':
      case 'quote':
      case 'listitem': {
        const text = textOf(node).trim()
        if (text) out.paragraphs.push(text)
        break
      }
      case 'link':
      case 'autolink': {
        const f = node.fields as { url?: string; linkType?: string; rel?: string } | undefined
        out.links.push({ href: String(f?.url ?? node.url ?? ''), rel: f?.rel ?? node.rel ?? null, linkType: f?.linkType ?? null })
        break
      }
      case 'upload': {
        const v = node.value as { id?: string; alt?: string } | string | undefined
        const populatedAlt = typeof v === 'object' && v ? v.alt : undefined
        const id = typeof v === 'string' ? v : v?.id
        out.imageAlts.push(String(populatedAlt ?? (id ? altOf(String(id)) : '') ?? ''))
        break
      }
      case 'block': {
        const f = node.fields as Record<string, unknown> | undefined
        const type = f?.blockType
        if (type === 'videoEmbed') out.videos += 1
        if (type === 'pullQuote' && typeof f?.quote === 'string') out.paragraphs.push(f.quote)
        if (type === 'calloutBox' && typeof f?.content === 'string') out.paragraphs.push(f.content)
        if (type === 'faq' && Array.isArray(f?.items)) {
          for (const item of f.items as { question?: string; answer?: string }[]) if (item?.answer) out.paragraphs.push(item.answer)
        }
        if (type === 'keyTakeaways' && Array.isArray(f?.points)) {
          for (const p of f.points as { text?: string }[]) if (p?.text) out.paragraphs.push(p.text)
        }
        if (type === 'ctaButton' && typeof f?.url === 'string') out.links.push({ href: f.url })
        break
      }
      default:
        break
    }
    node.children?.forEach(walk)
  }

  root.children?.forEach(walk)
  out.hasToc = out.headings.filter((h) => h.level === 2 || h.level === 3).length >= 2
  return out
}

/** Upload node asset ids in a Lexical body (to look up their alt text). */
export function lexicalUploadIds(body: unknown): string[] {
  const ids: string[] = []
  const walk = (node: LNode) => {
    if (node.type === 'upload') {
      const v = node.value as { id?: string } | string | undefined
      const id = typeof v === 'string' ? v : v?.id
      if (id) ids.push(String(id))
    }
    node.children?.forEach(walk)
  }
  const root = (body as { root?: LNode } | null)?.root
  root?.children?.forEach(walk)
  return ids
}

// ---------------------------------------------------------------------------- links

function classifyLinks(links: ContentLink[], origin: string | null | undefined) {
  let host = ''
  try {
    host = origin ? new URL(origin).hostname.replace(/^www\./, '') : ''
  } catch {
    host = ''
  }
  let internal = 0
  let external = 0
  let dofollowExternal = 0
  for (const link of links) {
    const u = (link.href ?? '').trim()
    if (!u || u.startsWith('#') || /^(mailto|tel|javascript):/i.test(u)) continue
    if (link.linkType === 'internal' || (u.startsWith('/') && !u.startsWith('//'))) {
      internal += 1
      continue
    }
    try {
      const h = new URL(u.startsWith('//') ? `https:${u}` : u).hostname.replace(/^www\./, '')
      if (host && h === host) internal += 1
      else {
        external += 1
        if (!/\bnofollow\b|\bsponsored\b|\bugc\b/i.test(link.rel ?? '')) dofollowExternal += 1
      }
    } catch {
      // ignore malformed
    }
  }
  return { internal, external, dofollowExternal }
}

// ---------------------------------------------------------------------------- analysis

/** Rank Math's content-length tiers (words -> points out of 8). */
function lengthPoints(words: number): number {
  if (words >= 2500) return 8
  if (words >= 2000) return 5
  if (words >= 1500) return 4
  if (words >= 1000) return 3
  if (words >= 600) return 2
  return 0
}

/** Rank Math's keyword-density tiers (points out of 6). Over 2.5% is keyword stuffing. */
function densityPoints(density: number): number {
  if (density > 2.5 || density < 0.5) return 0
  if (density < 0.75) return 2
  if (density < 1) return 3
  return 6
}

/** Images and videos in the content (points out of 6). */
function assetPoints(images: number, videos: number): number {
  const imagePoints = images >= 4 ? 6 : images === 3 ? 4 : images
  const videoPoints = Math.min(videos, 2)
  return Math.min(6, imagePoints + videoPoints)
}

export function analyzeSeo(input: SeoInput): SeoResult {
  const content = input.content
  const keyword = primaryKeyword(input.focusKeyword)
  const kwWords = wordsOf(keyword)
  const hasKeyword = kwWords.length > 0

  const bodyWords = wordsOf(content.paragraphs.join(' '))
  const wordCount = bodyWords.length

  const effectiveTitle = (input.seoTitle?.trim() || input.title || '').trim()
  const effectiveDescription = (input.seoDescription?.trim() || input.fallbackDescription?.trim() || '').trim()

  const inText = (text: string) => hasKeyword && countOccurrences(wordsOf(text), kwWords) > 0
  const keywordCount = countOccurrences(bodyWords, kwWords)
  // Rank Math: occurrences of the keyword per 100 words of content.
  const density = wordCount > 0 && hasKeyword ? (keywordCount / wordCount) * 100 : 0

  const pathWords = wordsOf(input.path.replace(/[/_-]+/g, ' '))
  const kwInUrl = hasKeyword && countOccurrences(pathWords, kwWords) > 0

  const tenPercent = bodyWords.slice(0, Math.max(1, Math.ceil(wordCount * 0.1)))
  const kwInIntro = hasKeyword && countOccurrences(tenPercent, kwWords) > 0

  const kwInSubheading = content.headings.some((h) => h.level >= 2 && inText(h.text))
  const imageCount = content.imageAlts.length + (input.featuredImage ? 1 : 0)
  const alts = [...content.imageAlts, ...(input.featuredImage ? [input.featuredImage.alt ?? ''] : [])]
  const kwInAlt = hasKeyword && alts.some((a) => inText(a))
  const longestParagraph = content.paragraphs.reduce((max, p) => Math.max(max, wordsOf(p).length), 0)
  const links = classifyLinks(content.links, input.origin)

  const titleWords = wordsOf(effectiveTitle)
  const kwTitleIndex = firstIndex(titleWords, kwWords)
  // Rank Math: the keyword should appear in the first half of the title.
  const kwNearStart = hasKeyword && kwTitleIndex >= 0 && kwTitleIndex < Math.ceil(titleWords.length / 2)
  const hasPowerWord = titleWords.some((w) => POWER_WORDS.has(w))
  const hasSentiment = titleWords.some((w) => POSITIVE_WORDS.has(w) || NEGATIVE_WORDS.has(w))
  const hasNumber = /\d/.test(effectiveTitle)

  const needKw = 'Set a focus keyword to run this test.'
  const checks: SeoCheck[] = []
  const add = (id: string, group: SeoGroup, label: string, weight: number, points: number, pass: boolean, detail: string) =>
    checks.push({ id, group, label, weight, points: Math.max(0, Math.min(weight, points)), pass, detail })
  const full = (id: string, group: SeoGroup, label: string, weight: number, pass: boolean, detail: string) => add(id, group, label, weight, pass ? weight : 0, pass, detail)

  // ---- Basic SEO (57) ----
  full(
    'kw-title',
    'basic',
    'Focus Keyword in the SEO title',
    36,
    inText(effectiveTitle),
    !hasKeyword ? needKw : inText(effectiveTitle) ? 'Hurray! You\'re using the Focus Keyword in the SEO Title.' : 'Add the Focus Keyword to the SEO title.',
  )
  full(
    'kw-description',
    'basic',
    'Focus Keyword in the meta description',
    2,
    inText(effectiveDescription),
    !hasKeyword ? needKw : inText(effectiveDescription) ? 'Focus Keyword used inside the SEO Meta Description.' : 'Add the Focus Keyword to the SEO Meta Description.',
  )
  full(
    'kw-url',
    'basic',
    'Focus Keyword in the URL',
    5,
    kwInUrl,
    !hasKeyword ? needKw : kwInUrl ? 'Focus Keyword used in the URL.' : 'Use the Focus Keyword in the URL (slug).',
  )
  full(
    'kw-intro',
    'basic',
    'Focus Keyword at the beginning of the content',
    3,
    kwInIntro,
    !hasKeyword ? needKw : kwInIntro ? 'Focus Keyword appears in the first 10% of the content.' : 'Use the Focus Keyword near the beginning of the content (first 10%).',
  )
  full(
    'kw-content',
    'basic',
    'Focus Keyword in the content',
    3,
    keywordCount > 0,
    !hasKeyword ? needKw : keywordCount > 0 ? 'Focus Keyword found in the content.' : 'Focus Keyword doesn\'t appear in the content.',
  )
  add(
    'length',
    'basic',
    'Content length',
    8,
    lengthPoints(wordCount),
    wordCount >= 600,
    wordCount >= 2500
      ? `Content is ${wordCount} words long. Good job!`
      : wordCount >= 600
        ? `Content is ${wordCount} words long. 2500+ words earns full points.`
        : `Content is ${wordCount} words long. Consider using at least 600 words.`,
  )

  // ---- Additional (26) ----
  full(
    'kw-subheading',
    'additional',
    'Focus Keyword in subheadings',
    3,
    kwInSubheading,
    !hasKeyword ? needKw : kwInSubheading ? 'Focus Keyword found in the subheading(s).' : 'Use the Focus Keyword in at least one subheading (H2-H6).',
  )
  full(
    'kw-image-alt',
    'additional',
    'Focus Keyword in image alt attributes',
    2,
    kwInAlt,
    !hasKeyword
      ? needKw
      : imageCount === 0
        ? 'Add an image with your Focus Keyword as alt text.'
        : kwInAlt
          ? 'Focus Keyword found in image alt attribute(s).'
          : 'Add the Focus Keyword to an image\'s alt text.',
  )
  add(
    'kw-density',
    'additional',
    'Keyword density',
    6,
    densityPoints(density),
    hasKeyword && density >= 0.5 && density <= 2.5,
    !hasKeyword
      ? needKw
      : keywordCount === 0
        ? 'Keyword Density is 0. Aim for around 1% Keyword Density.'
        : density > 2.5
          ? `Keyword Density is ${density.toFixed(2)}%, which is high. The Focus Keyword is used ${keywordCount} times; reduce it to avoid keyword stuffing.`
          : `Keyword Density is ${density.toFixed(2)}%; the Focus Keyword appears ${keywordCount} time${keywordCount === 1 ? '' : 's'}.${density < 1 ? ' Aim for around 1%.' : ''}`,
  )
  const urlLen = input.path.length
  full('url-length', 'additional', 'URL length', 4, urlLen <= 75, urlLen <= 75 ? `URL is ${urlLen} characters long. Kudos!` : `URL is ${urlLen} characters long. Keep it under 75.`)
  full(
    'external-links',
    'additional',
    'Linking to external resources',
    4,
    links.external > 0,
    links.external > 0 ? 'You are linking to external resources.' : 'No outbound links were found. Link out to external resources.',
  )
  full(
    'dofollow-link',
    'additional',
    'At least one external link is DoFollow',
    2,
    links.dofollowExternal > 0,
    links.dofollowExternal > 0 ? 'At least one external link with DoFollow found in your content.' : 'Add a DoFollow link that points to an external resource.',
  )
  full(
    'internal-links',
    'additional',
    'Linking to internal resources',
    5,
    links.internal > 0,
    links.internal > 0 ? 'You are linking to other resources on your website.' : 'Add internal links in your content.',
  )
  const usedBy = input.keywordUsedBy ?? []
  add(
    'kw-unique',
    'additional',
    'Focus Keyword not used before',
    0,
    0,
    hasKeyword && usedBy.length === 0,
    !hasKeyword ? needKw : usedBy.length === 0 ? 'You haven\'t used this Focus Keyword before.' : `Already used in: ${usedBy.slice(0, 3).join(', ')}${usedBy.length > 3 ? '…' : ''}. Use a different Focus Keyword for each page.`,
  )

  // ---- Title Readability (6) ----
  full(
    'title-starts-kw',
    'title',
    'Focus Keyword at the beginning of the SEO title',
    3,
    kwNearStart,
    !hasKeyword ? needKw : kwNearStart ? 'Focus Keyword used at the beginning of the SEO title.' : 'Use the Focus Keyword near the beginning of the SEO title.',
  )
  full('title-sentiment', 'title', 'Title has a positive or negative sentiment', 1, hasSentiment, hasSentiment ? 'Your title has a positive or a negative sentiment.' : 'Your title doesn\'t contain a positive or a negative sentiment word.')
  full('title-power-word', 'title', 'Title has a power word', 1, hasPowerWord, hasPowerWord ? 'Your title contains a power word. Booyah!' : 'Your title doesn\'t contain a power word. Add at least one.')
  full('title-number', 'title', 'Title has a number', 1, hasNumber, hasNumber ? 'You are using a number in your SEO title.' : 'Your SEO title doesn\'t contain a number.')

  // ---- Content Readability (11) ----
  full('toc', 'readability', 'Table of contents', 2, content.hasToc, content.hasToc ? 'You seem to be using a Table of Contents.' : 'Use a Table of Contents (two or more H2/H3 headings on posts) to break down your text.')
  const shortParas = content.paragraphs.length > 0 && longestParagraph <= 120
  full(
    'short-paragraphs',
    'readability',
    'Short paragraphs',
    3,
    shortParas,
    content.paragraphs.length === 0 ? 'Add some content first.' : shortParas ? 'You are using short paragraphs.' : `At least one paragraph is long (${longestParagraph} words). Keep paragraphs under 120 words.`,
  )
  add(
    'media',
    'readability',
    'Images and videos in the content',
    6,
    assetPoints(imageCount, content.videos),
    imageCount + content.videos > 0,
    imageCount + content.videos > 0
      ? `Your content contains ${imageCount} image${imageCount === 1 ? '' : 's'}${content.videos ? ` and ${content.videos} video${content.videos === 1 ? '' : 's'}` : ''}.${imageCount < 4 ? ' 4+ images earns full points.' : ''}`
      : 'Your content doesn\'t contain any images or videos.',
  )

  const score = Math.round(checks.reduce((sum, c) => sum + c.points, 0))

  return {
    score,
    grade: score >= 81 ? 'good' : score >= 51 ? 'ok' : 'poor',
    focusKeyword: keyword,
    checks,
    snippet: { title: effectiveTitle, titleLength: effectiveTitle.length, description: effectiveDescription, descriptionLength: effectiveDescription.length, path: input.path },
    stats: {
      words: wordCount,
      keywordCount,
      density: Math.round(density * 100) / 100,
      headings: content.headings.length,
      internalLinks: links.internal,
      externalLinks: links.external,
      dofollowExternalLinks: links.dofollowExternal,
      images: imageCount,
      videos: content.videos,
      longestParagraph,
    },
  }
}
