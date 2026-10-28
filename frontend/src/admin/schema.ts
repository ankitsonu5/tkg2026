/**
 * Admin panel definition: which collections appear in the menu, how their lists look and
 * which fields their edit screens have. The backend (backend/src/models) owns the data and
 * the rules; this file only describes the forms.
 */

export type OptionSource = 'roles' | 'inquiryRoutes' | 'pageIds' | 'moduleIds'
export type Option = { value: string; label: string }

export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'url'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'date'
  | 'datetime'
  | 'relationship'
  | 'upload'
  | 'richText'
  | 'array'
  | 'group'
  | 'json'
  | 'password'
  | 'tags'

export interface Field {
  name: string
  label: string
  type: FieldType
  required?: boolean
  help?: string
  /** Shown in the right-hand column (like WordPress's sidebar boxes). */
  sidebar?: boolean
  readOnly?: boolean
  options?: Option[] | OptionSource
  /** select / relationship: several values. */
  many?: boolean
  relationTo?: string
  /** array / group sub-fields. */
  fields?: Field[]
  /** array: label for one row. */
  rowLabel?: string
  /** Only shown when this returns true for the current values. */
  condition?: (values: Record<string, any>) => boolean
  /** Auto-fill from another field while empty (slugs). */
  slugFrom?: string
  placeholder?: string
}

export interface Column {
  name: string
  label: string
  kind?: 'title' | 'status' | 'date' | 'thumb' | 'badge' | 'score' | 'list' | 'bool'
}

export interface CollectionDef {
  slug: string
  label: string
  singular: string
  icon: string
  menuGroup: 'content' | 'engage' | 'evidence' | 'settings' | 'tools'
  titleField: string
  drafts?: boolean
  canCreate?: boolean
  columns: Column[]
  fields: Field[]
  defaultSort?: string
  /** Public URL of a document, for the "View" link. */
  viewPath?: (doc: Record<string, any>) => string | null
  /** Default values for "Add New". */
  defaults?: Record<string, unknown>
  /** Filter links above the list ("All | Published | Draft"). */
  statusField?: string
  statusLabels?: Record<string, string>
}

const opts = (...values: string[]): Option[] =>
  values.map((v) => ({ value: v, label: v.replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase()) }))

/** Rank Math-style focus keyword; the SEO analysis box in the sidebar scores against it. */
const focusKeywordGroup: Field = {
  name: 'seoAnalysis',
  label: 'Focus keyword',
  type: 'group',
  fields: [{ name: 'focusKeyword', label: 'Focus keyword', type: 'text', help: 'The search phrase this page should rank for. Separate several with commas; the first is scored.' }],
}

const seoGroup: Field = {
  name: 'seo',
  label: 'SEO & social',
  type: 'group',
  fields: [
    { name: 'seoId', label: 'SEO record ID', type: 'text', placeholder: 'SEO-…' },
    { name: 'title', label: 'SEO title', type: 'text', help: 'Up to ~60 characters. Falls back to the title.' },
    { name: 'description', label: 'Meta description', type: 'textarea', help: 'Up to ~155 characters. Falls back to the excerpt/summary.' },
    { name: 'noindex', label: 'Hide from search engines (noindex)', type: 'checkbox' },
    { name: 'ogImage', label: 'Social share image (1200×630)', type: 'upload' },
  ],
}

const evidenceFields: Field[] = [
  { name: 'claims', label: 'Claims on this record', type: 'relationship', relationTo: 'claims', many: true, sidebar: true, help: 'Publishing is blocked until every linked claim is Ready.' },
  { name: 'assets', label: 'Assets on this record', type: 'relationship', relationTo: 'assets', many: true, sidebar: true, help: 'Every asset must have cleared rights, alt text and credit.' },
]

const ownershipFields: Field[] = [
  { name: 'ownerRole', label: 'Owner role', type: 'text', sidebar: true },
  { name: 'baselineNotes', label: 'Traceability notes', type: 'textarea', sidebar: true },
]

const statusLabels = { published: 'Published', draft: 'Draft' }

const displayAsField: Field = {
  name: 'displayAs',
  label: 'Display as',
  type: 'select',
  sidebar: true,
  options: [
    { value: 'card', label: 'Card only (homepage / section card)' },
    { value: 'page', label: 'Card + its own detail page' },
  ],
  help: 'Card only: shown as a card, with no separate page, search result or sitemap entry.',
}

