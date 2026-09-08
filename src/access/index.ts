import type { Access, FieldAccess } from 'payload'

import { hasRole, isAdmin, ownedRouteIds, type Role } from './roles'

/**
 * Access functions. These run for REST, GraphQL, Local API calls that pass `req`, and
 * server-side reads — not just admin navigation. Any Local API call made with
 * `overrideAccess: true` bypasses these by design, so operational code paths that act on
 * behalf of a user must pass `{ user, overrideAccess: false }` explicitly.
 */

/** Nobody, including administrators. Used for machine-owned audit records. */
export const noone: Access = () => false

export const anyone: Access = () => true

export const authenticated: Access = ({ req: { user } }) => Boolean(user)

export const adminOnly: Access = ({ req: { user } }) => isAdmin(user)

export function roleAccess(...roles: Role[]): Access {
  return ({ req: { user } }) => isAdmin(user) || hasRole(user, ...roles)
}

export function roleFieldAccess(...roles: Role[]): FieldAccess {
  return ({ req: { user } }) => isAdmin(user) || hasRole(user, ...roles)
}

/**
 * Public read for published content only.
 *
 * Anonymous visitors get a `_status equals published` constraint rather than `true`, so a
 * draft can never leak through the REST/GraphQL API, the search index or a crafted query.
 * Authenticated staff may read drafts (protected preview).
 */
export const publishedOrAuthenticated: Access = ({ req: { user } }) => {
  if (user) return true
  return { _status: { equals: 'published' } }
}

/** Content authoring: editors and above may create/update; publishing is gated separately. */
export const contentWrite: Access = ({ req: { user } }) =>
  isAdmin(user) || hasRole(user, 'editor', 'publisher')

/** Evidence records are owned by reviewers. Editors may read but never approve. */
export const evidenceWrite: Access = ({ req: { user } }) =>
  isAdmin(user) || hasRole(user, 'evidence-reviewer')

export const evidenceRead: Access = ({ req: { user } }) =>
  Boolean(user) && (isAdmin(user) || hasRole(user, 'evidence-reviewer', 'editor', 'publisher', 'qa'))

/**
 * Inquiries: a route owner sees only the routes assigned to them. QA gets read-only.
 * Never public — leads contain personal data.
 */
export const inquiryRead: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdmin(user) || hasRole(user, 'qa')) return true
  if (hasRole(user, 'route-owner')) {
    const routes = ownedRouteIds(user)
    if (routes.length === 0) return false
    return { route: { in: routes } }
  }
  return false
}

export const inquiryUpdate: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdmin(user)) return true
  if (hasRole(user, 'route-owner')) {
    const routes = ownedRouteIds(user)
    if (routes.length === 0) return false
    return { route: { in: routes } }
  }
  return false
}
