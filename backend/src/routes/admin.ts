import fs from 'node:fs'
import path from 'node:path'

import express, { Router, type Request, type Response } from 'express'
import multer from 'multer'

import {
  clearSessionCookie,
  createSessionToken,
  hashPassword,
  login,
  passwordProblem,
  requireSameOrigin,
  requireStaff,
  setSessionCookie,
  verifyPassword,
} from '../admin/auth'
import { replyToLead, ReplyError } from '../admin/lead-reply'
import { completePasswordReset, GENERIC_SENT, requestPasswordReset } from '../admin/password-reset'
import { checkLoginGate, clearLoginFailures, MAX_FAILURES, recordLoginFailure } from '../admin/login-limit'
import { buildLeadsCsv, buildLeadsWorkbook, findLeads, leadStats, type LeadQuery, type LeadScope } from '../admin/leads'
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, removeFiles, storeUpload } from '../admin/media'
import {
  ACCESS,
  can,
  canPublish,
  INQUIRY_WORK_FIELDS,
  isAdmin,
  PRIVILEGED_FIELDS,
  ROLE_LABELS,
  ROLES,
  SECRET_FIELDS,
  type Action,
} from '../admin/permissions'
import { ALL_MODULE_IDS, PAGE_IDS } from '../baseline/pages'
import { isCustomPage, normalizePagePath } from '../lib/pages/custom-path'
import { BASELINE_INQUIRY_ROUTES } from '../baseline/inquiry-routes'
import { config } from '../config'
import { data, NotFoundError, type Doc } from '../data/client'
import { isGlobalSlug } from '../data/globals'
import { buildFilter, type Where } from '../data/where'
import {
  analyzeSeo,
  contentFromLexical,
  lexicalUploadIds,
  primaryKeyword,
  sameKeyword,
  TITLE_SUFFIX,
  type ContentModel,
  type SeoResult,
} from '../lib/seo/score'
import { isCollectionSlug, User, type CollectionSlug } from '../models'

/**
 * Admin panel API (the WordPress-style panel at /admin on the website).
 *
 * Auth is a signed httpOnly session cookie (see admin/auth.ts); every route below
 * /auth/login requires it, and every write is checked against the role table in
 * admin/permissions.ts. The data layer still applies the evidence gate and route rules.
 */
export const adminRouter = Router()

adminRouter.use(requireSameOrigin)
adminRouter.use(express.json({ limit: '5mb' }))

class ForbiddenError extends Error {
  status = 403
}

const DRAFTABLE = new Set<CollectionSlug>(['pages', 'articles', 'entities', 'projects', 'initiatives', 'downloads'])

/** Fields the admin search box looks in, per collection. */
const SEARCH_FIELDS: Partial<Record<CollectionSlug, string[]>> = {
  pages: ['title', 'path', 'pageId'],
  articles: ['title', 'excerpt', 'slug'],
  entities: ['name', 'summary', 'slug'],
  projects: ['title', 'summary', 'slug'],
  initiatives: ['title', 'summary', 'slug'],
  downloads: ['title', 'downloadId'],
  assets: ['assetId', 'filename', 'alt'],
  claims: ['claimId', 'exactWording'],
  'evidence-sources': ['title', 'reference'],
  inquiries: ['reference', 'fullName', 'email'],
  'newsletter-subscriptions': ['email'],
  'inquiry-routes': ['routeId', 'label'],
  redirects: ['fromPath', 'toPath'],
  'audit-events': ['event', 'detail', 'actor'],
  'delivery-attempts': ['recipient', 'route'],
  users: ['email', 'username', 'name'],
}

function staff(req: Request) {
  return req.staff!
}

function slugParam(req: Request): CollectionSlug {
  const slug = String(req.params.slug)
  if (!isCollectionSlug(slug)) throw new NotFoundError(`Unknown collection "${slug}".`)
  return slug
}

function requireAccess(req: Request, slug: CollectionSlug, action: Action) {
  if (!can(staff(req).roles, slug, action)) {
    throw new ForbiddenError(`Your role cannot ${action} ${slug.replace(/-/g, ' ')}.`)
  }
}