export const COLLECTIONS: CollectionDef[] = [
  {
    slug: 'articles',
    label: 'Posts',
    singular: 'Post',
    icon: 'post',
    menuGroup: 'content',
    titleField: 'title',
    drafts: true,
    statusField: '_status',
    statusLabels,
    defaults: { topic: 'leadership', authorshipStatus: 'authored', isFramework: false, _status: 'draft' },
    columns: [
      { name: 'title', label: 'Title', kind: 'title' },
      { name: 'topic', label: 'Topic', kind: 'badge' },
      { name: 'tags', label: 'Tags', kind: 'list' },
      { name: 'seoAnalysis.score', label: 'SEO', kind: 'score' },
      { name: 'publishedDate', label: 'Date', kind: 'date' },
    ],
    viewPath: (d) => (d.slug ? `/ideas/${d.slug}` : null),
    fields: [
      { name: 'slug', label: 'Permalink (slug)', type: 'text', required: true, slugFrom: 'title' },
      { name: 'body', label: 'Content', type: 'richText' },
      { name: 'excerpt', label: 'Excerpt', type: 'textarea', help: 'Shown on cards and used as the search snippet. Up to 400 characters.' },
      { name: 'topic', label: 'Topic', type: 'select', required: true, sidebar: true, options: opts('enterprise', 'leadership', 'investing', 'mind-trap', 'culture', 'impact') },
      { name: 'tags', label: 'Tags', type: 'tags', sidebar: true },
      { name: 'heroImage', label: 'Featured image', type: 'upload', sidebar: true },
      { name: 'publishedDate', label: 'Publish date', type: 'datetime', sidebar: true },
      { name: 'authorshipStatus', label: 'Authorship', type: 'select', required: true, sidebar: true, options: opts('authored', 'co-authored', 'unresolved'), help: '"Unresolved" blocks publishing.' },
      { name: 'isFramework', label: 'This is a framework', type: 'checkbox', sidebar: true },
      { name: 'related', label: 'Related posts', type: 'relationship', relationTo: 'articles', many: true, sidebar: true },
      focusKeywordGroup,
      seoGroup,
      ...evidenceFields,
      ...ownershipFields,
    ],
  },
  {
    slug: 'pages',
    label: 'Pages',
    singular: 'Page',
    icon: 'page',
    menuGroup: 'content',
    titleField: 'title',
    drafts: true,
    statusField: '_status',
    statusLabels,
    defaults: { _status: 'draft' },
    columns: [
      { name: 'title', label: 'Title', kind: 'title' },
      { name: 'pageId', label: 'Page ID', kind: 'badge' },
      { name: 'path', label: 'Path' },
      { name: 'seoAnalysis.score', label: 'SEO', kind: 'score' },
      { name: 'updatedAt', label: 'Last modified', kind: 'date' },
    ],
    viewPath: (d) => d.path ?? null,
    fields: [
      {
        name: 'pageId',
        label: 'Page ID',
        type: 'select',
        sidebar: true,
        options: 'pageIds',
        help: 'Built-in pages only (administrators). Leave empty for a new page of your own.',
        condition: (v) => !v.id || Boolean(v.pageId),
      },
      { name: 'path', label: 'Path', type: 'text', sidebar: true, placeholder: '/my-new-page', help: 'Where the page lives on the website. Left empty, it is made from the title.' },
      { name: 'body', label: 'Content', type: 'richText', condition: (v) => !v.pageId },
      { name: 'purpose', label: 'Summary', type: 'textarea', help: 'Used as the meta description when no SEO description is set.' },
      { name: 'heroImage', label: 'Featured image', type: 'upload', sidebar: true, condition: (v) => !v.pageId },
      {
        name: 'primaryCta',
        label: 'Primary call to action',
        type: 'group',
        fields: [
          { name: 'ctaId', label: 'CTA ID', type: 'text' },
          { name: 'label', label: 'Label', type: 'text' },
          { name: 'destinationType', label: 'Destination type', type: 'select', options: opts('internal', 'inquiry', 'external', 'download', 'subscribe') },
          { name: 'destination', label: 'Destination', type: 'text' },
        ],
      },
      { name: 'modules', label: 'Modules (advanced, JSON)', type: 'json', help: 'Approved content modules. While empty, the page shows its built-in baseline layout.' },
      focusKeywordGroup,
      seoGroup,
      ...evidenceFields,
      ...ownershipFields,
    ],
  },
  {
    slug: 'entities',
    label: 'Enterprises',
    singular: 'Enterprise',
    icon: 'building',
    menuGroup: 'content',
    titleField: 'name',
    drafts: true,
    statusField: '_status',
    statusLabels,
    defaults: { relationshipStatus: 'unresolved', displayOrder: 100, displayAs: 'page', cardSize: 'regular', cardTheme: 'dark', _status: 'draft' },
    defaultSort: 'displayOrder',
    columns: [
      { name: 'name', label: 'Name', kind: 'title' },
      { name: 'cardTag', label: 'Card tag' },
      { name: 'relationshipStatus', label: 'Relationship', kind: 'badge' },
      { name: 'displayAs', label: 'Display', kind: 'badge' },
      { name: 'seoAnalysis.score', label: 'SEO', kind: 'score' },
      { name: 'displayOrder', label: 'Order' },
    ],
    viewPath: (d) => (d.displayAs === 'card' ? '/' : d.slug ? `/enterprise-investments/${d.slug}` : null),
    fields: [
      { name: 'slug', label: 'Slug', type: 'text', required: true, slugFrom: 'name' },
      { name: 'summary', label: 'Summary (card description)', type: 'textarea' },
      { name: 'cardTag', label: 'Card tag', type: 'text', placeholder: '01 / Flagship enterprise' },
      { name: 'cardPills', label: 'Card pills', type: 'tags' },
      { name: 'cardImagePath', label: 'Card image path', type: 'text', placeholder: '/images/ventures/…', help: 'An image already on the website. An uploaded, rights-cleared Logo (right) takes priority.' },
      { name: 'cardImageAlt', label: 'Card image alt text', type: 'text' },
      { name: 'cardSize', label: 'Card size', type: 'select', options: [{ value: 'hero', label: 'Large (hero)' }, { value: 'wide', label: 'Wide' }, { value: 'regular', label: 'Regular' }] },
      { name: 'cardTheme', label: 'Card style', type: 'select', options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] },
      { name: 'cardHref', label: 'Card link', type: 'text', placeholder: '/enterprise-investments' },
      { name: 'body', label: 'Content', type: 'richText' },
      { name: 'relationshipStatus', label: 'Relationship status', type: 'select', required: true, sidebar: true, options: opts('current', 'former', 'unresolved') },
      { name: 'relationshipWording', label: 'Exact relationship wording', type: 'text', sidebar: true },
      { name: 'isFlagship', label: 'Flagship', type: 'checkbox', sidebar: true },
      { name: 'officialUrl', label: 'Official URL', type: 'url', sidebar: true },
      { name: 'logo', label: 'Logo', type: 'upload', sidebar: true },
      displayAsField,
      { name: 'displayOrder', label: 'Display order', type: 'number', sidebar: true },
      focusKeywordGroup,
      seoGroup,
      ...evidenceFields,
      ...ownershipFields,
    ],
  },
  {
    slug: 'projects',
    label: 'Film & Culture',
    singular: 'Project',
    icon: 'film',
    menuGroup: 'content',
    titleField: 'title',
    drafts: true,
    statusField: '_status',
    statusLabels,
    defaults: { creditStatus: 'unresolved', displayOrder: 100, displayAs: 'card', _status: 'draft' },
    defaultSort: 'displayOrder',
    columns: [
      { name: 'title', label: 'Title', kind: 'title' },
      { name: 'category', label: 'Category' },
      { name: 'creditStatus', label: 'Credit', kind: 'badge' },
      { name: 'displayAs', label: 'Display', kind: 'badge' },
      { name: 'seoAnalysis.score', label: 'SEO', kind: 'score' },
      { name: 'displayOrder', label: 'Order' },
    ],
    viewPath: (d) => (d.displayAs === 'card' ? '/film-culture' : d.slug ? `/film-culture/${d.slug}` : null),
    fields: [
      { name: 'slug', label: 'Slug', type: 'text', required: true, slugFrom: 'title' },
      { name: 'category', label: 'Category', type: 'text', placeholder: 'FEATURE FILM' },
      { name: 'tagline', label: 'Tagline', type: 'text' },
      { name: 'cast', label: 'Cast', type: 'text', placeholder: 'Name • Name • Name' },
      { name: 'summary', label: 'Summary', type: 'textarea' },
      { name: 'posterPath', label: 'Poster image path', type: 'text', placeholder: '/images/films/…', help: 'An image already on the website. An uploaded, rights-cleared Key art (right) takes priority.' },
      { name: 'posterAlt', label: 'Poster alt text', type: 'text' },
      { name: 'imdbUrl', label: 'IMDb link', type: 'url' },
      { name: 'cardHref', label: 'Card link', type: 'text', placeholder: '/film-culture' },
      { name: 'body', label: 'Content', type: 'richText' },
      { name: 'creditStatus', label: 'Credit status', type: 'select', required: true, sidebar: true, options: opts('verified', 'unresolved') },
      { name: 'creditWording', label: 'Exact screen credit', type: 'text', sidebar: true },
      { name: 'releaseYear', label: 'Release year', type: 'number', sidebar: true },
      { name: 'runtimeMinutes', label: 'Runtime (minutes)', type: 'number', sidebar: true },
      { name: 'officialUrl', label: 'Official URL', type: 'url', sidebar: true },
      { name: 'keyArt', label: 'Key art', type: 'upload', sidebar: true },
      displayAsField,
      { name: 'displayOrder', label: 'Display order', type: 'number', sidebar: true },
      focusKeywordGroup,
      seoGroup,
      ...evidenceFields,
      ...ownershipFields,
    ],
  },
  {
    slug: 'initiatives',
    label: 'Impact',
    singular: 'Initiative',
    icon: 'heart',
    menuGroup: 'content',
    titleField: 'title',
    drafts: true,
    statusField: '_status',
    statusLabels,
    defaults: { legalStatus: 'unresolved', displayOrder: 100, displayAs: 'page', _status: 'draft' },
    defaultSort: 'displayOrder',
    columns: [
      { name: 'title', label: 'Title', kind: 'title' },
      { name: 'tag', label: 'Tag' },
      { name: 'focusArea', label: 'Focus area' },
      { name: 'displayAs', label: 'Display', kind: 'badge' },
      { name: 'seoAnalysis.score', label: 'SEO', kind: 'score' },
      { name: 'displayOrder', label: 'Order' },
    ],
    viewPath: (d) => (d.displayAs === 'card' ? '/impact' : d.slug ? `/impact/${d.slug}` : null),
    fields: [
      { name: 'slug', label: 'Slug', type: 'text', required: true, slugFrom: 'title' },
      { name: 'summary', label: 'Summary (card description)', type: 'textarea' },
      { name: 'tag', label: 'Tag', type: 'text', placeholder: 'Focus Area 01' },
      { name: 'shortLabel', label: 'Short label (tab name)', type: 'text' },
      { name: 'body', label: 'Content', type: 'richText' },
      {
        name: 'outcomes',
        label: 'Outcomes',
        type: 'array',
        rowLabel: 'Outcome',
        fields: [
          { name: 'measure', label: 'Measure', type: 'text', required: true },
          { name: 'methodologyNote', label: 'Methodology note', type: 'textarea', required: true },
          { name: 'claim', label: 'Supporting claim', type: 'relationship', relationTo: 'claims', required: true },
        ],
      },
      {
        name: 'partners',
        label: 'Partners',
        type: 'array',
        rowLabel: 'Partner',
        fields: [
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'permissionOnFile', label: 'Permission on file', type: 'checkbox' },
        ],
      },
      { name: 'participationCriteria', label: 'Participation criteria', type: 'textarea' },
      { name: 'legalStatus', label: 'Legal status', type: 'select', required: true, sidebar: true, options: opts('registered', 'program', 'unresolved') },
      { name: 'focusArea', label: 'Focus area', type: 'text', sidebar: true },
      { name: 'geography', label: 'Geography', type: 'text', sidebar: true },
      { ...displayAsField, help: 'Card only = a focus-area tab on the homepage and /impact. Card + page = a program listed under Initiatives, with its own page.' },
      { name: 'displayOrder', label: 'Display order', type: 'number', sidebar: true },
      focusKeywordGroup,
      seoGroup,
      ...evidenceFields,
      ...ownershipFields,
    ],
  },
  {
    slug: 'downloads',
    label: 'Downloads',
    singular: 'Download',
    icon: 'download',
    menuGroup: 'content',
    titleField: 'title',
    drafts: true,
    statusField: '_status',
    statusLabels,
    defaults: { version: 'v1', kind: 'bio', _status: 'draft' },
    columns: [
      { name: 'title', label: 'Title', kind: 'title' },
      { name: 'downloadId', label: 'ID' },
      { name: 'kind', label: 'Kind', kind: 'badge' },
      { name: 'version', label: 'Version' },
    ],
    fields: [
      { name: 'downloadId', label: 'Download ID', type: 'text', required: true },
      { name: 'accessibleSummary', label: 'Accessible summary', type: 'textarea', required: true },
      { name: 'kind', label: 'Kind', type: 'select', required: true, sidebar: true, options: opts('bio', 'press-kit', 'one-sheet') },
      { name: 'version', label: 'Version', type: 'text', required: true, sidebar: true },
      { name: 'file', label: 'File', type: 'upload', sidebar: true },
      ...evidenceFields,
      ...ownershipFields,
    ],
  },
  {
    slug: 'inquiries',
    label: 'Inquiries',
    singular: 'Inquiry',
    icon: 'mail',
    menuGroup: 'engage',
    titleField: 'reference',
    canCreate: false,
    statusField: 'workState',
    statusLabels: { new: 'New', acknowledged: 'Acknowledged', responded: 'Responded', closed: 'Closed', reclassified: 'Reclassified' },
    defaultSort: '-createdAt',
    columns: [
      { name: 'reference', label: 'Reference', kind: 'title' },
      { name: 'fullName', label: 'From' },
      { name: 'route', label: 'Route', kind: 'badge' },
      { name: 'workState', label: 'Status', kind: 'status' },
      { name: 'deliveryState', label: 'Delivery', kind: 'badge' },
      { name: 'slaDueAt', label: 'Reply due', kind: 'date' },
      { name: 'createdAt', label: 'Received', kind: 'date' },
    ],
    fields: [
      { name: 'fullName', label: 'Name', type: 'text', readOnly: true },
      { name: 'email', label: 'Email', type: 'email', readOnly: true },
      { name: 'qualification', label: 'Inquiry details', type: 'json', readOnly: true },
      { name: 'attribution', label: 'Source', type: 'json', readOnly: true },
      { name: 'consent', label: 'Consent record', type: 'json', readOnly: true },
      { name: 'internalNotes', label: 'Internal notes', type: 'textarea', help: 'Only staff see these.' },
      { name: 'workState', label: 'Status', type: 'select', sidebar: true, options: opts('new', 'acknowledged', 'responded', 'closed', 'reclassified') },
      { name: 'route', label: 'Route', type: 'select', sidebar: true, options: 'inquiryRoutes' },
      { name: 'deliveryState', label: 'Delivery', type: 'text', sidebar: true, readOnly: true },
      { name: 'slaDueAt', label: 'Reply due', type: 'datetime', sidebar: true, readOnly: true },
      { name: 'acknowledgedAt', label: 'Acknowledged at', type: 'datetime', sidebar: true },
      { name: 'respondedAt', label: 'Responded at', type: 'datetime', sidebar: true },
      { name: 'escalatedAt', label: 'Escalated at', type: 'datetime', sidebar: true },
      { name: 'escalationReason', label: 'Escalation reason', type: 'textarea', sidebar: true, help: 'An SLA breach alone is not a reason.' },
    ],
  },
  {
    slug: 'newsletter-subscriptions',
    label: 'Subscribers',
    singular: 'Subscriber',
    icon: 'users-group',
    menuGroup: 'engage',
    titleField: 'email',
    canCreate: false,
    statusField: 'state',
    statusLabels: { subscribed: 'Subscribed', 'pending-confirmation': 'Pending', unsubscribed: 'Unsubscribed' },
    defaultSort: '-createdAt',
    columns: [
      { name: 'email', label: 'Email', kind: 'title' },
      { name: 'state', label: 'State', kind: 'status' },
      { name: 'sourcePage', label: 'Signed up on' },
      { name: 'confirmedAt', label: 'Confirmed', kind: 'date' },
    ],
    fields: [
      { name: 'state', label: 'State', type: 'select', sidebar: true, options: opts('pending-confirmation', 'subscribed', 'unsubscribed') },
      { name: 'sourcePage', label: 'Signed up on', type: 'text', readOnly: true },
      { name: 'policyVersion', label: 'Privacy policy version', type: 'text', readOnly: true },
      { name: 'consentedAt', label: 'Consented at', type: 'datetime', readOnly: true },
      { name: 'confirmedAt', label: 'Confirmed at', type: 'datetime', readOnly: true },
      { name: 'unsubscribedAt', label: 'Unsubscribed at', type: 'datetime' },
    ],
  },
  {
    slug: 'claims',
    label: 'Claims',
    singular: 'Claim',
    icon: 'shield',
    menuGroup: 'evidence',
    titleField: 'claimId',
    statusField: 'status',
    statusLabels: { blocked: 'Blocked', 'in-verification': 'In verification', ready: 'Ready', withdrawn: 'Withdrawn' },
    defaults: { status: 'blocked', riskLevel: 'material', verificationOwnerRole: 'Business Owner', riskReviewerRole: 'Legal' },
    columns: [
      { name: 'claimId', label: 'Claim', kind: 'title' },
      { name: 'exactWording', label: 'Wording' },
      { name: 'status', label: 'Status', kind: 'status' },
      { name: 'reviewDate', label: 'Review by', kind: 'date' },
    ],
    fields: [
      { name: 'exactWording', label: 'Exact wording', type: 'textarea', required: true },
      { name: 'qualifier', label: 'Qualifier (scope, period, definition)', type: 'text' },
      { name: 'approvedWording', label: 'Approved wording', type: 'textarea', help: 'Evidence Reviewer only.' },
      { name: 'blockingReason', label: 'Blocking reason', type: 'textarea' },
      { name: 'sources', label: 'Evidence sources', type: 'relationship', relationTo: 'evidence-sources', many: true },
      { name: 'status', label: 'Status', type: 'select', required: true, sidebar: true, options: opts('blocked', 'in-verification', 'ready', 'withdrawn') },
      { name: 'riskLevel', label: 'Risk level', type: 'select', required: true, sidebar: true, options: opts('material', 'descriptive') },
      { name: 'verificationOwnerRole', label: 'Verification owner', type: 'text', sidebar: true },
      { name: 'riskReviewerRole', label: 'Risk reviewer', type: 'text', sidebar: true },
      { name: 'approvalDate', label: 'Approval date', type: 'date', sidebar: true },
      { name: 'reviewDate', label: 'Review date', type: 'date', sidebar: true },
    ],
  },
  {
    slug: 'evidence-sources',
    label: 'Evidence sources',
    singular: 'Evidence source',
    icon: 'folder',
    menuGroup: 'evidence',
    titleField: 'title',
    defaults: { strength: 'weak', sourceType: 'corporate-record' },
    columns: [
      { name: 'title', label: 'Title', kind: 'title' },
      { name: 'sourceType', label: 'Type', kind: 'badge' },
      { name: 'strength', label: 'Strength', kind: 'badge' },
      { name: 'dated', label: 'Dated', kind: 'date' },
    ],
    fields: [
      { name: 'reference', label: 'Where the record is held', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
      {
        name: 'sourceType',
        label: 'Source type',
        type: 'select',
        required: true,
        sidebar: true,
        options: opts('corporate-record', 'org-record', 'contract', 'credit-record', 'hr-report', 'platform-evidence', 'filing', 'outcome-methodology', 'third-party'),
      },
      { name: 'strength', label: 'Strength', type: 'select', required: true, sidebar: true, options: opts('authoritative', 'supporting', 'weak') },
      { name: 'dated', label: 'Date on the source', type: 'date', sidebar: true },
      { name: 'withdrawn', label: 'Withdrawn', type: 'checkbox', sidebar: true },
    ],
  },
  {
    slug: 'inquiry-routes',
    label: 'Inquiry routes',
    singular: 'Inquiry route',
    icon: 'route',
    menuGroup: 'settings',
    titleField: 'label',
    canCreate: false,
    defaultSort: 'routeId',
    columns: [
      { name: 'label', label: 'Route', kind: 'title' },
      { name: 'primaryRecipient', label: 'Primary' },
      { name: 'backupRecipient', label: 'Backup' },
      { name: 'acceptanceStatus', label: 'Acceptance', kind: 'status' },
      { name: 'enabled', label: 'Enabled', kind: 'bool' },
    ],
    fields: [
      { name: 'primaryRecipient', label: 'Primary recipient', type: 'email' },
      { name: 'backupRecipient', label: 'Backup recipient', type: 'email' },
      { name: 'minimumQualification', label: 'Minimum qualification', type: 'textarea' },
      { name: 'escalationCriterion', label: 'Escalation criterion', type: 'textarea' },
      { name: 'enabled', label: 'Accepting submissions', type: 'checkbox', sidebar: true },
      { name: 'acceptanceStatus', label: 'Owner acceptance', type: 'select', sidebar: true, options: opts('unassigned', 'assigned', 'accepted') },
      { name: 'acceptedBy', label: 'Accepted by', type: 'text', sidebar: true },
      { name: 'acceptedAt', label: 'Accepted at', type: 'datetime', sidebar: true },
      { name: 'slaHours', label: 'SLA hours', type: 'number', sidebar: true },
      { name: 'slaClock', label: 'SLA clock', type: 'select', sidebar: true, options: opts('elapsed', 'business') },
      { name: 'slaTimezone', label: 'SLA timezone', type: 'text', sidebar: true },
      { name: 'escalatesToTel', label: 'May escalate to Tel', type: 'checkbox', sidebar: true },
    ],
  },
  {
    slug: 'redirects',
    label: 'Redirects',
    singular: 'Redirect',
    icon: 'redirect',
    menuGroup: 'settings',
    titleField: 'fromPath',
    defaults: { decision: '301' },
    columns: [
      { name: 'fromPath', label: 'Old URL', kind: 'title' },
      { name: 'decision', label: 'Decision', kind: 'badge' },
      { name: 'toPath', label: 'New URL' },
    ],
    fields: [
      { name: 'decision', label: 'Decision', type: 'select', required: true, sidebar: true, options: [
        { value: '301', label: '301 — moved permanently' },
        { value: '302', label: '302 — moved temporarily' },
        { value: '410', label: '410 — gone' },
        { value: 'undecided', label: 'Undecided (404)' },
      ] },
      { name: 'toPath', label: 'Redirect to', type: 'text', condition: (v) => v.decision === '301' || v.decision === '302' },
      { name: 'evidence', label: 'How this old URL was confirmed', type: 'textarea' },
    ],
  },
  {
    slug: 'users',
    label: 'Users',
    singular: 'User',
    icon: 'user',
    menuGroup: 'settings',
    titleField: 'email',
    defaults: { roles: ['qa'] },
    columns: [
      { name: 'email', label: 'Email', kind: 'title' },
      { name: 'username', label: 'Username' },
      { name: 'name', label: 'Name' },
      { name: 'roles', label: 'Roles', kind: 'list' },
    ],
    fields: [
      { name: 'username', label: 'Username', type: 'text', help: 'Optional. Lets this person log in with a username instead of the email.' },
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'password', label: 'New password', type: 'password', help: 'At least 8 characters. Leave empty to keep the current password.' },
      { name: 'roles', label: 'Roles', type: 'select', many: true, sidebar: true, options: 'roles' },
      { name: 'assignedRoutes', label: 'Assigned inquiry routes', type: 'select', many: true, sidebar: true, options: 'inquiryRoutes', condition: (v) => Array.isArray(v.roles) && v.roles.includes('route-owner') },
    ],
  },
  {
    slug: 'audit-events',
    label: 'Activity log',
    singular: 'Event',
    icon: 'list',
    menuGroup: 'tools',
    titleField: 'event',
    canCreate: false,
    defaultSort: '-occurredAt',
    columns: [
      { name: 'event', label: 'Event', kind: 'title' },
      { name: 'subjectCollection', label: 'On' },
      { name: 'actor', label: 'By' },
      { name: 'detail', label: 'Detail' },
      { name: 'occurredAt', label: 'When', kind: 'date' },
    ],
    fields: [
      { name: 'subjectCollection', label: 'Collection', type: 'text', readOnly: true },
      { name: 'subjectId', label: 'Record', type: 'text', readOnly: true },
      { name: 'actor', label: 'Actor', type: 'text', readOnly: true },
      { name: 'detail', label: 'Detail', type: 'textarea', readOnly: true },
      { name: 'occurredAt', label: 'When', type: 'datetime', readOnly: true },
    ],
  },
  {
    slug: 'delivery-attempts',
    label: 'Email delivery log',
    singular: 'Delivery attempt',
    icon: 'send',
    menuGroup: 'tools',
    titleField: 'recipient',
    canCreate: false,
    statusField: 'state',
    statusLabels: { queued: 'Queued', 'in-flight': 'Sending', sent: 'Sent', failed: 'Retrying', dead: 'Failed' },
    defaultSort: '-createdAt',
    columns: [
      { name: 'recipient', label: 'Recipient', kind: 'title' },
      { name: 'recipientKind', label: 'Kind', kind: 'badge' },
      { name: 'route', label: 'Route' },
      { name: 'state', label: 'State', kind: 'status' },
      { name: 'attemptCount', label: 'Attempts' },
      { name: 'createdAt', label: 'Queued', kind: 'date' },
    ],
    fields: [
      { name: 'state', label: 'State', type: 'text', readOnly: true },
      { name: 'attemptCount', label: 'Attempts', type: 'number', readOnly: true },
      { name: 'lastError', label: 'Last error', type: 'textarea', readOnly: true },
      { name: 'providerMessageId', label: 'Provider message ID', type: 'text', readOnly: true },
      { name: 'sentAt', label: 'Sent at', type: 'datetime', readOnly: true },
      { name: 'nextAttemptAt', label: 'Next attempt', type: 'datetime', readOnly: true },
    ],
  },
]

