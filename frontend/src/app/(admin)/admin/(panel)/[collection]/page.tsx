import { Suspense } from 'react'

import { ListView } from '@/admin/ListView'

export default async function CollectionPage({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params
  return (
    <Suspense>
      <ListView slug={collection} />
    </Suspense>
  )
}
