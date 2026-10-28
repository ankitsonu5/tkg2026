import { Types } from 'mongoose'
import type { SendMailOptions } from 'nodemailer'

import { sendEmail } from '../email/transport'
import { DEFAULTS, Global, MODELS, RELATIONS, RICH_TEXT_PATHS, UPLOAD_COLLECTIONS, type CollectionSlug } from '../models'
import { GLOBAL_DEFAULTS, isGlobalSlug, type GlobalSlug } from './globals'
import { beforeWrite } from './hooks'
import { applyDefault, forEachAtPath } from './paths'
import { decorateUpload, toPlain } from './serialize'
import type { Config } from '../types/content'
import { buildFilter, buildSort, type Where } from './where'

/**
 * Data access for the whole backend.
 *
 * The method names and option shapes intentionally match the Payload Local API this project
 * used before (find / findByID / findGlobal / create / update / sendEmail), so the business
 * logic in src/lib and src/jobs carried over unchanged. Documents come back as plain JSON
 * (string ids, ISO dates) with relationships populated to `depth`.
 */

export type Doc = Record<string, any> & { id: string }

/** Typed document shape per collection / global (see src/types/content.ts). */
export type CollectionDoc<C extends CollectionSlug> = Config['collections'][C]
export type GlobalDoc<S extends GlobalSlug> = Config['globals'][S]

export interface FindArgs {
  collection: CollectionSlug
  where?: Where
  sort?: string | string[]
  /** 0 = no limit. */
  limit?: number
  page?: number
  /** How many levels of relationships to populate. Defaults to 2, as Payload did. */
  depth?: number
  /** false = skip the count query; `limit` still applies. */
  pagination?: boolean
  /** Accepted for call-site compatibility; there is no access layer to override. */
  overrideAccess?: boolean
  draft?: boolean
  req?: unknown
}

export interface FindResult<T = Doc> {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage: number | null
  nextPage: number | null
}

const DEFAULT_DEPTH = 2
const DEFAULT_LIMIT = 10

export class NotFoundError extends Error {
  status = 404
}

function toObjectId(id: unknown): Types.ObjectId | null {
  if (id instanceof Types.ObjectId) return id
  // A populated document stands for its id.
  const value = typeof id === 'object' && id !== null && 'id' in id ? (id as { id: unknown }).id : id
  if (value instanceof Types.ObjectId) return value
  if (typeof value === 'string' && Types.ObjectId.isValid(value) && value.length === 24) return new Types.ObjectId(value)
  return null
}

/** Applies read-time defaults and upload URLs to a plain document. */
function finalize(collection: CollectionSlug, doc: Record<string, unknown>): Doc {
  for (const [path, value] of DEFAULTS[collection]) applyDefault(doc, path, value)
  if (UPLOAD_COLLECTIONS.has(collection)) decorateUpload(doc)
  return doc as Doc
}

async function populate(collection: CollectionSlug, docs: Doc[], depth: number): Promise<void> {
  if (depth <= 0 || docs.length === 0) return

  // Gather every referenced id per target collection, then load each collection once.
  const wanted = new Map<CollectionSlug, Set<string>>()
  const want = (target: CollectionSlug, id: unknown) => {
    if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) return
    if (!wanted.has(target)) wanted.set(target, new Set())
    wanted.get(target)!.add(id)
  }

  const relationPaths = RELATIONS[collection]
  const richTextPaths = RICH_TEXT_PATHS[collection] ?? []

  for (const doc of docs) {
    for (const [path, target] of relationPaths) {
      await forEachAtPath(doc, path, (container, key) => {
        const value = container[key]
        if (Array.isArray(value)) value.forEach((v) => want(target, v))
        else want(target, value)
      })
    }
    for (const path of richTextPaths) {
      await forEachAtPath(doc, path, (container, key) => {
        visitLexical(container[key], (node) => {
          if (node.type === 'upload' && typeof node.relationTo === 'string' && node.relationTo in MODELS) {
            want(node.relationTo as CollectionSlug, node.value)
          }
        })
      })
    }
  }

  const loaded = new Map<string, Doc>()
  for (const [target, ids] of wanted) {
    const related = await findDocs(target, { _id: { $in: [...ids].map((id) => new Types.ObjectId(id)) } }, {
      depth: depth - 1,
    })
    for (const rel of related) loaded.set(`${target}:${rel.id}`, rel)
  }

  // Swap ids for documents. Ids that no longer resolve stay as ids, as Payload left them.
  const resolve = (target: CollectionSlug, value: unknown) =>
    typeof value === 'string' ? (loaded.get(`${target}:${value}`) ?? value) : value

  for (const doc of docs) {
    for (const [path, target] of relationPaths) {
      await forEachAtPath(doc, path, (container, key) => {
        const value = container[key]
        container[key] = Array.isArray(value) ? value.map((v) => resolve(target, v)) : resolve(target, value)
      })
    }
    for (const path of richTextPaths) {
      await forEachAtPath(doc, path, (container, key) => {
        visitLexical(container[key], (node) => {
          if (node.type === 'upload' && typeof node.relationTo === 'string' && node.relationTo in MODELS) {
            node.value = resolve(node.relationTo as CollectionSlug, node.value)
          }
        })
      })
    }
  }
}

