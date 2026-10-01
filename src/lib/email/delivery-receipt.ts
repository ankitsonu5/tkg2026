/**
 * Nodemailer may resolve sendMail even when a recipient was rejected. Payload deliberately
 * types adapter responses as unknown, so normalize only the small receipt surface we need.
 */
type DeliveryReceipt = {
  accepted?: unknown
  rejected?: unknown
  messageId?: unknown
}

function addressStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item === 'string') return [item.toLowerCase()]
    if (item && typeof item === 'object' && 'address' in item) {
      return [String((item as { address: unknown }).address).toLowerCase()]
    }
    return []
  })
}

export function assertEmailAccepted(response: unknown, recipient: string): void {
  if (!response || typeof response !== 'object') return

  const receipt = response as DeliveryReceipt
  const accepted = addressStrings(receipt.accepted)
  const rejected = addressStrings(receipt.rejected)
  const normalizedRecipient = recipient.toLowerCase()

  if (rejected.includes(normalizedRecipient) || (Array.isArray(receipt.accepted) && accepted.length === 0)) {
    throw new Error('Email transport rejected the recipient address.')
  }
}

export function providerMessageId(response: unknown): string | undefined {
  if (!response || typeof response !== 'object') return undefined
  const value = (response as DeliveryReceipt).messageId
  return typeof value === 'string' && value.trim() ? value.slice(0, 500) : undefined
}
