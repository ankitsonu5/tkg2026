/**
 * Event taxonomy (Section 11.2 / FR-AN-01).
 *
 * Event names and their minimum parameters are contractual. The adapter is
 * provider-independent; GA4 is the configured target but nothing here depends on it.
 *
 * Privacy rules enforced by `scrubParams` below:
 *  - never send names, emails, inquiry bodies or confidential fields
 *  - never send raw search text
 *  - never send a URL containing personal data (paths only, query stripped)
 *  - operational references (e.g. an inquiry reference) are separated from analytics IDs
 */

export const ANALYTICS_EVENTS = {
  primary_cta_click: ['page_id', 'module_id', 'cta_id', 'label', 'destination_type', 'owner_role'],
  form_start: ['form_id', 'inquiry_type', 'source_page'],
  form_submit: ['form_id', 'route_id', 'reference_id'],
  form_error: ['form_id', 'error_class', 'route_id'],
  download: ['asset_id', 'version', 'page_id', 'cta_id'],
  outbound_referral: ['entity_id', 'destination', 'cta_id'],
  search: ['query_class', 'result_count'],
  page_view: ['page_id', 'page_path'],
} as const

export type AnalyticsEventName = keyof typeof ANALYTICS_EVENTS

/** Parameter keys that must never leave the server, whatever a caller passes. */
const FORBIDDEN_KEYS = new Set([
  'email',
  'full_name',
  'fullName',
  'name',
  'phone',
  'message',
  'body',
  'query',
  'query_text',
  'qualification',
  'internal_notes',
])

const MAX_PARAM_LENGTH = 100

function scrubValue(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value !== 'string') return undefined
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, '').trim()
  if (!cleaned) return undefined
  return cleaned.slice(0, MAX_PARAM_LENGTH)
}

export function scrubParams(
  params: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const [key, raw] of Object.entries(params)) {
    if (FORBIDDEN_KEYS.has(key)) continue
    const value = scrubValue(raw)
    if (value !== undefined) out[key] = value
  }
  return out
}

/**
 * Search terms are bucketed rather than sent verbatim: a visitor may type a name, an email
 * or something confidential into a search box.
 */
export function classifyQuery(query: string): string {
  const trimmed = query.trim()
  if (!trimmed) return 'empty'
  if (trimmed.includes('@')) return 'contains-address'
  const words = trimmed.split(/\s+/).length
  if (words === 1) return 'single-term'
  if (words <= 3) return 'short-phrase'
  return 'long-phrase'
}
