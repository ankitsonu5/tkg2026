/**
 * GA4 / Analytics Instrumentation Audit & Verification
 *
 * Verifies:
 *  1. Consent-gated inertness (FR-PRIV-01 / Section 11.2)
 *  2. Measurement ID configuration
 *  3. Pageview event dispatch and page_id resolution across all 17 templates
 *  4. Client-side navigation tracking & deduplication
 *  5. Custom event contract compliance (all 8 taxonomy events)
 *  6. PII scrubbing & privacy invariants (QA-AN-02, QA-AN-03)
 *  7. Account-level GA4 property requirements
 */

import {
  track,
  resolvePageId,
  readConsent,
  writeConsent,
  resetAnalyticsState,
  CONSENT_STORAGE_KEY,
} from '../src/lib/analytics/adapter'
import {
  ANALYTICS_EVENTS,
  classifyQuery,
  scrubParams,
  type AnalyticsEventName,
} from '../src/lib/analytics/events'

// In-memory mock for localStorage / sessionStorage / window
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear() {
    this.store.clear()
  }
  getItem(key: string) {
    return this.store.get(key) ?? null
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value))
  }
}

interface DispatchedEvent {
  type: string
  name: string
  payload: Record<string, unknown>
}

function setupBrowserEnvironment(): {
  dispatched: DispatchedEvent[]
  localStorage: MemoryStorage
  sessionStorage: MemoryStorage
} {
  const dispatched: DispatchedEvent[] = []
  const localStorage = new MemoryStorage()
  const sessionStorage = new MemoryStorage()

  const fakeWindow = {
    localStorage,
    sessionStorage,
    dispatchEvent: (_event: unknown) => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    dataLayer: [] as unknown[],
    gtag: (type: string, name: string, payload: Record<string, unknown>) => {
      dispatched.push({ type, name, payload })
    },
  }

  // @ts-ignore
  global.window = fakeWindow
  // @ts-ignore
  global.localStorage = localStorage
  // @ts-ignore
  global.sessionStorage = sessionStorage

  return { dispatched, localStorage, sessionStorage }
}

