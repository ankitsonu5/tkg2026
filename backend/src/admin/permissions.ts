import type { CollectionSlug } from '../models'

/**
 * Role model (developer handoff §5), unchanged from the Payload era. One user may hold
 * several roles. `administrator` has operational reach but can NOT bypass the evidence gate:
 * that is enforced in the data layer for every writer.
 */
export const ROLES = ['administrator', 'editor', 'evidence-reviewer', 'publisher', 'route-owner', 'qa'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  administrator: 'Administrator — users, settings and system administration',
  editor: 'Editor — writes content; cannot approve evidence or publish',
  'evidence-reviewer': 'Evidence Reviewer — verifies claims, sources, rights and assets',
  publisher: 'Publisher — publishes content that passes the evidence gate',
  'route-owner': 'Route Owner — works the inquiry routes assigned to them',
  qa: 'QA — read-only access for acceptance evidence',
}

type RoleSet = readonly Role[] | 'staff' | 'nobody'

interface CollectionAccess {
  read: RoleSet
  create: RoleSet
  update: RoleSet
  delete: RoleSet
}

const CONTENT: CollectionAccess = {
  read: 'staff',
  create: ['editor', 'publisher'],
  update: ['editor', 'publisher'],
  delete: ['publisher'],
}

/** Who may do what, per collection. Administrators are always allowed (except "nobody"). */
export const ACCESS: Record<CollectionSlug, CollectionAccess> = {
  pages: CONTENT,
  articles: CONTENT,
  entities: CONTENT,
  projects: CONTENT,
  initiatives: CONTENT,
  downloads: CONTENT,
  assets: { read: 'staff', create: ['editor', 'publisher', 'evidence-reviewer'], update: ['editor', 'publisher', 'evidence-reviewer'], delete: ['evidence-reviewer'] },
  claims: { read: ['evidence-reviewer', 'editor', 'publisher', 'qa'], create: ['evidence-reviewer'], update: ['evidence-reviewer'], delete: ['evidence-reviewer'] },
  'evidence-sources': { read: ['evidence-reviewer', 'editor', 'publisher', 'qa'], create: ['evidence-reviewer'], update: ['evidence-reviewer'], delete: ['evidence-reviewer'] },
  inquiries: { read: ['route-owner', 'qa'], create: 'nobody', update: ['route-owner'], delete: [] },
  'delivery-attempts': { read: ['qa'], create: 'nobody', update: 'nobody', delete: 'nobody' },
  'newsletter-subscriptions': { read: ['qa'], create: [], update: [], delete: [] },
  'inquiry-routes': { read: ['route-owner', 'qa'], create: [], update: [], delete: [] },
  redirects: { read: ['qa'], create: [], update: [], delete: [] },
  'audit-events': { read: ['qa'], create: 'nobody', update: 'nobody', delete: 'nobody' },
  'rate-limit-buckets': { read: [], create: 'nobody', update: 'nobody', delete: [] },
  users: { read: [], create: [], update: [], delete: [] },
}

export type Action = keyof CollectionAccess

export function isAdmin(roles: readonly Role[]): boolean {
  return roles.includes('administrator')
}

export function can(roles: readonly Role[], collection: CollectionSlug, action: Action): boolean {
  const rule = ACCESS[collection][action]
  if (rule === 'nobody') return false
  if (isAdmin(roles)) return true
  if (rule === 'staff') return roles.length > 0
  return rule.some((r) => roles.includes(r))
}

/** May set `_status: 'published'` (still subject to the evidence gate). */
export function canPublish(roles: readonly Role[]): boolean {
  return isAdmin(roles) || roles.includes('publisher')
}

/**
 * Fields only certain roles may change. A change to one of these by anyone else is refused
 * (not silently dropped), so the editor sees why.
 */
export const PRIVILEGED_FIELDS: Partial<Record<CollectionSlug, Record<string, readonly Role[]>>> = {
  pages: { pageId: [] },
  assets: { rightsStatus: ['evidence-reviewer'] },
  claims: { status: ['evidence-reviewer'], approvedWording: ['evidence-reviewer'], approvalDate: ['evidence-reviewer'] },
  users: { roles: [], assignedRoutes: [] },
}

/** Inquiry fields a route owner works; everything else on a lead is a record of what was sent. */
export const INQUIRY_WORK_FIELDS = new Set([
  'workState',
  'acknowledgedAt',
  'respondedAt',
  'escalatedAt',
  'escalationReason',
  'internalNotes',
  'route',
])

/** Never returned by the admin API. */
export const SECRET_FIELDS = new Set([
  'hash',
  'salt',
  'sessions',
  'loginAttempts',
  'lockUntil',
  'resetPasswordToken',
  'resetPasswordExpiration',
  'resetOtpHash',
  'resetOtpExpiresAt',
  'resetOtpAttempts',
  'resetOtpSentAt',
  'passwordChangedAt',
])
