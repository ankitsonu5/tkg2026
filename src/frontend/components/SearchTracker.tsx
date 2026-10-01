'use client'

import { useEffect } from 'react'
import { track } from '@/lib/analytics/adapter'
import { classifyQuery } from '@/lib/analytics/events'

export function SearchTracker({ query, resultCount }: { query: string; resultCount: number }) {
  useEffect(() => {
    if (!query.trim()) return
    track('search', {
      query_class: classifyQuery(query),
      result_count: resultCount,
    })
  }, [query, resultCount])

  return null
}
