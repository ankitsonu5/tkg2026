import type { CollectionConfig } from 'payload'

import { evidenceRead, evidenceWrite } from '@/access'

/**
 * Source records backing a claim. Private by design: the baseline forbids exposing private
 * evidence attachments through public APIs or media URLs, so `read` is never public.
 */
export const EvidenceSources: CollectionConfig = {
  slug: 'evidence-sources',
  admin: {
    useAsTitle: 'title',
    group: 'Evidence',
    defaultColumns: ['title', 'sourceType', 'strength', 'dated'],
  },
  access: {
    read: evidenceRead,
    create: evidenceWrite,
    update: evidenceWrite,
    delete: evidenceWrite,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'sourceType',
      type: 'select',
      required: true,
      options: [
        { label: 'Official corporate / formation record', value: 'corporate-record' },
        { label: 'Board or organization record', value: 'org-record' },
        { label: 'Contract or agreement', value: 'contract' },
        { label: 'Screen credit / distributor record', value: 'credit-record' },
        { label: 'Dated HR or operations report', value: 'hr-report' },
        { label: 'Official platform evidence', value: 'platform-evidence' },
        { label: 'Tax or regulatory filing', value: 'filing' },
        { label: 'Audited outcome methodology', value: 'outcome-methodology' },
        { label: 'Published third-party record', value: 'third-party' },
      ],
    },
    {
      name: 'strength',
      type: 'select',
      required: true,
      defaultValue: 'weak',
      options: [
        { label: 'Authoritative — primary official record', value: 'authoritative' },
        { label: 'Supporting — credible secondary record', value: 'supporting' },
        { label: 'Weak — insufficient on its own', value: 'weak' },
      ],
    },
    { name: 'dated', type: 'date', admin: { description: 'Date the source itself carries. Undated sources cannot support a dated claim.' } },
    { name: 'reference', type: 'text', admin: { description: 'Where the record is held. Store the pointer, not confidential contents.' } },
    { name: 'notes', type: 'textarea' },
    {
      name: 'withdrawn',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Withdrawn sources no longer support their claims; the re-check sweep will unpublish dependent content.' },
    },
  ],
}
