import { describe, expect, it } from 'vitest'

import { customPathProblem, isCustomPage, normalizePagePath } from '../src/lib/pages/custom-path'

describe('custom page paths', () => {
  it('normalises titles and typed paths', () => {
    expect(normalizePagePath('Speaking Fees & Terms')).toBe('/speaking-fees-terms')
    expect(normalizePagePath(' /Events/2027 Summit/ ')).toBe('/events/2027-summit')
    expect(normalizePagePath('')).toBe('/')
  })

  it('rejects empty paths and built-in sections', () => {
    expect(customPathProblem('/')).toMatch(/Set a path/)
    expect(customPathProblem('/about/team')).toMatch(/built-in/)
    expect(customPathProblem('/admin')).toMatch(/built-in/)
    expect(customPathProblem('/ideas')).toMatch(/built-in/)
    expect(customPathProblem('/speaking-fees')).toBeNull()
  })

  it('tells custom pages from built-in ones', () => {
    expect(isCustomPage({ pageId: 'ABOUT' })).toBe(false)
    expect(isCustomPage({ pageId: null })).toBe(true)
    expect(isCustomPage({})).toBe(true)
  })
})
