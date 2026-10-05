import Image from 'next/image'
import Link from 'next/link'

import { CtaLink } from './CtaLink'
import { FilmCultureSection } from './FilmCultureSection'
import { ImpactSection } from './ImpactSection'
import { MediaSpeakingSection } from './MediaSpeakingSection'
import { MindTrapSection } from './MindTrapSection'
import styles from './PremiumHomePage.module.css'

const Arrow = () => <span aria-hidden="true">&rarr;</span>

const timeline = [
  ['Early beginnings', 'Ideas, technology, and a belief in what is possible.'],
  ['Building enterprises', 'Kyyba takes shape through relationships, systems, and teams.'],
  ['Expanding horizons', 'Investments, partnerships, and new ventures.'],
  ['Creative and cultural platforms', 'Film, media, and the Mind Trap universe.'],
  ['Broader impact', 'People, programs, and a larger purpose.'],
  ['Continuing the journey', 'Building what comes next.'],
]

const bentoVentures = [
  {
    id: 'kyyba',
    tag: '01 / Flagship enterprise',
    title: 'Kyyba Group',
    description: 'Technology, engineering innovation, and global talent working across borders to create value.',
    href: '/enterprise-investments',
    image: '/images/ventures/kyyba-logo-official.png',
    alt: 'Kyyba Group Official Logo',
    pills: ['IT & Engineering', 'Global Talent', 'Scale'],
    span: 'hero',
    theme: 'light',
  },
  {
    id: 'strategic-investments',
    tag: '02 / Ventures & capital',
    title: 'Strategic Investments',
    description: 'Backing exceptional founders, scalable platforms, and disruptive next-generation systems.',
    href: '/enterprise-investments',
    pills: ['Seed to Growth', 'Founder-First', 'Ecosystem'],
    span: 'wide',
    theme: 'dark',
  },
  {
    id: 'new-ventures',
    tag: '03 / Media & studios',
    title: 'New Ventures',
    description: 'Expanding frontiers across film production, music, and culture-shaping creative IP.',
    href: '/enterprise-investments',
    pills: ['Kyyba Films', 'Trap City'],
    span: 'regular',
    theme: 'dark',
  },
  {
    id: 'global-opportunities',
    tag: '04 / Smart ecosystems',
    title: 'Global Opportunities',
    description: 'Crossing international markets, revitalizing urban centers, and driving long-term value.',
    href: '/enterprise-investments',
    pills: ['Vision 2030', 'Urban Tech'],
    span: 'regular',
    theme: 'dark',
  },
]


