/**
 * UTM / source attribution (FR-UTM-01).
 *
 * Attribution is consent-aware: when a visitor has not granted analytics consent, nothing is
 * persisted to browser storage and the inquiry records `consent-denied` rather than a
 * fabricated source. Values are sanitized and length-limited before they are stored or sent
 * anywhere, and URLs are stripped of query and fragment so personal data in a link cannot
 * leak into a lead record or an analytics payload.
 */

export const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const
export type UtmKey = (typeof UTM_KEYS)[number]

export const ATTRIBUTION_STORAGE_KEY = 'tkg.attribution.v1'
const MAX_VALUE_LENGTH = 120

export interface Attribution {
  sourcePage?: string
  entryPage?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
  attributionState: 'attributed' | 'unattributed' | 'consent-denied'
}

/** Strip control characters and quoting characters that could break a downstream log or CSV. */
export function sanitizeValue(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/["'`<>]/g, '')
    .trim()
  if (!cleaned) return undefined
  return cleaned.slice(0, MAX_VALUE_LENGTH)
}

/** Path only - query strings and fragments may carry personal data. */
export function sanitizePath(raw: unknown): string | undefined {
  const value = sanitizeValue(raw)
  if (!value) return undefined
  const withoutQuery = value.split('?')[0].split('#')[0]
  if (!withoutQuery.startsWith('/')) return undefined
  return withoutQuery.slice(0, MAX_VALUE_LENGTH)
}

export function readAttributionFromUrl(url: URL): Partial<Attribution> {
  const result: Partial<Attribution> = {}
  const map: Record<UtmKey, 'utmSource' | 'utmMedium' | 'utmCampaign' | 'utmTerm' | 'utmContent'> =
    {
      utm_source: 'utmSource',
      utm_medium: 'utmMedium',
      utm_campaign: 'utmCampaign',
      utm_term: 'utmTerm',
      utm_content: 'utmContent',
    }
  for (const key of UTM_KEYS) {
    const value = sanitizeValue(url.searchParams.get(key))
    if (value) result[map[key]] = value
  }
  return result
}

export function normalizeAttribution(
  input: Record<string, unknown>,
  analyticsConsent: boolean,
): Attribution {
  if (!analyticsConsent) {
    // Recorded honestly rather than silently inventing a source.
    return { attributionState: 'consent-denied' }
  }

  const attribution: Attribution = {
    sourcePage: sanitizePath(input.sourcePage),
    entryPage: sanitizePath(input.entryPage),
    utmSource: sanitizeValue(input.utmSource),
    utmMedium: sanitizeValue(input.utmMedium),
    utmCampaign: sanitizeValue(input.utmCampaign),
    utmTerm: sanitizeValue(input.utmTerm),
    utmContent: sanitizeValue(input.utmContent),
    attributionState: 'unattributed',
  }

  const hasSignal = Boolean(
    attribution.utmSource ||
      attribution.utmMedium ||
      attribution.utmCampaign ||
      attribution.entryPage,
  )
  attribution.attributionState = hasSignal ? 'attributed' : 'unattributed'

  return attribution
}
