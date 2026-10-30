import { Router } from 'express'

import { data } from '../data/client'
import { runDeliveryPass } from '../jobs/deliver-inquiries'
import { routeReadinessProblems } from '../lib/inquiries/routing-readiness'
import { submitInquiry, type SubmitInput } from '../lib/inquiries/submit'
import { confirmNewsletterSubscription, subscribeToNewsletter, type SubscribeInput } from '../lib/newsletter/subscribe'

/**
 * Write paths behind the Connect and newsletter forms. The Next.js server actions forward
 * the visitor's input here, plus the client IP as `clientIdentifier` for rate limiting
 * (it is salted and hashed, never stored raw).
 */
export const formsRouter = Router()

const str = (value: unknown) => (typeof value === 'string' ? value : value == null ? '' : String(value))

/**
 * Which Connect routes are enabled and production-ready. Recipient addresses stay on the
 * server: only the verdicts are returned.
 */
formsRouter.get('/inquiry-routes/status', async (_req, res) => {
  const configured = await data.find({ collection: 'inquiry-routes', limit: 20, pagination: false, depth: 0 })
  return res.json(
    configured.docs.map((route) => ({
      routeId: String(route.routeId),
      enabled: route.enabled !== false,
      productionReady: routeReadinessProblems(route).length === 0,
    })),
  )
})

formsRouter.post('/inquiries', async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const values = body.values && typeof body.values === 'object' ? (body.values as Record<string, unknown>) : {}

  const input: SubmitInput = {
    routeId: str(body.routeId),
    values,
    sourcePage: str(body.sourcePage),
    entryPage: str(body.entryPage),
    utmSource: str(body.utmSource),
    utmMedium: str(body.utmMedium),
    utmCampaign: str(body.utmCampaign),
    utmTerm: str(body.utmTerm),
    utmContent: str(body.utmContent),
    analyticsConsent: body.analyticsConsent === true,
    privacyAccepted: body.privacyAccepted === true,
    marketingOptIn: body.marketingOptIn === true,
    idempotencyKey: str(body.idempotencyKey),
    clientIdentifier: str(body.clientIdentifier) || 'unknown',
  }

  const outcome = await submitInquiry(data, input)
  res.json(outcome)

  if (outcome.status !== 'pending') return

  // Send the emails AFTER the visitor has their answer. Each message costs a new SMTP session
  // (about 1.5 s to Gmail), so doing it inline made the form feel stuck for several seconds.
  // The lead and its delivery rows are already stored; if this pass fails, the cron endpoint or
  // `npm run worker:delivery` retries, so nothing is lost. The response honestly says "pending".
  runDeliveryPass(data, { batchSize: 10 }).catch((error) => {
    console.error('background inquiry delivery failed; left queued for retry:', error)
  })
})

formsRouter.post('/newsletter/subscribe', async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const input: SubscribeInput = {
    email: str(body.email),
    sourcePage: str(body.sourcePage),
    privacyAccepted: body.privacyAccepted === true,
    clientIdentifier: str(body.clientIdentifier) || 'unknown',
  }
  return res.json(await subscribeToNewsletter(data, input))
})

formsRouter.post('/newsletter/confirm', async (req, res) => {
  const token = str((req.body ?? {}).token)
  return res.json({ confirmed: token ? await confirmNewsletterSubscription(data, token) : false })
})