export function collectionDef(slug: string): CollectionDef | undefined {
  return COLLECTIONS.find((c) => c.slug === slug)
}

/** Asset (media) edit fields, used by the media library's details panel. */
export const ASSET_FIELDS: Field[] = [
  { name: 'assetId', label: 'Asset ID', type: 'text', required: true },
  { name: 'alt', label: 'Alternative text', type: 'text', help: 'Describe the image for people who cannot see it. Required unless decorative.' },
  { name: 'decorative', label: 'Decorative (no alt text)', type: 'checkbox' },
  { name: 'rightsStatus', label: 'Rights status', type: 'select', options: opts('unverified', 'requested', 'cleared', 'refused'), help: 'Only cleared files are visible on the public site. Evidence Reviewer only.' },
  { name: 'source', label: 'Source', type: 'text' },
  { name: 'permittedUsage', label: 'Permitted usage', type: 'textarea' },
  { name: 'rightsExpiry', label: 'Rights expiry', type: 'date' },
  { name: 'creditRequired', label: 'Credit required', type: 'checkbox' },
  { name: 'credit', label: 'Credit', type: 'text', condition: (v) => Boolean(v.creditRequired) },
  { name: 'releaseRequired', label: 'Model release required', type: 'checkbox' },
  { name: 'releaseOnFile', label: 'Release on file', type: 'checkbox', condition: (v) => Boolean(v.releaseRequired) },
  { name: 'captionsOrTranscript', label: 'Captions / transcript', type: 'textarea' },
]

