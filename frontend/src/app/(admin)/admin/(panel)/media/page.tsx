import type { Metadata } from 'next'

import { MediaLibraryPage } from '@/admin/MediaLibraryPage'

export const metadata: Metadata = { title: 'Media Library' }

export default function MediaPage() {
  return <MediaLibraryPage />
}
