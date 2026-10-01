import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'
import { ConsentSettingsLink } from './ConsentBanner'
import { NewsletterSignup } from './NewsletterSignup'
import styles from './SiteFooter.module.css'

interface FooterLink {
  id?: string | null
  label: string
  path: string
}

interface FooterGroup {
  id?: string | null
  title: string
  links?: FooterLink[] | null
}

const DEFAULT_GROUPS: FooterGroup[] = [
  {
    id: 'grp-pillars',
    title: 'Core Pillars',
    links: [
      { id: 'lnk-about', label: 'Leadership Journey', path: '/about' },
      { id: 'lnk-enterprise', label: 'Enterprise & Investments', path: '/enterprise-investments' },
      { id: 'lnk-ideas', label: 'The Mind Trap (Ideas)', path: '/ideas' },
      { id: 'lnk-culture', label: 'Film & Culture', path: '/film-culture' },
      { id: 'lnk-impact', label: 'Global Philanthropy & STEM', path: '/impact' },
    ],
  },
  {
    id: 'grp-engage',
    title: 'Engage & Inquire',
    links: [
      { id: 'lnk-partnerships', label: 'Strategic Partnerships', path: '/connect?route=strategic-partnership' },
      { id: 'lnk-ventures', label: 'Venture Capital & M&A', path: '/connect?route=investment-ma' },
      { id: 'lnk-speaking', label: 'Keynotes & Speaking', path: '/connect?route=speaking' },
      { id: 'lnk-media', label: 'Press & Media Desk', path: '/media-speaking' },
      { id: 'lnk-general', label: 'Executive Office Direct', path: '/connect' },
    ],
  },
]

const SOCIAL_PROFILES = [
  {
    platform: 'LinkedIn',
    url: 'https://www.linkedin.com/in/telkganesan/',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.45 1.45 0 0 0 1.45-1.45 1.45 1.45 0 1 0-1.45 1.45m1.39 9.74v-8.37H5.07v8.37h2.78z" />
      </svg>
    ),
  },
  {
    platform: 'X (Twitter)',
    url: 'https://twitter.com/TelKGanesan',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    platform: 'Instagram',
    url: 'https://www.instagram.com/telkganesan/',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    platform: 'YouTube',
    url: 'https://www.youtube.com/@TelKGanesan',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    platform: 'IMDb',
    url: 'https://www.imdb.com/name/nm10609355/',
    icon: (
      <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.04em' }}>IMDb</span>
    ),
  },
]

export async function SiteFooter() {
  const payload = await getPayloadClient()
  const footer = await payload.findGlobal({ slug: 'footer', overrideAccess: true }).catch(() => null)

  const rawGroups = footer?.groups ?? []
  const groups: FooterGroup[] = (rawGroups.length === 2 ? rawGroups : DEFAULT_GROUPS) as FooterGroup[]

  return (
    <footer className={styles.footerRoot}>
      {/* Subtle Background Watermark */}
      <div className={styles.backgroundWatermark} aria-hidden="true">
        TEL K. GANESAN
      </div>

      <div className={styles.container}>
        {/* Top Branding & Status Bar */}
        <div className={styles.footerTopBar}>
          <div className={styles.brandIdentity}>
            <h2 className={styles.brandName}>Tel K. Ganesan</h2>
            <span className={styles.brandTagline}>Executive Chairman | Enterprise Builder | Investor | Producer</span>
          </div>

          <div className={styles.topRightActions}>
            <NewsletterSignup variant="inline" />
          </div>
        </div>

        {/* Main 4-Column Balanced Grid */}
        <div className={styles.footerMainGrid}>
          {/* Column 1: Executive Overview & Social Media */}
          <div className={styles.bioColumn}>
            <p className={styles.bioText}>
              Executive Chairman, serial entrepreneur, film producer, and venture builder empowering visionary founders and producing transformative cinematic stories worldwide.
            </p>
            <div className={styles.socialRow}>
              {SOCIAL_PROFILES.map((social) => (
                <a
                  key={social.platform}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialIconLink}
                  aria-label={`Follow Tel K. Ganesan on ${social.platform}`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
            <p className={styles.headquartersNote}>
              Headquartered in Metro Detroit with enterprise operations and film productions spanning North America and India.
            </p>
          </div>

          {/* Column 2 & 3: Navigation Link Groups */}
          {groups.map((group, idx) => (
            <div
              key={group.id ?? group.title}
              className={`${styles.navColumn} ${idx === 0 ? styles.exploreColumn : ''}`}
            >
              <h3 className={styles.columnHeading}>{group.title}</h3>
              <ul className={styles.linkList}>
                {(group.links ?? []).map((link) => (
                  <li key={link.id ?? link.path}>
                    <Link href={link.path} className={styles.linkItem}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Column 4: Simple Location Map */}
          <div className={styles.simpleMapContainer}>
            <div className={styles.simpleMapFrameWrapper}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2938.650892036733!2d-83.37688168453767!3d42.51268397917688!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8824bba750849ed7%3A0xe5a363229b3f367e!2s28230%20Orchard%20Lake%20Rd%20%23130%2C%20Farmington%20Hills%2C%20MI%2048334%2C%20USA!5e0!3m2!1sen!2sin!4v1647849182374!5m2!1sen!2sin"
                className={styles.simpleMapFrame}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Location Map"
              />
            </div>
          </div>
        </div>

        {/* Bottom Legal & Utility Bar */}
        <div className={styles.footerBottomBar}>
          <p style={{ margin: 0 }}>
            {footer?.legalLine ?? `© ${new Date().getFullYear()} Tel K. Ganesan. All rights reserved.`}
          </p>

          <div className={styles.legalLinks}>
            <Link href="/privacy" className={styles.legalLink}>
              Privacy Policy
            </Link>
            <span aria-hidden="true">•</span>
            <Link href="/terms" className={styles.legalLink}>
              Terms of Use
            </Link>
            <span aria-hidden="true">•</span>
            <Link href="/accessibility" className={styles.legalLink}>
              Accessibility Statement
            </Link>
            <span aria-hidden="true">•</span>
            <ConsentSettingsLink />
          </div>

          <a href="#main" className={styles.backToTopBtn} aria-label="Scroll back to top of page">
            <span>Back to Top</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  )
}
