import Image from 'next/image'
import Link from 'next/link'

import { CtaLink } from './CtaLink'
import styles from './PremiumHero.module.css'

export function PremiumHero() {
  return (
    <header className={styles.hero} data-module-id="MOD-HOME-HERO" aria-labelledby="home-heading">
      <div className={styles.backdrop} aria-hidden="true">
        <span className={styles.ring} />
        <span className={styles.glow} />
        <span className={styles.grain} />
      </div>
      <aside className={styles.sideRail}>
        <ul className={styles.sideRailList} aria-hidden="true">
          <li>Enterprise</li>
          <li>Ideas</li>
          <li>Culture</li>
          <li>Impact</li>
        </ul>
        <blockquote className={styles.sideRailQuote}>
          <span className={styles.sideRailMark} aria-hidden="true">&#8220;</span>
          <p>Possibility matters most when someone accepts the responsibility to build it.</p>
          <cite>&mdash; Tel K. Ganesan</cite>
        </blockquote>
      </aside>
      <div className={styles.composition}>
        <div className={styles.content}>
          <p className={styles.identity}><span aria-hidden="true" />Enterprise. Leadership. Lasting value.</p>
          <h1 id="home-heading" className={styles.heading}>
            Building enterprises.<br />
            Unlocking <em>human<br className={styles.desktopBreak} /> potential.</em>
          </h1>
          <p className={styles.statement}>
            Tel K. Ganesan is a Detroit-based business leader connecting enterprise building,
            investment, storytelling, and service.
          </p>
          <p className={styles.detail}>
            See overlooked potential. Build the system around it. Develop the people who carry it forward.
          </p>
          <div className={styles.actions}>
            <CtaLink pageId="HOME" moduleId="MOD-HOME-HERO" ctaId="CTA-HOME-PRIMARY"
              label="Explore the Leadership Journey" destination="/about" destinationType="internal" />
            <Link href="/connect?route=strategic-partnership" className={`text-link text-link--inverse ${styles.secondary}`}>
              Partner with Tel <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <div className={styles.location}>
            <span className={styles.locationMark} aria-hidden="true">+</span>
            <span>Rooted in Detroit.<br /><strong>A perspective without borders.</strong></span>
          </div>
        </div>
        <figure className={styles.portrait}>
          <div className={styles.photograph}>
            <Image src="/images/tel-k-ganesan-portrait.jpg" alt="Tel K. Ganesan in a dark suit"
              fill priority quality={80} sizes="(max-width: 700px) 90vw, (max-width: 1100px) 43vw, 480px" />
            <div className={styles.photoLabel}>
              <span>THE PERSON BEHIND THE WORK</span>
              <strong>Tel K. Ganesan</strong>
            </div>
          </div>
          <figcaption className={styles.caption}>
            <span>Enterprise builder. A lifelong student of possibility.</span>
            <span aria-hidden="true">01 / 10</span>
          </figcaption>
        </figure>
      </div>
      <div className={styles.bottomLine}>
        <p>Enterprise <span /> Ideas <span /> Culture <span /> Impact</p>
        <Link href="#enterprise">Discover the work <span aria-hidden="true">&darr;</span></Link>
      </div>
    </header>
  )
}
