import { getBaselineRoute, type BaselineInquiryRoute, type QualificationField } from '@/baseline/inquiry-routes'

/**
 * Server-side validation of a route submission (Section 7.2).
 *
 * The client validates too, for usability, but this is the authority: field presence, types,
 * lengths, email shape, date validity and URL protocol are all re-checked here. Anything not
 * declared in the route schema is discarded rather than stored.
 */

export interface FieldError {
  field: string
  errorClass: 'required' | 'format' | 'length' | 'unknown-option' | 'protocol'
  message: string
}

export interface ValidationOutcome {
  ok: boolean
  errors: FieldError[]
  /** Only the fields declared by the route schema, coerced and trimmed. */
  values: Record<string, string | boolean>
}

// Deliberately conservative: rejects the obviously invalid without pretending to be RFC 5322.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validateField(field: QualificationField, raw: unknown): { error?: FieldError; value?: string | boolean } {
  if (field.type === 'checkbox') {
    const value = raw === true || raw === 'true' || raw === 'on'
    if (field.required && !value) {
      return { error: { field: field.name, errorClass: 'required', message: `${field.label} is required.` } }
    }
    return { value }
  }

  const value = typeof raw === 'string' ? raw.trim() : ''

  if (!value) {
    if (field.required) {
      return { error: { field: field.name, errorClass: 'required', message: `${field.label} is required.` } }
    }
    return { value: '' }
  }

  const maxLength = field.maxLength ?? 1000
  if (value.length > maxLength) {
    return {
      error: { field: field.name, errorClass: 'length', message: `${field.label} must be ${maxLength} characters or fewer.` },
    }
  }

  if (field.type === 'email' && !EMAIL_RE.test(value)) {
    return { error: { field: field.name, errorClass: 'format', message: `${field.label} must be a valid email address.` } }
  }

  if (field.type === 'date') {
    const parsed = Date.parse(value)
    if (Number.isNaN(parsed)) {
      return { error: { field: field.name, errorClass: 'format', message: `${field.label} must be a valid date.` } }
    }
  }

  if (field.type === 'url') {
    try {
      const url = new URL(value)
      // Blocks javascript:, data: and file: destinations.
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { error: { field: field.name, errorClass: 'protocol', message: `${field.label} must be an http or https URL.` } }
      }
    } catch {
      return { error: { field: field.name, errorClass: 'format', message: `${field.label} must be a valid URL.` } }
    }
  }

  if (field.type === 'select' && field.options) {
    const allowed = field.options.map((o) => o.value)
    if (!allowed.includes(value)) {
      return { error: { field: field.name, errorClass: 'unknown-option', message: `${field.label} is not a recognized option.` } }
    }
  }

  return { value }
}

export function validateSubmission(routeId: string, input: Record<string, unknown>): ValidationOutcome {
  const route: BaselineInquiryRoute | undefined = getBaselineRoute(routeId)
  if (!route) {
    return {
      ok: false,
      errors: [{ field: 'route', errorClass: 'unknown-option', message: 'Unknown inquiry route.' }],
      values: {},
    }
  }

  const errors: FieldError[] = []
  const values: Record<string, string | boolean> = {}

  for (const field of route.fields) {
    const { error, value } = validateField(field, input[field.name])
    if (error) errors.push(error)
    else if (value !== undefined && value !== '') values[field.name] = value
  }

  // Consent is not a route field but is required before any submission is accepted.
  if (input.privacyAccepted !== true && input.privacyAccepted !== 'true' && input.privacyAccepted !== 'on') {
    errors.push({
      field: 'privacyAccepted',
      errorClass: 'required',
      message: 'You must accept the privacy notice before submitting.',
    })
  }

  return { ok: errors.length === 0, errors, values }
}
