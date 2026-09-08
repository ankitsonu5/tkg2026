import type { Payload } from 'payload'

import { evaluatePublicationGate } from './gate'

/**
 * Re-checks ALREADY PUBLISHED content against the evidence gate.
 *
 * A one-time publish check is insufficient: a claim's review date passes, a licence
 * expires, or a reviewer withdraws a source. This sweep finds published documents that no
 * longer pass, reverts them to draft, records an audit event and invalidates public caches.
 */

export const GATED_COLLECTIONS = ['pages', 'articles', 'entities', 'projects', 'initiatives', 'downloads'] as const
export type GatedCollection = (typeof GATED_COLLECTIONS)[number]

export interface RecheckFinding {
  collection: GatedCollection
  id: string | number
  title: string
  violations: { code: string; ref: string; message: string }[]
}

export async function findPublishedViolations(payload: Payload): Promise<RecheckFinding[]> {
  const findings: RecheckFinding[] = []

  for (const collection of GATED_COLLECTIONS) {
    const published = await payload.find({
      collection,
      where: { _status: { equals: 'published' } },
      depth: 0,
      pagination: false,
      limit: 0,
      overrideAccess: true,
    })

    for (const doc of published.docs) {
      const result = await evaluatePublicationGate({ payload, doc: doc as never })
      if (!result.ok) {
        findings.push({
          collection,
          id: doc.id,
          title: String((doc as { title?: unknown }).title ?? doc.id),
          violations: result.violations,
        })
      }
    }
  }

  return findings
}

/**
 * Withdraw affected content safely by reverting it to draft.
 *
 * `dryRun` is the default so the sweep can be reported on before it changes public state.
 */
export async function recheckAndWithdraw(
  payload: Payload,
  opts: { dryRun?: boolean } = {},
): Promise<{ findings: RecheckFinding[]; withdrawn: RecheckFinding[] }> {
  const dryRun = opts.dryRun ?? true
  const findings = await findPublishedViolations(payload)
  const withdrawn: RecheckFinding[] = []

  if (dryRun) return { findings, withdrawn }

  for (const finding of findings) {
    await payload.update({
      collection: finding.collection,
      id: finding.id,
      data: { _status: 'draft' },
      // The gate's beforeChange hook allows a move to draft, so this cannot deadlock.
      overrideAccess: true,
      context: { skipRevalidate: false },
    })

    await payload.create({
      collection: 'audit-events',
      data: {
        event: 'evidence.withdrawn',
        subjectCollection: finding.collection,
        subjectId: String(finding.id),
        detail: `Reverted to draft by the evidence re-check sweep. Violations: ${finding.violations
          .map((v) => v.code)
          .join(', ')}`,
        occurredAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })

    withdrawn.push(finding)
  }

  return { findings, withdrawn }
}
