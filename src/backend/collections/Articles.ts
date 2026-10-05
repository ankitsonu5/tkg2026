import type { CollectionConfig } from 'payload'

import { contentWrite, publishedOrAuthenticated, roleAccess } from '@/access'
import { withPublicationGate } from '@/lib/evidence/hooks'
import { analyzeArticleSeo } from '@/lib/seo/score'
import { evidenceFields, ownershipFields, seoField } from './fields/baseline'

/** ARTICLE template — authored ideas, frameworks and Mind Trap content. */
export const Articles: CollectionConfig = withPublicationGate({
  slug: 'articles',
  versions: { drafts: { autosave: false }, maxPerDoc: 50 },
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'topic', 'seoAnalysis.score', '_status', 'updatedAt'],
    livePreview: {
      url: ({ data }) => `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/ideas/${data?.slug ?? ''}?preview=1`,
    },
  },
  hooks: {
    beforeChange: [
      // Stores the SEO score on every save so it can be shown (and sorted) in the article list.
      async ({ data, originalDoc, req }) => {
        const merged = { ...(originalDoc ?? {}), ...(data ?? {}) } as Record<string, any>
        const hero = merged.heroImage
        const heroId = hero && typeof hero === 'object' ? hero.id : hero
        let alt: string | null = null
        if (heroId) {
          try {
            const asset = await req.payload.findByID({ collection: 'assets', id: heroId, depth: 0, overrideAccess: true })
            alt = (asset as { alt?: string | null }).alt ?? null
          } catch {
            alt = null
          }
        }
        const result = analyzeArticleSeo({
          title: String(merged.title ?? ''),
          slug: String(merged.slug ?? ''),
          excerpt: merged.excerpt,
          seoTitle: merged.seo?.title,
          seoDescription: merged.seo?.description,
          focusKeyword: merged.seoAnalysis?.focusKeyword,
          body: merged.body,
          hasFeaturedImage: Boolean(heroId),
          featuredImageAlt: alt,
          origin: process.env.PRODUCTION_ORIGIN || process.env.NEXT_PUBLIC_SERVER_URL,
        })
        return { ...data, seoAnalysis: { ...(merged.seoAnalysis ?? {}), score: result.score } }
      },
    ],
  },
  access: {
    read: publishedOrAuthenticated,
    create: contentWrite,
    update: contentWrite,
    delete: roleAccess('publisher'),
    readVersions: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Web address of the post. Leave empty and it is created from the title.' },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (typeof value === 'string' && value.trim()) return value
            const title = typeof data?.title === 'string' ? data.title : ''
            return title
              .toLowerCase()
              .normalize('NFKD')
              .replace(/[̀-ͯ]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
              .slice(0, 80)
          },
        ],
      },
    },
    { name: 'excerpt', type: 'textarea', maxLength: 400 },
    {
      name: 'topic',
      type: 'select',
      required: true,
      options: [
        { label: 'Enterprise building', value: 'enterprise' },
        { label: 'Leadership', value: 'leadership' },
        { label: 'Investing', value: 'investing' },
        { label: 'Mind Trap', value: 'mind-trap' },
        { label: 'Culture', value: 'culture' },
        { label: 'Impact', value: 'impact' },
      ],
    },
    {
      name: 'tags',
      type: 'text',
      hasMany: true,
      label: 'Tags',
      admin: {
        position: 'sidebar',
        description: 'Type a tag and press Enter. Tags appear in the article sidebar and link to related posts.',
      },
    },
    { name: 'isFramework', type: 'checkbox', defaultValue: false },
    {
      name: 'authorshipStatus',
      type: 'select',
      required: true,
      defaultValue: 'unresolved',
      options: [
        { label: 'Authored by Tel', value: 'authored' },
        { label: 'Co-authored (credit recorded)', value: 'co-authored' },
        { label: 'Unresolved — blocks publication', value: 'unresolved' },
      ],
      admin: { description: 'Authorship must be settled before publication (Section 6, Ideas).' },
    },
    { name: 'publishedDate', type: 'date' },
    {
      name: 'body',
      type: 'richText',
      label: 'Post content',
      admin: {
        description:
          'Write like in WordPress. Select text for bold, italic, link or heading. Type "/" on an empty line to insert a Pull Quote, Callout, Key Takeaways, FAQ, Video, Image, Table or Button.',
      },
    },
    { name: 'heroImage', type: 'relationship', relationTo: 'assets' },
    { name: 'related', type: 'relationship', relationTo: 'articles', hasMany: true },
    seoField,
    {
      name: 'seoAnalysis',
      type: 'group',
      label: 'SEO score',
      fields: [
        {
          name: 'focusKeyword',
          type: 'text',
          label: 'Focus keyword',
          admin: { description: 'The main phrase this article should rank for, e.g. "performance stack system".' },
        },
        {
          name: 'panel',
          type: 'ui',
          admin: { components: { Field: '/adminComponents/SeoScorePanel#SeoScorePanel' } },
        },
        {
          name: 'score',
          type: 'number',
          label: 'Saved score',
          min: 0,
          max: 100,
          admin: { readOnly: true, description: 'Calculated when you save.' },
        },
      ],
    },
    ...evidenceFields,
    ...ownershipFields,
  ],
})
