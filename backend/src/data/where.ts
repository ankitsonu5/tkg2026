import { Types } from 'mongoose'

/**
 * Query language for the content API: the same `where` shape the site used with Payload,
 * translated to a MongoDB filter.
 *
 *   { and: [{ slug: { equals: 'x' } }, { _status: { equals: 'published' } }] }
 *   { or:  [{ title: { like: 'growth' } }, { excerpt: { like: 'growth' } }] }
 *
 * Operators: equals, not_equals, in, not_in, all, exists, greater_than, greater_than_equal,
 * less_than, less_than_equal, like, contains.
 */

export type WhereField = Partial<Record<Operator, unknown>>
export type Where = { and?: Where[]; or?: Where[] } & { [field: string]: WhereField | Where[] | undefined }

type Operator =
  | 'equals'
  | 'not_equals'
  | 'in'
  | 'not_in'
  | 'all'
  | 'exists'
  | 'greater_than'
  | 'greater_than_equal'
  | 'less_than'
  | 'less_than_equal'
  | 'like'
  | 'contains'

const OPERATORS = new Set<string>([
  'equals',
  'not_equals',
  'in',
  'not_in',
  'all',
  'exists',
  'greater_than',
  'greater_than_equal',
  'less_than',
  'less_than_equal',
  'like',
  'contains',
])

const OBJECT_ID = /^[a-f0-9]{24}$/i
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/

export class InvalidQueryError extends Error {}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Relationship IDs are stored as ObjectIds, and dates as BSON dates, but arrive over JSON as
 * strings. A 24-hex string matches either representation; an ISO timestamp becomes a Date.
 */
function candidates(value: unknown): unknown[] {
  if (typeof value === 'string' && OBJECT_ID.test(value)) return [value, new Types.ObjectId(value)]
  if (typeof value === 'string' && ISO_DATE.test(value)) return [new Date(value)]
  return [value]
}

function scalar(value: unknown): unknown {
  if (typeof value === 'string' && ISO_DATE.test(value)) return new Date(value)
  return value
}

function toList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split(',')
  return [value]
}

function fieldCondition(op: string, value: unknown): Record<string, unknown> {
  switch (op) {
    case 'equals': {
      const options = candidates(value)
      return options.length > 1 ? { $in: options } : { $eq: options[0] }
    }
    case 'not_equals': {
      const options = candidates(value)
      return options.length > 1 ? { $nin: options } : { $ne: options[0] }
    }
    case 'in':
      return { $in: toList(value).flatMap(candidates) }
    case 'not_in':
      return { $nin: toList(value).flatMap(candidates) }
    case 'all':
      return { $all: toList(value).flatMap(candidates) }
    case 'exists':
      return { $exists: value === true || value === 'true' }
    case 'greater_than':
      return { $gt: scalar(value) }
    case 'greater_than_equal':
      return { $gte: scalar(value) }
    case 'less_than':
      return { $lt: scalar(value) }
    case 'less_than_equal':
      return { $lte: scalar(value) }
    case 'contains':
      return { $regex: escapeRegex(String(value ?? '')), $options: 'i' }
    default:
      throw new InvalidQueryError(`Unsupported operator "${op}".`)
  }
}

export function buildFilter(where: Where | undefined | null): Record<string, unknown> {
  if (!where || typeof where !== 'object') return {}
  const clauses: Record<string, unknown>[] = []

  for (const [key, condition] of Object.entries(where)) {
    if (condition === undefined) continue

    if (key === 'and' || key === 'or') {
      if (!Array.isArray(condition)) throw new InvalidQueryError(`"${key}" must be an array.`)
      const parts = condition.map((part) => buildFilter(part as Where)).filter((f) => Object.keys(f).length > 0)
      if (parts.length > 0) clauses.push({ [key === 'and' ? '$and' : '$or']: parts })
      continue
    }

    if (key.startsWith('$')) throw new InvalidQueryError(`Invalid field "${key}".`)
    if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
      throw new InvalidQueryError(`Condition for "${key}" must be an object of operators.`)
    }

    const field = key === 'id' ? '_id' : key

    for (const [op, value] of Object.entries(condition)) {
      if (!OPERATORS.has(op)) throw new InvalidQueryError(`Unsupported operator "${op}".`)

      if (op === 'like') {
        // Every word must appear somewhere in the field, case-insensitively.
        const words = String(value ?? '')
          .split(/\s+/)
          .filter(Boolean)
        const parts = words.map((word) => ({ [field]: { $regex: escapeRegex(word), $options: 'i' } }))
        if (parts.length > 0) clauses.push({ $and: parts })
        continue
      }

      clauses.push({ [field]: fieldCondition(op, value) })
    }
  }

  if (clauses.length === 0) return {}
  if (clauses.length === 1) return clauses[0]
  return { $and: clauses }
}

/** `'-createdAt'` / `'displayOrder'` / `['a', '-b']` -> a MongoDB sort document. */
export function buildSort(sort: string | string[] | undefined): Record<string, 1 | -1> {
  const fields = (Array.isArray(sort) ? sort : sort ? String(sort).split(',') : ['-createdAt'])
    .map((s) => s.trim())
    .filter(Boolean)
  const out: Record<string, 1 | -1> = {}
  for (const field of fields) {
    const desc = field.startsWith('-')
    let name = desc ? field.slice(1) : field
    if (name === 'id') name = '_id'
    if (name.startsWith('$')) throw new InvalidQueryError(`Invalid sort field "${name}".`)
    out[name] = desc ? -1 : 1
  }
  return out
}
