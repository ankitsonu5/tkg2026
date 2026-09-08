import type { CollectionConfig } from 'payload'

import { adminOnly, noone, roleAccess } from '@/access'

/**
 * Newsletter opt-in. Independent of inquiries: submitting an inquiry never subscribes anyone.
 * Double opt-in is a PROPOSED implementation choice pending privacy reviewer confirmation.
 */
export const NewsletterSubscriptions: CollectionConfig = {
  slug: 'newsletter-subscriptions',
  admin: {
    useAsTitle: 'email',
    group: 'Inquiries',
    defaultColumns: ['email', 'state', 'consentedAt'],
  },
  access: {
    read: roleAccess('route-owner', 'qa'),
    create: noone,
    update: noone,
    delete: adminOnly,
  },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    {
      name: 'state',
      type: 'select',
      required: true,
      defaultValue: 'pending-confirmation',
      options: [
        { label: 'Pending confirmation (double opt-in)', value: 'pending-confirmation' },
        { label: 'Subscribed', value: 'subscribed' },
        { label: 'Unsubscribed', value: 'unsubscribed' },
      ],
    },
    { name: 'confirmationToken', type: 'text', index: true, admin: { description: 'Unguessable token for confirm and unsubscribe links.' } },
    { name: 'consentedAt', type: 'date', required: true },
    { name: 'policyVersion', type: 'text', required: true },
    { name: 'confirmedAt', type: 'date' },
    { name: 'unsubscribedAt', type: 'date' },
    { name: 'sourcePage', type: 'text' },
  ],
}
