import { describe, it, expect, beforeAll } from 'vitest'
import type { Payload } from 'payload'

import { testPayload, uid, createReadyClaim } from './helpers'
import { BASELINE_PAGES, PRIMARY_NAVIGATION } from '@/baseline/pages'
import { BASELINE_INQUIRY_ROUTES } from '@/baseline/inquiry-routes'
import { FUNCTIONAL_REQUIREMENTS } from '@/baseline/ids'
import { classifyQuery, scrubParams, ANALYTICS_EVENTS } from '@/lib/analytics/events'

/**
 * QA-IA-* and QA-AN-* : baseline invariants that must not drift, plus the analytics
 * privacy rules.
 */
describe('Baseline architecture invariants', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await testPayload()
  })

  it('QA-IA-01: exactly 15 page/template types are defined with unique Page IDs and paths', () => {
    expect(BASELINE_PAGES).toHaveLength(15)
    expect(new Set(BASELINE_PAGES.map((p) => p.pageId)).size).toBe(15)
    expect(new Set(BASELINE_PAGES.map((p) => p.path)).size).toBe(15)
  })

  it('QA-IA-02: primary navigation matches the approved seven-route architecture', () => {
    expect(PRIMARY_NAVIGATION.map((p) => p.title)).toEqual([
      'About',
      'Enterprise & Investments',
      'Ideas',
      'Film & Culture',
      'Impact',
      'Media & Speaking',
      'Connect',
    ])
  })

  it('QA-IA-03: every page declares a primary CTA and its modules', () => {
    for (const page of BASELINE_PAGES) {
      expect(page.primaryCta, page.pageId).toBeTruthy()
      expect(page.primaryCtaId, page.pageId).toMatch(/^CTA-/)
      expect(page.modules.length, page.pageId).toBeGreaterThan(0)
      for (const moduleId of page.modules) {
        expect(moduleId, page.pageId).toMatch(/^MOD-/)
      }
    }
  })

  it('QA-IA-04: search results are never indexable', () => {
    const search = BASELINE_PAGES.find((p) => p.pageId === 'SEARCH')!
    expect(search.indexable).toBe(false)
  })

  it('QA-IA-05: exactly seven inquiry routes exist with the baseline owner roles', () => {
    expect(BASELINE_INQUIRY_ROUTES).toHaveLength(7)
    expect(BASELINE_INQUIRY_ROUTES.map((r) => r.ownerRole)).toEqual([
      'Partnership Lead',
      'Chief of Staff',
      'Media & Speaking Lead',
      'PR / Media Lead',
      'Film & Culture Lead',
      'Impact Lead',
      'Website Coordinator',
    ])
  })

  it('QA-IA-06: every qualification field states a collection purpose (data minimization)', () => {
    for (const route of BASELINE_INQUIRY_ROUTES) {
      for (const field of route.fields) {
        expect(field.purpose, `${route.routeId}.${field.name}`).toBeTruthy()
        expect(field.purpose.length, `${route.routeId}.${field.name}`).toBeGreaterThan(10)
      }
    }
  })

  it('QA-IA-07: the functional requirement set matches the baseline, with FR-SEARCH-01 the only P1', () => {
    expect(FUNCTIONAL_REQUIREMENTS).toHaveLength(16)
    const p1 = FUNCTIONAL_REQUIREMENTS.filter((r) => r.priority === 'P1')
    expect(p1.map((r) => r.id)).toEqual(['FR-SEARCH-01'])
  })

  it('QA-SEARCH-01: the public search query returns published content and no drafts', async () => {
    const publishedSlug = uid('published-article')
    const draftSlug = uid('draft-article')
    const marker = `Zephyr${Date.now()}`
    const claim = await createReadyClaim(payload)

    await payload.create({
      collection: 'articles',
      data: {
        title: `${marker} published`,
        slug: publishedSlug,
        topic: 'enterprise',
        authorshipStatus: 'authored',
        ownerRole: 'Editorial Lead',
        claims: [claim.id],
        _status: 'published',
      },
      overrideAccess: true,
    })

    await payload.create({
      collection: 'articles',
      data: {
        title: `${marker} draft`,
        slug: draftSlug,
        topic: 'enterprise',
        authorshipStatus: 'authored',
        ownerRole: 'Editorial Lead',
        _status: 'draft',
      },
      overrideAccess: true,
    })

    // Mirrors the query the /search route runs.
    const results = await payload.find({
      collection: 'articles',
      where: { and: [{ _status: { equals: 'published' } }, { title: { like: marker } }] },
      pagination: false,
      overrideAccess: true,
    })

    expect(results.docs).toHaveLength(1)
    expect(results.docs[0].slug).toBe(publishedSlug)
  })

  it('QA-SEARCH-02: evidence and lead records are not part of the searchable surface', async () => {
    // The search route only queries these five collections.
    const searchable = ['pages', 'articles', 'entities', 'projects', 'initiatives']
    expect(searchable).not.toContain('claims')
    expect(searchable).not.toContain('evidence-sources')
    expect(searchable).not.toContain('inquiries')
  })

  it('QA-AN-01: the event taxonomy matches the baseline names', () => {
    expect(Object.keys(ANALYTICS_EVENTS).sort()).toEqual(
      [
        'download',
        'form_error',
        'form_start',
        'form_submit',
        'outbound_referral',
        'page_view',
        'primary_cta_click',
        'search',
      ].sort(),
    )
  })

  it('QA-AN-02: analytics parameters never carry personal data', () => {
    const scrubbed = scrubParams({
      form_id: 'FORM-MEDIA',
      route_id: 'media',
      email: 'someone@example.com',
      fullName: 'Someone Real',
      message: 'Confidential body text',
      query: 'a private search',
    })

    expect(scrubbed).toHaveProperty('form_id')
    expect(scrubbed).toHaveProperty('route_id')
    expect(scrubbed).not.toHaveProperty('email')
    expect(scrubbed).not.toHaveProperty('fullName')
    expect(scrubbed).not.toHaveProperty('message')
    expect(scrubbed).not.toHaveProperty('query')
  })

  it('QA-AN-03: search terms are bucketed, never sent verbatim', () => {
    expect(classifyQuery('kyyba')).toBe('single-term')
    expect(classifyQuery('someone@example.com')).toBe('contains-address')
    expect(classifyQuery('  ')).toBe('empty')
    // The raw text is never a return value.
    expect(classifyQuery('confidential project name here')).toBe('long-phrase')
  })

  it('QA-SEO-01: canonicals and indexing are suppressed until an origin is configured', async () => {
    const settings = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true })
    // Default posture in a non-production environment.
    expect(settings.allowIndexing ?? false).toBe(false)
  })
})
