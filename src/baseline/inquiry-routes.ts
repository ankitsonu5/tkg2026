/**
 * Section 7.1 — Priority Lead Routes. These seven routes are preserved exactly.
 *
 * Owner ROLES are baseline. Named people, mailboxes and backups are deliberately absent:
 * the baseline forbids inventing them (R-03, Appendix C). They are configured per
 * environment in the `inquiry-routes` collection and must be accepted in writing by the
 * owner before a route can be accepted for production (see docs/OWNERS_AND_ROUTES.md).
 */

export type InquiryRouteId =
  | 'strategic-partnership'
  | 'investment-ma'
  | 'speaking'
  | 'media'
  | 'creative'
  | 'impact'
  | 'general'

export interface QualificationField {
  /** Field name persisted on the inquiry's qualification payload. */
  name: string
  label: string
  type: 'text' | 'textarea' | 'email' | 'date' | 'url' | 'select' | 'checkbox'
  required: boolean
  /** Stated qualification purpose. Section 7.2 forbids collecting a field without one. */
  purpose: string
  options?: { label: string; value: string }[]
  maxLength?: number
}

export interface BaselineInquiryRoute {
  routeId: InquiryRouteId
  /** FORM ID per Appendix A. */
  formId: string
  label: string
  /** Verbatim minimum qualification wording from the baseline table. */
  minimumQualification: string
  ownerRole: string
  /** Baseline SLA in hours. Elapsed-vs-business-hours is a configurable operational policy. */
  slaHours: number
  /** Verbatim Tel escalation criterion. */
  escalationCriterion: string
  /** General never escalates directly to Tel; it is reclassified to the right owner. */
  escalatesToTel: boolean
  fields: QualificationField[]
}

const CONTACT_FIELDS: QualificationField[] = [
  { name: 'fullName', label: 'Full name', type: 'text', required: true, purpose: 'Identify the sender so an owner can respond accountably.', maxLength: 200 },
  { name: 'email', label: 'Email address', type: 'email', required: true, purpose: 'The only channel used to acknowledge and respond to the inquiry.', maxLength: 320 },
]

