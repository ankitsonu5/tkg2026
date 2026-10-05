'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { impactPillars } from '@/frontend/data/impact'
import styles from './ImpactSection.module.css'

export function ImpactSection() {
  const [activePillarIndex, setActivePillarIndex] = useState(0)
  const currentPillar = impactPillars[activePillarIndex]

  return (
    <section className={styles.impactSection} id="impact" aria-labelledby="impact-heading">
      <div className={styles.impactInner}>
        <div className={styles.impactRow}>
          {/* Left Column: Framed Editorial Media */}
          <div className={styles.impactMediaCol}>
            <div className={styles.mediaFrame}>
              <Image
                src="/images/impact-editorial-v2.webp"
                alt="A diverse group of students collaborating around a laptop in a mentorship session"
                fill
                className={styles.impactImage}
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className={styles.mediaShade} aria-hidden="true" />

              {/* Floating Glassmorphic Impact Badge */}
              <div className={styles.floatingBadge} aria-label="Purpose in Action">
                <div className={styles.badgeIcon} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                  </svg>
                </div>
                <div className={styles.badgeText}>
                  <span className={styles.badgeMetric}>Purpose in Action</span>
                  <span className={styles.badgeLabel}>Community Driven</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Narrative & Interactive Pillars */}
          <div className={styles.impactCopy}>
            <div className={styles.eyebrowTag}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              <span className={styles.eyebrowText}>COMMUNITY &bull; IMPACT</span>
            </div>

            <h2 id="impact-heading" className={styles.impactHeading}>
              A More Inclusive<br />
              <span className={styles.goldWord}>Tomorrow.</span>
            </h2>

            <p className={styles.impactLead}>
              Through programs, partnerships, and collective action, Tel K. Ganesan channels capital, mentorship, and enterprise discipline into lasting community empowerment.
            </p>

            {/* Pillar Selector Pills */}
            <div className={styles.pillarPills} role="tablist" aria-label="Impact Pillars">
              {impactPillars.map((pillar, idx) => {
                const isActive = idx === activePillarIndex
                return (
                  <button
                    key={pillar.id}
                    id={`tab-${pillar.id}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`panel-${pillar.id}`}
                    onClick={() => setActivePillarIndex(idx)}
                    className={`${styles.pillarPill} ${isActive ? styles.pillarPillActive : ''}`}
                  >
                    {pillar.shortLabel}
                  </button>
                )
              })}
            </div>

            {/* Active Pillar Card Callout */}
            <div
              className={styles.activePillarCard}
              role="tabpanel"
              id={`panel-${currentPillar.id}`}
              aria-labelledby={`tab-${currentPillar.id}`}
            >
              <div className={styles.pillarCardHeader}>
                <span className={styles.pillarCardTag}>{currentPillar.tag}</span>
                <span className={styles.pillarCardMetric}>{currentPillar.focusArea}</span>
              </div>
              <h3 className={styles.pillarCardTitle}>{currentPillar.title}</h3>
              <p className={styles.pillarCardDesc}>{currentPillar.description}</p>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionGroup}>
              <Link href="/impact" className={styles.primaryCta}>
                Explore Impact Initiatives <span>&rarr;</span>
              </Link>
              <Link href="/connect?route=impact" className={styles.secondaryLink}>
                Partner with Tel &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Ticker / Principles Bar */}
        <div className={styles.impactFooterBar}>
          <span className={styles.footerStat}><strong>{impactPillars.length}</strong> Focus Areas</span>
          <span className={styles.footerSep} aria-hidden="true">|</span>
          <span className={styles.footerStat}><strong>Grassroots</strong> Partnerships</span>
          <span className={styles.footerSep} aria-hidden="true">|</span>
          <span className={styles.footerStat}><strong>Leadership</strong> Mentorship</span>
          <span className={styles.footerSep} aria-hidden="true">|</span>
          <span className={styles.footerStat}><strong>Measurable</strong> Outcomes</span>
        </div>
      </div>
    </section>
  )
}
