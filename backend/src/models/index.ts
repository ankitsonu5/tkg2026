import type { Model, Schema } from 'mongoose'

import { Article, Download, Entity, Initiative, Page, Project } from './content'
import { Asset, Claim, EvidenceSource } from './evidence'
import { DeliveryAttempt, Inquiry, InquiryRoute, NewsletterSubscription } from './inquiries'
import { AuditEvent, Global, RateLimitBucket, Redirect, User } from './system'

export * from './content'
export * from './evidence'
export * from './inquiries'
export * from './system'

export const MODELS = {
  pages: Page,
  articles: Article,
  entities: Entity,
  projects: Project,
  initiatives: Initiative,
  downloads: Download,
  claims: Claim,
  'evidence-sources': EvidenceSource,
  assets: Asset,
  'inquiry-routes': InquiryRoute,
  inquiries: Inquiry,
  'delivery-attempts': DeliveryAttempt,
  'newsletter-subscriptions': NewsletterSubscription,
  redirects: Redirect,
  'rate-limit-buckets': RateLimitBucket,
  'audit-events': AuditEvent,
  users: User,
} as const satisfies Record<string, Model<Record<string, unknown>>>

export type CollectionSlug = keyof typeof MODELS

export function isCollectionSlug(value: string): value is CollectionSlug {
  return Object.prototype.hasOwnProperty.call(MODELS, value)
}

export { Global }

/** Collections with an upload file attached (gets `url` / `sizes.*.url` on read). */
export const UPLOAD_COLLECTIONS = new Set<CollectionSlug>(['assets'])

/** Image sizes Payload generated for assets; every one gets a url (or null) on read. */
export const ASSET_IMAGE_SIZES = ['thumbnail', 'card', 'featured', 'hero', 'social'] as const

/** Lexical rich-text fields, whose upload nodes are populated like relationships. */
export const RICH_TEXT_PATHS: Partial<Record<CollectionSlug, string[]>> = {
  articles: ['body'],
  entities: ['body'],
  projects: ['body'],
  initiatives: ['body'],
  pages: ['modules.*.body'],
}

/** Relationships inside schemaless (`Mixed`) fields, which the schema cannot describe. */
const EXTRA_RELATIONS: Partial<Record<CollectionSlug, Record<string, CollectionSlug>>> = {
  pages: {
    'modules.*.claims': 'claims',
    'modules.*.assets': 'assets',
    'modules.*.image': 'assets',
    'modules.*.points.*.claim': 'claims',
    'modules.*.entries.*.claim': 'claims',
  },
}

/** Paths are dot-separated; `*` steps into every item of an array. */
export type PathSpec<V> = Array<[path: string, value: V]>

function walkSchema(schema: Schema, prefix: string, visit: (path: string, type: any) => void) {
  schema.eachPath((path, type: any) => {
    if (path === '_id' || path === '__v') return
    const full = prefix ? `${prefix}.${path}` : path
    if (type.schema && type.$isMongooseDocumentArray) {
      walkSchema(type.schema, `${full}.*`, visit)
      return
    }
    visit(full, type)
  })
}

function relationsOf(slug: CollectionSlug): PathSpec<CollectionSlug> {
  const out: PathSpec<CollectionSlug> = []
  walkSchema(MODELS[slug].schema, '', (path, type) => {
    const target = type.options?.ref ?? type.caster?.options?.ref
    if (target && isCollectionSlug(target)) out.push([path, target])
  })
  for (const [path, target] of Object.entries(EXTRA_RELATIONS[slug] ?? {})) out.push([path, target])
  return out
}

function defaultsOf(slug: CollectionSlug): PathSpec<unknown> {
  const out: PathSpec<unknown> = []
  walkSchema(MODELS[slug].schema, '', (path, type) => {
    if (path === 'createdAt' || path === 'updatedAt') return
    if (type.$isMongooseArray) return
    const value = type.defaultValue
    if (value !== undefined && typeof value !== 'function') out.push([path, value])
  })
  return out
}

export const RELATIONS = Object.fromEntries(
  (Object.keys(MODELS) as CollectionSlug[]).map((slug) => [slug, relationsOf(slug)]),
) as Record<CollectionSlug, PathSpec<CollectionSlug>>

/**
 * Field defaults, applied on read to documents saved before the field existed (Payload did
 * the same in its afterRead hook), and on create.
 */
export const DEFAULTS = Object.fromEntries(
  (Object.keys(MODELS) as CollectionSlug[]).map((slug) => [slug, defaultsOf(slug)]),
) as Record<CollectionSlug, PathSpec<unknown>>
