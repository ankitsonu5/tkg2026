import { defineModel, Mixed, ref } from './base'

/** Inquiry route configuration: owners, recipients and SLA per Connect route. */
export const InquiryRoute = defineModel('inquiry-routes', {
  routeId: { type: String, required: true },
  label: String,
  ownerRole: String,
  minimumQualification: String,
  slaHours: Number,
  slaClock: { type: String, default: 'elapsed' },
  slaTimezone: { type: String, default: 'America/Detroit' },
  primaryRecipient: String,
  backupRecipient: String,
  acceptanceStatus: { type: String, default: 'unassigned' },
  acceptedBy: String,
  acceptedAt: Date,
  escalationCriterion: String,
  escalatesToTel: { type: Boolean, default: true },
  enabled: { type: Boolean, default: true },
})

/** A lead submitted through a Connect form. */
export const Inquiry = defineModel('inquiries', {
  reference: { type: String, required: true },
  idempotencyKey: String,
  route: { type: String, required: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  qualification: Mixed,
  deliveryState: { type: String, default: 'stored' },
  workState: { type: String, default: 'new' },
  slaDueAt: Date,
  acknowledgedAt: Date,
  respondedAt: Date,
  escalatedAt: Date,
  escalationReason: String,
  attribution: {
    sourcePage: String,
    entryPage: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmTerm: String,
    utmContent: String,
    attributionState: { type: String, default: 'unattributed' },
  },
  consent: {
    privacyAccepted: { type: Boolean, default: false },
    policyVersion: String,
    consentedAt: Date,
    analyticsConsent: { type: Boolean, default: false },
    marketingOptIn: { type: Boolean, default: false },
  },
  internalNotes: String,
})

/** One outbound email for an inquiry (owner, backup or sender acknowledgement), with retries. */
export const DeliveryAttempt = defineModel('delivery-attempts', {
  inquiry: { ...ref('inquiries'), required: true },
  route: { type: String, required: true },
  recipientKind: String,
  recipient: { type: String, required: true },
  state: { type: String, default: 'queued' },
  attemptCount: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  nextAttemptAt: Date,
  lastError: String,
  providerMessageId: String,
  sentAt: Date,
  bounceState: { type: String, default: 'none' },
})

/** Double opt-in newsletter subscriptions. */
export const NewsletterSubscription = defineModel('newsletter-subscriptions', {
  email: { type: String, required: true },
  state: { type: String, default: 'pending-confirmation' },
  confirmationToken: String,
  confirmationExpiresAt: Date,
  confirmationSentAt: Date,
  confirmationMessageId: String,
  consentedAt: Date,
  policyVersion: String,
  confirmedAt: Date,
  unsubscribedAt: Date,
  sourcePage: String,
})
