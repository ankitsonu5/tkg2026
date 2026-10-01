import type { CollectionConfig } from 'payload'

import { noone, roleAccess } from '@/access'

/**
 * Append-only audit trail for governance-relevant actions.
 * No role may create, update or delete through the API: rows are written by server code with
 * an explicit override, so the trail cannot be edited from the admin UI.
 */
export const AuditEvents: CollectionConfig = {
  slug: 'audit-events',
  admin: {
    useAsTitle: 'event',
    group: 'Administration',
    defaultColumns: ['event', 'subjectCollection', 'subjectId', 'occurredAt'],
  },
  access: {
    read: roleAccess('qa', 'publisher', 'evidence-reviewer'),
    create: noone,
    update: noone,
    delete: noone,
  },
  fields: [
    { name: 'event', type: 'text', required: true, index: true },
    { name: 'subjectCollection', type: 'text' },
    { name: 'subjectId', type: 'text' },
    { name: 'actor', type: 'text', admin: { description: 'Role or system process. Not an end-visitor identifier.' } },
    { name: 'detail', type: 'textarea' },
    { name: 'occurredAt', type: 'date', required: true, index: true },
  ],
}