function sanitize<T extends Record<string, any>>(doc: T): T {
  const out: Record<string, any> = {}
  for (const [key, value] of Object.entries(doc)) if (!SECRET_FIELDS.has(key)) out[key] = value
  return out as T
}

/** A route owner (who is not also admin/QA) only ever sees their assigned routes. */
function inquiryScope(req: Request, slug: CollectionSlug): Where | null {
  if (slug !== 'inquiries') return null
  const { roles, assignedRoutes } = staff(req)
  if (isAdmin(roles) || roles.includes('qa')) return null
  return { route: { in: assignedRoutes.length ? assignedRoutes : ['__none__'] } }
}

function withScope(where: Where | undefined, scope: Where | null): Where | undefined {
  if (!scope) return where
  return where ? { and: [where, scope] } : scope
}

async function audit(req: Request, event: string, collection: string, id: string, detail: string) {
  await data
    .create({
      collection: 'audit-events',
      data: {
        event,
        subjectCollection: collection,
        subjectId: id,
        actor: `staff:${staff(req).email}`,
        detail: detail.slice(0, 2000),
        occurredAt: new Date().toISOString(),
      },
    })
    .catch((error) => console.error('audit write failed', error))
}

function idOf(value: unknown): string | null {
  if (value && typeof value === 'object' && 'id' in value) return String((value as { id: unknown }).id)
  return typeof value === 'string' && value ? value : null
}

// ---------------------------------------------------------------------------- SEO (Rank Math-style)

const SEO_COLLECTIONS = new Set<string>(['articles', 'pages', 'entities', 'projects', 'initiatives'])

/** Public path of a record, as the site serves it (null when it has no page of its own). */
function seoPath(collection: string, doc: Record<string, any>): string | null {
  if (collection === 'pages') return typeof doc.path === 'string' ? doc.path : null
  if (!doc.slug) return null
  if (collection === 'articles') return `/ideas/${doc.slug}`
  if (doc.displayAs === 'card') return null
  if (collection === 'entities') return `/enterprise-investments/${doc.slug}`
  if (collection === 'projects') return `/film-culture/${doc.slug}`
  if (collection === 'initiatives') return `/impact/${doc.slug}`
  return null
}

/** The title as the site renders it: the root layout adds the brand unless it is already there. */
function brandedTitle(title: string): string {
  const t = title.trim()
  return !t || /\|\s*Tel K\. Ganesan\s*$/i.test(t) ? t : `${t}${TITLE_SUFFIX}`
}

async function altsById(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return map
  const found = await data
    .find({ collection: 'assets', where: { id: { in: unique } }, limit: unique.length, depth: 0, pagination: false })
    .catch(() => ({ docs: [] as Doc[] }))
  for (const a of found.docs as { id: string; alt?: string | null }[]) map.set(String(a.id), a.alt ?? '')
  return map
}

/** Titles of other records (any SEO collection) that already use this focus keyword. */
async function keywordUsedBy(keyword: string, collection: string, id: string | null): Promise<string[]> {
  const kw = primaryKeyword(keyword)
  if (!kw) return []
  const titles: string[] = []
  for (const slug of SEO_COLLECTIONS) {
    const found = await data
      .find({ collection: slug as CollectionSlug, where: { 'seoAnalysis.focusKeyword': { contains: kw } }, limit: 50, depth: 0, pagination: false })
      .catch(() => ({ docs: [] as Doc[] }))
    for (const d of found.docs as Record<string, any>[]) {
      if (slug === collection && String(d.id) === String(id)) continue
      if (sameKeyword(String(d.seoAnalysis?.focusKeyword ?? ''), kw)) titles.push(String(d.title ?? d.name ?? d.slug ?? d.id))
    }
  }
  return titles
}

const asStrings = (v: unknown, max: number) => (Array.isArray(v) ? v.slice(0, max).map((x) => String(x ?? '').slice(0, 5000)) : [])

