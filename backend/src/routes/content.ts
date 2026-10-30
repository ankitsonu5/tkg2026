import { Router } from 'express'

import { data } from '../data/client'
import { isGlobalSlug } from '../data/globals'
import type { CollectionSlug } from '../models'

/**
 * Read API for the website's server-rendered pages.
 *
 * POST /find takes the same options the pages always used ({ collection, where, sort, limit,
 * page, depth, pagination }) and returns { docs, totalDocs, ... }. Only content collections
 * are readable here; leads, subscribers, users and route recipients never are.
 */

const READABLE = new Set<CollectionSlug>(['pages', 'articles', 'entities', 'projects', 'initiatives', 'downloads', 'redirects'])

export const contentRouter = Router()

contentRouter.post('/find', async (req, res) => {
  const { collection, where, sort, limit, page, depth, pagination } = req.body ?? {}
  if (typeof collection !== 'string' || !READABLE.has(collection as CollectionSlug)) {
    return res.status(404).json({ error: `Collection "${String(collection)}" is not readable.` })
  }
  const result = await data.find({
    collection: collection as CollectionSlug,
    where,
    sort,
    // Keep responses bounded however the caller asks.
    limit: limit === undefined ? undefined : Math.min(Math.max(0, Number(limit) || 0), 500) || 500,
    page,
    depth: depth === undefined ? undefined : Math.min(Math.max(0, Number(depth) || 0), 3),
    pagination,
  })
  return res.json(result)
})

contentRouter.get('/globals/:slug', async (req, res) => {
  if (!isGlobalSlug(req.params.slug)) return res.status(404).json({ error: 'Unknown global.' })
  return res.json(await data.findGlobal({ slug: req.params.slug }))
})
