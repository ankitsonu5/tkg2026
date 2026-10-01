import { APIError, type CollectionBeforeOperationHook } from 'payload'

import { hasRole, isAdmin, type Role } from './roles'

/**
 * Loud rejection of unauthorized privileged-field changes.
 *
 * Payload's field-level `access` silently STRIPS a field the user may not write: the
 * operation succeeds and the field is simply unchanged. That is safe but dishonest - an
 * editor who tried to approve a claim would see a successful save and reasonably believe the
 * claim is now Ready.
 *
 * For a governance-critical control that is not acceptable, so these guards reject the
 * request outright with a 403 naming the role that owns the decision. Field-level access
 * stays in place underneath as defence in depth.
 *
 * This runs as `beforeOperation`, which is the only hook that sees the caller's raw incoming
 * data: by the time `beforeValidate` runs, unauthorized fields have already been removed
 * (verified empirically against Payload 3.88 - the hook received an empty object).
 */
export function guardPrivilegedFields(args: {
  fields: string[]
  allowedRoles: Role[]
  message: string
}): CollectionBeforeOperationHook {
  return async ({ args: operationArgs, operation, req, collection }) => {
    if (operation !== 'create' && operation !== 'update') return operationArgs

    const user = req.user
    // Unauthenticated requests are already refused by collection-level access.
    if (!user) return operationArgs
    if (isAdmin(user) || hasRole(user, ...args.allowedRoles)) return operationArgs

    const data = (operationArgs as { data?: Record<string, unknown> }).data
    if (!data) return operationArgs

    const present = args.fields.filter((field) => field in data)
    if (present.length === 0) return operationArgs

    // On update, compare against the stored document so that resubmitting an unchanged
    // value (as the admin UI does when saving a whole form) is not treated as an attempt.
    let attempted = present
    const id = (operationArgs as { id?: string | number }).id

    if (operation === 'update' && id !== undefined) {
      const original = await req.payload
        .findByID({ collection: collection.slug as never, id, depth: 0, overrideAccess: true })
        .catch(() => null)

      if (original) {
        attempted = present.filter((field) => {
          const next = data[field]
          const current = (original as Record<string, unknown>)[field]
          return JSON.stringify(next ?? null) !== JSON.stringify(current ?? null)
        })
      }
    }

    if (attempted.length > 0) {
      throw new APIError(
        `${args.message} Attempted to change: ${attempted.join(', ')}.`,
        403,
        undefined,
        true,
      )
    }

    return operationArgs
  }
}
