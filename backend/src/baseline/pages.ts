/**
 * Section 5 — Approved Information Architecture. All 15 public page/template types.
 *
 * `path` values are PROPOSED technical mappings from the developer handoff and are NOT
 * yet frozen. They must be confirmed into the SEO register (SEO-*) before launch, because
 * canonicals and the redirect register derive from them (see docs/DECISIONS_AND_RISKS.md).
 */

export type PageKind = 'page' | 'template' | 'utility'

export interface BaselinePage {
  /** Stable PAGE ID from the baseline. Never renamed without a change request. */
  pageId: string
  title: string
  seoTitle?: string
  seoDescription?: string
  /** Proposed route. Dynamic templates use [slug]. */
  path: string
  kind: PageKind
  purpose: string
  /** Primary CTA label from the baseline. One primary action per page. */
  primaryCta: string | null
  /** Stable CTA ID. */
  primaryCtaId: string | null
  /** Inquiry route this page's primary CTA opens, when it opens one. */
  ctaRouteId?: string
  /** Modules required by Section 6, as MOD IDs. */
  modules: string[]
  /** Search engine indexation intent. Section 11.1 forbids indexing search results. */
  indexable: boolean
  inPrimaryNav: boolean
}

export const BASELINE_PAGES: BaselinePage[] = [
  {
    pageId: 'HOME',
    title: 'Home',
    seoTitle: 'Tel K. Ganesan | Executive Chairman and Enterprise Builder',
    seoDescription: 'Tel K. Ganesan builds enterprises, leaders, and platforms across technology, ideas, culture, and community impact. Explore his journey and work.',
    path: '/',
    kind: 'page',
    purpose: 'Establish identity, flagship proof and routes.',
    primaryCta: 'Explore the Leadership Journey',
    primaryCtaId: 'CTA-HOME-PRIMARY',
    modules: [
      'MOD-HOME-HERO',
      'MOD-HOME-KYYBA-FLAGSHIP',
      'MOD-HOME-LEADERSHIP-JOURNEY',
      'MOD-HOME-SELECTED-ENTERPRISE',
      'MOD-HOME-SELECTED-IDEAS',
      'MOD-HOME-SELECTED-CULTURE',
      'MOD-HOME-SELECTED-IMPACT',
      'MOD-HOME-MEDIA-CREDIBILITY',
      'MOD-HOME-FINAL-CTA',
    ],
    indexable: true,
    inPrimaryNav: false,
  },
  {
    pageId: 'ABOUT',
    title: 'About',
    seoTitle: 'About Tel K. Ganesan | Entrepreneur and Enterprise Builder',
    seoDescription: 'Explore Tel K. Ganesan’s journey from India to Detroit, the decisions behind Kyyba, and the leadership principles guiding his current work.',
    path: '/about',
    kind: 'page',
    purpose: 'Build confidence through journey and operating principles.',
    primaryCta: 'Explore Enterprise & Investments',
    primaryCtaId: 'CTA-ABOUT-PRIMARY',
    modules: [
      'MOD-ABOUT-BIO',
      'MOD-ABOUT-TIMELINE',
      'MOD-ABOUT-PRINCIPLES',
      'MOD-ABOUT-RECOGNITION',
      'MOD-ABOUT-HUMAN-CONTEXT',
      'MOD-ABOUT-ENTERPRISE-BRIDGE',
    ],
    indexable: true,
    inPrimaryNav: true,
  },
  {
    pageId: 'ENTERPRISE',
    title: 'Enterprise & Investments',
    seoTitle: 'Enterprise & Investments | Tel K. Ganesan',
    seoDescription: 'Explore Tel K. Ganesan’s enterprise-building approach, Kyyba’s flagship role, selected ventures, governance philosophy, and strategic partnership opportunities.',
    path: '/enterprise-investments',
    kind: 'page',
    purpose: 'Show Kyyba-led enterprise value and selected relationships.',
    primaryCta: 'Discuss a Strategic Partnership',
    primaryCtaId: 'CTA-ENTERPRISE-PRIMARY',
    ctaRouteId: 'strategic-partnership',
    modules: [
      'MOD-ENTERPRISE-KYYBA-FLAGSHIP',
      'MOD-ENTERPRISE-APPROACH',
      'MOD-ENTERPRISE-PORTFOLIO',
      'MOD-ENTERPRISE-ENTITY-ROUTES',
      'MOD-ENTERPRISE-QUALIFICATION',
    ],
    indexable: true,
    inPrimaryNav: true,
  },
  {
    pageId: 'IDEAS',
    title: 'Ideas',
    seoTitle: 'Ideas from Tel K. Ganesan | Leadership, AI and Mind Trap',
    seoDescription: 'Practical ideas on founder focus, leadership systems, AI and work, cross-cultural entrepreneurship, mental freedom, storytelling, and legacy.',
    path: '/ideas',
    kind: 'page',
    purpose: 'Organize thought leadership, frameworks and Mind Trap.',
    primaryCta: "Subscribe to Tel's Ideas",
    primaryCtaId: 'CTA-IDEAS-PRIMARY',
    modules: [
      'MOD-IDEAS-FEATURED',
      'MOD-IDEAS-TOPIC-FILTERS',
      'MOD-IDEAS-FRAMEWORKS',
      'MOD-IDEAS-MIND-TRAP',
      'MOD-IDEAS-NEWSLETTER',
    ],
    indexable: true,
    inPrimaryNav: true,
  },
  {
    pageId: 'CULTURE',
    title: 'Film & Culture',
    seoTitle: 'Film & Culture | Tel K. Ganesan, Enterprise Builder',
    seoDescription: 'Explore selected film, music, and cultural work connected to Tel K. Ganesan, with verified credits, official destinations, and collaboration routes.',
    path: '/film-culture',
    kind: 'page',
    purpose: 'Present verified creative work and official destinations.',
    primaryCta: 'View Selected Work',
    primaryCtaId: 'CTA-CULTURE-PRIMARY',
    modules: [
      'MOD-CULTURE-SELECTED-WORK',
      'MOD-CULTURE-PROJECT-CARDS',
      'MOD-CULTURE-ROLE-CREDIT',
      'MOD-CULTURE-OFFICIAL-MEDIA',
      'MOD-CULTURE-COLLABORATION',
    ],
    indexable: true,
    inPrimaryNav: true,
  },
  {
    pageId: 'IMPACT',
    title: 'Impact',
    seoTitle: 'Community Impact | Tel K. Ganesan, Enterprise Builder',
    seoDescription: 'Explore Tel K. Ganesan’s community, mentoring, youth, and civic initiatives through documented outcomes and partner-led stories.',
    path: '/impact',
    kind: 'page',
    purpose: 'Explain contribution, programs, evidence and partnership criteria.',
    primaryCta: 'Explore an Impact Partnership',
    primaryCtaId: 'CTA-IMPACT-PRIMARY',
    ctaRouteId: 'impact',
    modules: [
      'MOD-IMPACT-FOCUS-AREAS',
      'MOD-IMPACT-INITIATIVES',
      'MOD-IMPACT-EVIDENCE',
      'MOD-IMPACT-PARTNERS',
      'MOD-IMPACT-GEOGRAPHY',
      'MOD-IMPACT-PARTICIPATION',
    ],
    indexable: true,
    inPrimaryNav: true,
  },
  {
    pageId: 'MEDIA',
    title: 'Media & Speaking',
    seoTitle: 'Tel K. Ganesan | Speaker, Media and Interviews',
    seoDescription: 'Book Tel K. Ganesan for keynotes, executive conversations, podcasts, and media on enterprise building, leadership, AI, mental freedom, and legacy.',
    path: '/media-speaking',
    kind: 'page',
    purpose: 'Support journalists, producers and event organizers.',
    // Baseline label. This opens a qualified inquiry; it never confirms a booking.
    primaryCta: 'Book Tel to Speak',
    primaryCtaId: 'CTA-MEDIA-PRIMARY',
    ctaRouteId: 'speaking',
    modules: [
      'MOD-MEDIA-TOPICS',
      'MOD-MEDIA-BIOS',
      'MOD-MEDIA-SPEAKER-REEL',
      'MOD-MEDIA-CLIPS',
      'MOD-MEDIA-RECOGNITION',
      'MOD-MEDIA-PRESS-KIT',
      'MOD-MEDIA-INQUIRY-ROUTES',
    ],
    indexable: true,
    inPrimaryNav: true,
  },
  {
    pageId: 'CONNECT',
    title: 'Connect',
    seoTitle: 'Connect with Tel K. Ganesan | Partnerships & Inquiries',
    seoDescription: 'Choose the right route for strategic partnerships, investment or M&A, speaking, media, creative work, or community collaboration.',
    path: '/connect',
    kind: 'page',
    purpose: 'Route qualified inquiries without exposing Tel as routine intake.',
    primaryCta: 'Submit Qualified Inquiry',
    primaryCtaId: 'CTA-CONNECT-PRIMARY',
    modules: [
      'MOD-CONNECT-INTENT-SELECTOR',
      'MOD-CONNECT-ROUTE-FORM',
      'MOD-CONNECT-PRIVACY-NOTICE',
      'MOD-CONNECT-ACKNOWLEDGEMENT',
    ],
    indexable: true,
    inPrimaryNav: true,
  },
  {
    pageId: 'ARTICLE',
    title: 'Idea / Article detail',
    path: '/ideas/[slug]',
    kind: 'template',
    purpose: 'Deliver readable authored content and related discovery.',
    primaryCta: "Subscribe to Tel's Ideas",
    primaryCtaId: 'CTA-ARTICLE-PRIMARY',
    modules: ['MOD-ARTICLE-BODY', 'MOD-ARTICLE-CONTEXT', 'MOD-ARTICLE-RELATED', 'MOD-ARTICLE-SUBSCRIBE'],
    indexable: true,
    inPrimaryNav: false,
  },
  {
    pageId: 'ENTITY',
    title: 'Enterprise / Investment detail',
    path: '/enterprise-investments/[slug]',
    kind: 'template',
    purpose: 'Explain current entity relationship and evidence.',
    primaryCta: 'Visit Official Entity',
    primaryCtaId: 'CTA-ENTITY-PRIMARY',
    modules: ['MOD-ENTITY-CONTEXT', 'MOD-ENTITY-STATUS', 'MOD-ENTITY-EVIDENCE', 'MOD-ENTITY-OFFICIAL', 'MOD-ENTITY-RELATED'],
    indexable: true,
    inPrimaryNav: false,
  },
  {
    pageId: 'PROJECT',
    title: 'Film / Culture detail',
    path: '/film-culture/[slug]',
    kind: 'template',
    purpose: 'Show verified credits, assets and official viewing route.',
    primaryCta: 'Official Destination',
    primaryCtaId: 'CTA-PROJECT-PRIMARY',
    modules: ['MOD-PROJECT-CONTEXT', 'MOD-PROJECT-CREDITS', 'MOD-PROJECT-MEDIA', 'MOD-PROJECT-OFFICIAL', 'MOD-PROJECT-RELATED'],
    indexable: true,
    inPrimaryNav: false,
  },
  {
    pageId: 'INITIATIVE',
    title: 'Impact detail',
    path: '/impact/[slug]',
    kind: 'template',
    purpose: 'Show purpose, partners, outcomes and participation.',
    primaryCta: 'Partner or Participate',
    primaryCtaId: 'CTA-INITIATIVE-PRIMARY',
    ctaRouteId: 'impact',
    modules: ['MOD-INITIATIVE-PURPOSE', 'MOD-INITIATIVE-PARTNERS', 'MOD-INITIATIVE-OUTCOMES', 'MOD-INITIATIVE-PARTICIPATE', 'MOD-INITIATIVE-RELATED'],
    indexable: true,
    inPrimaryNav: false,
  },
  {
    pageId: 'SEARCH',
    title: 'Search results',
    path: '/search',
    kind: 'utility',
    purpose: 'Enable discovery without indexing duplicate result pages.',
    primaryCta: 'Open result',
    primaryCtaId: 'CTA-SEARCH-PRIMARY',
    modules: ['MOD-SEARCH-INPUT', 'MOD-SEARCH-RESULTS', 'MOD-SEARCH-EMPTY'],
    // Section 11.1: search result pages must never be indexed.
    indexable: false,
    inPrimaryNav: false,
  },
  {
    pageId: 'PRIVACY',
    title: 'Privacy Policy',
    seoTitle: 'Privacy Policy | Tel K. Ganesan',
    seoDescription: 'Read how the Tel K. Ganesan website collects, uses, protects and manages personal information and visitor choices.',
    path: '/privacy',
    kind: 'utility',
    purpose: 'Explain collection, use, retention and visitor choices.',
    primaryCta: 'Contact the privacy owner',
    primaryCtaId: 'CTA-PRIVACY-PRIMARY',
    modules: ['MOD-PRIVACY-POLICY', 'MOD-PRIVACY-CONTACT'],
    indexable: true,
    inPrimaryNav: false,
  },
  {
    pageId: 'TERMS',
    title: 'Terms of Use',
    seoTitle: 'Terms of Use | Tel K. Ganesan',
    seoDescription: 'Review the terms governing use of the Tel K. Ganesan website, its content, downloads, external links and intellectual property.',
    path: '/terms',
    kind: 'utility',
    purpose: 'Set the terms governing website use, content and intellectual property.',
    primaryCta: null,
    primaryCtaId: null,
    modules: ['MOD-TERMS-POLICY'],
    indexable: true,
    inPrimaryNav: false,
  },
  {
    pageId: 'ACCESSIBILITY',
    title: 'Accessibility Statement',
    seoTitle: 'Accessibility Statement | Tel K. Ganesan',
    seoDescription: 'Read the website accessibility commitment, supported standards, known limitations and the process for requesting assistance.',
    path: '/accessibility',
    kind: 'utility',
    purpose: 'Publish commitment, known limits and assistance route.',
    primaryCta: 'Request accessibility help',
    primaryCtaId: 'CTA-ACCESSIBILITY-PRIMARY',
    modules: ['MOD-ACCESSIBILITY-COMMITMENT', 'MOD-ACCESSIBILITY-LIMITS', 'MOD-ACCESSIBILITY-ASSISTANCE'],
    indexable: true,
    inPrimaryNav: false,
  },
]

export const PAGE_IDS = BASELINE_PAGES.map((p) => p.pageId)

export const PRIMARY_NAVIGATION = BASELINE_PAGES.filter((p) => p.inPrimaryNav)

export function getBaselinePage(pageId: string): BaselinePage | undefined {
  return BASELINE_PAGES.find((p) => p.pageId === pageId)
}

/** Every MOD ID declared across the architecture, used to validate CMS block placement. */
export const ALL_MODULE_IDS = Array.from(new Set(BASELINE_PAGES.flatMap((p) => p.modules)))