/** Site settings screens (the WordPress "Settings" menu). */
export const GLOBALS: { slug: string; label: string; fields: Field[] }[] = [
  {
    slug: 'site-settings',
    label: 'General',
    fields: [
      { name: 'siteName', label: 'Site title', type: 'text', required: true },
      { name: 'positioningLine', label: 'Tagline (positioning)', type: 'text', required: true, help: 'Changing this is a Class A decision requiring Tel approval.' },
      { name: 'masterStatement', label: 'Master statement', type: 'textarea', required: true },
      { name: 'productionOrigin', label: 'Site address (production origin)', type: 'url', placeholder: 'https://telkganesan.com' },
      { name: 'allowIndexing', label: 'Allow search engines to index this site', type: 'checkbox', help: 'Keep off until launch is authorised.' },
      { name: 'privacyPolicyVersion', label: 'Privacy policy version', type: 'text', required: true },
      {
        name: 'analytics',
        label: 'Analytics',
        type: 'group',
        fields: [
          { name: 'ga4MeasurementId', label: 'GA4 measurement ID', type: 'text', placeholder: 'G-XXXXXXX' },
          { name: 'enabled', label: 'Enabled', type: 'checkbox' },
        ],
      },
    ],
  },
  {
    slug: 'navigation',
    label: 'Menus',
    fields: [
      {
        name: 'primary',
        label: 'Primary navigation',
        type: 'array',
        rowLabel: 'Menu item',
        fields: [
          { name: 'label', label: 'Label', type: 'text', required: true },
          { name: 'path', label: 'Link', type: 'text', required: true },
          { name: 'pageId', label: 'Page ID', type: 'select', options: 'pageIds', required: true },
        ],
      },
    ],
  },
  {
    slug: 'footer',
    label: 'Footer',
    fields: [
      {
        name: 'groups',
        label: 'Link groups',
        type: 'array',
        rowLabel: 'Group',
        fields: [
          { name: 'title', label: 'Title', type: 'text', required: true },
          {
            name: 'links',
            label: 'Links',
            type: 'array',
            rowLabel: 'Link',
            fields: [
              { name: 'label', label: 'Label', type: 'text', required: true },
              { name: 'path', label: 'Link', type: 'text', required: true },
            ],
          },
        ],
      },
      {
        name: 'socialLinks',
        label: 'Social profiles',
        type: 'array',
        rowLabel: 'Profile',
        fields: [
          { name: 'platform', label: 'Platform', type: 'text', required: true },
          { name: 'url', label: 'URL', type: 'url', required: true },
          { name: 'verified', label: 'Verified (only verified links are shown)', type: 'checkbox' },
        ],
      },
      { name: 'legalLine', label: 'Copyright line', type: 'text' },
    ],
  },
]
