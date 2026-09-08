import Link from 'next/link'

import { getPayloadClient } from '@/lib/payload'
import { ConsentSettingsLink } from './ConsentBanner'

/**
 * Footer with grouped navigation, legal/accessibility links and consent settings.
 * Social destinations render ONLY when marked verified: the baseline requires verified
 * destinations, so an unverified link is omitted rather than guessed.
 */
export async function SiteFooter() {
  const payload = await getPayloadClient()
  const footer = await payload.findGlobal({ slug: 'footer', overrideAccess: true }).catch(() => null)

  const groups = footer?.groups ?? []
  const verifiedSocial = (footer?.socialLinks ?? []).filter((link) => link.verified)

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__groups">
          {groups.map((group) => (
            <div key={group.id ?? group.title}>
              <h2>{group.title}</h2>
              <ul>
                {(group.links ?? []).map((link) => (
                  <li key={link.id ?? link.path}>
                    <Link href={link.path}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2>Legal</h2>
            <ul>
              <li>
                <Link href="/privacy">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/accessibility">Accessibility Statement</Link>
              </li>
              <li>
                <ConsentSettingsLink />
              </li>
            </ul>
          </div>

          {verifiedSocial.length > 0 && (
            <div>
              <h2>Elsewhere</h2>
              <ul>
                {verifiedSocial.map((link) => (
                  <li key={link.id ?? link.url}>
                    <a href={link.url} rel="me noopener noreferrer">
                      {link.platform}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <p className="site-footer__legal">
          {footer?.legalLine ?? `© ${new Date().getFullYear()} Tel K. Ganesan. All rights reserved.`}
        </p>
      </div>
    </footer>
  )
}
