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

/**
 * FAQ block. Each question/answer pair renders as an accessible accordion and is also emitted
 * as FAQPage structured data on the article, so editors get the SEO benefit without any markup.
 */
export const FaqBlock: Block = {
  slug: 'faq',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Frequently asked questions',
      admin: { description: 'Section heading shown above the questions.' },
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      labels: { singular: 'Question', plural: 'Questions' },
      admin: { initCollapsed: false },
      fields: [
        { name: 'question', type: 'text', required: true },
        {
          name: 'answer',
          type: 'textarea',
          required: true,
          admin: { description: 'Plain text. Keep it a direct, self-contained answer.' },
        },
      ],
    },
  ],
}

/** Large decorative pull quote for a standout line from the article or from another person. */
export const PullQuoteBlock: Block = {
  slug: 'pullQuote',
  labels: { singular: 'Pull Quote', plural: 'Pull Quotes' },
  fields: [
    { name: 'quote', type: 'textarea', required: true, label: 'Quote' },
    { name: 'attribution', type: 'text', label: 'Said by (optional)', defaultValue: 'Tel K. Ganesan' },
  ],
}

/** "Key takeaways" summary box: a short bulleted list readers can scan. */
export const KeyTakeawaysBlock: Block = {
  slug: 'keyTakeaways',
  labels: { singular: 'Key Takeaways', plural: 'Key Takeaways' },
  fields: [
    { name: 'title', type: 'text', defaultValue: 'Key takeaways' },
    {
      name: 'points',
      type: 'array',
      required: true,
      minRows: 1,
      labels: { singular: 'Point', plural: 'Points' },
      fields: [{ name: 'text', type: 'text', required: true }],
    },
  ],
}

/** Embed a YouTube or Vimeo video. Other hosts are rejected so nothing arbitrary is embedded. */
export const VideoEmbedBlock: Block = {
  slug: 'videoEmbed',
  labels: { singular: 'Video (YouTube / Vimeo)', plural: 'Videos' },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      label: 'Video link',
      admin: { description: 'Paste the normal YouTube or Vimeo page link.' },
      validate: (value: unknown) =>
        typeof value === 'string' && /^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//i.test(value.trim())
          ? true
          : 'Use a https://youtube.com, https://youtu.be or https://vimeo.com link.',
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Video title',
      admin: { description: 'Describes the video for screen-reader users.' },
    },
    { name: 'caption', type: 'text', label: 'Caption (optional)' },
  ],
}
