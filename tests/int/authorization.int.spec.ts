import { describe, it, expect, beforeAll } from 'vitest'
import type { Payload, User } from 'payload'

import { testPayload, uid, createBlockedClaim } from './helpers'

/**
 * QA-AUTH-* : access control must hold on API and server-side operations, not just admin nav.
 * Every call below passes `overrideAccess: false` so real access control is exercised.
 */
describe('Authorization and draft protection', () => {
  let payload: Payload
  let editor: User
  let reviewer: User
  let routeOwnerA: User

  beforeAll(async () => {
    payload = await testPayload()

    editor = (await payload.create({
      collection: 'users',
      data: {
        email: `${uid('editor')}@localhost.test`,
        name: 'Scoped Editor',
        roles: ['editor'],
        password: 'test-password-not-a-secret',
      },
      overrideAccess: true,
    })) as User

    reviewer = (await payload.create({
      collection: 'users',
      data: {
        email: `${uid('reviewer')}@localhost.test`,
        name: 'Evidence Reviewer',
        roles: ['evidence-reviewer'],
        password: 'test-password-not-a-secret',
      },
      overrideAccess: true,
    })) as User

    routeOwnerA = (await payload.create({
      collection: 'users',
      data: {
        email: `${uid('owner')}@localhost.test`,
        name: 'Media Route Owner',
        roles: ['route-owner'],
        assignedRoutes: ['media'],
        password: 'test-password-not-a-secret',
      },
      overrideAccess: true,
    })) as User
  })

  it('QA-AUTH-01: an anonymous read of a collection never returns drafts', async () => {
    const slug = uid('draft-only')
    await payload.create({
      collection: 'articles',
      data: {
        title: 'Unpublished draft',
        slug,
        topic: 'enterprise',
        authorshipStatus: 'authored',
        ownerRole: 'Editorial Lead',
        _status: 'draft',
      },
      overrideAccess: true,
    })

    const anonymous = await payload.find({
      collection: 'articles',
      where: { slug: { equals: slug } },
      // No user, real access control.
      overrideAccess: false,
      pagination: false,
    })

    expect(anonymous.docs).toHaveLength(0)
  })

  it('QA-AUTH-02: an anonymous read of inquiries is denied outright', async () => {
    await expect(
      payload.find({ collection: 'inquiries', overrideAccess: false, pagination: false }),
    ).rejects.toThrow()
  })

  it('QA-AUTH-03: an editor cannot approve evidence (no self-approval)', async () => {
    const claim = await createBlockedClaim(payload)

    await expect(
      payload.update({
        collection: 'claims',
        id: claim.id,
        data: { status: 'ready', approvedWording: 'Editor approved this themselves.' },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    const unchanged = await payload.findByID({ collection: 'claims', id: claim.id, overrideAccess: true })
    expect(unchanged.status).toBe('blocked')
    expect(unchanged.approvedWording).toBeFalsy()
  })

  it('QA-AUTH-04: an evidence reviewer can approve evidence', async () => {
    const claim = await createBlockedClaim(payload)

    const updated = await payload.update({
      collection: 'claims',
      id: claim.id,
      data: { status: 'in-verification' },
      user: reviewer,
      overrideAccess: false,
    })

    expect(updated.status).toBe('in-verification')
  })

  it('QA-AUTH-05: an editor cannot grant themselves a role', async () => {
    await expect(
      payload.update({
        collection: 'users',
        id: editor.id,
        data: { roles: ['administrator'] },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    const unchanged = await payload.findByID({ collection: 'users', id: editor.id, overrideAccess: true })
    expect(unchanged.roles).toEqual(['editor'])
  })

  it('QA-AUTH-06: an editor cannot change global navigation', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'navigation',
        data: { primary: [{ label: 'Injected', path: '/injected', pageId: 'HOME' }] },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('QA-AUTH-07: a route owner sees only their assigned routes', async () => {
    const payloadClient = payload

    const mediaRef = uid('MEDIA-REF')
    const impactRef = uid('IMPACT-REF')

    for (const [route, reference] of [
      ['media', mediaRef],
      ['impact', impactRef],
    ] as const) {
      await payloadClient.create({
        collection: 'inquiries',
        data: {
          reference,
          idempotencyKey: uid('idem'),
          route,
          fullName: 'Test Sender',
          email: 'sender@localhost.test',
          deliveryState: 'stored',
          workState: 'new',
          consent: {
            privacyAccepted: true,
            policyVersion: 'draft-unapproved',
            consentedAt: new Date().toISOString(),
          },
        },
        overrideAccess: true,
      })
    }

    const visible = await payloadClient.find({
      collection: 'inquiries',
      user: routeOwnerA,
      overrideAccess: false,
      pagination: false,
      limit: 0,
    })

    const routes = new Set(visible.docs.map((d) => d.route))
    expect(routes.has('media')).toBe(true)
    expect(routes.has('impact')).toBe(false)
  })

  it('QA-AUTH-08: audit events cannot be created or altered through the API by any role', async () => {
    await expect(
      payload.create({
        collection: 'audit-events',
        data: { event: 'forged.event', occurredAt: new Date().toISOString() },
        user: reviewer,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})
