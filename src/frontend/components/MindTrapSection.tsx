'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from './MindTrapSection.module.css'

interface BeliefTrap {
  id: string
  name: string
  subtitle: string
  quote: string
}

const beliefTraps: BeliefTrap[] = [
  {
    id: 'fear',
    name: 'Fear Trap',
    subtitle: 'The Illusion of Safety',
    quote: 'When fear masquerades as practicality, staying small feels smart — until regret takes its place.',
  },
  {
    id: 'pressure',
    name: 'Pressure Trap',
    subtitle: "Carrying Other People's Expectations",
    quote: "Winning on everyone else's scoreboard means losing the only game that truly matters to your soul.",
  },
  {
    id: 'perfection',
    name: 'Perfection Trap',
    subtitle: 'The Pursuit That Paralyzes',
    quote: 'Waiting for guaranteed certainty is how groundbreaking ideas die unbuilt.',
  },
  {
    id: 'glamour',
    name: 'Glamour Trap',
    subtitle: 'Confusing Applause with Fulfillment',
    quote: 'External validation will never quiet an internal longing for genuine alignment.',
  },
  {
    id: 'environment',
    name: 'Environment Trap',
    subtitle: "Outgrowing the Room You're In",
    quote: 'You cannot cultivate a global vision inside conversations that only think in safe boundaries.',
  },
]

export function MindTrapSection() {
  const [activeTrapIndex, setActiveTrapIndex] = useState(0)
  const currentTrap = beliefTraps[activeTrapIndex]

  return (
    <section className={styles.mindtrapSection} id="ideas" aria-labelledby="mindtrap-heading">
      <div className={styles.mindtrapInner}>
        <div className={styles.mindtrapRow}>
          {/* Left Narrative Column */}
          <div className={styles.mindtrapCopy}>
            <div className={styles.eyebrowTag}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              <span className={styles.eyebrowText}>IDEAS &bull; MIND TRAP PODCAST</span>
            </div>

            <h2 id="mindtrap-heading" className={styles.mindtrapHeading}>
              Bolder Ideas.<br />
              <span className={styles.goldWord}>Braver People.</span>
            </h2>

            <p className={styles.mindtrapLead}>
              Mind Trap explores the invisible beliefs that quietly dictate human potential. Hosted by Tel K. Ganesan, the platform breaks down the mental frameworks that hold leaders back — transforming fear, pressure, and perfection into lasting freedom.
            </p>


            {/* Dynamic Trap Insight */}
            <div className={styles.activeTrapInsight}>
              <p className={styles.activeTrapTitle}>{currentTrap.name} &mdash; {currentTrap.subtitle}</p>
              <p className={styles.activeTrapQuote}>&ldquo;{currentTrap.quote}&rdquo;</p>
            </div>

            {/* Action Group */}
            <div className={styles.actionGroup}>
              <a
                href="https://mindtrappodcast.com/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.primaryCta}
              >
                Listen to Mind Trap <span>&rarr;</span>
              </a>
              <Link href="/ideas" className={styles.secondaryLink}>
                Explore All Ideas &rarr;
              </Link>
            </div>
          </div>

          {/* Right Side — Mind Trap Logo */}
          <div className={styles.orbitVisualColumn}>
            <div className={styles.orbitCard}>
              <div className={styles.orbitStage}>
                <div className={styles.auraGlow} aria-hidden="true" />
                <Image
                  src="/images/mindtrap/mindtrap-logo-clean.jpg"
                  alt="Mind Trap podcast logo"
                  fill
                  sizes="(max-width: 1024px) 420px, 600px"
                  quality={80}
                  className={styles.mindtrapLogoImage}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Ticker / Stats Bar */}
        <div className={styles.mindtrapFooterBar}>
          <span className={styles.footerStat}><strong>{beliefTraps.length}</strong> Belief Traps Explored</span>
          <span className={styles.footerSep} aria-hidden="true">|</span>
          <span className={styles.footerStat}><strong>Unscripted</strong> Dialogue</span>
          <span className={styles.footerSep} aria-hidden="true">|</span>
          <span className={styles.footerStat}><strong>Global</strong> Conversations</span>
        </div>
      </div>
    </section>
  )
}
