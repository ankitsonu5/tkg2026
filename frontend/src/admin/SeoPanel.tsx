'use client'

import { useEffect, useState } from 'react'

import { adminFetch } from './api'
import { idOf, type Values } from './fields'

interface SeoCheck {
  id: string
  group: string
  label: string
  pass: boolean
  points: number
  weight: number
  detail: string
}

interface SeoResult {
  score: number
  grade: 'good' | 'ok' | 'poor'
  focusKeyword: string
  checks: SeoCheck[]
  snippet: { title: string; titleLength: number; description: string; descriptionLength: number; path: string }
  stats: { words: number; keywordCount: number; density: number }
}

/** What the analysis needs from a rendered page (mirrors the backend ContentModel). */
interface Rendered {
  title: string
  description: string
  content: {
    paragraphs: string[]
    headings: { level: number; text: string }[]
    links: { href: string; rel: string | null }[]
    imageAlts: string[]
    videos: number
    hasToc: boolean
  }
}

const GROUPS: Record<string, string> = {
  basic: 'Basic SEO',
  additional: 'Additional',
  title: 'Title Readability',
  readability: 'Content Readability',
}

const COLORS = { good: '#00a32a', ok: '#dba617', poor: '#d63638' }

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

/**
 * Reads the page as the site renders it: only the <main> content (Rank Math, too, scores the
 * post content, not the header, navigation or footer).
 */
async function readRenderedPage(path: string): Promise<Rendered | null> {
  const res = await fetch(path, { credentials: 'same-origin', cache: 'no-store' }).catch(() => null)
  if (!res?.ok) return null
  const html = await res.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const main = doc.querySelector('main') ?? doc.body
  main.querySelectorAll('script, style, noscript, template').forEach((n) => n.remove())

  const paragraphs: string[] = []
  main.querySelectorAll('p, li, blockquote, dd, figcaption').forEach((el) => {
    // A list item or quote that wraps paragraphs is counted through those paragraphs.
    if (el.tagName !== 'P' && el.querySelector('p')) return
    const text = clean(el.textContent)
    if (text) paragraphs.push(text)
  })

  const headings: Rendered['content']['headings'] = []
  main.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    const text = clean(h.textContent)
    if (text) headings.push({ level: Number(h.tagName.slice(1)), text })
  })

  const links: Rendered['content']['links'] = []
  main.querySelectorAll('a[href]').forEach((a) => links.push({ href: a.getAttribute('href') ?? '', rel: a.getAttribute('rel') }))

  const imageAlts: string[] = []
  main.querySelectorAll('img').forEach((img) => imageAlts.push(img.getAttribute('alt') ?? ''))

  const videos = main.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="vimeo"]').length
  const hasToc = Boolean(main.querySelector('[class*="toc" i], [id*="toc" i], nav[aria-label*="contents" i], nav[aria-label*="on this page" i]'))

  return {
    title: clean(doc.title),
    description: clean(doc.querySelector('meta[name="description"]')?.getAttribute('content')),
    content: { paragraphs, headings, links, imageAlts, videos, hasToc },
  }
}

/**
 * Rank Math-style SEO box. Posts and custom pages are scored from the editor content as you
 * type; built-in pages and other records are scored from their live rendered page plus the SEO
 * fields in the form.
 */