function visitLexical(state: unknown, visit: (node: Record<string, any>) => void): void {
  const root = (state as { root?: unknown } | null)?.root
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    visit(node as Record<string, any>)
    const children = (node as { children?: unknown }).children
    if (Array.isArray(children)) children.forEach(walk)
  }
  walk(root)
}

async function findDocs(
  collection: CollectionSlug,
  filter: Record<string, unknown>,
  opts: { sort?: Record<string, 1 | -1>; skip?: number; limit?: number; depth: number },
): Promise<Doc[]> {
  let query = MODELS[collection].find(filter).sort(opts.sort ?? { createdAt: -1 })
  if (opts.skip) query = query.skip(opts.skip)
  if (opts.limit && opts.limit > 0) query = query.limit(opts.limit)
  const raw = await query.lean().exec()
  const docs = raw.map((d) => finalize(collection, toPlain(d) as Record<string, unknown>))
  await populate(collection, docs, opts.depth)
  return docs
}

export async function find<C extends CollectionSlug>(args: FindArgs & { collection: C }): Promise<FindResult<CollectionDoc<C>>> {
  type T = CollectionDoc<C>
  const filter = buildFilter(args.where)
  const sort = buildSort(args.sort)
  // Payload's rule: an explicit limit always applies; otherwise 10 per page, or everything
  // when pagination is off.
  const limit = Math.max(0, Number(args.limit ?? (args.pagination === false ? 0 : DEFAULT_LIMIT)))
  const page = Math.max(1, Number(args.page ?? 1))
  const depth = Math.max(0, Number(args.depth ?? DEFAULT_DEPTH))
  const skip = limit > 0 ? (page - 1) * limit : 0

  const docs = await findDocs(args.collection, filter, { sort, skip, limit, depth })

  if (args.pagination === false) {
    const total = docs.length
    return {
      docs: docs as T[],
      totalDocs: total,
      limit,
      totalPages: 1,
      page: 1,
      pagingCounter: 1,
      hasPrevPage: false,
      hasNextPage: false,
      prevPage: null,
      nextPage: null,
    }
  }

  const totalDocs = await MODELS[args.collection].countDocuments(filter).exec()
  const totalPages = limit > 0 ? Math.max(1, Math.ceil(totalDocs / limit)) : 1
  return {
    docs: docs as T[],
    totalDocs,
    limit,
    totalPages,
    page,
    pagingCounter: skip + 1,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
    prevPage: page > 1 ? page - 1 : null,
    nextPage: page < totalPages ? page + 1 : null,
  }
}

export async function findByID<C extends CollectionSlug>(
  args: { collection: C; id: unknown; depth?: number } & Omit<Partial<FindArgs>, 'collection'>,
): Promise<CollectionDoc<C>> {
  const _id = toObjectId(args.id)
  const docs = _id ? await findDocs(args.collection, { _id }, { limit: 1, depth: args.depth ?? DEFAULT_DEPTH }) : []
  if (!docs[0]) throw new NotFoundError(`${args.collection} ${String(args.id)} not found.`)
  return docs[0] as CollectionDoc<C>
}

export async function count(args: { collection: CollectionSlug; where?: Where }): Promise<{ totalDocs: number }> {
  return { totalDocs: await MODELS[args.collection].countDocuments(buildFilter(args.where)).exec() }
}

