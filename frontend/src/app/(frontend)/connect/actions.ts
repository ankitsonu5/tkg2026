'use server'

import { headers } from 'next/headers'

import { submitInquiry, type SubmitOutcome } from '@/lib/forms'

/**
 * Server action for the Connect forms. Forwards the submission to the backend, which
 * validates, stores and delivers it (emails go out after the response, so the visitor is not
 * kept waiting on SMTP).
 *
 * The client identifier is derived from request headers for rate limiting only; the raw
 * value never reaches the database (the backend salts and hashes it).
 */
export async function submitInquiryAction(formData: FormData): Promise<SubmitOutcome> {
  const headerList = await headers()

  const routeId = String(formData.get('routeId') ?? '')

  const values: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('field.') && typeof value === 'string') {
      values[key.slice('field.'.length)] = value
    }
  }

  const forwarded = headerList.get('x-forwarded-for') ?? ''
  const clientIdentifier = forwarded.split(',')[0].trim() || headerList.get('x-real-ip') || 'unknown'

  return submitInquiry({
    routeId,
    values,
    sourcePage: String(formData.get('sourcePage') ?? ''),
    entryPage: String(formData.get('entryPage') ?? ''),
    utmSource: String(formData.get('utmSource') ?? ''),
    utmMedium: String(formData.get('utmMedium') ?? ''),
    utmCampaign: String(formData.get('utmCampaign') ?? ''),
    utmTerm: String(formData.get('utmTerm') ?? ''),
    utmContent: String(formData.get('utmContent') ?? ''),
    analyticsConsent: formData.get('analyticsConsent') === 'true',
    privacyAccepted: formData.get('privacyAccepted') === 'on',
    marketingOptIn: formData.get('marketingOptIn') === 'on',
    idempotencyKey: String(formData.get('idempotencyKey') ?? ''),
    clientIdentifier,
  })
}
