'use client'

import React from 'react'
import { track } from '@/lib/analytics/adapter'

export function DownloadButton({
  href,
  downloadName,
  assetId,
  version = '2026.1',
  pageId = 'MEDIA',
  ctaId = 'CTA-MEDIA-PRESSKIT',
  className,
  style,
  children,
}: {
  href: string
  downloadName?: string
  assetId: string
  version?: string
  pageId?: string
  ctaId?: string
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  const handleClick = () => {
    track(
      'download',
      {
        asset_id: assetId,
        version,
        page_id: pageId,
        cta_id: ctaId,
      },
      { once: `download:${assetId}:${version}` },
    )
  }

  return (
    <a
      href={href}
      download={downloadName}
      className={className}
      style={style}
      onClick={handleClick}
    >
      {children}
    </a>
  )
}
