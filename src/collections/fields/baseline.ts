import type { Field } from 'payload'

import { PAGE_IDS, ALL_MODULE_IDS } from '@/baseline/pages'
import { roleFieldAccess } from '@/access'

/**
 * FR-CONT-01 — every page/module stores a stable Page ID and Module ID that trace to copy,
 * CTA and QA records. These are constrained to the approved baseline vocabulary so a new
 * page cannot quietly appear outside the approved architecture.
 */
export const pageIdField: Field = {
  name: 'pageId',
  type: 'select',
  required: true,
  unique: true,
  index: true,
  options: PAGE_IDS.map((id) => ({ label: id, value: id })),
  admin: {
    description: 'Stable PAGE ID from the approved information architecture. Changing this requires a change request.',
    position: 'sidebar',
  },
  access: {
    // Editors edit content, not the architecture.
    update: roleFieldAccess('administrator'),
  },
}

export const moduleIdField: Field = {
  name: 'moduleId',
  type: 'select',
  required: true,
  options: ALL_MODULE_IDS.map((id) => ({ label: id, value: id })),
  admin: {
    description: 'Stable MOD ID. Traces this module to the copy deck, CTA and QA records.',
  },
}

/** Ownership and traceability carried by every publishable record. */
export const ownershipFields: Field[] = [
  {
    name: 'ownerRole',
    type: 'text',
    required: true,
    defaultValue: 'Editorial Lead',
    admin: {
      position: 'sidebar',
      description: 'Accountable role for this record. Roles, not named individuals — names are a G0 dependency.',
    },
  },
  {
    name: 'baselineNotes',
    type: 'textarea',
    admin: {
      position: 'sidebar',
      description: 'Traceability notes: source document, change request ID, or the reason a module deviates.',
    },
  },
]

/**
 * Evidence links. The publication gate reads exactly these two fields, so any collection
 * that can appear publicly must include them.
 */
export const evidenceFields: Field[] = [
  {
    name: 'claims',
    type: 'relationship',
    relationTo: 'claims',
    hasMany: true,
    admin: {
      description:
        'Every material public claim on this record. Publication is blocked until each linked claim is Ready with approved wording and unexpired review date.',
    },
  },
  {
    name: 'assets',
    type: 'relationship',
    relationTo: 'assets',
    hasMany: true,
    admin: {
      description:
        'Every published asset on this record. Publication is blocked until rights, credit, release and accessibility metadata are complete.',
    },
  },
]

/** SEO controls required by Section 11.1 / FR-SEO-01. */
export const seoField: Field = {
  name: 'seo',
  type: 'group',
  label: 'SEO and social (SEO-*)',
  fields: [
    {
      name: 'seoId',
      type: 'text',
      admin: { description: 'SEO record ID, e.g. SEO-HOME.' },
    },
    {
      name: 'title',
      type: 'text',
      maxLength: 70,
      admin: { description: 'Unique page title. Required before an indexable page can be accepted.' },
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 200,
      admin: { description: 'Unique meta description.' },
    },
    {
      name: 'noindex',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Exclude from indexation. Forced on for search results and any non-production origin regardless of this value.',
      },
    },
    {
      name: 'ogImage',
      type: 'relationship',
      relationTo: 'assets',
      admin: { description: 'Rights-cleared 1200x630 social image. Subject to the same asset gate.' },
    },
  ],
}

/** One primary CTA per page; secondary actions are visually and structurally subordinate. */
export const ctaField: Field = {
  name: 'primaryCta',
  type: 'group',
  label: 'Primary call to action (CTA-*)',
  fields: [
    { name: 'ctaId', type: 'text', admin: { description: 'Stable CTA ID, e.g. CTA-HOME-PRIMARY.' } },
    { name: 'label', type: 'text' },
    {
      name: 'destinationType',
      type: 'select',
      defaultValue: 'internal',
      options: [
        { label: 'Internal page', value: 'internal' },
        { label: 'Inquiry route', value: 'inquiry' },
        { label: 'Official external destination', value: 'external' },
        { label: 'Download', value: 'download' },
        { label: 'Newsletter subscribe', value: 'subscribe' },
      ],
    },
    { name: 'destination', type: 'text', admin: { description: 'Path, route ID or absolute official URL.' } },
  ],
}
