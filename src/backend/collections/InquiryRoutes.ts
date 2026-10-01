import type { CollectionConfig } from 'payload'

import { adminOnly, authenticated } from '@/access'
import { INQUIRY_ROUTE_IDS } from '@/baseline/inquiry-routes'
import { routeReadinessProblems } from '@/lib/inquiries/routing-readiness'

/**
 * FR-ROUTE-01 — per-route configuration: primary and backup recipients, owner acceptance,
 * response window and controlled escalation.
 *
 * Recipients are environment configuration, not baseline content. Real mailboxes are absent
 * by design (R-03): a route cannot be ACCEPTED for production until a named owner and backup
 * are configured and the owner has acknowledged in writing.
 */
export const InquiryRoutes: CollectionConfig = {
  slug: 'inquiry-routes',
  admin: {
    useAsTitle: 'label',
    group: 'Inquiries',
    defaultColumns: ['routeId', 'label', 'ownerRole', 'slaHours', 'acceptanceStatus'],
    description:
      'The seven baseline routes. Route IDs, owner roles, SLAs and escalation criteria are fixed by the baseline; recipients and acceptance are operational configuration.',
  },
  access: {
    read: authenticated,
    // Routing configuration is a privileged operational control.
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        const candidate = { ...(originalDoc ?? {}), ...(data ?? {}) }
        if (candidate.acceptanceStatus === 'accepted') {
          const problems = routeReadinessProblems({ ...candidate, enabled: true })
          if (problems.length > 0) {
            throw new Error(`A route cannot be accepted for production: ${problems.join('; ')}.`)
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'routeId',
      type: 'select',
      required: true,
      unique: true,
      index: true,
      options: INQUIRY_ROUTE_IDS.map((r) => ({ label: r, value: r })),
    },
    { name: 'label', type: 'text', required: true },
    { name: 'ownerRole', type: 'text', required: true, admin: { description: 'Baseline owner role. Fixed by the baseline.' } },
    { name: 'minimumQualification', type: 'textarea', required: true },
    {
      name: 'slaHours',
      type: 'number',
      required: true,
      admin: { description: 'Baseline response window in hours.' },
    },
    {
      name: 'slaClock',
      type: 'select',
      required: true,
      defaultValue: 'elapsed',
      options: [
        { label: 'Elapsed hours (24/7)', value: 'elapsed' },
        { label: 'Business hours', value: 'business' },
      ],
      admin: {
        description:
          'OPEN OPERATIONAL DECISION: the baseline states hours but not whether they are elapsed or business hours. Configurable until decided.',
      },
    },
    {
      name: 'slaTimezone',
      type: 'text',
      defaultValue: 'America/Detroit',
      admin: { description: 'Timezone the SLA clock uses. Confirm with the route owner.' },
    },
    {
      name: 'primaryRecipient',
      type: 'email',
      admin: { description: 'Primary owner mailbox. Unset in development; required before production acceptance.' },
    },
    {
      name: 'backupRecipient',
      type: 'email',
      admin: { description: 'Backup owner mailbox. Required before production acceptance.' },
    },
    {
      name: 'acceptanceStatus',
      type: 'select',
      required: true,
      defaultValue: 'unassigned',
      options: [
        { label: 'Unassigned — no named owner yet', value: 'unassigned' },
        { label: 'Assigned — owner named, acceptance pending', value: 'assigned' },
        { label: 'Accepted — owner acknowledged in writing', value: 'accepted' },
      ],
    },
    { name: 'acceptedBy', type: 'text', admin: { description: 'Who acknowledged, recorded verbatim. Do not infer.' } },
    { name: 'acceptedAt', type: 'date' },
    { name: 'escalationCriterion', type: 'textarea', required: true },
    {
      name: 'escalatesToTel',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'General inquiries never escalate to Tel; they are reclassified to the correct owner. SLA breach alone never escalates to Tel on any route.',
      },
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'A disabled route is hidden from the intent selector and rejects submissions.' },
    },
  ],
}
