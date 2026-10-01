'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from './MediaSpeakingSection.module.css'

interface SpeakingTheme {
  id: string
  tag: string
  shortLabel: string
  category: string
  title: string
  description: string
  keywords: string[]
}

const speakingThemes: SpeakingTheme[] = [
  {
    id: 'possibility',
    tag: 'Keynote Focus 01',
    shortLabel: 'Building Possibility',
    category: 'Enterprise Architecture',
    title: 'Building Possibility: From Idea to Repeatable Scale',
    description: 'How leaders move from a compelling vision into a durable operating structure that can carry capital, talent, and sustainable performance.',
    keywords: ['Enterprise Scale', 'Operating Systems', 'Repeatable Execution'],
  },
  {
    id: 'leadership',
    tag: 'Keynote Focus 02',
    shortLabel: 'Leadership Under Complexity',
    category: 'Executive Decision-Making',
    title: 'Leadership Under Complexity: Decisions Without a Map',
    description: 'Clarity, ownership, and decisive action when the path is unmapped, consequences are high, and conventional playbooks no longer apply.',
    keywords: ['Unmapped Decisions', 'Crisis Leadership', 'Executive Resilience'],
  },
  {
    id: 'culture',
    tag: 'Keynote Focus 03',
    shortLabel: 'Enterprise & Culture',
    category: 'Creative Risk & Narrative',
    title: 'Enterprise Meets Culture: Story as Business Strategy',
    description: 'What corporate builders can learn from film production, audience psychology, and creative risk to shift market perception.',
    keywords: ['Cultural Reach', 'Story as Strategy', 'Audience Psychology'],
  },
]

export function MediaSpeakingSection() {
  const [activeThemeIndex, setActiveThemeIndex] = useState(0)
  const currentTheme = speakingThemes[activeThemeIndex]

  return (
    <section className={styles.stageSection} id="media-speaking" aria-labelledby="media-heading">
      <div className={styles.stageInner}>
        <div className={styles.stageRow}>
          {/* Left Column: Executive Narrative & Topic Dossier */}
          <div className={styles.stageCopy}>
            <div className={styles.eyebrowTag}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              <span className={styles.eyebrowText}>EXECUTIVE FORUMS &bull; KEYNOTES &bull; MEDIA</span>
            </div>

            <h2 id="media-heading" className={styles.stageHeading}>
              Conversations for<br />
              <span className={styles.goldWord}>What’s Next.</span>
            </h2>

            <p className={styles.stageLead}>
              A clear point of view deserves the right room. Tel K. Ganesan brings builder discipline, cinematic storytelling, and unscripted clarity to global summits, boardrooms, and forums.
            </p>

            {/* Speaking Theme Selector Pills */}
            <div className={styles.themePills} role="tablist" aria-label="Speaking Themes">
              {speakingThemes.map((theme, idx) => {
                const isActive = idx === activeThemeIndex
                return (
                  <button
                    key={theme.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveThemeIndex(idx)}
                    className={`${styles.themePill} ${isActive ? styles.themePillActive : ''}`}
                  >
                    {theme.shortLabel}
                  </button>
                )
              })}
            </div>

            {/* Active Keynote Theme Dossier Card */}
            <div className={styles.activeThemeCard}>
              <div className={styles.themeCardHeader}>
                <span className={styles.themeCardTag}>{currentTheme.tag}</span>
                <span className={styles.themeCardCategory}>{currentTheme.category}</span>
              </div>
              <h3 className={styles.themeCardTitle}>{currentTheme.title}</h3>
              <p className={styles.themeCardDesc}>{currentTheme.description}</p>
              <div className={styles.themeKeywords}>
                {currentTheme.keywords.map((kw) => (
                  <span key={kw} className={styles.keywordChip}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Gateways */}
            <div className={styles.actionGroup}>
              <Link href="/connect?route=speaking" className={styles.primaryCta}>
                Book Tel to Speak <span>&rarr;</span>
              </Link>
              <Link href="/connect?route=media" className={styles.secondaryLink}>
                Request Media Kit &amp; Press &rarr;
              </Link>
            </div>
          </div>

          {/* Right Column: Cinematic Keynote Stage Media */}
          <div className={styles.stageMediaCol}>
            <div className={styles.mediaFrame}>
              <Image
                src="/images/tel-k-ganesan-speaking.png"
                alt="Tel K. Ganesan delivering a keynote address on stage"
                fill
                className={styles.stageImage}
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
              <div className={styles.mediaShade} aria-hidden="true" />

              {/* Floating Speaker Reel Play Badge */}
              <Link
                href="/connect?route=speaking"
                className={styles.floatingReelBadge}
                aria-label="Request Speaker Reel and Inquire"
              >
                <div className={styles.playIconCircle} aria-hidden="true">&#9654;</div>
                <div className={styles.reelText}>
                  <span className={styles.reelTitle}>Keynote Speaker Reel</span>
                  <span className={styles.reelDuration}>Executive Summit Highlights</span>
                </div>
              </Link>

              {/* Credibility Badge */}
              <div className={styles.stageCredBadge} aria-hidden="true">
                ⚡ 24h Response SLA
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Ticker Strip */}
        <div className={styles.stageFooterBar}>
          <span className={styles.footerStat}><strong>Global</strong> Keynotes</span>
          <span className={styles.footerSep} aria-hidden="true">|</span>
          <span className={styles.footerStat}><strong>Fireside</strong> Dialogues</span>
          <span className={styles.footerSep} aria-hidden="true">|</span>
          <span className={styles.footerStat}><strong>24h</strong> Response SLA</span>
          <span className={styles.footerSep} aria-hidden="true">|</span>
          <span className={styles.footerStat}><strong>Verified</strong> Press Assets</span>
        </div>
      </div>
    </section>
  )
}
