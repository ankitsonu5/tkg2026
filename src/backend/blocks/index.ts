import type { Block } from 'payload'

import { moduleIdField, evidenceFields } from '@/collections/fields/baseline'

/**
 * Approved modular content blocks (Section 6). Every block carries its MOD ID and its own
 * claim/asset links, so evidence is tracked at module granularity — the baseline blocks
 * publication of a *module*, not only of a page.
 */

const commonFields = [moduleIdField, ...evidenceFields]

export const RichTextBlock: Block = {
  slug: 'richText',
  interfaceName: 'RichTextBlock',
  labels: { singular: 'Rich text module', plural: 'Rich text modules' },
  fields: [...commonFields, { name: 'heading', type: 'text' }, { name: 'body', type: 'richText' }],
}

export const HeroBlock: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: { singular: 'Identity hero', plural: 'Identity heroes' },
  fields: [
    ...commonFields,
    { name: 'eyebrow', type: 'text', admin: { description: 'Positioning line, e.g. Executive Chairman | Enterprise Builder | Investor | Producer.' } },
    { name: 'heading', type: 'text', required: true },
    { name: 'statement', type: 'textarea', admin: { description: 'Master statement or page promise. Material claims must be linked above.' } },
    { name: 'image', type: 'relationship', relationTo: 'assets' },
  ],
}

export const ProofBlock: Block = {
  slug: 'proof',
  interfaceName: 'ProofBlock',
  labels: { singular: 'Proof module', plural: 'Proof modules' },
  fields: [
    ...commonFields,
    { name: 'heading', type: 'text', required: true },
    { name: 'body', type: 'textarea' },
    {
      name: 'points',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'detail', type: 'textarea' },
        {
          name: 'claim',
          type: 'relationship',
          relationTo: 'claims',
          admin: { description: 'Link the claim that supports this point. Unlinked metrics are not publishable.' },
        },
      ],
    },
  ],
}

export const TimelineBlock: Block = {
  slug: 'timeline',
  interfaceName: 'TimelineBlock',
  labels: { singular: 'Verified timeline', plural: 'Verified timelines' },
  fields: [
    ...commonFields,
    { name: 'heading', type: 'text', required: true },
    {
      name: 'entries',
      type: 'array',
      fields: [
        { name: 'period', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'detail', type: 'textarea' },
        {
          name: 'roleStatus',
          type: 'select',
          required: true,
          defaultValue: 'unresolved',
          options: [
            { label: 'Current', value: 'current' },
            { label: 'Former', value: 'former' },
            { label: 'Unresolved — blocks publication', value: 'unresolved' },
          ],
        },
        { name: 'claim', type: 'relationship', relationTo: 'claims' },
      ],
    },
  ],
}

export const CardGridBlock: Block = {
  slug: 'cardGrid',
  interfaceName: 'CardGridBlock',
  labels: { singular: 'Card grid', plural: 'Card grids' },
  fields: [
    ...commonFields,
    { name: 'heading', type: 'text', required: true },
    { name: 'intro', type: 'textarea' },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'entities',
      options: [
        { label: 'Entities', value: 'entities' },
        { label: 'Projects', value: 'projects' },
        { label: 'Initiatives', value: 'initiatives' },
        { label: 'Articles', value: 'articles' },
      ],
    },
    { name: 'limit', type: 'number', defaultValue: 3, min: 1, max: 12 },
  ],
}

export const CtaBlock: Block = {
  slug: 'ctaModule',
  interfaceName: 'CtaBlock',
  labels: { singular: 'CTA module', plural: 'CTA modules' },
  fields: [
    ...commonFields,
    { name: 'ctaId', type: 'text', required: true },
    { name: 'heading', type: 'text', required: true },
    { name: 'body', type: 'textarea' },
    { name: 'label', type: 'text', required: true },
    {
      name: 'destinationType',
      type: 'select',
      required: true,
      defaultValue: 'internal',
      options: [
        { label: 'Internal page', value: 'internal' },
        { label: 'Inquiry route', value: 'inquiry' },
        { label: 'Official external destination', value: 'external' },
        { label: 'Download', value: 'download' },
        { label: 'Newsletter subscribe', value: 'subscribe' },
      ],
    },
    { name: 'destination', type: 'text', required: true },
    {
      name: 'emphasis',
      type: 'select',
      defaultValue: 'secondary',
      options: [
        { label: 'Primary — one per page', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
      ],
    },
  ],
}

export const NewsletterBlock: Block = {
  slug: 'newsletter',
  interfaceName: 'NewsletterBlock',
  labels: { singular: 'Newsletter module', plural: 'Newsletter modules' },
  fields: [
    ...commonFields,
    { name: 'heading', type: 'text', required: true },
    { name: 'body', type: 'textarea' },
  ],
}

export const CONTENT_BLOCKS = [
  HeroBlock,
  RichTextBlock,
  ProofBlock,
  TimelineBlock,
  CardGridBlock,
  CtaBlock,
  NewsletterBlock,
]
