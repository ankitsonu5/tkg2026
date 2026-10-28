/**
 * Pulls FAQ pairs out of a Lexical document so they can be emitted as FAQPage structured data.
 * Walks the tree generically: FAQ blocks are Lexical `block` nodes whose fields carry
 * `blockType: 'faq'`.
 */
export interface FaqPair {
  question: string
  answer: string
}

export function extractFaqPairs(node: unknown): FaqPair[] {
  const pairs: FaqPair[] = []

  const walk = (value: unknown): void => {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    const record = value as Record<string, unknown>
    const fields = record.fields as Record<string, unknown> | undefined
    if (record.type === 'block' && fields?.blockType === 'faq' && Array.isArray(fields.items)) {
      for (const item of fields.items as Record<string, unknown>[]) {
        const question = typeof item?.question === 'string' ? item.question.trim() : ''
        const answer = typeof item?.answer === 'string' ? item.answer.trim() : ''
        if (question && answer) pairs.push({ question, answer })
      }
      return
    }
    Object.values(record).forEach(walk)
  }

  walk(node)
  return pairs
}
