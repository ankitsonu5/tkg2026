import type { GlobalConfig } from 'payload'

import { adminOnly, anyone } from '@/access'

/**
 * Site-wide controls including the SEO origin and indexation switch.
 * Design tokens are deliberately NOT editable here: FR-CMS-01 requires that editors cannot
 * change global tokens.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  admin: { group: 'Site' },
  access: { read: anyone, update: adminOnly },
  fields: [
    { name: 'siteName', type: 'text', required: true, defaultValue: 'Tel K. Ganesan' },
    {
      name: 'positioningLine',
      type: 'text',
      required: true,
      defaultValue: 'Executive Chairman | Enterprise Builder | Investor | Producer',
      admin: { description: 'Approved positioning. Changing this is a Class A strategic decision requiring Tel approval.' },
    },
    {
      name: 'masterStatement',
      type: 'textarea',
      required: true,
      defaultValue: 'Tel K. Ganesan builds enterprises, leaders, and platforms that turn possibility into lasting value.',
    },
    {
      name: 'productionOrigin',
      type: 'text',
      admin: {
        description:
          'Verified production origin used for absolute canonicals. UNSET until the domain decision is made (Appendix C). Canonicals are suppressed while unset rather than guessed.',
      },
    },
    {
      name: 'allowIndexing',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Master indexation switch. Defaults OFF so staging is private and noindex. Turned on only at launch authorization.',
      },
    },
    {
      name: 'privacyPolicyVersion',
      type: 'text',
      required: true,
      defaultValue: 'draft-unapproved',
      admin: { description: 'Version stamped onto every consent record. Stays "draft-unapproved" until the privacy reviewer signs off.' },
    },
    {
      name: 'analytics',
      type: 'group',
      fields: [
        { name: 'ga4MeasurementId', type: 'text', admin: { description: 'Optional. Analytics stays inert until this is configured AND consent is granted.' } },
        { name: 'enabled', type: 'checkbox', defaultValue: false },
      ],
    },
  ],
}
