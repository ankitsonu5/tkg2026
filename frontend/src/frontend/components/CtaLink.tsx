'use client'

import Link from 'next/link'

import { track } from '@/lib/analytics/adapter'

/**
 * A CTA that emits `primary_cta_click` with the baseline's minimum parameters, and
 * `outbound_referral` for official external destinations.
 *
 * External destinations are validated to http/https before rendering: an unvalidated
 * destination becomes inert text rather than a live link, so a bad CMS value can never
 * produce a javascript: link.
 */
export function CtaLink({
  pageId,
  moduleId,
  ctaId,
  label,
  destination,
  destinationType,
  emphasis = 'primary',
  ownerRole,
}: {
  pageId: string
  moduleId?: string
  ctaId?: string | null
  label: string
  destination?: string | null
  destinationType?: string | null
  emphasis?: 'primary' | 'secondary'
  ownerRole?: string
}) {
  const className = `cta cta--${emphasis}`

  const onClick = () => {
    track('primary_cta_click', {
      page_id: pageId,
      module_id: moduleId,
      cta_id: ctaId,
      label,
      destination_type: destinationType,
      owner_role: ownerRole,
    })
  }

  if (!destination) {
    return (
      <span className={className} aria-disabled="true" title="Destination not yet configured">
        {label}
      </span>
    )
  }

  if (destinationType === 'external') {
    let safe: URL | null = null
    try {
      const url = new URL(destination)
      if (url.protocol === 'http:' || url.protocol === 'https:') safe = url
    } catch {
      safe = null
    }

    if (!safe) {
      return (
        <span className={className} aria-disabled="true" title="External destination failed validation">
          {label}
        </span>
      )
    }

    return (
      <a
        className={className}
        href={safe.toString()}
        rel="noopener noreferrer"
        onClick={() => {
          onClick()
          track('outbound_referral', {
            entity_id: pageId,
            destination: safe.hostname,
            cta_id: ctaId,
          })
        }}
      >
        {label}
      </a>
    )
  }

  if (destinationType === 'inquiry') {
    return (
      <Link className={className} href={`/connect?route=${encodeURIComponent(destination)}`} onClick={onClick}>
        {label}
      </Link>
    )
  }

  return (
    <Link className={className} href={destination} onClick={onClick}>
      {label}
    </Link>
  )
}
