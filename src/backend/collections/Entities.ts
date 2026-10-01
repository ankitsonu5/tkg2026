import type { CollectionConfig } from 'payload'

import { contentWrite, publishedOrAuthenticated, roleAccess } from '@/access'
import { withPublicationGate } from '@/lib/evidence/hooks'
import { evidenceFields, ownershipFields, seoField } from './fields/baseline'

/**
 * ENTITY template — enterprise and investment detail.
 * `relationshipStatus` defaults to `unresolved`, which the gate treats as a publication
 * blocker: the baseline forbids publishing an entity whose exact current relationship
 * wording has not been evidence-checked (Appendix C).
 */
export const Entities: CollectionConfig = withPublicationGate({
  slug: 'entities',
  versions: { drafts: { autosave: false }, maxPerDoc: 50 },
  admin: {
    useAsTitle: 'name',
    group: 'Content',
    defaultColumns: ['name', 'slug', 'relationshipStatus', 'isFlagship', '_status'],
    livePreview: {
      url: ({ data }) => `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/enterprise-investments/${data?.slug ?? ''}?preview=1`,
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
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'isFlagship',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Kyyba is the flagship enterprise proof. Other work extends the narrative rather than competing with it.' },
    },
    {
      name: 'relationshipStatus',
      type: 'select',
      required: true,
      defaultValue: 'unresolved',
      index: true,
      options: [
        { label: 'Current relationship', value: 'current' },
        { label: 'Former relationship', value: 'former' },
        { label: 'Unresolved — blocks publication', value: 'unresolved' },
      ],
    },
    {
      name: 'relationshipWording',
      type: 'text',
      admin: { description: 'Exact approved public wording for the relationship. No inferred titles or implied ownership.' },
    },
    { name: 'summary', type: 'textarea' },
    { name: 'body', type: 'richText' },
    { name: 'officialUrl', type: 'text', admin: { description: 'Official destination. Validated as http(s) before it is rendered as an outbound link.' } },
    { name: 'logo', type: 'relationship', relationTo: 'assets' },
    { name: 'displayOrder', type: 'number', defaultValue: 100 },
    seoField,
    ...evidenceFields,
    ...ownershipFields,
  ],
})
