import Link from 'next/link'

import press from '@/frontend/data/press-kit.json'
import { Breadcrumbs } from './Breadcrumbs'
import { CopyButton } from './CopyButton'
import { CtaLink } from './CtaLink'
import { DownloadButton } from './DownloadButton'
import styles from './MediaPage.module.css'

/**
 * Media & Speaking page. Structure and wording follow Tel K. Ganesan's approval of 6 Oct 2026:
 * hero > speaking themes > formats > short and full bio > operating principles > platforms >
 * press kit download > official destinations > inquiry routes.
 *
 * All text lives in src/frontend/data/press-kit.json (also used by the PDF generator). A theme's
 * audience/takeaway line and the response-time line render only once they are filled in there,
 * which happens only after sign-off, so nothing unapproved can appear on the page.
 */
export function MediaPage() {
  const rawResponseTime = press.responseTime as string | null
  const responseTime = typeof rawResponseTime === 'string' && rawResponseTime.trim() ? rawResponseTime : null

  return (
    <>
      <section className={styles.hero} aria-labelledby="press-headline">
        <div className="container">
          <Breadcrumbs pageId="MEDIA" />
          <p className={styles.eyebrow}>{press.positioning}</p>
          <h1 id="press-headline" className={styles.headline}>
            {press.headline}
          </h1>
          <p className={styles.supporting}>{press.supportingLine}</p>
          <div className={styles.heroActions}>
            <CtaLink pageId="MEDIA" ctaId="CTA-MEDIA-PRIMARY" label="Book Tel to Speak" destination="speaking" destinationType="inquiry" emphasis="primary" />
            <CtaLink pageId="MEDIA" ctaId="CTA-MEDIA-SECONDARY" label="Media Request" destination="media" destinationType="inquiry" emphasis="secondary" />
          </div>
        </div>
      </section>

      <section className={styles.section} id="speaking-themes" aria-labelledby="themes-heading">
        <div className="container">
          <h2 id="themes-heading" className={styles.h2}>
            Speaking Themes
          </h2>
          <p className={styles.lede}>{press.speakingIntro}</p>
          <div className={styles.themeGrid}>
            {press.themes.map((theme, index) => (
              <article className={styles.card} key={theme.title}>
                <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
                <h3>{theme.title}</h3>
                <p>{theme.text}</p>
                {theme.audience && (
                  <p className={styles.meta}>
                    <strong>Audience:</strong> {theme.audience}
                  </p>
                )}
                {theme.takeaway && (
                  <p className={styles.meta}>
                    <strong>Takeaway:</strong> {theme.takeaway}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.tint}`} id="formats" aria-labelledby="formats-heading">
        <div className="container">
          <h2 id="formats-heading" className={styles.h2}>
            Formats
          </h2>
          <dl className={styles.formats}>
            <div>
              <dt>Speaking</dt>
              <dd>{press.formats.speaking}</dd>
            </div>
            <div>
              <dt>Media</dt>
              <dd>{press.formats.media}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={styles.section} id="bio" aria-labelledby="bio-heading">
        <div className="container">
          <h2 id="bio-heading" className={styles.h2}>
            Short and full bio
          </h2>
          <div className={styles.bioGrid}>
            <article className={styles.bioCard}>
              <h3>Short bio</h3>
              <p className={styles.bioNote}>For MCs, hosts and producers.</p>
              <p>{press.shortBio}</p>
              <CopyButton className={styles.copy} label="Copy short bio" text={press.shortBio} />
            </article>
            <article className={styles.bioCard}>
              <h3>Full bio</h3>
              {press.fullBio.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
              <CopyButton className={styles.copy} label="Copy full bio" text={press.fullBio.join('\n\n')} />
            </article>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.tint}`} id="principles" aria-labelledby="principles-heading">
        <div className="container">
          <h2 id="principles-heading" className={styles.h2}>
            Operating Principles
          </h2>
          <ol className={styles.principles}>
            {press.principles.map((principle, index) => (
              <li key={principle}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {principle}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.section} id="platforms" aria-labelledby="platforms-heading">
        <div className="container">
          <h2 id="platforms-heading" className={styles.h2}>
            Platforms
          </h2>
          <p className={styles.lede}>{press.platformsIntro}</p>
          <div className={styles.platformGrid}>
            {press.platforms.map((platform) => (
              <article className={styles.card} key={platform.title}>
                <h3>{platform.title}</h3>
                <p>{platform.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} id="press-kit" aria-labelledby="press-kit-heading">
        <div className="container">
          <div className={styles.download}>
            <div>
              <p className={styles.eyebrow}>Press kit</p>
              <h2 id="press-kit-heading">Download the press kit</h2>
              <p>Two pages: speaking themes, bios, operating principles, platforms and official links.</p>
            </div>
            <DownloadButton
              href="/downloads/tel-k-ganesan-press-kit.pdf"
              downloadName="tel-k-ganesan-press-kit.pdf"
              assetId="tel-k-ganesan-press-kit-pdf"
              version="2026.2"
              pageId="MEDIA"
              ctaId="CTA-MEDIA-PRESSKIT"
              className={styles.downloadButton}
            >
              Download press kit (PDF) <span aria-hidden="true">{'↓'}</span>
            </DownloadButton>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.tint}`} id="destinations" aria-labelledby="destinations-heading">
        <div className="container">
          <h2 id="destinations-heading" className={styles.h2}>
            Official destinations
          </h2>
          <ul className={styles.links}>
            {press.destinations.map((item) => (
              <li key={item.url}>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <strong>{item.label}</strong>
                  <span>{item.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.section} id="routes" aria-labelledby="routes-heading">
        <div className="container">
          <h2 id="routes-heading" className={styles.h2}>
            Inquiry routes
          </h2>
          <p className={styles.lede}>
            Speaking and media requests go to dedicated owners, so each reaches the right person with the context needed to respond.
          </p>
          <div className={styles.routeGrid}>
            <Link href="/connect?route=speaking" className={styles.route}>
              <strong>Speaking</strong>
              <span>Event, audience, objective, date, format, and budget</span>
              <em aria-hidden="true">{'→'}</em>
            </Link>
            <Link href="/connect?route=media" className={styles.route}>
              <strong>Media</strong>
              <span>Outlet, topic, format, deadline, and requested assets</span>
              <em aria-hidden="true">{'→'}</em>
            </Link>
          </div>
          {responseTime && <p className={styles.responseTime}>{responseTime}</p>}
        </div>
      </section>
    </>
  )
}
