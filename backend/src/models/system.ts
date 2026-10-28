import { defineModel } from './base'

/** Legacy-URL decisions applied by the frontend proxy (301/302/410). */
export const Redirect = defineModel('redirects', {
  fromPath: { type: String, required: true },
  decision: { type: String, default: 'undecided' },
  toPath: String,
  evidence: String,
})

export const RateLimitBucket = defineModel('rate-limit-buckets', {
  key: { type: String, required: true },
  count: { type: Number, default: 0 },
  windowStart: Date,
  expiresAt: Date,
})

export const AuditEvent = defineModel('audit-events', {
  event: { type: String, required: true },
  subjectCollection: String,
  subjectId: String,
  actor: String,
  detail: String,
  occurredAt: { type: Date, required: true },
})

/**
 * Staff accounts for the admin panel (created by Payload originally; same documents, same
 * password hashes). `hash`, `salt`, `loginAttempts` and `lockUntil` never leave the backend.
 */
export const User = defineModel('users', {
  name: String,
  email: { type: String, lowercase: true, trim: true },
  /** Optional login name (WordPress-style); login accepts this or the email. */
  username: { type: String, lowercase: true, trim: true },
  roles: [String],
  assignedRoutes: [String],
  hash: String,
  salt: String,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  /** Sessions issued before this are signed out. */
  passwordChangedAt: Date,
  /** "Lost your password?" one-time code (keyed hash only). */
  resetOtpHash: String,
  resetOtpExpiresAt: Date,
  resetOtpAttempts: Number,
  resetOtpSentAt: Date,
})

/**
 * Site-wide singletons (`site-settings`, `navigation`, `footer`), one document each in the
 * `globals` collection, told apart by `globalType`.
 */
export const Global = defineModel('globals', {
  globalType: { type: String, required: true },
})
