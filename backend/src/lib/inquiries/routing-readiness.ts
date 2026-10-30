export interface RouteDeliveryConfiguration {
  enabled?: boolean | null
  primaryRecipient?: string | null
  backupRecipient?: string | null
  acceptanceStatus?: string | null
  acceptedBy?: string | null
  acceptedAt?: string | null
}

const RESERVED_HOSTS = new Set(['localhost', 'localhost.localdomain'])
const RESERVED_TLDS = ['.test', '.invalid', '.example']

export function isPlaceholderRecipient(address: string | null | undefined): boolean {
  const domain = address?.trim().toLowerCase().split('@')[1]
  if (!domain) return true
  return RESERVED_HOSTS.has(domain) || RESERVED_TLDS.some((suffix) => domain.endsWith(suffix))
}

/** Production readiness requires two deliverable mailboxes and recorded owner acceptance. */
export function routeReadinessProblems(route: RouteDeliveryConfiguration): string[] {
  const problems: string[] = []
  if (route.enabled === false) problems.push('route disabled')
  if (isPlaceholderRecipient(route.primaryRecipient)) problems.push('primary recipient missing or placeholder')
  if (isPlaceholderRecipient(route.backupRecipient)) problems.push('backup recipient missing or placeholder')
  if (route.acceptanceStatus !== 'accepted') problems.push('owner acceptance not recorded')
  if (!route.acceptedBy?.trim()) problems.push('acceptedBy missing')
  if (!route.acceptedAt || Number.isNaN(Date.parse(route.acceptedAt))) problems.push('acceptedAt missing or invalid')
  return problems
}
