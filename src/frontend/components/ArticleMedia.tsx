import Image from 'next/image'

import type { FeaturedImage } from '@/lib/articles'

/**
 * Renders a featured image. Cleared assets go through the Next image optimiser. An uncleared
 * asset (development preview only, see resolveFeaturedImage) is served directly so the
 * logged-in editor can see it; the optimiser fetches without cookies and would be refused.
 */
export function ArticleMedia({
  image,
  sizes,
  priority = false,
  className,
  variant = 'full',
}: {
  image: FeaturedImage
  sizes: string
  priority?: boolean
  className?: string
  variant?: 'full' | 'card'
}) {
  const src = variant === 'card' ? image.cardSrc : image.src
  if (!image.cleared) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={image.alt} className={className} loading={priority ? 'eager' : 'lazy'} />
  }
  return (
    <Image
      src={src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  )
}
