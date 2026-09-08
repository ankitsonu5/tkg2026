import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'

let cached: Payload | null = null

export async function testPayload(): Promise<Payload> {
  if (!cached) cached = await getPayload({ config })
  return cached
}

/** Unique suffix so parallel or repeated runs never collide on unique fields. */
export function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function createReadyClaim(payload: Payload, overrides: Record<string, unknown> = {}) {
  const source = await payload.create({
    collection: 'evidence-sources',
    data: {
      title: uid('source'),
      sourceType: 'corporate-record',
      strength: 'authoritative',
      dated: new Date('2020-01-01').toISOString(),
    },
    overrideAccess: true,
  })

  return payload.create({
    collection: 'claims',
    data: {
      claimId: uid('CLAIM'),
      exactWording: 'Approved and verifiable statement.',
      riskLevel: 'material',
      verificationOwnerRole: 'Business Owner',
      riskReviewerRole: 'Legal',
      status: 'ready',
      approvedWording: 'Approved and verifiable statement.',
      approvalDate: new Date().toISOString(),
      // Review date well in the future so the claim is not expired.
      reviewDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      sources: [source.id],
      ...overrides,
    },
    overrideAccess: true,
  })
}

export async function createBlockedClaim(payload: Payload) {
  return payload.create({
    collection: 'claims',
    data: {
      claimId: uid('CLAIM-BLOCKED'),
      exactWording: 'Kyyba has 700+ employees.',
      riskLevel: 'material',
      verificationOwnerRole: 'Business Owner',
      riskReviewerRole: 'Legal',
      status: 'blocked',
      blockingReason: 'Not scoped or dated; requires a dated HR/operations report.',
    },
    overrideAccess: true,
  })
}

/**
 * Smallest valid PNG, for exercising the upload-backed asset register without shipping a
 * binary fixture into the repository.
 */
export function onePixelPng() {
  const data = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  return { data, mimetype: 'image/png', name: `${uid('pixel')}.png`, size: data.byteLength }
}