/** A ContentModel extracted from a rendered page in the admin's browser (sanitised). */
function contentFromClient(raw: any): ContentModel {
  return {
    paragraphs: asStrings(raw?.paragraphs, 2000),
    headings: (Array.isArray(raw?.headings) ? raw.headings.slice(0, 500) : []).map((h: any) => ({ level: Math.min(6, Math.max(1, Number(h?.level) || 2)), text: String(h?.text ?? '').slice(0, 500) })),
    links: (Array.isArray(raw?.links) ? raw.links.slice(0, 2000) : []).map((l: any) => ({ href: String(l?.href ?? '').slice(0, 2000), rel: l?.rel ? String(l.rel).slice(0, 200) : null })),
    imageAlts: asStrings(raw?.imageAlts, 500),
    videos: Math.max(0, Math.min(100, Number(raw?.videos) || 0)),
    hasToc: raw?.hasToc === true,
  }
}

/**
 * Runs the analysis for a record. Articles are scored from their Lexical body (so the score
 * follows the editor as the author types). Other records are scored from their rendered page,
 * which the admin extracts and sends as `rendered`.
 */
async function analyzeRecord(collection: string, id: string | null, doc: Record<string, any>, rendered?: any): Promise<SeoResult | null> {
  const path = seoPath(collection, doc)
  if (!path) return null
  const focusKeyword = String(doc.seoAnalysis?.focusKeyword ?? '')
  const formTitle = String(doc.seo?.title ?? '').trim()
  const formDescription = String(doc.seo?.description ?? '').trim()
  const origin = process.env.PRODUCTION_ORIGIN || config.publicSiteUrl
  const keywordUsed = await keywordUsedBy(focusKeyword, collection, id)

  if (collection === 'articles' || !rendered) {
    const heroId = idOf(doc.heroImage)
    const alts = await altsById([...lexicalUploadIds(doc.body), ...(heroId ? [heroId] : [])])
    return analyzeSeo({
      title: brandedTitle(String(doc.title ?? doc.name ?? '')),
      path,
      seoTitle: formTitle ? brandedTitle(formTitle) : null,
      seoDescription: formDescription,
      fallbackDescription: doc.excerpt ?? doc.summary ?? doc.purpose ?? null,
      focusKeyword,
      content: contentFromLexical(doc.body, (assetId) => alts.get(assetId) ?? ''),
      featuredImage: heroId ? { alt: alts.get(heroId) ?? '' } : null,
      origin,
      keywordUsedBy: keywordUsed,
    })
  }

  return analyzeSeo({
    title: String(rendered.title ?? '') || brandedTitle(String(doc.title ?? doc.name ?? '')),
    path,
    seoTitle: formTitle ? brandedTitle(formTitle) : null,
    seoDescription: formDescription,
    fallbackDescription: String(rendered.description ?? '') || doc.summary || doc.purpose || null,
    focusKeyword,
    content: contentFromClient(rendered.content),
    origin,
    keywordUsedBy: keywordUsed,
  })
}

/**
 * Stores the SEO score on save so lists can show it. Articles are re-scored here; other records
 * keep the score the editor computed from their rendered page.
 */
async function withSeoScore(merged: Record<string, any>, patch: Record<string, any>) {
  const result = await analyzeRecord('articles', merged.id ?? null, merged)
  if (result) patch.seoAnalysis = { ...(merged.seoAnalysis ?? {}), score: result.score }
}

/**
 * Applies role rules to a create/update body and returns the cleaned patch.
 * Throws ForbiddenError with a readable reason when the user may not make the change.
 */
