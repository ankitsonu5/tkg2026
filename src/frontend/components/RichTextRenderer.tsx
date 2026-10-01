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

const customConverters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
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
