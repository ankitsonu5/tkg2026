import { describe, expect, it } from 'vitest'

import { analyzeSeo, contentFromLexical, primaryKeyword, sameKeyword, type ContentModel } from '../src/lib/seo/score'

const words = (n: number, filler = 'growth') => Array.from({ length: n }, () => filler).join(' ')

/** ~2,600 words, keyword ~1.2%, short paragraphs, 4 images, links, TOC. */
function perfectContent(): ContentModel {
  const paragraphs = ['Leadership lessons for founders start with clarity. ' + words(40)]
  for (let i = 0; i < 40; i++) paragraphs.push(`leadership lessons ${words(64)}`)
  return {
    paragraphs,
    headings: [
      { level: 2, text: 'Why leadership lessons matter' },
      { level: 2, text: 'Building teams' },
      { level: 3, text: 'Hiring' },
    ],
    links: [{ href: '/about' }, { href: 'https://example.org/research' }],
    imageAlts: ['leadership lessons on stage', 'team', 'office'],
    videos: 0,
    hasToc: true,
  }
}

describe('analyzeSeo (Rank Math rules)', () => {
  it('weights add up to 100 and a fully optimised page scores 100', () => {
    const result = analyzeSeo({
      title: 'x',
      path: '/ideas/leadership-lessons',
      seoTitle: 'Leadership Lessons: 7 Powerful Ideas for Founders | Tel K. Ganesan',
      seoDescription: 'Leadership lessons from three decades of building companies, with practical ideas any founder can apply this week.',
      focusKeyword: 'leadership lessons',
      content: perfectContent(),
      featuredImage: { alt: 'Tel speaking' },
      keywordUsedBy: [],
    })
    expect(result.checks.reduce((s, c) => s + c.weight, 0)).toBe(100)
    expect(result.checks.filter((c) => !c.pass)).toEqual([])
    expect(result.score).toBe(100)
    expect(result.grade).toBe('good')
  })

  it('gives no keyword points without a focus keyword', () => {
    const result = analyzeSeo({ title: 'Hello', path: '/about', content: perfectContent() })
    expect(result.checks.find((c) => c.id === 'kw-title')?.points).toBe(0)
    expect(result.score).toBeLessThan(50)
  })

  it('fails keyword stuffing over 2.5% density', () => {
    const content: ContentModel = { paragraphs: [words(50, 'seo') + ' ' + words(50)], headings: [], links: [], imageAlts: [], videos: 0, hasToc: false }
    const density = analyzeSeo({ title: 'seo', path: '/seo', focusKeyword: 'seo', content }).checks.find((c) => c.id === 'kw-density')!
    expect(density.pass).toBe(false)
    expect(density.points).toBe(0)
  })

  it('scales content length points like Rank Math', () => {
    const pts = (n: number) =>
      analyzeSeo({ title: 't', path: '/t', content: { paragraphs: [words(n)], headings: [], links: [], imageAlts: [], videos: 0, hasToc: false } }).checks.find((c) => c.id === 'length')!.points
    expect([pts(500), pts(600), pts(1000), pts(1500), pts(2000), pts(2500)]).toEqual([0, 2, 3, 4, 5, 8])
  })

  it('treats nofollow external links as not DoFollow', () => {
    const content: ContentModel = { paragraphs: ['hi'], headings: [], links: [{ href: 'https://example.org', rel: 'nofollow' }], imageAlts: [], videos: 0, hasToc: false }
    const r = analyzeSeo({ title: 't', path: '/t', content })
    expect(r.checks.find((c) => c.id === 'external-links')?.pass).toBe(true)
    expect(r.checks.find((c) => c.id === 'dofollow-link')?.pass).toBe(false)
  })

  it('flags a focus keyword used elsewhere without costing points', () => {
    const r = analyzeSeo({ title: 't', path: '/t', focusKeyword: 'x', content: perfectContent(), keywordUsedBy: ['About'] })
    const check = r.checks.find((c) => c.id === 'kw-unique')!
    expect(check.pass).toBe(false)
    expect(check.weight).toBe(0)
  })

  it('reads Lexical bodies', () => {
    const body = {
      root: {
        children: [
          { type: 'heading', tag: 'h2', children: [{ text: 'One' }] },
          { type: 'heading', tag: 'h3', children: [{ text: 'Two' }] },
          { type: 'paragraph', children: [{ text: 'Hello ' }, { type: 'link', fields: { url: 'https://a.com' }, children: [{ text: 'a' }] }] },
          { type: 'upload', value: 'img1' },
        ],
      },
    }
    const c = contentFromLexical(body, (id) => (id === 'img1' ? 'alt one' : ''))
    expect(c.headings).toHaveLength(2)
    expect(c.hasToc).toBe(true)
    expect(c.links).toHaveLength(1)
    expect(c.imageAlts).toEqual(['alt one'])
  })

  it('uses the first of several keywords', () => {
    expect(primaryKeyword(' tel ganesan, kyyba ')).toBe('tel ganesan')
    expect(sameKeyword('Tel Ganésan', 'tel ganesan, other')).toBe(true)
  })
})