async function preparePatch(req: Request, slug: CollectionSlug, body: Record<string, any>, original: Doc | null) {
  const { roles } = staff(req)
  const patch: Record<string, any> = {}
  for (const [key, value] of Object.entries(body ?? {})) {
    if (['id', '_id', 'createdAt', 'updatedAt', '__v', 'password'].includes(key) || SECRET_FIELDS.has(key)) continue
    patch[key] = value
  }

  if (slug === 'inquiries') {
    for (const key of Object.keys(patch)) if (!INQUIRY_WORK_FIELDS.has(key)) delete patch[key]
  }

  // Custom pages: a clean path, taken from the title when left empty.
  if (slug === 'pages' && isCustomPage({ ...(original ?? {}), ...patch })) {
    if (patch.pageId === '') patch.pageId = null
    const raw = 'path' in patch ? String(patch.path ?? '') : original ? null : ''
    if (raw !== null) patch.path = normalizePagePath(raw.trim() || String(patch.title ?? original?.title ?? ''))
  }

  for (const [field, allowed] of Object.entries(PRIVILEGED_FIELDS[slug] ?? {})) {
    if (!(field in patch)) continue
    const before = original ? JSON.stringify(original[field] ?? null) : 'null'
    if (JSON.stringify(patch[field] ?? null) === before) continue
    if (!isAdmin(roles) && !allowed.some((r) => roles.includes(r))) {
      throw new ForbiddenError(`Only ${allowed.length ? allowed.join(' / ') + ' or an ' : 'an '}administrator may change "${field}".`)
    }
  }

  if (DRAFTABLE.has(slug)) {
    const nextStatus = patch._status ?? original?._status ?? 'draft'
    if (nextStatus === 'published' && !canPublish(roles)) {
      throw new ForbiddenError('Only a Publisher or Administrator can publish, or edit content that is already published.')
    }
  }

  if (slug === 'users') {
    if (typeof patch.email === 'string') patch.email = patch.email.trim().toLowerCase() || undefined
    if (typeof patch.username === 'string') patch.username = patch.username.trim().toLowerCase() || undefined
    if (body.password !== undefined && body.password !== '') {
      const problem = passwordProblem(body.password)
      if (problem) throw new ForbiddenError(problem)
      Object.assign(patch, await hashPassword(String(body.password)))
    } else if (!original) {
      throw new ForbiddenError('Set a password for the new user.')
    }
  }

  if (slug === 'articles') await withSeoScore({ ...(original ?? {}), ...patch }, patch)

  return patch
}

// ---------------------------------------------------------------------------- auth

adminRouter.post('/auth/login', async (req, res) => {
  // Per-IP brute-force gate: 5 failed attempts (any username) block this client for 15 min.
  const ip = req.ip ?? ''
  const gate = await checkLoginGate(ip)
  if (gate.blocked) {
    res.set('Retry-After', String(gate.retryAfterSeconds))
    return res.status(429).json({ error: 'Too many failed login attempts from your network.', retryAfterSeconds: gate.retryAfterSeconds })
  }

  const result = await login(req.body?.email, req.body?.password)
  if ('error' in result) {
    if (!result.failed) {
      return res.status(result.status).json({ error: result.error, retryAfterSeconds: result.retryAfterSeconds })
    }
    const after = await recordLoginFailure(ip)
    if (after.blocked || result.retryAfterSeconds) {
      const wait = Math.max(after.blocked ? after.retryAfterSeconds : 0, result.retryAfterSeconds ?? 0)
      res.set('Retry-After', String(wait))
      return res.status(429).json({ error: 'Too many failed login attempts.', retryAfterSeconds: wait })
    }
    return res.status(result.status).json({ error: result.error, attemptsLeft: MAX_FAILURES - after.failures })
  }
  await clearLoginFailures(ip)
  setSessionCookie(res, createSessionToken(result.user.id))
  return res.json({ user: result.user })
})

/** Lost your password? Step 1: email a 6-digit code (same answer whether or not the account exists). */
adminRouter.post('/auth/forgot', async (req, res) => {
  const result = await requestPasswordReset(req.body?.login, req.ip ?? '')
  if ('error' in result) return res.status(result.status).json({ error: result.error, retryAfterSeconds: result.retryAfterSeconds })
  return res.json({ ok: true, message: GENERIC_SENT })
})

/** Step 2: the code + a new password. Signs out every existing session of that account. */
adminRouter.post('/auth/reset', async (req, res) => {
  const result = await completePasswordReset(req.body?.login, req.body?.code, req.body?.password)
  if ('error' in result) return res.status(result.status).json({ error: result.error })
  clearSessionCookie(res)
  return res.json({ ok: true })
})

