import { defineModel, Mixed, publishable, ref, refMany } from './base'

/**
 * The fixed public pages (HOME, ABOUT, ...) and their modular content blocks, plus custom pages
 * added from the admin: those have no baseline `pageId` and render `body` (Lexical JSON) at `path`.
 */
export const Page = defineModel('pages', {
  ...publishable,
  title: { type: String, required: true },
  pageId: String,
  path: { type: String, required: true },
  purpose: String,
  body: Mixed,
  heroImage: ref('assets'),
  modules: [Mixed],
  primaryCta: {
    ctaId: String,
    label: String,
    destinationType: { type: String, default: 'internal' },
    destination: String,
  },
})

/** ARTICLE template: ideas, frameworks and Mind Trap essays. `body` is Lexical JSON. */
export const Article = defineModel('articles', {
  ...publishable,
  title: { type: String, required: true },
  slug: { type: String, required: true },
  excerpt: String,
  topic: String,
  tags: [String],
  isFramework: { type: Boolean, default: false },
  authorshipStatus: { type: String, default: 'unresolved' },
  publishedDate: Date,
  body: Mixed,
  heroImage: ref('assets'),
  related: refMany('articles'),
})

/** ENTITY template: enterprises and investments. */
export const Entity = defineModel('entities', {
  ...publishable,
  name: { type: String, required: true },
  slug: { type: String, required: true },
  isFlagship: { type: Boolean, default: false },
  relationshipStatus: { type: String, default: 'unresolved' },
  relationshipWording: String,
  summary: String,
  body: Mixed,
  officialUrl: String,
  logo: ref('assets'),
  displayOrder: { type: Number, default: 100 },
  /** 'card' = only a card on the homepage/section; 'page' = card plus its own detail page. */
  displayAs: { type: String, default: 'page' },
  // Homepage 'Enterprise & investments' card
  cardTag: String,
  cardPills: [String],
  cardImagePath: String,
  cardImageAlt: String,
  cardSize: { type: String, default: 'regular' },
  cardTheme: { type: String, default: 'dark' },
  cardHref: String,
})

/** PROJECT template: film and culture work. */
export const Project = defineModel('projects', {
  ...publishable,
  title: { type: String, required: true },
  slug: { type: String, required: true },
  creditStatus: { type: String, default: 'unresolved' },
  creditWording: String,
  summary: String,
  body: Mixed,
  runtimeMinutes: Number,
  releaseYear: Number,
  officialUrl: String,
  keyArt: ref('assets'),
  displayOrder: { type: Number, default: 100 },
  /** 'card' = only a card on the homepage/section; 'page' = card plus its own detail page. */
  displayAs: { type: String, default: 'page' },
  // Poster card on the homepage carousel and /film-culture
  category: String,
  tagline: String,
  cast: String,
  imdbUrl: String,
  posterPath: String,
  posterAlt: String,
  cardHref: String,
})

/** INITIATIVE template: impact programmes. */
export const Initiative = defineModel('initiatives', {
  ...publishable,
  title: { type: String, required: true },
  slug: { type: String, required: true },
  legalStatus: { type: String, default: 'unresolved' },
  focusArea: String,
  geography: String,
  summary: String,
  body: Mixed,
  outcomes: [{ _id: false, id: String, measure: String, methodologyNote: String, claim: ref('claims') }],
  partners: [{ _id: false, id: String, name: String, permissionOnFile: { type: Boolean, default: false } }],
  participationCriteria: String,
  displayOrder: { type: Number, default: 100 },
  /** 'card' = only a card on the homepage/section; 'page' = card plus its own detail page. */
  displayAs: { type: String, default: 'page' },
  // Focus-area tab on the homepage and /impact
  tag: String,
  shortLabel: String,
})

export const Download = defineModel('downloads', {
  _status: publishable._status,
  claims: publishable.claims,
  assets: publishable.assets,
  ownerRole: publishable.ownerRole,
  baselineNotes: publishable.baselineNotes,
  title: { type: String, required: true },
  downloadId: { type: String, required: true },
  version: { type: String, default: 'v1' },
  kind: String,
  file: ref('assets'),
  accessibleSummary: String,
})
