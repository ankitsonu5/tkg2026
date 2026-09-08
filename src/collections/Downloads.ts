import type { CollectionConfig } from 'payload'

import { contentWrite, publishedOrAuthenticated } from '@/access'
import { withPublicationGate } from '@/lib/evidence/hooks'
import { evidenceFields, ownershipFields } from './fields/baseline'

/**
 * FR-DL-01 — bios and press kits are versioned, accessible and trackable.
 * Draft/unapproved downloads stay protected: the public query filters on published status.
 */
export const Downloads: CollectionConfig = withPublicationGate({
  slug: 'downloads',
  versions: { drafts: true },
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'downloadId', 'version', '_status'],
  },
  access: {
    read: publishedOrAuthenticated,
    create: contentWrite,
    update: contentWrite,
    delete: contentWrite,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'downloadId', type: 'text', required: true, unique: true, index: true, admin: { description: 'Stable asset ID used in the download analytics event.' } },
    { name: 'version', type: 'text', required: true, defaultValue: 'v1' },
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Approved bio', value: 'bio' },
        { label: 'Press kit', value: 'press-kit' },
        { label: 'Speaker one-sheet', value: 'one-sheet' },
      ],
    },
    { name: 'file', type: 'relationship', relationTo: 'assets', admin: { description: 'The downloadable file. Subject to the asset rights gate.' } },
    { name: 'accessibleSummary', type: 'textarea', required: true, admin: { description: 'Accessible text equivalent of the download contents.' } },
    ...evidenceFields,
    ...ownershipFields,
  ],
})
