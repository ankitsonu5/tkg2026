import type { CollectionConfig } from 'payload'

import { evidenceRead, evidenceWrite, roleFieldAccess } from '@/access'
import { guardPrivilegedFields } from '@/access/guard'

/**
 * CLAIM records — Section 9 claim lifecycle.
 *
 * Only an Evidence Reviewer (or administrator) may move a claim to Ready or set approved
 * wording. An Editor can draft a claim but cannot approve their own copy: that separation is
 * the point of the gate.
 */
export const Claims: CollectionConfig = {
  slug: 'claims',
  admin: {
    useAsTitle: 'claimId',
    group: 'Evidence',
    defaultColumns: ['claimId', 'status', 'exactWording', 'reviewDate'],
    description:
      'Claim lifecycle: draft wording, assign owner/reviewer, attach source, approve exact wording and review date, link to modules, publish only when Ready, reverify on schedule.',
  },
  hooks: {
    beforeOperation: [
      guardPrivilegedFields({
        fields: ['status', 'approvedWording', 'approvalDate', 'reviewDate'],
        allowedRoles: ['evidence-reviewer'],
        message:
          'Only an Evidence Reviewer may verify a claim, approve its public wording or set its review date. An author cannot approve their own copy.',
      }),
    ],
  },
  access: {
    read: evidenceRead,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: evidenceWrite,
  },
  fields: [
    {
      name: 'claimId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Stable claim ID, e.g. CLAIM-003.' },
    },
    {
      name: 'exactWording',
      type: 'textarea',
      required: true,
      admin: { description: 'Step 1 — the exact claim as drafted, including its qualifier and scope.' },
    },
    { name: 'qualifier', type: 'text', admin: { description: 'Scope/qualifier: region, category, period, definition.' } },
    {
      name: 'riskLevel',
      type: 'select',
      required: true,
      defaultValue: 'material',
      options: [
        { label: 'Material — gated', value: 'material' },
        { label: 'Descriptive — non-material', value: 'descriptive' },
      ],
    },
    { name: 'verificationOwnerRole', type: 'text', required: true, defaultValue: 'Business Owner', admin: { description: 'Step 2 — role accountable for verification.' } },
    { name: 'riskReviewerRole', type: 'text', required: true, defaultValue: 'Legal', admin: { description: 'Step 2 — role accountable for risk review.' } },
    {
      name: 'sources',
      type: 'relationship',
      relationTo: 'evidence-sources',
      hasMany: true,
      admin: { description: 'Step 3 — source records and evidence strength. A claim with no source can never reach Ready.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'blocked',
      index: true,
      options: [
        { label: 'Blocked — evidence missing or contradictory', value: 'blocked' },
        { label: 'In verification', value: 'in-verification' },
        { label: 'Ready — approved for publication', value: 'ready' },
        { label: 'Withdrawn', value: 'withdrawn' },
      ],
      // Only evidence reviewers move a claim's status. Editors cannot self-approve.
      access: { update: roleFieldAccess('evidence-reviewer') },
    },
    {
      name: 'approvedWording',
      type: 'textarea',
      admin: { description: 'Step 4 — the exact wording approved for public use. Published copy must match this verbatim.' },
      access: { update: roleFieldAccess('evidence-reviewer') },
    },
    { name: 'approvalDate', type: 'date', access: { update: roleFieldAccess('evidence-reviewer') } },
    {
      name: 'reviewDate',
      type: 'date',
      admin: { description: 'Step 7 — scheduled reverification date. Once passed, dependent content is unpublished by the re-check sweep.' },
      access: { update: roleFieldAccess('evidence-reviewer') },
    },
    {
      name: 'blockingReason',
      type: 'textarea',
      admin: { description: 'What exactly is missing, and which role owns supplying it.' },
    },
  ],
}
