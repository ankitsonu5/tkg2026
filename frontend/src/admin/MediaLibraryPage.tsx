'use client'

import { MediaBrowser } from './MediaLibrary'

export function MediaLibraryPage() {
  return (
    <>
      <div className="wpa-heading">
        <h1>Media Library</h1>
      </div>
      <MediaBrowser />
    </>
  )
}