export function PremiumHomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-heading">
        <div className={styles.heroPortrait} aria-hidden="true">
          <Image src="/images/tel-k-ganesan-casual.jpg" alt="Tel K. Ganesan" fill priority quality={80}
            sizes="(max-width: 760px) 100vw, 62vw" />
        </div>
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>EXECUTIVE CHAIRMAN &nbsp;|&nbsp; ENTERPRISE BUILDER &nbsp;|&nbsp; INVESTOR &nbsp;|&nbsp; PRODUCER</p>
            <h1 id="home-heading">Turning<br />Possibility Into<br /><span className={styles.goldHeading}>Lasting Value.</span></h1>
            <p className={styles.heroLead}>
              Tel K. Ganesan builds enterprises, leaders, and platforms
              <span className={styles.desktopBr}><br /></span>
              at the intersection of business, ideas, culture and impact &mdash;
              <span className={styles.desktopBr}><br /></span>
              creating opportunities for people and a better tomorrow.
            </p>
            <div className={styles.heroActions}>
              <CtaLink pageId="HOME" moduleId="MOD-HOME-HERO" ctaId="CTA-HOME-PRIMARY"
                label="Explore the Leadership Journey" destination="/about" destinationType="internal" />
              <Link className={styles.overview} href="/about">
                <span className={styles.play} aria-hidden="true">&#9654;</span>
                <span className={styles.overviewText}>
                  <strong>Watch Overview</strong>
                  <small>2 min</small>
                </span>
              </Link>
            </div>
          </div>
          <aside className={styles.heroRail} aria-label="Tel K. Ganesan perspective">
            <div className={styles.railWordList}>
              <span>IDEAS</span>
              <span>PEOPLE</span>
              <span>ENTERPRISES</span>
              <span>A BETTER</span>
              <span>TOMORROW</span>
            </div>
            <div className={styles.railSlash} aria-hidden="true" />
            <blockquote className={styles.railQuote}>
              <span className={styles.quoteMark} aria-hidden="true">&ldquo;</span>
              <p>Value is created when people are free to imagine and bold enough to build.&rdquo;</p>
              <cite>&mdash; TEL K. GANESAN</cite>
            </blockquote>
          </aside>
        </div>
      </section>

      <section className={styles.flagship} id="enterprise" aria-labelledby="flagship-heading">
        <div className={styles.flagshipInner}>
          <div className={styles.flagshipLogo}>
            <p>THE FLAGSHIP</p>
            <Image src="/images/kyyba-logo.png" alt="Kyyba" width={200} height={80} style={{ width: 'auto', height: 'auto' }} />
          </div>
          <div className={styles.flagshipCopy}>
            <h2 id="flagship-heading">Kyyba: A Global Platform for What’s Next</h2>
            <p>Kyyba is the cornerstone of Tel’s enterprise-building journey &mdash; uniting technology, talent and innovation to create real-world value.</p>
            <Link href="/enterprise-investments" className="text-link">Explore Kyyba <Arrow /></Link>
          </div>
          <div className={styles.flagshipWords}>
            <span>PEOPLE</span>
            <span>IDEAS</span>
            <span>TECHNOLOGY</span>
            <span>GLOBAL SCALE</span>
          </div>
          <div className={styles.world} aria-hidden="true">
            <Image
              src="/images/kyyba-world-map.png?v=5"
              alt="Global Scale Network Map"
              width={340}
              height={185}
              className={styles.worldImage}
            />
          </div>
        </div>
        <div className={styles.flagshipFooterBar}>
          <span className={styles.flagshipFooterStat}><strong>Global</strong> Talent</span>
          <span className={styles.flagshipFooterSep} aria-hidden="true">&bull;</span>
          <span className={styles.flagshipFooterStat}><strong>Engineering</strong> Excellence</span>
          <span className={styles.flagshipFooterSep} aria-hidden="true">&bull;</span>
          <span className={styles.flagshipFooterStat}><strong>Enterprise</strong> Scale</span>
          <span className={styles.flagshipFooterSep} aria-hidden="true">&bull;</span>
          <span className={styles.flagshipFooterStat}><strong>Trusted</strong> Partnerships</span>
        </div>
      </section>

      <section className={styles.journey} aria-labelledby="journey-heading">
        <Image src="/images/journey-mountains.webp" alt="Sunrise over a dramatic mountain range" fill sizes="100vw" />
        <div className={styles.journeyShade} aria-hidden="true" />
        <div className={styles.journeyInner}>
          <div className={styles.journeyCopy}>
            <p className={styles.eyebrow}>The Journey</p>
            <h2 id="journey-heading">A Life of Building<br /><em>What Matters</em></h2>
            <p>From early ideas to global enterprises, Tel’s journey reflects a consistent belief—in people, in bold ideas, and in the power of long-term value.</p>
            <Link className={styles.goldButton} href="/about">Explore the Full Journey <Arrow /></Link>
          </div>
          <ol className={styles.timeline}>
            {timeline.map(([title, body]) => <li key={title}><span /><div><strong>{title}</strong><small>{body}</small></div></li>)}
          </ol>
          <p className={styles.verticalStatement}>A<br />Bigger<br />Tomorrow<br />Together</p>
        </div>
      </section>

      <section className={styles.ventures} id="enterprise-ventures" aria-labelledby="ventures-heading">
        <div className={styles.venturesHeader}>
          <p className={styles.venturesEyebrow}>Enterprise &amp; investments</p>
          <h2 id="ventures-heading" className={styles.venturesHeading}>Ideas backed by action</h2>
        </div>
        <div className={styles.ventureBento}>
          {bentoVentures.map((item) => (
            <Link
              href={item.href}
              className={`${styles.bentoCard} ${styles[`bento_${item.span}`]} ${styles[`bento_${item.theme}`]}`}
              key={item.id}
            >
              <div className={styles.bentoHeader}>
                <span className={styles.bentoTag}>{item.tag}</span>
                <span className={styles.bentoArrow} aria-hidden="true">&rarr;</span>
              </div>

              {item.image && (
                <div className={styles.kyybaLogoWrap}>
                  <Image
                    src={item.image}
                    alt={item.alt || 'Kyyba Group'}
                    width={320}
                    height={125}
                    className={styles.kyybaLogoImg}
                  />
                </div>
              )}

              <div className={styles.bentoBody}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className={styles.bentoPills}>
                  {item.pills.map((pill) => (
                    <span key={pill} className={styles.bentoPill}>
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Chapter 01: Ideas / Mind Trap (Ultra-Premium Official Mind Trap Showcase) */}
      <MindTrapSection />

      {/* Chapter 02: Film & Culture */}
      <FilmCultureSection />

      {/* Chapter 03: Community Impact (Luxury Editorial Showcase) */}
      <ImpactSection />

      {/* Chapter 04: Media & Speaking (Theatrical Executive Keynote Stage) */}
      <MediaSpeakingSection />

      <section className={styles.finalCta} aria-labelledby="final-heading">
        <Image
          src="/images/journey-detroit-skyline.webp"
          alt=""
          fill
          sizes="100vw"
          quality={90}
          aria-hidden="true"
          className={styles.finalBgImage}
        />
        <div className={styles.finalShade} aria-hidden="true">
          <span className={styles.finalGlow} />
        </div>
        <div className={styles.finalInner}>
          <div className={styles.finalMainCopy}>
            <div className={styles.finalEyebrowWrap}>
              <span className={styles.finalDot} aria-hidden="true" />
              <span className={styles.finalEyebrow}>Let’s Build What’s Next</span>
            </div>
            <h2 id="final-heading" className={styles.finalHeading}>
              Explore. Collaborate.<br />
              <span className={styles.finalGoldGradient}>Create Lasting Value.</span>
            </h2>
            <p className={styles.finalDescription}>
              Whether it’s a strategic enterprise partnership, venture investment, keynote engagement, or a shared idea &mdash; we welcome conversations with leaders who believe in building enduring impact.
            </p>
            <div className={styles.finalActionRow}>
              <CtaLink
                pageId="HOME"
                moduleId="MOD-HOME-FINAL-CTA"
                ctaId="CTA-HOME-INQUIRY"
                label="Submit a Qualified Inquiry"
                destination="general"
                destinationType="inquiry"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