adminRouter.post('/auth/logout', (_req, res) => {
  clearSessionCookie(res)
  res.json({ ok: true })
})

adminRouter.use(requireStaff)

adminRouter.get('/auth/me', (req, res) => {
  const { roles } = staff(req)
  const permissions = Object.fromEntries(
    (Object.keys(ACCESS) as CollectionSlug[]).map((slug) => [
      slug,
      { read: can(roles, slug, 'read'), create: can(roles, slug, 'create'), update: can(roles, slug, 'update'), delete: can(roles, slug, 'delete') },
    ]),
  )
  res.json({ user: staff(req), permissions, canPublish: canPublish(roles), isAdmin: isAdmin(roles) })
})

/** Own profile: name and password (current password required to change it). */
adminRouter.patch('/auth/me', async (req, res) => {
  const me = staff(req)
  const set: Record<string, unknown> = {}
  if (typeof req.body?.name === 'string' && req.body.name.trim()) set.name = req.body.name.trim()
  if (req.body?.newPassword) {
    const doc = await User.findById(me.id).lean().exec()
    const check = await verifyPassword(String(req.body.currentPassword ?? ''), doc?.salt, doc?.hash)
    if (!check.ok) return res.status(400).json({ error: 'Your current password is incorrect.' })
    const problem = passwordProblem(req.body.newPassword)
    if (problem) return res.status(400).json({ error: problem })
    Object.assign(set, await hashPassword(String(req.body.newPassword)))
  }
  if (Object.keys(set).length) await User.updateOne({ _id: me.id }, { $set: set }).exec()
  // Changing the password signs out other sessions; keep this one logged in.
  if (set.hash) setSessionCookie(res, createSessionToken(me.id))
  await audit(req, 'admin.profile', 'users', me.id, set.hash ? 'Password changed' : 'Profile updated')
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------- meta + dashboard

adminRouter.get('/meta', (_req, res) => {
  res.json({
    roles: ROLES.map((value) => ({ value, label: ROLE_LABELS[value] })),
    inquiryRoutes: BASELINE_INQUIRY_ROUTES.map((r) => ({ value: r.routeId, label: r.label })),
    pageIds: PAGE_IDS,
    moduleIds: ALL_MODULE_IDS,
  })
})

adminRouter.get('/dashboard', async (req, res) => {
  const { roles } = staff(req)
  const countOf = async (slug: CollectionSlug, where?: Where) =>
    can(roles, slug, 'read') ? (await data.count({ collection: slug, where: withScope(where, inquiryScope(req, slug)) })).totalDocs : null

  const recent = async (slug: CollectionSlug, limit = 5) =>
    can(roles, slug, 'read')
      ? (await data.find({ collection: slug, where: withScope(undefined, inquiryScope(req, slug)), sort: '-createdAt', limit, depth: 0, pagination: false })).docs.map(sanitize)
      : []

  res.json({
    counts: {
      articlesPublished: await countOf('articles', { _status: { equals: 'published' } }),
      articlesDraft: await countOf('articles', { _status: { equals: 'draft' } }),
      pages: await countOf('pages'),
      media: await countOf('assets'),
      inquiriesNew: await countOf('inquiries', { workState: { equals: 'new' } }),
      inquiriesTotal: await countOf('inquiries'),
      inquiriesOverdue: await countOf('inquiries', { and: [{ workState: { equals: 'new' } }, { slaDueAt: { less_than: new Date().toISOString() } }] }),
      deliveryFailed: await countOf('delivery-attempts', { state: { equals: 'dead' } }),
      subscribers: await countOf('newsletter-subscriptions', { state: { equals: 'subscribed' } }),
      claimsBlocked: await countOf('claims', { status: { not_equals: 'ready' } }),
    },
    recentInquiries: await recent('inquiries'),
    recentArticles: await recent('articles'),
  })
})

// ---------------------------------------------------------------------------- collections

adminRouter.get('/collections/:slug', async (req, res) => {
  const slug = slugParam(req)
  requireAccess(req, slug, 'read')
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
  const depth = Math.min(1, Math.max(0, Number(req.query.depth) || 0))
  const sort = typeof req.query.sort === 'string' && req.query.sort ? req.query.sort : '-updatedAt'

  const clauses: Where[] = []
  if (typeof req.query.where === 'string' && req.query.where) {
    try {
      clauses.push(JSON.parse(req.query.where) as Where)
    } catch {
      return res.status(400).json({ error: 'Invalid filter.' })
    }
  }
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : ''
  if (search) clauses.push({ or: (SEARCH_FIELDS[slug] ?? ['title']).map((f) => ({ [f]: { like: search } })) })
  const scope = inquiryScope(req, slug)
  if (scope) clauses.push(scope)

  const result = await data.find({ collection: slug, where: clauses.length ? { and: clauses } : undefined, sort, limit, page, depth })
  res.json({ ...result, docs: result.docs.map((d) => sanitize(d as Record<string, any>)) })
})

/** Counts for the "All | Published | Draft" (or work state) filter links above a list. */
adminRouter.get('/collections/:slug/counts', async (req, res) => {
  const slug = slugParam(req)
  requireAccess(req, slug, 'read')
  const scope = inquiryScope(req, slug)
  const field = DRAFTABLE.has(slug) ? '_status' : slug === 'inquiries' ? 'workState' : slug === 'assets' ? 'rightsStatus' : null
  const all = (await data.count({ collection: slug, where: withScope(undefined, scope) })).totalDocs
  const by: Record<string, number> = {}
  if (field) {
    const model = (await import('../models')).MODELS[slug]
    const grouped = await model.aggregate([{ $match: buildFilter(withScope(undefined, scope)) }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }]).exec()
    for (const g of grouped) by[String(g._id ?? 'none')] = g.n
  }
  res.json({ all, field, by })
})

adminRouter.get('/collections/:slug/:id', async (req, res) => {
  const slug = slugParam(req)
  requireAccess(req, slug, 'read')
  const doc = await data.findByID({ collection: slug, id: req.params.id, depth: 1 })
  const scope = inquiryScope(req, slug)
  if (scope && !(staff(req).assignedRoutes as string[]).includes(String((doc as unknown as Record<string, unknown>).route))) {
    throw new NotFoundError('Not found.')
  }
  res.json(sanitize(doc as Record<string, any>))
})

adminRouter.post('/collections/:slug', async (req, res) => {
  const slug = slugParam(req)
  requireAccess(req, slug, 'create')
  const patch = await preparePatch(req, slug, req.body ?? {}, null)
  const doc = await data.create({ collection: slug, data: patch })
  await audit(req, 'admin.create', slug, String(doc.id), `Created${patch._status ? ` (${patch._status})` : ''}`)
  res.status(201).json(sanitize(doc as Record<string, any>))
})

adminRouter.patch('/collections/:slug/:id', async (req, res) => {
  const slug = slugParam(req)
  requireAccess(req, slug, 'update')
  const original = await data.findByID({ collection: slug, id: req.params.id, depth: 0 })
  const scope = inquiryScope(req, slug)
  if (scope && !staff(req).assignedRoutes.includes(String((original as unknown as Record<string, unknown>).route))) throw new NotFoundError('Not found.')
  const patch = await preparePatch(req, slug, req.body ?? {}, original as Doc)
  const doc = await data.update({ collection: slug, id: req.params.id, data: patch })
  await audit(req, 'admin.update', slug, req.params.id as string, `Updated: ${Object.keys(patch).filter((k) => !['hash', 'salt'].includes(k)).join(', ')}`)
  res.json(sanitize(doc as Record<string, any>))
})

adminRouter.delete('/collections/:slug/:id', async (req, res) => {
  const slug = slugParam(req)
  requireAccess(req, slug, 'delete')
  if (slug === 'users' && req.params.id === staff(req).id) throw new ForbiddenError('You cannot delete your own account.')
  const doc = await data.delete({ collection: slug, id: req.params.id })
  if (slug === 'assets') await removeFiles(doc as Record<string, any>)
  await audit(req, 'admin.delete', slug, req.params.id as string, 'Deleted')
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------- leads

function leadScope(req: Request): LeadScope {
  const { roles, assignedRoutes } = staff(req)
  return {
    canReadInquiries: can(roles, 'inquiries', 'read'),
    canReadNewsletter: can(roles, 'newsletter-subscriptions', 'read'),
    routes: isAdmin(roles) || roles.includes('qa') ? null : assignedRoutes,
  }
}

function leadQuery(req: Request): LeadQuery {
  const q = req.query
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
  const type = str(q.type)
  return {
    type: type === 'inquiry' || type === 'newsletter' ? type : 'all',
    route: str(q.route),
    status: str(q.status),
    search: str(q.search),
    from: str(q.from) && !Number.isNaN(Date.parse(String(q.from))) ? str(q.from) : undefined,
    to: str(q.to) && !Number.isNaN(Date.parse(String(q.to))) ? str(q.to) : undefined,
  }
}

/** Every form submission on the site (inquiries + newsletter), filtered and paginated. */
adminRouter.get('/leads', async (req, res) => {
  const scope = leadScope(req)
  if (!scope.canReadInquiries && !scope.canReadNewsletter) throw new ForbiddenError('Your role cannot see leads.')
  const query = leadQuery(req)
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25))
  const [leads, everything] = await Promise.all([findLeads(query, scope), findLeads({ type: 'all' }, scope)])
  res.json({
    docs: leads.slice((page - 1) * limit, page * limit),
    totalDocs: leads.length,
    totalPages: Math.max(1, Math.ceil(leads.length / limit)),
    page,
    stats: leadStats(everything),
    filteredStats: leadStats(leads),
    canSeeNewsletter: scope.canReadNewsletter,
  })
})

/** Reply to a lead by email from the admin (sent through the site's mail transport). */
adminRouter.post('/leads/:type/:id/reply', async (req, res) => {
  const type = req.params.type === 'newsletter' ? 'newsletter' : req.params.type === 'inquiry' ? 'inquiry' : null
  if (!type) throw new NotFoundError('Unknown lead type.')
  const scope = leadScope(req)
  const { roles } = staff(req)
  const allowed = type === 'inquiry' ? can(roles, 'inquiries', 'update') : isAdmin(roles)
  if (!allowed) throw new ForbiddenError('Your role cannot reply to this lead.')
  try {
    const lead = await replyToLead({ type, id: String(req.params.id), subject: req.body?.subject, message: req.body?.message, staff: staff(req), routes: scope.routes })
    return res.json({ ok: true, lead })
  } catch (error) {
    if (error instanceof ReplyError) return res.status(error.status).json({ error: error.message })
    throw error
  }
})

/** Download the filtered leads as a styled Excel workbook or CSV. */
adminRouter.get('/leads/export', async (req, res) => {
  const scope = leadScope(req)
  if (!scope.canReadInquiries && !scope.canReadNewsletter) throw new ForbiddenError('Your role cannot export leads.')
  const query = leadQuery(req)
  const leads = await findLeads(query, scope)
  const filters = [
    query.type !== 'all' ? (query.type === 'inquiry' ? 'Inquiries' : 'Newsletter') : '',
    query.route ? `Route: ${query.route}` : '',
    query.status ? `Status: ${query.status}` : '',
    query.search ? `Search: "${query.search}"` : '',
    query.from ? `From ${query.from}` : '',
    query.to ? `To ${query.to}` : '',
  ]
    .filter(Boolean)
    .join(', ')
  const day = new Date().toISOString().slice(0, 10)
  await audit(req, 'admin.export', 'leads', '-', `Exported ${leads.length} lead(s) as ${req.query.format === 'csv' ? 'CSV' : 'Excel'}${filters ? ` (${filters})` : ''}`)
  res.set('Cache-Control', 'no-store')
  if (req.query.format === 'csv') {
    res.set('Content-Type', 'text/csv; charset=utf-8')
    res.set('Content-Disposition', `attachment; filename="tkg-leads-${day}.csv"`)
    return res.send(buildLeadsCsv(leads))
  }
  const buffer = await buildLeadsWorkbook(leads, filters)
  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.set('Content-Disposition', `attachment; filename="tkg-leads-${day}.xlsx"`)
  return res.send(buffer)
})

// ---------------------------------------------------------------------------- globals

adminRouter.get('/globals/:slug', async (req, res) => {
  if (!isGlobalSlug(req.params.slug as string)) throw new NotFoundError('Unknown global.')
  res.json(await data.findGlobal({ slug: req.params.slug as 'site-settings' }))
})

adminRouter.put('/globals/:slug', async (req, res) => {
  const slug = req.params.slug as string
  if (!isGlobalSlug(slug)) throw new NotFoundError('Unknown global.')
  if (!isAdmin(staff(req).roles)) throw new ForbiddenError('Only an administrator can change site settings.')
  const patch = Object.fromEntries(Object.entries(req.body ?? {}).filter(([k]) => !['id', '_id', 'globalType', 'createdAt', 'updatedAt'].includes(k)))
  const doc = await data.updateGlobal({ slug, data: patch })
  await audit(req, 'admin.settings', 'globals', slug, `Updated: ${Object.keys(patch).join(', ')}`)
  res.json(doc)
})

// ---------------------------------------------------------------------------- media + tools

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_MIME.test(file.mimetype)),
})

