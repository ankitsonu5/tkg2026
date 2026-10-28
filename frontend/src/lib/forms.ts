import { backendFetch } from './api'

/**
 * Form write paths. The work (validation, rate limiting, storage, email delivery) happens in
 * the backend; these helpers forward the visitor's input from the server actions. The outcome
 * types are the contract the form components render from.
 */

export interface FieldError {
  field: string
  errorClass: 'required' | 'format' | 'length' | 'unknown-option' | 'protocol'
  message: string
}

export type NewsletterOptInStatus = 'confirmation-sent' | 'already-subscribed' | 'failed'

/**
 * Delivery contract: SUCCESS only for `delivered`, an honest PENDING for `pending`, and a
 * recoverable ERROR with the reference for `failed`. A database insert alone is never
 * reported as success.
 */
export type SubmitOutcome =
  | { status: 'success'; reference: string; deliveryState: 'delivered'; slaHours: number; slaDueAt: string; newsletter?: NewsletterOptInStatus }
  | { status: 'pending'; reference: string; deliveryState: 'pending'; slaHours: number; slaDueAt: string; newsletter?: NewsletterOptInStatus }
  | { status: 'failed'; reference: string; message: string }
  | { status: 'invalid'; errors: FieldError[] }
  | { status: 'rate-limited'; retryAfterSeconds: number }
  | { status: 'route-unavailable'; message: string }

export type NewsletterOutcome =
  | { status: 'success' }
  | { status: 'already-subscribed' }
  | { status: 'invalid'; message: string }
  | { status: 'rate-limited'; retryAfterSeconds: number }
  | { status: 'failed'; message: string }

export interface InquiryRouteStatus {
  routeId: string
  enabled: boolean
  productionReady: boolean
}

export interface InquiryInput {
  routeId: string
  values: Record<string, unknown>
  sourcePage: string
  entryPage: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm: string
  utmContent: string
  analyticsConsent: boolean
  privacyAccepted: boolean
  marketingOptIn: boolean
  idempotencyKey: string
  /** Visitor IP, used only for a salted rate-limit bucket. */
  clientIdentifier: string
}

export function getInquiryRouteStatus(): Promise<InquiryRouteStatus[]> {
  return backendFetch<InquiryRouteStatus[]>('/inquiry-routes/status')
}

export function submitInquiry(input: InquiryInput): Promise<SubmitOutcome> {
  return backendFetch<SubmitOutcome>('/inquiries', { method: 'POST', body: input })
}

export function subscribeToNewsletter(input: {
  email: string
  sourcePage: string
  privacyAccepted: boolean
  clientIdentifier: string
}): Promise<NewsletterOutcome> {
  return backendFetch<NewsletterOutcome>('/newsletter/subscribe', { method: 'POST', body: input })
}

export async function confirmNewsletterSubscription(token: string): Promise<boolean> {
  const { confirmed } = await backendFetch<{ confirmed: boolean }>('/newsletter/confirm', { method: 'POST', body: { token } })
  return confirmed
}
