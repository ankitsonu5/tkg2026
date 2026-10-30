import { evaluatePublicationGate, formatViolations } from '../lib/evidence/gate'
import { routeReadinessProblems } from '../lib/inquiries/routing-readiness'
import { customPathProblem, isCustomPage } from '../lib/pages/custom-path'
import type { CollectionSlug } from '../models'
import type { DataClient } from './client'

/**
 * Write rules that used to live in Payload collection hooks. They run inside the data
 * client, so every writer (API routes, scripts, the future admin panel) is held to them.
 */

export class WriteRejectedError extends Error {
  status = 422
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
  }
}

/** Collections whose documents can appear publicly and therefore carry the evidence gate. */
const GATED = new Set<CollectionSlug>(['pages', 'articles', 'entities', 'projects', 'initiatives', 'downloads'])

/**
 * @param candidate the document as it will look after the write (stored doc merged with the
 *   change), so a partial update is judged on the result, not just the patch.
 */
export async function beforeWrite(db: DataClient, collection: CollectionSlug, candidate: Record<string, unknown>): Promise<void> {
  // FR-ROUTE-01: a route cannot be ACCEPTED for production until a named owner and backup
  // are configured and the owner has acknowledged in writing.
  if (collection === 'inquiry-routes' && candidate.acceptanceStatus === 'accepted') {
    const problems = routeReadinessProblems({ ...candidate, enabled: true } as Parameters<typeof routeReadinessProblems>[0])
    if (problems.length > 0) {
      throw new WriteRejectedError(`A route cannot be accepted for production: ${problems.join('; ')}.`)
    }
  }

  // Custom pages are served at their own path, which must be free and must not shadow a built-in route.
  if (collection === 'pages' && isCustomPage(candidate)) {
    const path = String(candidate.path ?? '')
    const problem = customPathProblem(path)
    if (problem) throw new WriteRejectedError(problem)
    const taken = await db.find({ collection: 'pages', where: { path: { equals: path } }, limit: 2, depth: 0, pagination: false })
    if (taken.docs.some((d) => String(d.id) !== String(candidate.id ?? ''))) throw new WriteRejectedError(`Another page already uses the path ${path}.`)
  }

  // Section 9 publication gate. Drafts are always allowed: the gate keeps unverified material
  // out of public view, it does not block editorial work in progress.
  if (GATED.has(collection) && candidate._status === 'published') {
    const result = await evaluatePublicationGate({ db, doc: candidate })
    if (!result.ok) {
      throw new WriteRejectedError(
        `Publication blocked by the evidence gate for ${collection}. ` +
          `${result.violations.length} condition(s) must be resolved before this content can be published:\n` +
          formatViolations(result.violations),
        { violations: result.violations },
      )
    }
  }
}
