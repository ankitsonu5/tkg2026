import type { CollectionConfig } from 'payload'

import { contentWrite, publishedOrAuthenticated, roleAccess } from '@/access'
import { withPublicationGate } from '@/lib/evidence/hooks'
import { evidenceFields, ownershipFields, seoField } from './fields/baseline'

/**
 * PROJECT template — film and culture detail.
 * Producer/distribution roles require an exact credit; the baseline forbids an inferred role,
 * so `creditStatus` starts unresolved and blocks publication until evidenced.
 */
export const Projects: CollectionConfig = withPublicationGate({
  slug: 'projects',
  versions: { drafts: { autosave: false }, maxPerDoc: 50 },
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'slug', 'creditStatus', '_status'],
    livePreview: {
      url: ({ data }) => `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/film-culture/${data?.slug ?? ''}?preview=1`,
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
      name: 'creditStatus',
      type: 'select',
      required: true,
      defaultValue: 'unresolved',
      index: true,
      options: [
        { label: 'Verified against contract, screen credit or distributor record', value: 'verified' },
        { label: 'Unresolved — blocks publication', value: 'unresolved' },
      ],
    },
    { name: 'creditWording', type: 'text', admin: { description: 'Exact screen credit wording. No inferred producer or distribution role.' } },
    { name: 'summary', type: 'textarea' },
    { name: 'body', type: 'richText' },
    { name: 'runtimeMinutes', type: 'number' },
    { name: 'releaseYear', type: 'number' },
    { name: 'officialUrl', type: 'text', admin: { description: 'Official viewing destination.' } },
    { name: 'keyArt', type: 'relationship', relationTo: 'assets' },
    { name: 'displayOrder', type: 'number', defaultValue: 100 },
    seoField,
    ...evidenceFields,
    ...ownershipFields,
  ],
})