adminRouter.post('/media', upload.single('file'), async (req, res) => {
  requireAccess(req, 'assets', 'create')
  if (!req.file) return res.status(400).json({ error: 'Choose an image, PDF, video or audio file (max 25 MB).' })
  const stored = await storeUpload(req.file)
  const fallbackId = `AST-${Date.now().toString(36).toUpperCase()}`
  const assetId = typeof req.body?.assetId === 'string' && req.body.assetId.trim() ? req.body.assetId.trim() : fallbackId
  const doc = await data.create({
    collection: 'assets',
    data: { ...stored, assetId, alt: typeof req.body?.alt === 'string' ? req.body.alt : undefined },
  })
  await audit(req, 'admin.upload', 'assets', String(doc.id), `Uploaded ${stored.filename}`)
  res.status(201).json(doc)
})

/**
 * Media files for staff, including assets whose rights are not cleared yet (the public
 * /api/assets/file route refuses those).
 */
adminRouter.get('/media/file/:filename', async (req, res) => {
  const filename = String(req.params.filename)
  if (!filename || /[\\/]|\.\./.test(filename)) throw new NotFoundError('Not found.')
  const fullPath = path.join(config.mediaDir, filename)
  if (!fs.existsSync(fullPath)) throw new NotFoundError('Not found.')
  res.set('Cache-Control', 'private, max-age=300')
  res.sendFile(fullPath)
})

