'use server'

import { headers } from 'next/headers'

import { getPayloadClient } from '@/lib/payload'
import { submitInquiry, type SubmitOutcome } from '@/lib/inquiries/submit'

/**
 * Server action for the Connect forms.
 *
 * The client identifier is derived from request headers for rate limiting only; the raw
 * value never reaches the database (it is salted and hashed in the rate limiter).
 */
export async function submitInquiryAction(formData: FormData): Promise<SubmitOutcome> {
  const payload = await getPayloadClient()
  const headerList = await headers()

  const routeId = String(formData.get('routeId') ?? '')

  const values: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('field.')) {
      values[key.slice('field.'.length)] = value
    }
  }

  const forwarded = headerList.get('x-forwarded-for') ?? ''
  const clientIdentifier = forwarded.split(',')[0].trim() || headerList.get('x-real-ip') || 'unknown'

  return submitInquiry(payload, {
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
