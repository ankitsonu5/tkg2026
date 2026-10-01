import type { User } from '@/payload-types'

/**
 * Proposed role model (developer handoff §5). One user may hold several explicit roles.
 *
 * Deliberate constraint: `administrator` grants operational reach but must NOT be a way to
 * bypass the factual publication gate by ordinary editing. The gate in
 * src/lib/evidence/gate.ts is applied regardless of role.
 */
export const ROLES = [
  'administrator',
  'editor',
  'evidence-reviewer',
  'publisher',
  'route-owner',
  'qa',
] as const

export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  administrator: 'Administrator — user, settings and system administration',
  editor: 'Editor — edits assigned content only; cannot approve evidence or publish',
  'evidence-reviewer': 'Evidence Reviewer — verifies claims, sources, rights and assets',
  publisher: 'Publisher — publishes content that passes the server-enforced gate',
  'route-owner': 'Route Owner — sees and works assigned inquiry routes only',
  qa: 'QA — read-only access for acceptance evidence',
}

type MaybeUser = Partial<User> | null | undefined

export function rolesOf(user: MaybeUser): Role[] {
  if (!user || !Array.isArray(user.roles)) return []
  return user.roles.filter((r): r is Role => (ROLES as readonly string[]).includes(r as string))
}

export function hasRole(user: MaybeUser, ...roles: Role[]): boolean {
  const held = rolesOf(user)
  return roles.some((r) => held.includes(r))
}

export function isAdmin(user: MaybeUser): boolean {
  return hasRole(user, 'administrator')
}

/** Route IDs this user owns. Empty for everyone except route owners and administrators. */
export function ownedRouteIds(user: MaybeUser): string[] {
  if (!user) return []
  const assigned = (user as { assignedRoutes?: unknown }).assignedRoutes
  if (!Array.isArray(assigned)) return []
  return assigned.filter((r): r is string => typeof r === 'string')
}
