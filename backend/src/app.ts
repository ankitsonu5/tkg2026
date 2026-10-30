import express, { type NextFunction, type Request, type Response } from 'express'

import { NotFoundError } from './data/client'
import { WriteRejectedError } from './data/hooks'
import { InvalidQueryError } from './data/where'
import { requireInternalKey } from './middleware/internal-auth'
import { adminRouter } from './routes/admin'
import { assetsRouter } from './routes/assets'
import { contentRouter } from './routes/content'
import { formsRouter } from './routes/forms'
import { systemRouter } from './routes/system'

/**
 * Routes
 *   Public (proxied by the Next.js site under the same paths):
 *     GET  /api/health
 *     GET  /api/cron/deliver              (Bearer CRON_SECRET)
 *     GET  /api/assets/file/:filename     (rights-cleared media only)
 *     /api/admin/*                        admin panel API (staff session cookie; see routes/admin.ts)
 *   Internal (Next.js server only, `x-internal-key`):
 *     POST /api/internal/find             content queries
 *     GET  /api/internal/globals/:slug    site-settings | navigation | footer
 *     GET  /api/internal/inquiry-routes/status
 *     POST /api/internal/inquiries
 *     POST /api/internal/newsletter/subscribe
 *     POST /api/internal/newsletter/confirm
 */
export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  // nginx (or the Next.js rewrite) sits in front.
  app.set('trust proxy', 'loopback')

  // Admin panel API: has its own body parser (larger limit for article bodies) and auth.
  app.use('/api/admin', adminRouter)

  app.use(express.json({ limit: '100kb' }))

  app.use('/api', systemRouter)
  app.use('/api/assets', assetsRouter)
  app.use('/api/internal', requireInternalKey, contentRouter, formsRouter)

  app.use((_req, res) => {
    res.status(404).json({ errors: [{ message: 'Not Found' }] })
  })

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof InvalidQueryError) return res.status(400).json({ error: error.message })
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message })
    if (error instanceof WriteRejectedError) return res.status(422).json({ error: error.message, details: error.details })
    if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'Invalid JSON body.' })
    console.error(error)
    return res.status(500).json({ error: 'Internal server error.' })
  })

  return app
}
