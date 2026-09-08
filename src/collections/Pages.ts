import type { CollectionConfig } from 'payload'

import { contentWrite, publishedOrAuthenticated, roleAccess } from '@/access'
import { withPublicationGate } from '@/lib/evidence/hooks'
import { CONTENT_BLOCKS } from '@/blocks'
import { ctaField, evidenceFields, ownershipFields, pageIdField, seoField } from './fields/baseline'

/**
 * The eight fixed public pages plus the three utility pages, as CMS records.
 * Dynamic detail templates live in their own collections.
 *
 * Publishing is restricted to `publisher`/`administrator` AND still has to clear the
 * evidence gate — a Publisher cannot publish content that fails it.
 */
export const Pages: CollectionConfig = withPublicationGate({
  slug: 'pages',
  versions: {
    drafts: { autosave: false },
    maxPerDoc: 50,
  },
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'pageId', 'path', '_status'],
    livePreview: {
      url: ({ data }) => `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}${data?.path ?? '/'}?preview=1`,
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
    pageIdField,
    {
      name: 'path',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Proposed public path. Frozen into the SEO register before launch; changes require a redirect record.',
      },
    },
    { name: 'purpose', type: 'textarea', admin: { description: 'Baseline purpose for this page. Judge every content decision against it.' } },
    {
      name: 'modules',
      type: 'blocks',
      blocks: CONTENT_BLOCKS,
      admin: { description: 'Approved modular content. Each module carries its own MOD ID and evidence links.' },
    },
    ctaField,
    seoField,
    ...evidenceFields,
    ...ownershipFields,
  ],
})