/** Live SEO analysis for the editor sidebar (same rules as the stored score). */
adminRouter.post('/seo-analysis', async (req, res) => {
  const body = req.body ?? {}
  const collection = String(body.collection ?? 'articles')
  if (!SEO_COLLECTIONS.has(collection)) throw new NotFoundError('This section has no SEO analysis.')
  requireAccess(req, collection as CollectionSlug, 'read')
  const result = await analyzeRecord(collection, body.id ? String(body.id) : null, body.doc ?? {}, body.rendered)
  if (!result) return res.json({ noPage: true })
  res.json(result)
})

adminRouter.use((error: unknown, _req: Request, res: Response, next: (e?: unknown) => void) => {
  if (error instanceof ForbiddenError) return res.status(403).json({ error: error.message })
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'File is larger than 25 MB.' : error.message })
  const mongo = error as { code?: number; name?: string; message?: string; keyValue?: Record<string, unknown> }
  if (mongo?.code === 11000) {
    const field = Object.keys(mongo.keyValue ?? {}).join(', ') || 'value'
    return res.status(409).json({ error: `Another record already uses this ${field}. Choose a different ${field}.` })
  }
  if (mongo?.name === 'ValidationError' || mongo?.name === 'CastError') return res.status(400).json({ error: mongo.message })
  return next(error)
})
