import { describe, it, expect, beforeAll } from 'vitest'
import type { Payload } from 'payload'

import { testPayload, uid, createReadyClaim, createBlockedClaim, onePixelPng } from './helpers'
import { evaluatePublicationGate } from '@/lib/evidence/gate'

/**
 * QA-GATE-* : the publication gate is the baseline's central factual control.
 * These tests prove it blocks at WRITE time, for every role, and re-checks after publication.
 */
describe('Publication gate (baseline Section 9)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await testPayload()
  })

  it('QA-GATE-01: blocks publishing an article that cites an unapproved claim', async () => {
    const blocked = await createBlockedClaim(payload)

    const draft = await payload.create({
      collection: 'articles',
      data: {
        title: 'Article citing an unverified metric',
        slug: uid('unverified'),
        topic: 'enterprise',
        authorshipStatus: 'authored',
        ownerRole: 'Editorial Lead',
        claims: [blocked.id],
        _status: 'draft',
      },
      overrideAccess: true,
    })

    // Drafting is allowed; publishing is not.
    await expect(
      payload.update({
        collection: 'articles',
        id: draft.id,
        data: { _status: 'published' },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/Publication blocked by the evidence gate/)
  })

  it('QA-GATE-02: the rejection names the specific corrective conditions', async () => {
    const blocked = await createBlockedClaim(payload)
    const draft = await payload.create({
      collection: 'articles',
      data: {
        title: 'Article with corrective detail',
        slug: uid('corrective'),
        topic: 'enterprise',
        authorshipStatus: 'authored',
        ownerRole: 'Editorial Lead',
        claims: [blocked.id],
        _status: 'draft',
      },
      overrideAccess: true,
    })

    let message = ''
    try {
      await payload.update({
        collection: 'articles',
        id: draft.id,
        data: { _status: 'published' },
        overrideAccess: true,
      })
    } catch (error) {
      message = (error as Error).message
    }

    expect(message).toContain('CLAIM_NOT_READY')
    expect(message).toContain('CLAIM_MISSING_SOURCE')
    // Says what to do, not merely that it failed.
    expect(message).toMatch(/claim lifecycle/i)
  })

  it('QA-GATE-03: an administrator cannot bypass the gate by ordinary editing', async () => {
    const admin = await payload.create({
      collection: 'users',
      data: {
        email: `${uid('admin')}@localhost.test`,
        name: 'Gate Bypass Attempt',
        roles: ['administrator', 'publisher'],
        password: 'test-password-not-a-secret',
      },
      overrideAccess: true,
    })

    const blocked = await createBlockedClaim(payload)
    const draft = await payload.create({
      collection: 'articles',
      data: {
        title: 'Administrator publish attempt',
        slug: uid('admin-attempt'),
        topic: 'enterprise',
        authorshipStatus: 'authored',
        ownerRole: 'Editorial Lead',
        claims: [blocked.id],
        _status: 'draft',
      },
      overrideAccess: true,
    })

    await expect(
      payload.update({
        collection: 'articles',
        id: draft.id,
        data: { _status: 'published' },
        // Full admin identity, access control honoured - the gate still refuses.
        user: admin,
        overrideAccess: false,
      }),
    ).rejects.toThrow(/evidence gate/)
  })

  it('QA-GATE-04: publishes when every linked claim is Ready with approved wording and a source', async () => {
    const ready = await createReadyClaim(payload)

    const draft = await payload.create({
      collection: 'articles',
      data: {
        title: 'Fully evidenced article',
        slug: uid('evidenced'),
        topic: 'enterprise',
        authorshipStatus: 'authored',
        ownerRole: 'Editorial Lead',
        claims: [ready.id],
        _status: 'draft',
      },
      overrideAccess: true,
    })

    const published = await payload.update({
      collection: 'articles',
      id: draft.id,
      data: { _status: 'published' },
      overrideAccess: true,
    })

    expect(published._status).toBe('published')
  })

  it('QA-GATE-05: an unresolved entity relationship status blocks publication', async () => {
    const ready = await createReadyClaim(payload)

    const draft = await payload.create({
      collection: 'entities',
      data: {
        name: 'Entity with unsettled relationship',
        slug: uid('entity'),
        // Default is 'unresolved'; the baseline forbids publishing this.
        relationshipStatus: 'unresolved',
        ownerRole: 'Editorial Lead',
        claims: [ready.id],
        _status: 'draft',
      },
      overrideAccess: true,
    })

    await expect(
      payload.update({ collection: 'entities', id: draft.id, data: { _status: 'published' }, overrideAccess: true }),
    ).rejects.toThrow(/STATUS_UNRESOLVED|unresolved/)
  })

  it('QA-GATE-06: expired evidence is caught on already-published content, not only at publish time', async () => {
    const ready = await createReadyClaim(payload)

    const doc = await payload.create({
      collection: 'articles',
      data: {
        title: 'Article whose evidence later expires',
        slug: uid('expiring'),
        topic: 'enterprise',
        authorshipStatus: 'authored',
        ownerRole: 'Editorial Lead',
        claims: [ready.id],
        _status: 'published',
      },
      overrideAccess: true,
    })
    expect(doc._status).toBe('published')

    // Evidence expires AFTER publication.
    await payload.update({
      collection: 'claims',
      id: ready.id,
      data: { reviewDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
      overrideAccess: true,
    })

    const fresh = await payload.findByID({ collection: 'articles', id: doc.id, depth: 0, overrideAccess: true })
    const result = await evaluatePublicationGate({ payload, doc: fresh as never })

    expect(result.ok).toBe(false)
    expect(result.violations.map((v) => v.code)).toContain('CLAIM_EVIDENCE_EXPIRED')
  })

  it('QA-GATE-07: an asset without alt text or cleared rights blocks publication', async () => {
    const asset = await payload.create({
      collection: 'assets',
      data: {
        assetId: uid('AST'),
        rightsStatus: 'unverified',
        decorative: false,
        // No alt text supplied.
      },
      file: onePixelPng(),
      overrideAccess: true,
    })

    const draft = await payload.create({
      collection: 'articles',
      data: {
        title: 'Article using an uncleared image',
        slug: uid('uncleared'),
        topic: 'culture',
        authorshipStatus: 'authored',
        ownerRole: 'Editorial Lead',
        assets: [asset.id],
        _status: 'draft',
      },
      overrideAccess: true,
    })

    let message = ''
    try {
      await payload.update({
        collection: 'articles',
        id: draft.id,
        data: { _status: 'published' },
        overrideAccess: true,
      })
    } catch (error) {
      message = (error as Error).message
    }

    expect(message).toContain('ASSET_RIGHTS_NOT_CLEARED')
    expect(message).toContain('ASSET_MISSING_ALT_TEXT')
  })
})
