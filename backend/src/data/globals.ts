import { PRIMARY_NAVIGATION } from '../baseline/pages'
import type { PathSpec } from '../models'

export const GLOBAL_SLUGS = ['site-settings', 'navigation', 'footer'] as const
export type GlobalSlug = (typeof GLOBAL_SLUGS)[number]

export function isGlobalSlug(value: string): value is GlobalSlug {
  return (GLOBAL_SLUGS as readonly string[]).includes(value)
}

/** Values a global reads as when its document (or a field of it) was never saved. */
export const GLOBAL_DEFAULTS: Record<GlobalSlug, PathSpec<unknown>> = {
  'site-settings': [
    ['siteName', 'Tel K. Ganesan'],
    ['positioningLine', 'Executive Chairman | Enterprise Builder | Investor | Producer'],
    ['masterStatement', 'Tel K. Ganesan builds enterprises, leaders, and platforms that turn possibility into lasting value.'],
    ['allowIndexing', false],
    ['privacyPolicyVersion', 'draft-unapproved'],
    ['analytics.enabled', false],
  ],
  navigation: [['primary', PRIMARY_NAVIGATION.map((p) => ({ label: p.title, path: p.path, pageId: p.pageId }))]],
  footer: [['socialLinks.*.verified', false]],
}
