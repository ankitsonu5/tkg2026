import type { GlobalConfig } from 'payload'

import { adminOnly, anyone } from '@/access'

export const Footer: GlobalConfig = {
  slug: 'footer',
  admin: { group: 'Site' },
  access: { read: anyone, update: adminOnly },
  fields: [
    {
      name: 'groups',
      type: 'array',
      admin: { description: 'Grouped footer navigation.' },
      fields: [
        { name: 'title', type: 'text', required: true },
        {
          name: 'links',
          type: 'array',
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'path', type: 'text', required: true },
          ],
        },
      ],
    },
    {
      name: 'socialLinks',
      type: 'array',
      admin: {
        description:
          'VERIFIED destinations only. An unverified social profile is left out rather than guessed (Section 5).',
      },
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
        { name: 'verified', type: 'checkbox', defaultValue: false, admin: { description: 'Unverified links are not rendered.' } },
      ],
    },
    { name: 'legalLine', type: 'text' },
  ],
}
