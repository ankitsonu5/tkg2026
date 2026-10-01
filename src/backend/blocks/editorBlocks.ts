import type { Block } from 'payload'

/**
 * Custom CTA Button Block for WordPress-like blog/article authoring.
 */
export const CtaButtonBlock: Block = {
  slug: 'ctaButton',
  labels: {
    singular: 'CTA Button',
    plural: 'CTA Buttons',
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      defaultValue: 'Read More',
      admin: { description: 'Text displayed on the button' },
    },
    {
      name: 'url',
      type: 'text',
      required: true,
      defaultValue: '/connect',
      admin: { description: 'URL destination or internal path (e.g. /connect or https://...)' },
    },
    {
      name: 'style',
      type: 'select',
      defaultValue: 'gold',
      options: [
        { label: 'Gold Gradient (Primary)', value: 'gold' },
        { label: 'Obsidian Dark (Executive)', value: 'dark' },
        { label: 'Gold Outline', value: 'outline' },
      ],
    },
    {
      name: 'align',
      type: 'select',
      defaultValue: 'left',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    {
      name: 'newTab',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Open link in a new browser tab' },
    },
  ],
}

/**
 * Custom Callout / Executive Quote Block for highlighted editorial insights.
 */
export const CalloutBoxBlock: Block = {
  slug: 'calloutBox',
  labels: {
    singular: 'Callout / Quote Box',
    plural: 'Callout / Quote Boxes',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Title / Header (Optional)',
      admin: { description: 'e.g. Executive Takeaway or Leadership Principle' },
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
      label: 'Quote or Insight Text',
      admin: { description: 'The main quote or callout text' },
    },
    {
      name: 'author',
      type: 'text',
      label: 'Attribution / Author (Optional)',
      defaultValue: 'Tel K. Ganesan',
    },
    {
      name: 'accent',
      type: 'select',
      defaultValue: 'gold',
      options: [
        { label: 'Gold Authority Accent', value: 'gold' },
        { label: 'Deep Emerald Accent', value: 'emerald' },
        { label: 'Navy Executive Card', value: 'navy' },
      ],
    },
  ],
}
