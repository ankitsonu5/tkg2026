import type { CollectionConfig } from 'payload'

import { adminOnly, authenticated, noone } from '@/access'

/**
 * Durable delivery outbox (FR-OPS-01, FR-FORM-01).
 *
 * Rows are created inside the submission transaction and worked by the worker in
 * src/jobs/deliver-inquiries.ts. A request-lifetime promise is NOT a delivery system: if the
 * process dies mid-request, the row survives and the worker retries it with backoff.
 */
export const DeliveryAttempts: CollectionConfig = {
  slug: 'delivery-attempts',
  admin: {
    useAsTitle: 'id',
    group: 'Inquiries',
    defaultColumns: ['inquiry', 'recipientKind', 'state', 'attemptCount', 'nextAttemptAt'],
  },
  access: {
    read: authenticated,
    // Written only by the submission path and the worker, both with explicit override.
    create: noone,
    update: noone,
    delete: adminOnly,
  },
  fields: [
    { name: 'inquiry', type: 'relationship', relationTo: 'inquiries', required: true, index: true },
    { name: 'route', type: 'text', required: true, index: true },
    {
      name: 'recipientKind',
      type: 'select',
      required: true,
      options: [
        { label: 'Primary owner', value: 'primary' },
        { label: 'Backup owner', value: 'backup' },
        { label: 'Sender acknowledgement', value: 'sender-ack' },
      ],
    },
    { name: 'recipient', type: 'text', required: true },
    {
      name: 'state',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      index: true,
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'In flight', value: 'in-flight' },
        { label: 'Sent — accepted by provider', value: 'sent' },
        { label: 'Failed — will retry', value: 'failed' },
        { label: 'Dead — retries exhausted', value: 'dead' },
      ],
      admin: {
        description:
          '"Sent" means the transport accepted the message. It does NOT mean a recipient read it. Bounces reconcile separately.',
      },
    },
    { name: 'attemptCount', type: 'number', required: true, defaultValue: 0 },
    { name: 'maxAttempts', type: 'number', required: true, defaultValue: 5 },
    { name: 'nextAttemptAt', type: 'date', index: true },
    { name: 'lastError', type: 'textarea', admin: { description: 'Redacted transport error. Inquiry bodies are never logged here.' } },
    { name: 'providerMessageId', type: 'text' },
    { name: 'sentAt', type: 'date' },
    {
      name: 'bounceState',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'No bounce recorded', value: 'none' },
        { label: 'Soft bounce', value: 'soft' },
        { label: 'Hard bounce', value: 'hard' },
      ],
      admin: { description: 'Reconciled from provider receipts, separately from internal acknowledgement.' },
    },
  ],
}
