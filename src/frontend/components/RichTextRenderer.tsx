import React from 'react'
import Link from 'next/link'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import './rich-text.css'

interface CtaButtonFields {
  label: string
  url: string
  style?: 'gold' | 'dark' | 'outline'
  align?: 'left' | 'center' | 'right'
  newTab?: boolean
}

interface CalloutBoxFields {
  title?: string
  content: string
  author?: string
  accent?: 'gold' | 'emerald' | 'navy'
}

/** Converts a pasted YouTube/Vimeo page link into its privacy-friendly embed URL, or null. */
function toEmbedUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim())
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = url.pathname.slice(1)
      return /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (host === 'youtube.com') {
      const id = url.searchParams.get('v') ?? (url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2] : null)
      return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (host === 'vimeo.com') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch {
    // fall through
  }
  return null
}

const customConverters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  // Headings carry an id (set by prepareArticleBody) so the "On this page" list can link to them.
  heading: ({ node, nodesToJSX }) => {
    const Tag = node.tag
    const id = (node as { anchorId?: string }).anchorId
    return <Tag id={id}>{nodesToJSX({ nodes: node.children })}</Tag>
  },
  blocks: {
    ctaButton: ({ node }: { node: { fields: CtaButtonFields } }) => {
      const { label, url, style = 'gold', align = 'left', newTab } = node.fields || {}
      if (!label || !url) return null

      let buttonClass = 'editorial-cta'
      if (style === 'dark') buttonClass += ' editorial-cta--dark'
      else if (style === 'outline') buttonClass += ' editorial-cta--outline'
      else buttonClass += ' editorial-cta--gold'

      return (
        <div className={`editorial-cta-wrap editorial-cta-wrap--${align}`}>
          <Link
            href={url}
            className={buttonClass}
            target={newTab ? '_blank' : undefined}
            rel={newTab ? 'noopener noreferrer' : undefined}
          >
            {label}
            <span aria-hidden="true" className="editorial-cta__arrow">
              &rarr;
            </span>
          </Link>
        </div>
      )
    },
    pullQuote: ({ node }: { node: { fields: { quote?: string; attribution?: string } } }) => {
      const { quote, attribution } = node.fields || {}
      if (!quote) return null
      return (
        <figure className="editorial-pullquote">
          <blockquote>{quote}</blockquote>
          {attribution && <figcaption>&mdash; {attribution}</figcaption>}
        </figure>
      )
    },
    keyTakeaways: ({ node }: { node: { fields: { title?: string; points?: { text?: string }[] } } }) => {
      const { title, points } = node.fields || {}
      const items = (points ?? []).filter((p) => p?.text)
      if (items.length === 0) return null
      return (
        <aside className="editorial-takeaways" aria-label={title || 'Key takeaways'}>
          <div className="editorial-takeaways__title">{title || 'Key takeaways'}</div>
          <ul>
            {items.map((p, i) => (
              <li key={i}>{p.text}</li>
            ))}
          </ul>
        </aside>
      )
    },
    faq: ({ node }: { node: { fields: { heading?: string; items?: { question?: string; answer?: string }[] } } }) => {
      const { heading, items } = node.fields || {}
      const faqs = (items ?? []).filter((i) => i?.question && i?.answer)
      if (faqs.length === 0) return null
      return (
        <section className="editorial-faq" aria-label={heading || 'Frequently asked questions'}>
          {heading && <h2 className="editorial-faq__heading">{heading}</h2>}
          {faqs.map((item, i) => (
            <details key={i} className="editorial-faq__item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
      )
    },
    videoEmbed: ({ node }: { node: { fields: { url?: string; title?: string; caption?: string } } }) => {
      const { url, title, caption } = node.fields || {}
      const embed = url ? toEmbedUrl(url) : null
      if (!embed) return null
      return (
        <figure className="editorial-video">
          <div className="editorial-video__frame">
            <iframe
              src={embed}
              title={title || 'Embedded video'}
              loading="lazy"
              allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
      )
    },
    calloutBox: ({ node }: { node: { fields: CalloutBoxFields } }) => {
      const { title, content, author, accent = 'gold' } = node.fields || {}
      if (!content) return null

      return (
        <blockquote className={`editorial-callout editorial-callout--${accent}`}>
          {title && <div className="editorial-callout__title">{title}</div>}
          <div className="editorial-callout__content">{content}</div>
          {author && <cite className="editorial-callout__author">&mdash; {author}</cite>}
        </blockquote>
      )
    },
  },
})

export function RichTextRenderer({
  data,
  className = '',
}: {
  data: Record<string, unknown> | null | undefined
  className?: string
}) {
  if (!data) return null

  return (
    <div className={`article-prose ${className}`}>
      <RichText data={data as any} converters={customConverters} />
    </div>
  )
}
