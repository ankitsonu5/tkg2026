import mongoose, { Schema, type SchemaDefinition } from 'mongoose'

/**
 * The database was created by Payload CMS, and these models read and write the same
 * collections in place, with no data migration:
 *  - collection names are the old Payload slugs (`inquiry-routes`, `delivery-attempts`, ...)
 *  - `strict: false` keeps every stored field, including ones not declared here
 *  - indexes already exist in the database, so Mongoose must not try to build or drop them
 */
export function defineModel(collection: string, definition: SchemaDefinition, options: { strict?: boolean } = {}) {
  const schema = new Schema(definition, {
    collection,
    timestamps: true,
    strict: options.strict ?? false,
    minimize: false,
    autoIndex: false,
    autoCreate: false,
  })
  return (mongoose.models[collection] as mongoose.Model<Record<string, unknown>>) ?? mongoose.model(collection, schema)
}

export const ObjectId = Schema.Types.ObjectId
export const Mixed = Schema.Types.Mixed

/** Relationship to one document, stored as an ObjectId exactly as Payload stored it. */
export const ref = (to: string) => ({ type: ObjectId, ref: to })
export const refMany = (to: string) => [{ type: ObjectId, ref: to }]

/** Fields every publishable record carries (evidence links, SEO, ownership). */
export const publishable = {
  _status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  claims: refMany('claims'),
  assets: refMany('assets'),
  seo: {
    seoId: String,
    title: String,
    description: String,
    noindex: { type: Boolean, default: false },
    ogImage: ref('assets'),
  },
  /** Rank Math-style analysis: the focus keyword and the last computed 0-100 score. */
  seoAnalysis: { focusKeyword: String, score: Number },
  ownerRole: { type: String, default: 'Editorial Lead' },
  baselineNotes: String,
}
