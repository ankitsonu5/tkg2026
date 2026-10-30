import { Router } from 'express'
import mongoose from 'mongoose'

import { config } from '../config'
import { data } from '../data/client'
import { runDeliveryPass } from '../jobs/deliver-inquiries'
import { runSlaSweep } from '../jobs/sla-reminders'

export const systemRouter = Router()

/**
 * Liveness + database check for uptime monitors. 200 when the database answers, 503
 * otherwise. Exposes no data or configuration, so it is safe to leave public.
 */
systemRouter.get('/health', async (_req, res) => {
  res.set('Cache-Control', 'no-store')
  try {
    await mongoose.connection.db!.admin().ping()
    return res.status(200).json({ status: 'ok' })
  } catch {
    return res.status(503).json({ status: 'unavailable' })
  }
})

/**
 * Scheduled retry for queued inquiry emails, for hosting without a long-running worker.
 * Point a cron at GET /api/cron/deliver every few minutes with
 * `Authorization: Bearer <CRON_SECRET>`. Disabled unless CRON_SECRET is set.
 */
systemRouter.get('/cron/deliver', async (req, res) => {
  const secret = config.cronSecret
  if (!secret || req.get('authorization') !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  const delivery = await runDeliveryPass(data)
  const sla = await runSlaSweep(data)
  return res.json({ delivery, slaOverdue: sla.overdue })
})