async function runAudit() {
  console.log('═'.repeat(120))
  console.log('TKG GA4 / ANALYTICS INSTRUMENTATION AUDIT & VERIFICATION REPORT')
  console.log('═'.repeat(120))
  console.log()

  const env = setupBrowserEnvironment()
  const TEST_MEASUREMENT_ID = 'G-TKGTEST999'
  process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = TEST_MEASUREMENT_ID

  let passCount = 0
  let failCount = 0

  function assert(title: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`  ✓ ${title}`)
      passCount++
    } else {
      console.error(`  ✗ FAIL: ${title} ${detail ? `(${detail})` : ''}`)
      failCount++
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Consent Gating (FR-PRIV-01)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('── 1. Consent Gating & Inertness (FR-PRIV-01) ──')

  // Case 1A: Consent Unset
  env.dispatched.length = 0
  resetAnalyticsState()
  env.localStorage.removeItem(CONSENT_STORAGE_KEY)
  assert('Default consent is unset', readConsent() === 'unset')

  track('page_view', { page_id: 'HOME', page_path: '/' })
  assert('Zero events dispatched when consent is unset', env.dispatched.length === 0)

  // Case 1B: Consent Denied
  writeConsent('denied')
  assert('writeConsent("denied") sets state to denied', readConsent() === 'denied')
  track('page_view', { page_id: 'HOME', page_path: '/' })
  assert('Zero events dispatched when consent is denied', env.dispatched.length === 0)

  // Case 1C: Consent Granted
  writeConsent('granted')
  assert('writeConsent("granted") sets state to granted', readConsent() === 'granted')
  track('page_view', { page_id: 'HOME', page_path: '/' })
  assert('Events dispatched when consent is granted', env.dispatched.length === 1)
  assert('Event name is page_view', env.dispatched[0]?.name === 'page_view')
  assert('Payload matches page_view contract', env.dispatched[0]?.payload.page_id === 'HOME' && env.dispatched[0]?.payload.page_path === '/')

  // Case 1D: Consent Withdrawal cleans attribution
  env.localStorage.setItem('tkg.attribution.v1', 'utm_source=linkedin')
  env.sessionStorage.setItem('tkg.attribution.v1', 'utm_source=linkedin')
  writeConsent('denied')
  assert('Consent withdrawal purges localStorage attribution', env.localStorage.getItem('tkg.attribution.v1') === null)
  assert('Consent withdrawal purges sessionStorage attribution', env.sessionStorage.getItem('tkg.attribution.v1') === null)
  console.log()

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Measurement ID Configuration
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('── 2. Measurement Configuration ──')
  writeConsent('granted')
  env.dispatched.length = 0
  resetAnalyticsState()

  // Without ID
  delete process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
  track('page_view', { page_id: 'ABOUT', page_path: '/about' })
  assert('Stays inert if NEXT_PUBLIC_GA4_MEASUREMENT_ID is missing', env.dispatched.length === 0)

  // Restore ID
  process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = TEST_MEASUREMENT_ID
  track('page_view', { page_id: 'ABOUT', page_path: '/about' })
  assert('Fires successfully when measurement ID is configured', env.dispatched.length === 1)
  console.log()

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Template Coverage & Page ID Resolution (All 17 Routes)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('── 3. Page Template Coverage & Page ID Mapping ──')

  const ROUTES: { path: string; expectedId: string; description: string }[] = [
    { path: '/', expectedId: 'HOME', description: 'Homepage' },
    { path: '/about', expectedId: 'ABOUT', description: 'Executive Biography' },
    { path: '/enterprise-investments', expectedId: 'ENTERPRISE', description: 'Enterprise Hub' },
    { path: '/enterprise-investments/kyyba', expectedId: 'ENTITY', description: 'Enterprise Detail (Kyyba)' },
    { path: '/ideas', expectedId: 'IDEAS', description: 'Ideas & Operating Principles' },
    { path: '/ideas/mind-trap-operating-system', expectedId: 'ARTICLE', description: 'Article Detail' },
    { path: '/film-culture', expectedId: 'CULTURE', description: 'Film & Media' },
    { path: '/film-culture/mind-trap-film', expectedId: 'PROJECT', description: 'Film Detail' },
    { path: '/impact', expectedId: 'IMPACT', description: 'Community Initiatives' },
    { path: '/impact/youth-mentorship', expectedId: 'INITIATIVE', description: 'Initiative Detail' },
    { path: '/media-speaking', expectedId: 'MEDIA', description: 'Keynotes & Media' },
    { path: '/connect', expectedId: 'CONNECT', description: 'Direct Contact Router' },
    { path: '/privacy', expectedId: 'PRIVACY', description: 'Privacy Policy' },
    { path: '/terms', expectedId: 'TERMS', description: 'Terms of Use' },
    { path: '/accessibility', expectedId: 'ACCESSIBILITY', description: 'Accessibility' },
    { path: '/search', expectedId: 'SEARCH', description: 'Site Search' },
    { path: '/newsletter/confirm', expectedId: 'NEWSLETTER_CONFIRM', description: 'Newsletter Confirmation' },
  ]

  console.log('Path'.padEnd(42) + 'Resolved Page ID'.padEnd(24) + 'Template Category'.padEnd(30) + 'Status')
  console.log('─'.repeat(105))

  for (const r of ROUTES) {
    const resolved = resolvePageId(r.path)
    const matches = resolved === r.expectedId
    assert(`Resolved ${r.path} -> ${r.expectedId}`, matches)
    console.log(`${r.path.padEnd(42)}${resolved.padEnd(24)}${r.description.padEnd(30)}${matches ? 'PASS ✅' : 'FAIL ❌'}`)
  }
  console.log()

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Client-Side Navigation Tracking & Deduplication
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('── 4. Client-Side Navigation Simulation & Deduplication ──')
  env.dispatched.length = 0
  resetAnalyticsState()

  const navSequence = ['/', '/about', '/ideas', '/ideas/mind-trap-operating-system', '/connect']
  for (const p of navSequence) {
    const pid = resolvePageId(p)
    track('page_view', { page_id: pid, page_path: p }, { once: `page_view:${p}` })
  }

  assert(`Recorded exactly ${navSequence.length} pageviews across navigation flow`, env.dispatched.length === navSequence.length)

  // Attempt duplicate fire on same route
  track('page_view', { page_id: 'HOME', page_path: '/' }, { once: 'page_view:/' })
  assert('Duplicate pageview guarded via opts.once', env.dispatched.length === navSequence.length)
  console.log()

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Custom Event Taxonomy Compliance
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('── 5. Full Event Taxonomy Compliance (8/8 Baseline Events) ──')
  env.dispatched.length = 0
  resetAnalyticsState()

  const eventSamples: { event: AnalyticsEventName; params: Record<string, unknown> }[] = [
    {
      event: 'page_view',
      params: { page_id: 'HOME', page_path: '/' },
    },
    {
      event: 'primary_cta_click',
      params: { page_id: 'HOME', module_id: 'MOD-HOME-HERO', cta_id: 'CTA-HOME-PRIMARY', label: 'Explore Journey', destination_type: 'internal', owner_role: 'executive' },
    },
    {
      event: 'outbound_referral',
      params: { entity_id: 'HOME', destination: 'kyyba.com', cta_id: 'CTA-KYYBA-LINK' },
    },
    {
      event: 'form_start',
      params: { form_id: 'FORM-MEDIA', inquiry_type: 'speaking', source_page: '/connect' },
    },
    {
      event: 'form_submit',
      params: { form_id: 'FORM-MEDIA', route_id: 'media', reference_id: 'INQ-2026-001' },
    },
    {
      event: 'form_error',
      params: { form_id: 'FORM-MEDIA', route_id: 'media', error_class: 'validation' },
    },
    {
      event: 'download',
      params: { asset_id: 'tel-k-ganesan-press-kit-pdf', version: '2026.1', page_id: 'MEDIA', cta_id: 'CTA-MEDIA-PRESSKIT' },
    },
    {
      event: 'search',
      params: { query_class: classifyQuery('quantum leadership'), result_count: 3 },
    },
  ]

  for (const sample of eventSamples) {
    const prevLen = env.dispatched.length
    track(sample.event, sample.params)
    const last = env.dispatched[env.dispatched.length - 1]
    const requiredKeys = ANALYTICS_EVENTS[sample.event] as readonly string[]
    const hasAll = requiredKeys.every((k) => k in (last?.payload ?? {}))
    assert(`Event '${sample.event}' dispatches with all baseline keys`, env.dispatched.length === prevLen + 1 && hasAll)
  }
  console.log()

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Privacy & PII Scrubbing Invariants (QA-AN-02 / QA-AN-03)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('── 6. Privacy & PII Scrubbing Invariants ──')
  env.dispatched.length = 0

  track('form_submit', {
    form_id: 'FORM-SPEAKING',
    route_id: 'speaking',
    reference_id: 'INQ-888',
    email: 'executive@vip.org',
    fullName: 'Jane Doe',
    message: 'Confidential inquiry content',
    query: 'secret search term',
    internal_notes: 'Highly sensitive notes',
  })

  const scrubbedPayload = env.dispatched[0]?.payload ?? {}
  assert('Retains legitimate routing params (form_id)', 'form_id' in scrubbedPayload)
  assert('Retains legitimate reference_id', 'reference_id' in scrubbedPayload)
  assert('Strictly removes email', !('email' in scrubbedPayload))
  assert('Strictly removes fullName', !('fullName' in scrubbedPayload))
  assert('Strictly removes message', !('message' in scrubbedPayload))
  assert('Strictly removes query', !('query' in scrubbedPayload))
  assert('Strictly removes internal_notes', !('internal_notes' in scrubbedPayload))

  // Search bucketing invariant
  assert('classifyQuery single term', classifyQuery('leadership') === 'single-term')
  assert('classifyQuery address masked', classifyQuery('test@domain.com') === 'contains-address')
  assert('classifyQuery short phrase', classifyQuery('venture studio model') === 'short-phrase')
  assert('classifyQuery long phrase', classifyQuery('how to scale global enterprise operations') === 'long-phrase')
  assert('classifyQuery empty string', classifyQuery('   ') === 'empty')
  console.log()

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Account-Level Checklist & Required Access
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('── 7. Account-Level Access & Property Configuration Checklist ──')
  console.log(`
The following steps require admin-level access to the Google Analytics 4 console
(property dashboard: https://analytics.google.com/):

1. Measurement ID Provisioning:
   - Create a Web Data Stream for 'https://telkganesan.com'.
   - Copy the Measurement ID (format: G-XXXXXXXXXX).
   - Set in production environment:
     NEXT_PUBLIC_GA4_MEASUREMENT_ID="G-XXXXXXXXXX"
     Or configure via Payload CMS: Admin > Site Settings > Analytics > GA4 Measurement ID.

2. Custom Definitions (Dimensions) Registration:
   In GA4 Admin > Custom definitions > Custom dimensions, create event-scoped dimensions for:
   • page_id          (Event parameter: page_id)
   • module_id        (Event parameter: module_id)
   • cta_id           (Event parameter: cta_id)
   • destination_type (Event parameter: destination_type)
   • owner_role       (Event parameter: owner_role)
   • form_id          (Event parameter: form_id)
   • route_id         (Event parameter: route_id)
   • error_class      (Event parameter: error_class)
   • asset_id         (Event parameter: asset_id)
   • query_class      (Event parameter: query_class)

3. Data Retention:
   - In Admin > Data Settings > Data Retention: extend event data retention from 2 months to 14 months.

4. Enhanced Measurement Settings:
   - In Admin > Data Streams > Web Stream Details > Enhanced measurement:
     Disable automatic "Page changes based on browser history events" if custom page_view is preferred,
     or keep our 'send_page_view: false' config to prevent duplicate counts.
`)

  console.log('═'.repeat(120))
  console.log(`FINAL RESULT: ${passCount} PASS  ${failCount} FAIL  (${passCount + failCount} Total Checks)`)
  console.log('═'.repeat(120))

  if (failCount > 0) {
    process.exit(1)
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit failure:', err)
  process.exit(1)
})
