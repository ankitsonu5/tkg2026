import { APIError, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'

import { evaluatePublicationGate, formatViolations, type GateSubject } from './gate'

/**
 * Rejects a publish attempt that fails the evidence gate, with corrective detail.
 *
 * Applied as `beforeChange`, so it runs before anything is written for create and update,
 * through admin, REST, GraphQL and non-overridden Local API calls alike.
 */
export const enforcePublicationGate: CollectionBeforeChangeHook = async ({
  data,
  req,
  originalDoc,
  collection,
}) => {
  const nextStatus = (data as { _status?: string })._status ?? (originalDoc as { _status?: string } | undefined)?._status

  // Drafts are always allowed. The gate exists to keep unverified material out of public
  // view, not to block editorial work in progress.
  if (nextStatus !== 'published') return data

  // Merge so a partial update is judged on the resulting document, not just the patch.
  const subject: GateSubject = { ...(originalDoc ?? {}), ...(data ?? {}) } as GateSubject

  const result = await evaluatePublicationGate({ payload: req.payload, doc: subject, req })

  if (!result.ok) {
    throw new APIError(
      `Publication blocked by the evidence gate for ${collection.slug}. ` +
        `${result.violations.length} condition(s) must be resolved before this content can be published:\n` +
        formatViolations(result.violations),
      // 422: the request was understood but the content is not in a publishable state.
      422,
      { violations: result.violations },
      true,
    )
  }

  return data
}

/** Collections whose documents can appear publicly and therefore carry the gate. */
export function withPublicationGate(config: CollectionConfig): CollectionConfig {
  return {
    ...config,
    hooks: {
      ...config.hooks,
      beforeChange: [...(config.hooks?.beforeChange ?? []), enforcePublicationGate],
    },
  }
}
