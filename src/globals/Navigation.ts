import type { GlobalConfig } from 'payload'

import { adminOnly, anyone } from '@/access'
import { PRIMARY_NAVIGATION } from '@/baseline/pages'

/**
 * FR-IA-01 — global navigation follows the approved hierarchy.
 * Editors cannot restructure the site: navigation is administrator-only.
 */
export const Navigation: GlobalConfig = {
  slug: 'navigation',
  admin: { group: 'Site' },
  access: { read: anyone, update: adminOnly },
  fields: [
    {
      name: 'primary',
      type: 'array',
      required: true,
      defaultValue: PRIMARY_NAVIGATION.map((p) => ({ label: p.title, path: p.path, pageId: p.pageId })),
      admin: { description: 'Approved primary navigation: About | Enterprise & Investments | Ideas | Film & Culture | Impact | Media & Speaking | Connect.' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'path', type: 'text', required: true },
        { name: 'pageId', type: 'text', required: true },
      ],
    },
  ],
}
