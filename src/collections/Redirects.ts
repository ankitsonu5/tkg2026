import type { CollectionConfig } from 'payload'

import { adminOnly, anyone } from '@/access'

/**
 * Redirect register (Section 11.1).
 *
 * Legacy URLs must be INVENTORIED before decisions are assigned. The baseline explicitly
 * forbids redirecting every missing URL to Home, so `410 Gone` is a first-class decision and
 * `undecided` is the default: an unmapped legacy URL is a task, not a silent redirect.
 */
export const Redirects: CollectionConfig = {
  slug: 'redirects',
  admin: {
    useAsTitle: 'fromPath',
    group: 'Administration',
    defaultColumns: ['fromPath', 'decision', 'toPath'],
  },
  access: {
    read: anyone,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    { name: 'fromPath', type: 'text', required: true, unique: true, index: true, admin: { description: 'Inventoried legacy path, verified to have existed. Do not invent old routes.' } },
    {
      name: 'decision',
      type: 'select',
      required: true,
      defaultValue: 'undecided',
      options: [
        { label: 'Undecided — inventoried, not yet mapped', value: 'undecided' },
        { label: '301 permanent redirect', value: '301' },
        { label: '302 temporary redirect', value: '302' },
        { label: '410 Gone — deliberately removed', value: '410' },
      ],
    },
    { name: 'toPath', type: 'text', admin: { condition: (data) => data?.decision === '301' || data?.decision === '302' } },
    { name: 'evidence', type: 'textarea', admin: { description: 'How this legacy URL was confirmed to exist (crawl, log, sitemap).' } },
  ],
}
