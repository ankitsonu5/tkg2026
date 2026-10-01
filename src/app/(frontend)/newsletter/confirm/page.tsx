import { buildMetadata } from '@/lib/seo/metadata'
import { buildPageSchema } from '@/lib/seo/schema'
import { JsonLd } from '@/frontend/components/JsonLd'
import { getPayloadClient } from '@/lib/payload'
import { confirmNewsletterSubscription } from '@/lib/newsletter/subscribe'

export async function generateMetadata() {
  return buildMetadata({
    pageId: 'NEWSLETTER_CONFIRM',
    title: 'Confirm your subscription | Tel K. Ganesan',
    description: 'Confirm your email address to complete your subscription to Tel K. Ganesan\'s Ideas newsletter.',
    path: '/newsletter/confirm',
    noindex: true,
  })
}

export default async function ConfirmNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const payload = await getPayloadClient()
  const confirmed = token ? await confirmNewsletterSubscription(payload, token) : false

  return (
    <section className="section section--spacious">
      <JsonLd schema={buildPageSchema('NEWSLETTER_CONFIRM', '/newsletter/confirm')} />
      <div className="container container--narrow policy-copy">
        <h1>{confirmed ? 'Subscription confirmed' : 'This link is no longer valid'}</h1>
        <p>
          {confirmed
            ? "Thank you for confirming. You're subscribed to Tel K. Ganesan's Ideas."
            : 'This confirmation link has already been used or has expired. You can subscribe again from the newsletter form on the site.'}
        </p>
      </div>
    </section>
  )
}
