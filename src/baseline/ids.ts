/**
 * Appendix A — Requirement ID Convention (Master Implementation Baseline v1.0).
 * These prefixes are contractual: tickets, designs, PRs, QA records and approvals
 * reference them. Do not rename without a change request (CR-YYYY-NNN).
 */
export const ID_PREFIXES = {
  PAGE: 'Public page/template',
  MOD: 'Reusable page module',
  FR: 'Functional requirement',
  CTA: 'Call to action',
  FORM: 'Inquiry form',
  CLAIM: 'Public claim/evidence record',
  AST: 'Asset/rights record',
  SEO: 'Metadata/schema record',
  QA: 'Acceptance test',
  DEF: 'Defect/exception',
  CR: 'Change request',
} as const

export type IdPrefix = keyof typeof ID_PREFIXES

/** Section 8 functional requirements. FR-SEARCH-01 is the only P1; all others are P0. */
export const FUNCTIONAL_REQUIREMENTS = [
  { id: 'FR-IA-01', priority: 'P0', requirement: 'Global navigation, breadcrumbs and footer follow the approved hierarchy.' },
  { id: 'FR-CMS-01', priority: 'P0', requirement: 'Editors manage assigned modular content without changing global tokens or publishing blocked evidence.' },
  { id: 'FR-CONT-01', priority: 'P0', requirement: 'Every page/module stores stable Page ID and Module ID.' },
  { id: 'FR-FORM-01', priority: 'P0', requirement: 'Seven qualified inquiry routes validate, submit, acknowledge and deliver to owners.' },
  { id: 'FR-ROUTE-01', priority: 'P0', requirement: 'Routing supports primary, backup, SLA and controlled escalation.' },
  { id: 'FR-SEARCH-01', priority: 'P1', requirement: 'Search returns current indexable content and excludes private/draft records.' },
  { id: 'FR-MEDIA-01', priority: 'P0', requirement: 'Video/audio uses approved sources, captions/transcripts and responsive controls.' },
  { id: 'FR-DL-01', priority: 'P0', requirement: 'Bios and press kits are versioned, accessible and trackable.' },
  { id: 'FR-AN-01', priority: 'P0', requirement: 'Consent-aware analytics records page, CTA, form start, submit, error and download events.' },
  { id: 'FR-UTM-01', priority: 'P0', requirement: 'UTM/source context persists through navigation and submission.' },
  { id: 'FR-SEO-01', priority: 'P0', requirement: 'Indexable pages have unique title, description, H1, canonical, OG and schema.' },
  { id: 'FR-A11Y-01', priority: 'P0', requirement: 'Core journeys support keyboard, focus, labels, contrast, zoom and screen-reader use.' },
  { id: 'FR-PRIV-01', priority: 'P0', requirement: 'Data collection, consent, retention and contact practices follow approved policy.' },
  { id: 'FR-SEC-01', priority: 'P0', requirement: 'TLS, secure headers, least privilege, validation, rate limiting and patching are active.' },
  { id: 'FR-PERF-01', priority: 'P0', requirement: 'Priority templates meet agreed Core Web Vitals/performance budgets.' },
  { id: 'FR-OPS-01', priority: 'P0', requirement: 'Monitoring, backups, release versioning and tested rollback are available.' },
] as const

/** Section 13 stage gates. Engineering may proceed on reversible work while content gates stay open. */
export const STAGE_GATES = [
  { id: 'G0', name: 'Baseline Lock', accountable: 'Ankit / Tel' },
  { id: 'G1', name: 'Content Ready', accountable: 'Editorial Lead' },
  { id: 'G2', name: 'UX/UI Ready', accountable: 'Design Lead' },
  { id: 'G3', name: 'Build Complete', accountable: 'Technical Lead' },
  { id: 'G4', name: 'QA Passed', accountable: 'Independent QA' },
  { id: 'G5', name: 'Launch Authorized', accountable: 'Tel / Ankit' },
  { id: 'G6', name: 'Stabilized', accountable: 'Website Owner' },
] as const
