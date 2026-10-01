import React from 'react'

/**
 * Renders one or more Schema.org JSON-LD scripts safely.
 */
export function JsonLd({
  schema,
}: {
  schema: Record<string, unknown> | Record<string, unknown>[] | null | undefined
}) {
  if (!schema) return null
  const schemas = Array.isArray(schema) ? schema : [schema]
  if (schemas.length === 0) return null

  return (
    <>
      {schemas.map((s, idx) => (
        <script
          key={String(s['@id'] ?? s['@type'] ?? idx)}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(s).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  )
}
