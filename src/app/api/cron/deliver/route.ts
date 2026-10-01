import { runDeliveryPass } from '@/jobs/deliver-inquiries'
import { runSlaSweep } from '@/jobs/sla-reminders'
import { getPayloadClient } from '@/lib/payload'

/**
 * Scheduled retry for queued inquiry emails, for hosting without a long-running worker.
 * Point a cron (Vercel Cron, cron-job.org, etc.) at GET /api/cron/deliver every few minutes
 * with `Authorization: Bearer <CRON_SECRET>`. Disabled unless CRON_SECRET is set.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const payload = await getPayloadClient()
  const delivery = await runDeliveryPass(payload)
  const sla = await runSlaSweep(payload)
  return Response.json({ delivery, slaOverdue: sla.overdue })
}