export function SeoPanel({
  slug,
  id,
  values,
  path,
  onScore,
}: {
  slug: string
  id: string | null
  values: Values
  /** Public path of the record, or null when it has no page of its own. */
  path: string | null
  onScore?: (score: number | null) => void
}) {
  const [result, setResult] = useState<SeoResult | null>(null)
  const [noPage, setNoPage] = useState(false)
  const [open, setOpen] = useState(true)
  const [rendered, setRendered] = useState<Rendered | null | undefined>(undefined)
  const [loadingPage, setLoadingPage] = useState(false)
  // Posts and custom pages are scored from the editor content as you type.
  const fromEditor = slug === 'articles' || (slug === 'pages' && !values.pageId)

  // Read the page, and again whenever it changes on the server (after Save/Update).
  const updatedAt = values.updatedAt
  useEffect(() => {
    if (fromEditor || !path) return
    let cancelled = false
    readRenderedPage(path).then((r) => {
      if (!cancelled) setRendered(r)
    })
    return () => {
      cancelled = true
    }
  }, [fromEditor, path, updatedAt])

  const loadPage = () => {
    if (!path) return
    setLoadingPage(true)
    readRenderedPage(path)
      .then(setRendered)
      .finally(() => setLoadingPage(false))
  }

  const input = JSON.stringify({
    collection: slug,
    id,
    doc: {
      title: values.title,
      name: values.name,
      slug: values.slug,
      path: values.path,
      displayAs: values.displayAs,
      excerpt: values.excerpt,
      summary: values.summary,
      purpose: values.purpose,
      pageId: values.pageId,
      seo: { title: values.seo?.title, description: values.seo?.description },
      seoAnalysis: { focusKeyword: values.seoAnalysis?.focusKeyword },
      body: values.body,
      heroImage: idOf(values.heroImage),
    },
    rendered: rendered ?? undefined,
  })
  const waiting = !fromEditor && Boolean(path) && rendered === undefined

  useEffect(() => {
    if (waiting) return
    const t = setTimeout(() => {
      adminFetch<SeoResult | { noPage: true }>('/seo-analysis', { method: 'POST', body: JSON.parse(input) })
        .then((r) => {
          if ('noPage' in r) {
            setNoPage(true)
            setResult(null)
            onScore?.(null)
          } else {
            setNoPage(false)
            setResult(r)
            onScore?.(r.score)
          }
        })
        .catch(() => setResult(null))
    }, 700)
    return () => clearTimeout(t)
  }, [input, waiting, onScore])

  const origin = typeof window !== 'undefined' ? window.location.host : ''

  return (
    <div className="wpa-postbox">
      <div className="wpa-postbox__head">
        <h2>SEO analysis</h2>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? '▾' : '▸'}
        </button>
      </div>
      {open && (
        <div className="wpa-postbox__body">
          {noPage || (!fromEditor && !path) ? (
            <p className="wpa-muted">This record has no page of its own (it shows as a card), so there is nothing to rank. Set “Display as” to a detail page to analyse it.</p>
          ) : !result ? (
            <p className="wpa-muted">Analysing…</p>
          ) : (
            <>
              <div className="wpa-seo-score">
                <div className="wpa-seo-score__ring" style={{ background: COLORS[result.grade] }}>
                  {result.score}
                </div>
                <div>
                  <strong>
                    {result.score}/100 · {result.grade === 'good' ? 'Good' : result.grade === 'ok' ? 'Okay' : 'Needs work'}
                  </strong>
                  <div className="wpa-muted">{result.focusKeyword ? `Focus keyword: “${result.focusKeyword}”` : 'Set a focus keyword (Focus keyword box).'}</div>
                </div>
              </div>

              {!fromEditor && (
                <p className="wpa-field__help" style={{ marginTop: 8 }}>
                  {rendered
                    ? 'Content is read from the live page. SEO title, description and keyword update as you type; content changes count after you save.'
                    : 'The live page could not be read (not published yet?), so the saved content is used.'}{' '}
                  <button type="button" className="wpa-link-plain" onClick={loadPage} disabled={loadingPage}>
                    {loadingPage ? 'Re-reading…' : 'Re-read page'}
                  </button>
                </p>
              )}

              <div className="wpa-seo-snippet" style={{ marginTop: 12, padding: 10, border: '1px solid #dcdcde', borderRadius: 4, background: '#fff' }}>
                <div style={{ fontSize: 12, color: '#4d5156' }}>
                  {origin}
                  {result.snippet.path}
                </div>
                <div style={{ color: '#1a0dab', fontSize: 16, lineHeight: 1.3 }}>{result.snippet.title.length > 60 ? `${result.snippet.title.slice(0, 60)}…` : result.snippet.title}</div>
                <div style={{ fontSize: 13, color: '#4d5156' }}>
                  {result.snippet.description ? (result.snippet.description.length > 160 ? `${result.snippet.description.slice(0, 160)}…` : result.snippet.description) : <em>No meta description.</em>}
                </div>
                <div className="wpa-muted" style={{ fontSize: 11, marginTop: 6 }}>
                  Title <span style={{ color: result.snippet.titleLength > 60 ? COLORS.poor : COLORS.good }}>{result.snippet.titleLength}/60</span> · Description{' '}
                  <span style={{ color: result.snippet.descriptionLength > 160 || result.snippet.descriptionLength < 120 ? COLORS.ok : COLORS.good }}>
                    {result.snippet.descriptionLength}/160
                  </span>{' '}
                  · {result.stats.words} words
                </div>
              </div>

              {Object.entries(GROUPS).map(([group, label]) => {
                const checks = result.checks.filter((c) => c.group === group)
                if (!checks.length) return null
                const errors = checks.filter((c) => !c.pass).length
                return (
                  <div key={group} style={{ marginTop: 12 }}>
                    <div className="wpa-field__label">
                      {label} <span className="wpa-muted">({errors ? `${errors} Error${errors === 1 ? '' : 's'}` : 'All Good'})</span>
                    </div>
                    <ul className="wpa-seo-checks">
                      {checks.map((c) => {
                        const partial = c.pass && c.points < c.weight
                        return (
                          <li key={c.id} title={`${c.points}/${c.weight} points`}>
                            <span className="wpa-seo-dot" style={{ background: !c.pass ? COLORS.poor : partial ? COLORS.ok : COLORS.good }} />
                            <span>
                              {c.detail || c.label}
                              {c.weight > 0 && (
                                <span className="wpa-muted">
                                  {' '}
                                  ({c.points}/{c.weight})
                                </span>
                              )}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