export async function findGlobal<S extends GlobalSlug>(args: { slug: S; depth?: number } & Partial<FindArgs>): Promise<GlobalDoc<S>> {
  if (!isGlobalSlug(args.slug)) throw new NotFoundError(`Unknown global "${args.slug}".`)
  const raw = await Global.findOne({ globalType: args.slug }).lean().exec()
  const doc = (raw ? toPlain(raw) : { globalType: args.slug }) as Record<string, unknown>
  for (const [path, value] of GLOBAL_DEFAULTS[args.slug]) applyDefault(doc, path, value)
  return doc as unknown as GlobalDoc<S>
}

/** Creates the global's document on first write; later writes update only the given fields. */
export async function updateGlobal<S extends GlobalSlug>(
  args: { slug: S; data: Record<string, unknown> } & Partial<FindArgs>,
): Promise<GlobalDoc<S>> {
  if (!isGlobalSlug(args.slug)) throw new NotFoundError(`Unknown global "${args.slug}".`)
  const set = Object.fromEntries(Object.entries(toWritable(args.data)).filter(([, value]) => value !== undefined))
  await Global.updateOne({ globalType: args.slug }, { $set: set, $setOnInsert: { globalType: args.slug } }, { upsert: true }).exec()
  return findGlobal({ slug: args.slug })
}

/** Strips read-only keys before a write. */
function toWritable(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || key === '_id' || key === 'createdAt' || key === 'updatedAt') continue
    out[key] = value
  }
  return out
}

export async function create<C extends CollectionSlug>(
  args: { collection: C; data: Record<string, unknown> } & Omit<Partial<FindArgs>, 'collection'>,
): Promise<CollectionDoc<C>> {
  const doc = toWritable(args.data)
  for (const [path, value] of DEFAULTS[args.collection]) applyDefault(doc, path, value)
  await beforeWrite(data, args.collection, doc)
  const created = await MODELS[args.collection].create(doc)
  return findByID({ collection: args.collection, id: created._id, depth: args.depth ?? 0 })
}

type UpdateArgs<C extends CollectionSlug> = { collection: C; data: Record<string, unknown> } & Omit<Partial<FindArgs>, 'collection'>

/** Update one document by `id`, or every document matching `where` (returns `{ docs }`). */
export async function update<C extends CollectionSlug>(args: UpdateArgs<C> & { id: unknown }): Promise<CollectionDoc<C>>
export async function update<C extends CollectionSlug>(
  args: UpdateArgs<C> & { where: Where; id?: undefined },
): Promise<{ docs: CollectionDoc<C>[] }>
export async function update<C extends CollectionSlug>(
  args: UpdateArgs<C> & { id?: unknown },
): Promise<CollectionDoc<C> | { docs: CollectionDoc<C>[] }> {
  // Undefined means "not provided" and leaves the stored value alone; null clears it.
  const set = Object.fromEntries(Object.entries(toWritable(args.data)).filter(([, value]) => value !== undefined))

  if (args.id === undefined) {
    const targets = await findDocs(args.collection, buildFilter(args.where), { depth: 0 })
    for (const target of targets) await beforeWrite(data, args.collection, { ...target, ...set })
    const ids = targets.map((target) => new Types.ObjectId(target.id))
    await MODELS[args.collection].updateMany({ _id: { $in: ids } }, { $set: set }).exec()
    const docs = await findDocs(args.collection, { _id: { $in: ids } }, { depth: args.depth ?? 0 })
    return { docs: docs as CollectionDoc<C>[] }
  }

  const _id = toObjectId(args.id)
  if (!_id) throw new NotFoundError(`${args.collection} ${String(args.id)} not found.`)
  const original = await findByID({ collection: args.collection, id: _id, depth: 0 })
  await beforeWrite(data, args.collection, { ...(original as unknown as Record<string, unknown>), ...set })
  await MODELS[args.collection].updateOne({ _id }, { $set: set }).exec()
  return findByID({ collection: args.collection, id: _id, depth: args.depth ?? 0 })
}

async function deleteDoc<C extends CollectionSlug>(
  args: { collection: C; id: unknown } & Omit<Partial<FindArgs>, 'collection'>,
): Promise<CollectionDoc<C>> {
  const doc = await findByID({ collection: args.collection, id: args.id, depth: 0 })
  await MODELS[args.collection].deleteOne({ _id: toObjectId(args.id) }).exec()
  return doc
}

export const data = {
  delete: deleteDoc,
  find,
  findByID,
  findGlobal,
  updateGlobal,
  count,
  create,
  update,
  sendEmail: (message: SendMailOptions) => sendEmail(message),
}

export type DataClient = typeof data
