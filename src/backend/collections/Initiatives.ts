import type { CollectionConfig } from 'payload'

import { contentWrite, publishedOrAuthenticated, roleAccess } from '@/access'
import { withPublicationGate } from '@/lib/evidence/hooks'
import { evidenceFields, ownershipFields, seoField } from './fields/baseline'

/**
 * INITIATIVE template — impact detail.
 * The baseline forbids a charitable or cumulative implication without proof, so legal entity
 * status is an explicit gated field and outcome figures must be claim-backed.
 */
export const Initiatives: CollectionConfig = withPublicationGate({
  slug: 'initiatives',
  versions: { drafts: { autosave: false }, maxPerDoc: 50 },
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'slug', 'legalStatus', '_status'],
    livePreview: {
      url: ({ data }) => `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/impact/${data?.slug ?? ''}?preview=1`,
    },
  },
  access: {
    read: publishedOrAuthenticated,
    create: contentWrite,
    update: contentWrite,
    delete: roleAccess('publisher'),
    readVersions: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'legalStatus',
      type: 'select',
      required: true,
      defaultValue: 'unresolved',
      index: true,
      options: [
        { label: 'Registered entity (formation/tax record on file)', value: 'registered' },
        { label: 'Program without separate legal entity', value: 'program' },
        { label: 'Unresolved — blocks publication', value: 'unresolved' },
      ],
    },
    { name: 'focusArea', type: 'text' },
    { name: 'geography', type: 'text' },
    { name: 'summary', type: 'textarea' },
    { name: 'body', type: 'richText' },
    {
      name: 'outcomes',
      type: 'array',
      admin: { description: 'Every outcome figure needs a claim with an auditable methodology. No cumulative implication without proof.' },
      fields: [
        { name: 'measure', type: 'text', required: true },
        { name: 'methodologyNote', type: 'textarea', required: true },
        { name: 'claim', type: 'relationship', relationTo: 'claims', required: true },
      ],
    },
    {
      name: 'partners',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'permissionOnFile', type: 'checkbox', defaultValue: false, admin: { description: 'Named partners require permission before they appear publicly.' } },
      ],
    },
    { name: 'participationCriteria', type: 'textarea' },
    { name: 'displayOrder', type: 'number', defaultValue: 100 },
    seoField,
    ...evidenceFields,
    ...ownershipFields,
  ],
})
