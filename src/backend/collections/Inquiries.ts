import type { CollectionConfig } from 'payload'

import { inquiryRead, inquiryUpdate, noone, adminOnly } from '@/access'
import { INQUIRY_ROUTE_IDS } from '@/baseline/inquiry-routes'

/**
 * Lead records. Never publicly readable — they contain personal data.
 *
 * `create: noone` is deliberate: submissions arrive only through the server action in
 * src/lib/inquiries/submit.ts, which validates, rate-limits and records consent before
 * writing with an explicit override. There is no public create endpoint.
 */
export const Inquiries: CollectionConfig = {
  slug: 'inquiries',
  admin: {
    useAsTitle: 'reference',
    group: 'Inquiries',
    defaultColumns: ['reference', 'route', 'deliveryState', 'workState', 'slaDueAt'],
  },
  access: {
    read: inquiryRead,
    create: noone,
    update: inquiryUpdate,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'reference',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Operational reference shown to the sender. Distinct from any analytics identifier.' },
    },
    {
      name: 'idempotencyKey',
      type: 'text',
      index: true,
      unique: true,
      admin: { description: 'Prevents a retried submission from creating a duplicate lead.' },
    },
    { name: 'route', type: 'select', required: true, index: true, options: INQUIRY_ROUTE_IDS.map((r) => ({ label: r, value: r })) },
    { name: 'fullName', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    {
      name: 'qualification',
      type: 'json',
      admin: { description: 'Route-specific qualification answers, validated server-side against the route schema.' },
    },
    {
      name: 'deliveryState',
      type: 'select',
      required: true,
      defaultValue: 'stored',
      index: true,
      options: [
        { label: 'Stored — not yet delivered', value: 'stored' },
        { label: 'Pending delivery', value: 'pending' },
        { label: 'Delivered to owner', value: 'delivered' },
        { label: 'Failed — recoverable', value: 'failed' },
      ],
      admin: { description: 'Delivery to the owner. A database insert alone is never "delivered".' },
    },
    {
      name: 'workState',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Owner acknowledged', value: 'acknowledged' },
        { label: 'Responded', value: 'responded' },
        { label: 'Closed', value: 'closed' },
        { label: 'Reclassified to another route', value: 'reclassified' },
      ],
      admin: { description: 'Owner-side progress. Provider acceptance is NOT acknowledgement and NOT a response.' },
    },
    { name: 'slaDueAt', type: 'date', index: true },
    { name: 'acknowledgedAt', type: 'date' },
    { name: 'respondedAt', type: 'date' },
    { name: 'escalatedAt', type: 'date' },
    { name: 'escalationReason', type: 'textarea', admin: { description: 'Why this was escalated. SLA breach alone is not an escalation reason.' } },
    {
      name: 'attribution',
      type: 'group',
      admin: { description: 'Validated attribution captured at submission (FR-UTM-01). Consent-aware.' },
      fields: [
        { name: 'sourcePage', type: 'text' },
        { name: 'entryPage', type: 'text' },
        { name: 'utmSource', type: 'text' },
        { name: 'utmMedium', type: 'text' },
        { name: 'utmCampaign', type: 'text' },
        { name: 'utmTerm', type: 'text' },
        { name: 'utmContent', type: 'text' },
        {
          name: 'attributionState',
          type: 'select',
          defaultValue: 'unattributed',
          options: [
            { label: 'Attributed', value: 'attributed' },
            { label: 'Unattributed (no source data)', value: 'unattributed' },
            { label: 'Consent denied — not collected', value: 'consent-denied' },
          ],
          admin: { description: 'Recorded honestly. Consent denial is never silently replaced with invented attribution.' },
        },
      ],
    },
    {
      name: 'consent',
      type: 'group',
      fields: [
        { name: 'privacyAccepted', type: 'checkbox', required: true, defaultValue: false },
        { name: 'policyVersion', type: 'text', required: true },
        { name: 'consentedAt', type: 'date', required: true },
        { name: 'analyticsConsent', type: 'checkbox', defaultValue: false },
        {
          name: 'marketingOptIn',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Separate, explicit opt-in. Submitting an inquiry never subscribes anyone.' },
        },
      ],
    },
    { name: 'internalNotes', type: 'textarea', admin: { description: 'Owner working notes. Not returned by any public endpoint.' } },
  ],
}
