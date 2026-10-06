'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { films } from '../data/films'
import styles from './FilmCultureSection.module.css'

export function FilmCultureSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const seenRef = useRef(false)
  const isHoveredRef = useRef(false)
  const touchStartXRef = useRef<number | null>(null)

  const nextFilm = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % films.length)
  }, [])

  const prevFilm = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + films.length) % films.length)
  }, [])

  // The carousel only moves while the section is actually on screen. Without this it kept
  // rotating from page load, so a visitor scrolling down saw whichever film happened to be up
  // by then. The first time it comes into view it always starts on the first film (Trap City).
  useEffect(() => {
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !seenRef.current) {
          seenRef.current = true
          setActiveIndex(0)
        }
        setVisible(entry.isIntersecting)
      },
      { threshold: 0.35 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Auto-play: next film every 6s while visible and not hovered. Re-arming on every change of
  // activeIndex gives each film a full 6s after a manual tab click or swipe. Auto-play is off for
  // visitors who prefer reduced motion (WCAG 2.2.2).
  useEffect(() => {
    if (!visible) return
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => {
      if (!isHoveredRef.current) nextFilm()
    }, 6000)
    return () => clearInterval(timer)
  }, [visible, activeIndex, nextFilm])

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return
    const diff = touchStartXRef.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        nextFilm()
      } else {
        prevFilm()
      }
    }
    touchStartXRef.current = null
  }

  const currentFilm = films[activeIndex]

  return (
    <section
      ref={sectionRef}
      className={styles.cultureSection}
      id="film-culture"
      aria-labelledby="culture-heading"
      onMouseEnter={() => {
        isHoveredRef.current = true
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false
      }}
    >
      <div className={styles.cultureInner}>
        <div className={styles.cultureRow}>
          {/* Left Column: Editorial Story & Film Insight */}
          <div className={styles.cultureCopy}>
            <div className={styles.cultureTagline}>
              <span className={styles.cultureDot} aria-hidden="true" />
              <span className={styles.cultureCategory}>KYYBA FILMS &bull; FILM &amp; CULTURE</span>
            </div>

            <h2 id="culture-heading" className={styles.cultureHeading}>
              Stories That<br />
              Create <span className={styles.cultureGoldWord}>Impact.</span>
            </h2>

            <p className={styles.cultureLead}>
              Through film, media, and culture, we bring powerful stories to life &mdash; stories that inspire, challenge perspectives, and connect people across communities worldwide.
            </p>

            {/* Interactive Film Tabs */}
            <div className={styles.filmNavPills} role="tablist" aria-label="Select Film">
              {films.map((film, idx) => (
                <button
                  key={film.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === activeIndex}
                  onClick={() => setActiveIndex(idx)}
                  className={`${styles.filmPill} ${idx === activeIndex ? styles.filmPillActive : ''}`}
                >
                  <span className={styles.pillTitle}>{film.title}</span>
                </button>
              ))}
            </div>

            {/* Active Film Insight Card */}
            <div className={styles.activeFilmCard} key={currentFilm.id}>
              <div className={styles.filmMetaTop}>
                <span className={styles.filmBadge}>{currentFilm.category}</span>
                <span className={styles.filmRole}>{currentFilm.role}</span>
              </div>
              <p className={styles.filmTaglineQuote}>
                &ldquo;{currentFilm.tagline}&rdquo;
              </p>
              <p className={styles.filmCast}>
                <strong>Cast:</strong> {currentFilm.cast}
              </p>
            </div>

            {/* Action Group */}
            <div className={styles.actionGroup}>
              <Link href="/film-culture" className={styles.cultureCta}>
                Explore Full Slate <span aria-hidden="true">&rarr;</span>
              </Link>
              {currentFilm.imdbUrl && (
                <a
                  href={currentFilm.imdbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.cultureSecondaryCta}
                  aria-label={`View ${currentFilm.title} on IMDb`}
                >
                  IMDb Profile <span aria-hidden="true">{'↗'}</span>
                </a>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Film Poster Carousel */}
          <div className={styles.posterStageWrapper} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <div className={styles.posterContainer}>
              <button
                type="button"
                onClick={prevFilm}
                className={`${styles.controlArrowBtn} ${styles.prevBtn}`}
                aria-label="Previous Film"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <div className={styles.posterStage}>
                {films.map((film, idx) => {
                  const isActive = idx === activeIndex
                  return (
                    <Link
                      key={film.id}
                      href={film.href}
                      className={`${styles.posterSlide} ${isActive ? styles.posterSlideActive : ''}`}
                      tabIndex={isActive ? 0 : -1}
                      aria-hidden={!isActive}
                    >
                      <Image
                        src={film.image}
                        alt={film.alt}
                        fill
                        sizes="(max-width: 768px) 90vw, (max-width: 1200px) 35vw, 320px"
                        className={styles.posterImage}
                      />
                      <div className={styles.posterOverlay} aria-hidden="true">
                        <span className={styles.posterOverlayBadge}>{film.category}</span>
                        <h3 className={styles.posterOverlayTitle}>{film.title}</h3>
                        <p className={styles.posterOverlayCredit}>{film.role}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={nextFilm}
                className={`${styles.controlArrowBtn} ${styles.nextBtn}`}
                aria-label="Next Film"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* Dots Indicator */}
            <div className={styles.posterDots} role="tablist" aria-label="Film carousel slide selection">
              {films.map((film, idx) => (
                <button
                  key={`dot-${film.id}`}
                  type="button"
                  role="tab"
                  aria-selected={idx === activeIndex}
                  onClick={() => setActiveIndex(idx)}
                  className={`${styles.dot} ${idx === activeIndex ? styles.dotActive : ''}`}
                  aria-label={`Slide ${idx + 1} of ${films.length}: ${film.title}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Ticker / Brand Bar */}
        <div className={styles.cultureFooterBar}>
          <span className={styles.cultureFooterTag}>FEATURE FILMS</span>
          <span className={styles.cultureFooterSep} aria-hidden="true">&bull;</span>
          <span className={styles.cultureFooterTag}>GLOBAL DISTRIBUTION</span>
          <span className={styles.cultureFooterSep} aria-hidden="true">&bull;</span>
          <span className={styles.cultureFooterTag}>CROSS-CULTURAL IP</span>
          <span className={styles.cultureFooterSep} aria-hidden="true">&bull;</span>
          <span className={styles.cultureFooterTag}>CINEMATIC IMPACT</span>
        </div>
      </div>
    </section>
  )
}
