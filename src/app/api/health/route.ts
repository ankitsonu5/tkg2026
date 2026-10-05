import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

/**
 * Liveness + database check for uptime monitors (UptimeRobot, Better Stack, Vercel checks...).
 * Returns 200 when the app can reach its database and 503 otherwise. It exposes no data and
 * no configuration, so it is safe to leave public.
 */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' }
  try {
    const payload = await getPayloadClient()
    await payload.find({ collection: 'inquiry-routes', limit: 1, depth: 0, pagination: false, overrideAccess: true })
    return Response.json({ status: 'ok' }, { status: 200, headers })
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503, headers })
  }
}
