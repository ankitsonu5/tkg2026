'use server'

import { headers } from 'next/headers'

import { getPayloadClient } from '@/lib/payload'
import { subscribeToNewsletter, type NewsletterOutcome } from '@/lib/newsletter/subscribe'

/**
 * Server action for the sitewide newsletter signup (footer + Ideas page).
 * Mirrors src/app/(frontend)/connect/actions.ts: the client identifier is derived from
 * request headers for rate limiting only and never reaches the database in raw form.
 */
export async function subscribeToNewsletterAction(formData: FormData): Promise<NewsletterOutcome> {
  const payload = await getPayloadClient()
  const headerList = await headers()

  const forwarded = headerList.get('x-forwarded-for') ?? ''
  const clientIdentifier = forwarded.split(',')[0].trim() || headerList.get('x-real-ip') || 'unknown'

  return subscribeToNewsletter(payload, {
    email: String(formData.get('email') ?? ''),
    sourcePage: String(formData.get('sourcePage') ?? ''),
    privacyAccepted: formData.get('privacyAccepted') === 'true',
    clientIdentifier,
  })
}
