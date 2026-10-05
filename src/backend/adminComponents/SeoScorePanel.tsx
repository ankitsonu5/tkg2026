'use client'

import { useAllFormFields } from '@payloadcms/ui'
import { useEffect, useMemo, useState } from 'react'

import {
  analyzeArticleSeo,
  GROUP_LABELS,
  type SeoCheck,
  type SeoGrade,
  type SeoGroup,
} from '../../lib/seo/score'

const GRADE_COLOR: Record<SeoGrade, string> = { good: '#1f9d63', ok: '#d98a1d', poor: '#d64545' }
const GRADE_LABEL: Record<SeoGrade, string> = { good: 'Good', ok: 'Okay', poor: 'Needs work' }
const GROUP_ORDER: SeoGroup[] = ['basic', 'additional', 'title', 'readability']

const text = (v: unknown) => (typeof v === 'string' ? v : '')

/**
 * Live SEO score shown while editing an article. Reads the form as the author types, so the
 * score and checklist update immediately; the same analysis runs on the server when saving.
 */
export function SeoScorePanel() {
  const [fields] = useAllFormFields()
  const [alt, setAlt] = useState<string | null>(null)

  const heroId = (() => {
    const v = fields['heroImage']?.value
    if (!v) return null
    return typeof v === 'object' ? String((v as { id?: unknown }).id ?? '') : String(v)
  })()

  useEffect(() => {
    if (!heroId) return
    let cancelled = false
    fetch(`/api/assets/${heroId}?depth=0`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((asset) => {
        if (!cancelled) setAlt(asset ? text(asset.alt) : null)
      })
      .catch(() => {
        if (!cancelled) setAlt(null)
      })
    return () => {
      cancelled = true
    }
  }, [heroId])

  const origin = (process.env.NEXT_PUBLIC_SERVER_URL || '').replace(/\/+$/, '')
  const title = text(fields['title']?.value)
  const slug = text(fields['slug']?.value)
  const seoTitle = text(fields['seo.title']?.value)
  const seoDescription = text(fields['seo.description']?.value)
  const excerpt = text(fields['excerpt']?.value)
  const focusKeyword = text(fields['seoAnalysis.focusKeyword']?.value)
  const body = fields['body']?.value

  const result = useMemo(
    () =>
      analyzeArticleSeo({
        title,
        slug,
        excerpt,
        seoTitle,
        seoDescription,
        focusKeyword,
        body,
        hasFeaturedImage: Boolean(heroId),
        featuredImageAlt: heroId ? alt : null,
        origin,
      }),
    [title, slug, excerpt, seoTitle, seoDescription, focusKeyword, body, heroId, alt, origin],
  )

  const color = GRADE_COLOR[result.grade]
  const snippetTitle = (seoTitle || title || 'Untitled article').slice(0, 60)
  const snippetDesc = (seoDescription || excerpt || 'Add a meta description so search engines show a good summary.').slice(0, 160)
  const passed = result.checks.filter((c) => c.pass).length

  return (
    <div style={{ margin: '0 0 2rem', padding: '1.25rem', border: '1px solid var(--theme-elevation-150)', borderRadius: 8, background: 'var(--theme-elevation-50)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        <div
          aria-label={`SEO score ${result.score} out of 100`}
          style={{
            width: 84,
            height: 84,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontSize: 26,
            fontWeight: 800,
            color,
            background: `conic-gradient(${color} ${result.score * 3.6}deg, var(--theme-elevation-150) 0)`,
            position: 'relative',
          }}
        >
          <span style={{ position: 'absolute', inset: 7, borderRadius: '50%', background: 'var(--theme-elevation-50)', display: 'grid', placeItems: 'center' }}>
            {result.score}
          </span>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color }}>SEO score: {GRADE_LABEL[result.grade]}</div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            {passed} of {result.checks.length} checks passed &middot; {result.stats.words} words
            {focusKeyword ? <> &middot; keyword used {result.stats.keywordCount}× ({result.stats.density}%)</> : null}
          </div>
          {!focusKeyword && (
            <div style={{ fontSize: 13, marginTop: 4, color: GRADE_COLOR.ok }}>
              Enter a focus keyword above to unlock the keyword checks.
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#fff', color: '#202124', borderRadius: 8, border: '1px solid #dfe1e5' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#70757a', marginBottom: 6 }}>Search preview</div>
        <div style={{ fontSize: 13, color: '#4d5156', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {(origin || 'https://yoursite.com').replace(/^https?:\/\//, '')} › ideas › {slug || 'your-article'}
        </div>
        <div style={{ fontSize: 20, lineHeight: 1.3, color: '#1a0dab', margin: '2px 0 4px' }}>{snippetTitle}</div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: '#4d5156' }}>{snippetDesc}</div>
      </div>

      {GROUP_ORDER.map((group) => {
        const items = result.checks.filter((c) => c.group === group)
        const ok = items.filter((c) => c.pass).length
        return (
          <details key={group} open={ok < items.length} style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
              {GROUP_LABELS[group]} <span style={{ fontWeight: 400, opacity: 0.7 }}>({ok}/{items.length})</span>
            </summary>
            <ul style={{ listStyle: 'none', margin: '0.6rem 0 0', padding: 0, display: 'grid', gap: 8 }}>
              {items.map((c: SeoCheck) => (
                <li key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}>
                  <span
                    aria-hidden="true"
                    style={{ flex: 'none', width: 18, height: 18, borderRadius: '50%', marginTop: 2, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: '#fff', background: c.pass ? GRADE_COLOR.good : GRADE_COLOR.poor }}
                  >
                    {c.pass ? '✓' : '✕'}
                  </span>
                  <span>
                    <strong>{c.label}</strong>
                    <span style={{ display: 'block', opacity: 0.75 }}>
                      <span className="visually-hidden">{c.pass ? 'Passed. ' : 'Failed. '}</span>
                      {c.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )
      })}
    </div>
  )
}