export const BASELINE_INQUIRY_ROUTES: BaselineInquiryRoute[] = [
  {
    routeId: 'strategic-partnership',
    formId: 'FORM-STRATEGIC-PARTNERSHIP',
    label: 'Strategic Partnership',
    minimumQualification: 'Organization, authority, objective, fit, timing',
    ownerRole: 'Partnership Lead',
    slaHours: 24,
    escalationCriterion: 'Material enterprise value, capital, reputation or relationship',
    escalatesToTel: true,
    fields: [
      ...CONTACT_FIELDS,
      { name: 'organization', label: 'Organization', type: 'text', required: true, purpose: 'Establish the counterparty for partnership assessment.', maxLength: 200 },
      { name: 'authority', label: 'Your authority in this discussion', type: 'select', required: true, purpose: 'Confirm the sender can progress a partnership discussion.', options: [
        { label: 'Decision maker', value: 'decision-maker' },
        { label: 'Authorized representative', value: 'authorized-representative' },
        { label: 'Exploratory / no mandate yet', value: 'exploratory' },
      ] },
      { name: 'objective', label: 'Partnership objective', type: 'textarea', required: true, purpose: 'Assess what outcome the partnership is meant to produce.', maxLength: 2000 },
      { name: 'fit', label: 'Why this is a fit', type: 'textarea', required: true, purpose: 'Assess strategic fit before committing executive attention.', maxLength: 2000 },
      { name: 'timing', label: 'Timing', type: 'text', required: true, purpose: 'Prioritize against the response SLA and pipeline.', maxLength: 200 },
    ],
  },
  {
    routeId: 'investment-ma',
    formId: 'FORM-INVESTMENT-MA',
    label: 'Investment / M&A',
    minimumQualification: 'Principal identity, thesis, relevance, authority, timing, confidentiality',
    ownerRole: 'Chief of Staff',
    slaHours: 24,
    escalationCriterion: 'M&A, capital allocation, governance or irreversible commitment',
    escalatesToTel: true,
    fields: [
      ...CONTACT_FIELDS,
      { name: 'principalIdentity', label: 'Principal / firm', type: 'text', required: true, purpose: 'Identify the principal behind the approach.', maxLength: 200 },
      { name: 'thesis', label: 'Investment or transaction thesis', type: 'textarea', required: true, purpose: 'Assess the substance of the proposal before any conversation.', maxLength: 2000 },
      { name: 'relevance', label: 'Relevance to current activity', type: 'textarea', required: true, purpose: 'Filter approaches unrelated to current holdings or mandate.', maxLength: 2000 },
      { name: 'authority', label: 'Mandate / authority', type: 'select', required: true, purpose: 'Confirm the sender can transact or represent a principal.', options: [
        { label: 'Principal', value: 'principal' },
        { label: 'Mandated adviser', value: 'mandated-adviser' },
        { label: 'Intermediary without mandate', value: 'intermediary' },
      ] },
      { name: 'timing', label: 'Timing', type: 'text', required: true, purpose: 'Prioritize time-bound processes.', maxLength: 200 },
      { name: 'confidentiality', label: 'Confidentiality requirement', type: 'textarea', required: true, purpose: 'Handle the inquiry under the correct confidentiality expectation.', maxLength: 1000 },
    ],
  },
  {
    routeId: 'speaking',
    formId: 'FORM-SPEAKING',
    label: 'Speaking',
    minimumQualification: 'Event, audience, objective, date, location, format, budget',
    ownerRole: 'Media & Speaking Lead',
    slaHours: 24,
    escalationCriterion: 'Strategic audience, major fee, schedule or reputation tradeoff',
    escalatesToTel: true,
    fields: [
      ...CONTACT_FIELDS,
      { name: 'event', label: 'Event name and organizer', type: 'text', required: true, purpose: 'Identify the event and host organization.', maxLength: 300 },
      { name: 'audience', label: 'Audience profile and size', type: 'textarea', required: true, purpose: 'Assess audience relevance against speaking priorities.', maxLength: 1000 },
      { name: 'objective', label: 'Objective for the session', type: 'textarea', required: true, purpose: 'Match the request to approved topics.', maxLength: 2000 },
      { name: 'eventDate', label: 'Event date', type: 'date', required: true, purpose: 'Check schedule feasibility.' },
      { name: 'location', label: 'Location', type: 'text', required: true, purpose: 'Assess travel and feasibility.', maxLength: 300 },
      { name: 'format', label: 'Format', type: 'select', required: true, purpose: 'Determine preparation and delivery requirements.', options: [
        { label: 'Keynote', value: 'keynote' },
        { label: 'Fireside chat', value: 'fireside' },
        { label: 'Panel', value: 'panel' },
        { label: 'Workshop', value: 'workshop' },
        { label: 'Virtual', value: 'virtual' },
      ] },
      { name: 'budget', label: 'Speaking budget', type: 'text', required: true, purpose: 'Qualify the engagement commercially before owner time is spent.', maxLength: 200 },
    ],
  },
  {
    routeId: 'media',
    formId: 'FORM-MEDIA',
    label: 'Media',
    minimumQualification: 'Outlet, topic, format, deadline and requested assets',
    ownerRole: 'PR / Media Lead',
    // Shortest SLA in the baseline: media deadlines are same-day sensitive.
    slaHours: 4,
    escalationCriterion: 'Tier-one outlet, crisis, legal sensitivity or same-day response',
    escalatesToTel: true,
    fields: [
      ...CONTACT_FIELDS,
      { name: 'outlet', label: 'Outlet', type: 'text', required: true, purpose: 'Identify the publication and assess tier.', maxLength: 200 },
      { name: 'topic', label: 'Topic', type: 'textarea', required: true, purpose: 'Match against approved topics and legal sensitivity.', maxLength: 2000 },
      { name: 'format', label: 'Format', type: 'select', required: true, purpose: 'Determine preparation and rights requirements.', options: [
        { label: 'Written interview', value: 'written' },
        { label: 'Live interview', value: 'live' },
        { label: 'Recorded broadcast', value: 'broadcast' },
        { label: 'Quote / comment', value: 'quote' },
        { label: 'Background briefing', value: 'background' },
      ] },
      { name: 'deadline', label: 'Deadline', type: 'date', required: true, purpose: 'Meet the 4-hour SLA against a real publication deadline.' },
      { name: 'requestedAssets', label: 'Requested assets', type: 'textarea', required: true, purpose: 'Release only rights-cleared, approved assets.', maxLength: 1000 },
    ],
  },
  {
    routeId: 'creative',
    formId: 'FORM-CREATIVE',
    label: 'Creative',
    minimumQualification: 'Project, role, readiness, rights/financing and timing',
    ownerRole: 'Film & Culture Lead',
    slaHours: 72,
    escalationCriterion: 'Material rights, financing, distribution or reputation exposure',
    escalatesToTel: true,
    fields: [
      ...CONTACT_FIELDS,
      { name: 'project', label: 'Project', type: 'textarea', required: true, purpose: 'Understand the creative work being proposed.', maxLength: 2000 },
      { name: 'role', label: 'Role sought', type: 'text', required: true, purpose: 'Clarify the exact role requested; no inferred credits.', maxLength: 300 },
      { name: 'readiness', label: 'Project readiness', type: 'select', required: true, purpose: 'Filter concepts from financed projects.', options: [
        { label: 'Concept', value: 'concept' },
        { label: 'Development', value: 'development' },
        { label: 'Financed', value: 'financed' },
        { label: 'In production', value: 'production' },
        { label: 'Post / distribution', value: 'post' },
      ] },
      { name: 'rightsFinancing', label: 'Rights and financing status', type: 'textarea', required: true, purpose: 'Assess rights and financing exposure before engagement.', maxLength: 2000 },
      { name: 'timing', label: 'Timing', type: 'text', required: true, purpose: 'Assess schedule feasibility.', maxLength: 200 },
    ],
  },
  {
    routeId: 'impact',
    formId: 'FORM-IMPACT',
    label: 'Impact',
    minimumQualification: 'Organization, initiative, geography, role, evidence and timing',
    ownerRole: 'Impact Lead',
    slaHours: 48,
    escalationCriterion: 'Public commitment, board role, major funding or reputation',
    escalatesToTel: true,
    fields: [
      ...CONTACT_FIELDS,
      { name: 'organization', label: 'Organization', type: 'text', required: true, purpose: 'Identify the partner organization and its status.', maxLength: 200 },
      { name: 'initiative', label: 'Initiative', type: 'textarea', required: true, purpose: 'Understand the program being proposed.', maxLength: 2000 },
      { name: 'geography', label: 'Geography', type: 'text', required: true, purpose: 'Match against defined impact focus geographies.', maxLength: 200 },
      { name: 'role', label: 'Role sought', type: 'text', required: true, purpose: 'Clarify the requested involvement; board roles escalate.', maxLength: 300 },
      { name: 'evidence', label: 'Outcome evidence', type: 'textarea', required: true, purpose: 'Baseline forbids outcome claims without auditable methodology.', maxLength: 2000 },
      { name: 'timing', label: 'Timing', type: 'text', required: true, purpose: 'Assess schedule and commitment window.', maxLength: 200 },
    ],
  },
  {
    routeId: 'general',
    formId: 'FORM-GENERAL',
    label: 'General',
    minimumQualification: 'Identifiable sender and request not fitting another route',
    ownerRole: 'Website Coordinator',
    slaHours: 48,
    escalationCriterion: 'Do not escalate; reclassify to correct owner',
    // Explicitly false: the baseline forbids a routine direct-to-Tel path.
    escalatesToTel: false,
    fields: [
      ...CONTACT_FIELDS,
      { name: 'request', label: 'Your request', type: 'textarea', required: true, purpose: 'Understand the request so the coordinator can reclassify it to the right owner.', maxLength: 4000 },
      { name: 'organization', label: 'Organization (optional)', type: 'text', required: false, purpose: 'Optional context to help reclassification.', maxLength: 200 },
    ],
  },
]

export const INQUIRY_ROUTE_IDS = BASELINE_INQUIRY_ROUTES.map((r) => r.routeId)

export function getBaselineRoute(routeId: string): BaselineInquiryRoute | undefined {
  return BASELINE_INQUIRY_ROUTES.find((r) => r.routeId === routeId)
}
