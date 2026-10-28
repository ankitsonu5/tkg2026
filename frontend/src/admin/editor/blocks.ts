import type { Field } from '../schema'

/**
 * Content blocks available inside the article editor. Field names match what the site's
 * renderer reads (frontend/src/frontend/components/RichTextRenderer.tsx).
 */
export const EDITOR_BLOCKS: { slug: string; label: string; fields: Field[]; defaults: Record<string, unknown>; summary: (f: Record<string, any>) => string }[] = [
  {
    slug: 'pullQuote',
    label: 'Pull quote',
    defaults: { quote: '', attribution: 'Tel K. Ganesan' },
    summary: (f) => (f.quote ? `“${f.quote}”${f.attribution ? ` — ${f.attribution}` : ''}` : 'Empty quote'),
    fields: [
      { name: 'quote', label: 'Quote', type: 'textarea', required: true },
      { name: 'attribution', label: 'Said by (optional)', type: 'text' },
    ],
  },
  {
    slug: 'calloutBox',
    label: 'Callout box',
    defaults: { accent: 'gold' },
    summary: (f) => [f.title, f.content].filter(Boolean).join(' — ') || 'Empty callout',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'content', label: 'Content', type: 'textarea', required: true },
      { name: 'author', label: 'Author', type: 'text' },
      {
        name: 'accent',
        label: 'Accent',
        type: 'select',
        options: [
          { label: 'Gold Authority Accent', value: 'gold' },
          { label: 'Deep Emerald Accent', value: 'emerald' },
          { label: 'Navy Executive Card', value: 'navy' },
        ],
      },
    ],
  },
  {
    slug: 'keyTakeaways',
    label: 'Key takeaways',
    defaults: { title: 'Key takeaways', points: [] },
    summary: (f) => `${f.title || 'Key takeaways'} (${(f.points ?? []).length} points)`,
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'points', label: 'Points', type: 'array', rowLabel: 'Point', fields: [{ name: 'text', label: 'Text', type: 'text', required: true }] },
    ],
  },
  {
    slug: 'faq',
    label: 'FAQ',
    defaults: { heading: 'Frequently asked questions', items: [] },
    summary: (f) => `${f.heading || 'FAQ'} (${(f.items ?? []).length} questions)`,
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      {
        name: 'items',
        label: 'Questions',
        type: 'array',
        rowLabel: 'Question',
        fields: [
          { name: 'question', label: 'Question', type: 'text', required: true },
          { name: 'answer', label: 'Answer', type: 'textarea', required: true },
        ],
      },
    ],
  },
  {
    slug: 'ctaButton',
    label: 'Button',
    defaults: { style: 'gold', align: 'left', newTab: false },
    summary: (f) => (f.label ? `[ ${f.label} ] → ${f.url ?? ''}` : 'Empty button'),
    fields: [
      { name: 'label', label: 'Button text', type: 'text', required: true },
      { name: 'url', label: 'Link', type: 'text', required: true },
      {
        name: 'style',
        label: 'Style',
        type: 'select',
        options: [
          { label: 'Gold Gradient (Primary)', value: 'gold' },
          { label: 'Obsidian Dark (Executive)', value: 'dark' },
          { label: 'Gold Outline', value: 'outline' },
        ],
      },
      {
        name: 'align',
        label: 'Alignment',
        type: 'select',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
        ],
      },
      { name: 'newTab', label: 'Open in a new tab', type: 'checkbox' },
    ],
  },
  {
    slug: 'videoEmbed',
    label: 'Video (YouTube / Vimeo)',
    defaults: {},
    summary: (f) => f.title || f.url || 'No video link yet',
    fields: [
      { name: 'url', label: 'YouTube or Vimeo link', type: 'url', required: true },
      { name: 'title', label: 'Title (for screen readers)', type: 'text' },
      { name: 'caption', label: 'Caption (optional)', type: 'text' },
    ],
  },
]

export function blockDef(slug: string) {
  return EDITOR_BLOCKS.find((b) => b.slug === slug)
}
