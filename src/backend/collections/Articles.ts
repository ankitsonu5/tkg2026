import type { CollectionConfig } from 'payload'

import { contentWrite, publishedOrAuthenticated, roleAccess } from '@/access'
import { withPublicationGate } from '@/lib/evidence/hooks'
import { evidenceFields, ownershipFields, seoField } from './fields/baseline'

/** ARTICLE template — authored ideas, frameworks and Mind Trap content. */
export const Articles: CollectionConfig = withPublicationGate({
  slug: 'articles',
  versions: { drafts: { autosave: false }, maxPerDoc: 50 },
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'slug', 'topic', '_status'],
    livePreview: {
      url: ({ data }) => `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/ideas/${data?.slug ?? ''}?preview=1`,
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
    { name: 'excerpt', type: 'textarea', maxLength: 400 },
    {
      name: 'topic',
      type: 'select',
      required: true,
      options: [
        { label: 'Enterprise building', value: 'enterprise' },
        { label: 'Leadership', value: 'leadership' },
        { label: 'Investing', value: 'investing' },
        { label: 'Mind Trap', value: 'mind-trap' },
        { label: 'Culture', value: 'culture' },
        { label: 'Impact', value: 'impact' },
      ],
    },
    { name: 'isFramework', type: 'checkbox', defaultValue: false },
    {
      name: 'authorshipStatus',
      type: 'select',
      required: true,
      defaultValue: 'unresolved',
      options: [
        { label: 'Authored by Tel', value: 'authored' },
        { label: 'Co-authored (credit recorded)', value: 'co-authored' },
        { label: 'Unresolved — blocks publication', value: 'unresolved' },
      ],
      admin: { description: 'Authorship must be settled before publication (Section 6, Ideas).' },
    },
    { name: 'publishedDate', type: 'date' },
    { name: 'body', type: 'richText' },
    { name: 'heroImage', type: 'relationship', relationTo: 'assets' },
    { name: 'related', type: 'relationship', relationTo: 'articles', hasMany: true },
    seoField,
    ...evidenceFields,
    ...ownershipFields,
  ],
})
