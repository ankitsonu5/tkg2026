import Image from 'next/image'
import Link from 'next/link'

import { Breadcrumbs } from './Breadcrumbs'
import { CtaLink } from './CtaLink'
import { films } from '../data/films'
import { PremiumHero } from './PremiumHero'
import { IdeasArticlesSection } from './IdeasArticlesSection'

type PageId = 'HOME' | 'ABOUT' | 'ENTERPRISE' | 'IDEAS' | 'CULTURE' | 'IMPACT' | 'MEDIA' | 'PRIVACY' | 'TERMS' | 'ACCESSIBILITY'

const Arrow = () => <span aria-hidden="true">&#8599;</span>

/** Small hand-drawn line icons (no icon library dependency) used to give the Enterprise
    "Qualification" criteria a visual anchor instead of a plain text list. */
const iconProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const TargetIcon = () => (
  <svg {...iconProps} aria-hidden="true">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.25" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
  </svg>
)
const LeadershipIcon = () => (
  <svg {...iconProps} aria-hidden="true">
    <circle cx="9" cy="8" r="3.25" />
    <path d="M3 20c0-3.4 2.7-6 6-6s6 2.6 6 6" />
    <circle cx="17.5" cy="9" r="2.35" />
    <path d="M21 20c0-2.7-1.8-5-4.2-5.7" />
  </svg>
)
const DocumentIcon = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M6.5 2.5h8l4 4V21a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
    <path d="M14.5 2.5v4h4" />
    <path d="M9 14l2.2 2.2L16 11.4" />
  </svg>
)
const ShieldIcon = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M12 2.5l7.5 2.8v5.4c0 4.7-3.2 8.2-7.5 9.8-4.3-1.6-7.5-5.1-7.5-9.8V5.3L12 2.5Z" />
    <path d="M8.7 12l2.2 2.2 4.4-4.4" />
  </svg>
)
const EyeIcon = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const QuestionIcon = () => (
  <svg {...iconProps} aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.1 9.2a2.9 2.9 0 1 1 4.5 2.4c-1 .65-1.6 1.15-1.6 2.4" />
    <path d="M12 17.4h.01" />
  </svg>
)
const CompassMoveIcon = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M4.5 12h14" />
    <path d="M12.5 6l6 6-6 6" />
  </svg>
)

function SectionIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body?: string
}) {
  return (
    <div className="section-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {body && <p className="section-intro__body">{body}</p>}
    </div>
  )
}

function RouteCard({
  href,
  number,
  title,
  body,
  sla,
}: {
  href: string
  number: string
  title: string
  body: string
  sla?: string
}) {
  return (
    <Link href={href} className="route-card">
      <div className="route-card__top">
        <span className="route-card__number">{number}</span>
        {sla && <span className="route-card__sla">{sla}</span>}
      </div>
      <span>
        <strong>{title}</strong>
        <small>{body}</small>
      </span>
      <Arrow />
    </Link>
  )
}

function InnerHero({
  eyebrow,
  title,
  body,
  pageId,
  cta,
  secondaryCta,
}: {
  eyebrow: string
  title: string
  body: string
  pageId: string
  cta?: { id: string; label: string; destination: string; type?: 'internal' | 'inquiry' }
  secondaryCta?: { id: string; label: string }
}) {
  return (
    <header className="inner-hero inner-hero--compact">
      <div className="container">
        <Breadcrumbs pageId={pageId} />
        <div className="inner-hero__grid">
          <div>
            <p className="eyebrow eyebrow--gold">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
        <div className="inner-hero__aside">
          <p>{body}</p>
          {cta && !secondaryCta && (
            <CtaLink
              pageId={pageId}
              ctaId={cta.id}
              label={cta.label}
              destination={cta.destination}
              destinationType={cta.type ?? 'internal'}
            />
          )}
          {cta && secondaryCta && (
            <div className="hero-actions">
              <CtaLink
                pageId={pageId}
                ctaId={cta.id}
                label={cta.label}
                destination={cta.destination}
                destinationType={cta.type ?? 'internal'}
              />
              <CtaLink pageId={pageId} ctaId={secondaryCta.id} label={secondaryCta.label} destination={null} emphasis="secondary" />
            </div>
          )}
          </div>
        </div>
      </div>
    </header>
  )
}

function HomePage() {
  return (
    <div className="home-page">
      <PremiumHero />

      {/* HOME-02: Credibility */}
      <section className="section flagship" id="enterprise" data-module-id="MOD-HOME-KYYBA-FLAGSHIP">
        <div className="container flagship__grid">
          <div className="flagship__emblem-card">
            <p className="flagship__brand-title">KYYBA</p>
            <p className="flagship__brand-subtitle">Global Technology &amp; Engineering Solutions</p>
            <div className="flagship__pills">
              <span>Mobility &amp; Automotive</span>
              <span>Cross-Border Teams</span>
              <span>Enterprise Scale</span>
            </div>
          </div>
          <div className="flagship__content">
            <p className="eyebrow eyebrow--gold">Built Through Operating Experience</p>
            <h2>Enterprise credibility comes first.</h2>
            <p>
              Kyyba is the flagship proof of Tel’s enterprise-building journey—a technology and engineering business
              shaped by long-term relationships, cross-border teams, and the discipline to keep adapting.
            </p>
            <div className="flagship__proof-points">
              <div className="proof-metric">
                <strong>Enterprise Anchor</strong>
                <small>Decades of continuous technical delivery, mobility engineering, and institutional trust.</small>
              </div>
              <div className="proof-metric">
                <strong>Global Delivery</strong>
                <small>Multinational operations spanning North America and India with agile cross-border teams.</small>
              </div>
              <div className="proof-metric">
                <strong>The System’s Foundation</strong>
                <small>The operational proving ground for all subsequent ventures, capital allocation, and governance.</small>
              </div>
            </div>
            <div className="flagship__actions">
              <Link href="/enterprise-investments" className="cta cta--primary">
                Explore Enterprise &amp; Investments <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOME-03: Founder Arc */}
      <section className="section section--spacious journey-band" data-module-id="MOD-HOME-LEADERSHIP-JOURNEY">
        <div className="container journey-band__grid">
          <div className="journey-band__intro">
            <SectionIntro
              eyebrow="From Trichy to Detroit—and Beyond"
              title="A journey shaped by reinvention."
              body="Tel’s story is not a straight line of titles. It is a series of decisions: leaving what was familiar, learning through engineering and enterprise, building Kyyba, backing new possibilities, and entering a chapter centered on stewardship, ideas, relationships, and legacy."
            />
            <Link href="/about" className="cta cta--secondary cta--inverse">
              Read Tel’s Full Story <Arrow />
            </Link>
          </div>

          <div className="journey-band__graphic" aria-hidden="true">
            <span className="journey-band__peak journey-band__peak--back" />
            <span className="journey-band__peak journey-band__peak--front" />
          </div>

          <div className="founder-timeline">
            <div className="founder-timeline__item">
              <span className="founder-timeline__num">01</span>
              <div>
                <strong>Systems &amp; Engineering</strong>
                <p>Precision instincts developed through engineering education and technical leadership in Michigan.</p>
              </div>
            </div>
            <div className="founder-timeline__item">
              <span className="founder-timeline__num">02</span>
              <div>
                <strong>Enterprise Scaling</strong>
                <p>Founding and building Kyyba into a sustained, multinational technology and engineering partner.</p>
              </div>
            </div>
            <div className="founder-timeline__item">
              <span className="founder-timeline__num">03</span>
              <div>
                <strong>Venture &amp; Growth Capital</strong>
                <p>Applying an operator’s disciplined lens to emerging founders, technology, and strategic investments.</p>
              </div>
            </div>
            <div className="founder-timeline__item">
              <span className="founder-timeline__num">04</span>
              <div>
                <strong>Stewardship &amp; Legacy</strong>
                <p>Focusing on mental freedom (Mind Trap), cultural storytelling (Film), and community empowerment.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOME-04: The Builder's Method */}
      <section className="section section--alt" data-module-id="MOD-HOME-VALUE-METHOD">
        <div className="container">
          <SectionIntro
            eyebrow="The Builder’s Method"
            title="Potential becomes valuable when the right system surrounds it."
            body="Tel’s work follows four practical operating principles designed to turn raw ambition into durable, self-sustaining enterprise."
          />
          <div className="process-grid">
            {[
              {
                num: '01',
                title: 'See what others overlook',
                body: 'Look beyond the immediate constraint to the latent value that could exist with the right perspective.',
              },
              {
                num: '02',
                title: 'Build repeatable structures',
                body: 'Turn an initial idea into an accountable enterprise, platform, or body of work that compounds over time.',
              },
              {
                num: '03',
                title: 'Connect disparate worlds',
                body: 'Bridge technology, capital, creative storytelling, and community service where they rarely meet.',
              },
              {
                num: '04',
                title: 'Develop independent leaders',
                body: 'Equip teams to make sound, principled decisions without founder bottlenecks or delays.',
              },
            ].map((p) => (
              <article key={p.num} className="process-card">
                <span>{p.num}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </article>
            ))}
          </div>
          <div className="section-footer-action">
            <Link href="/about" className="text-link">
              Explore the Approach <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* HOME-05: Enterprise and Portfolio */}
      <section className="section section--spacious" data-module-id="MOD-HOME-SELECTED-ENTERPRISE">
        <div className="container">
          <SectionIntro
            eyebrow="Flagship Enterprise &bull; Selected Platforms"
            title="Range with a clear center of gravity."
            body="Kyyba leads the story. Selected ventures and platforms extend Tel’s experience into investment, wellness, film, music, technology, and ideas—but each is presented by its true stage, purpose, and Tel’s exact role."
          />
          <div className="editorial-grid editorial-grid--three">
            <article className="editorial-card editorial-card--feature">
              <span className="editorial-card__index">01 &bull; Build</span>
              <h3>Operating Enterprises</h3>
              <p>Founding and scaling core technology and engineering businesses that transform expertise into useful, repeatable value.</p>
            </article>
            <article className="editorial-card">
              <span className="editorial-card__index">02 &bull; Back</span>
              <h3>Strategic Investments</h3>
              <p>Selective relationships and growth capital where operational conviction, alignment, and execution can compound.</p>
            </article>
            <article className="editorial-card">
              <span className="editorial-card__index">03 &bull; Bridge</span>
              <h3>Creative &amp; Ideas Platforms</h3>
              <p>Platforms that connect enterprise thinking with global audiences, cultural narratives, and civic leadership.</p>
            </article>
          </div>
          <div className="section-footer-action">
            <Link href="/enterprise-investments" className="cta cta--secondary">
              View Enterprise &amp; Investments <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* HOME-06 + HOME-08: Ideas/Mind Trap and Film & Culture as a paired feature row */}
      <section className="section feature-duo" data-module-id="MOD-HOME-FEATURE-DUO">
        <div className="container feature-duo__grid">
          <article className="feature-card">
            <div className="feature-card__art feature-card__art--ideas" aria-hidden="true">
              <span>Ideas that move people</span>
            </div>
            <div className="feature-card__body">
              <p className="eyebrow eyebrow--gold">Mind Trap &bull; Signature Framework</p>
              <h3>The hardest limits are often the ones we stop seeing.</h3>
              <p>
                Mind Trap explores the beliefs, habits, fears, and inherited patterns that quietly shape leadership
                and life. Through conversations, writing, and practical reflection, Tel examines how awareness
                creates the freedom to choose differently.
              </p>
              <ul className="feature-card__tags">
                <li>Awareness over Habit</li>
                <li>Freedom to Choose</li>
                <li>Clarity Under Pressure</li>
              </ul>
              <Link href="/ideas" className="text-link text-link--inverse">
                Explore Ideas <Arrow />
              </Link>
            </div>
          </article>

          <article className="feature-card">
            <div className="feature-card__art feature-card__art--culture" aria-hidden="true">
              <span>People &middot; Stories &middot; Culture &middot; Impact</span>
            </div>
            <div className="feature-card__body">
              <p className="eyebrow">Stories Can Move What Strategy Cannot</p>
              <h3>Enterprise discipline meets cultural storytelling.</h3>
              <p>
                Selected film and music work reflects Tel’s belief that stories can reveal hidden pressures, widen
                perspective, and reach people in ways a business presentation cannot. Each project here shows the
                exact role, status, and official destination.
              </p>
              <Link href="/film-culture" className="text-link text-link--inverse">
                Explore Culture <Arrow />
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* HOME-09: Impact */}
      <section className="section impact-band" data-module-id="MOD-HOME-SELECTED-IMPACT">
        <div className="container impact-band__grid">
          <div>
            <p className="eyebrow eyebrow--gold">Value Should Travel Beyond the Enterprise</p>
            <h2>Built with communities, not around them.</h2>
          </div>
          <div>
            <p>
              Tel supports initiatives that expand opportunity, develop young people, strengthen communities, and connect
              experience with service. The strongest stories here belong to the partners and participants who made the work real.
            </p>
            <Link href="/impact" className="cta cta--secondary cta--inverse">
              Explore Impact <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* Media & Speaking Credibility */}
      <section className="section media-route" data-module-id="MOD-HOME-MEDIA-CREDIBILITY">
        <div className="container media-route__grid">
          <SectionIntro
            eyebrow="Media &amp; Speaking"
            title="A clear point of view deserves the right room."
            body="For journalists, event producers, and thoughtful collaborators, the route starts with the subject, audience, and outcome—not a generic inbox."
          />
          <div className="route-grid route-grid--two">
            <RouteCard
              href="/media-speaking"
              number="01"
              title="Book Tel to speak"
              body="Keynotes, executive conversations, and panels"
              sla="24h SLA"
            />
            <RouteCard
              href="/media-speaking"
              number="02"
              title="Request the media kit"
              body="Official bio, portrait assets, and press route"
              sla="4h SLA"
            />
          </div>
        </div>
      </section>

      {/* HOME-10: Final Conversion Route Selector */}
      <section className="section section--spacious" data-module-id="MOD-HOME-FINAL-CTA">
        <div className="container">
          <SectionIntro
            eyebrow="What Would You Like to Build?"
            title="Choose the route that matches your purpose."
            body="Explore strategic partnerships, confidential investment or M&A conversations, speaking and media opportunities, or community and impact collaboration. Each inquiry goes directly to the accountable lead."
          />
          <div className="route-grid">
            <RouteCard
              href="/connect?route=strategic-partnership"
              number="01"
              title="Strategic Partnership"
              body="Material enterprise relationships and joint ventures"
              sla="24h SLA"
            />
            <RouteCard
              href="/connect?route=investment-ma"
              number="02"
              title="Investment / M&A"
              body="Confidential investment, capital allocation, and M&A inquiries"
              sla="24h SLA"
            />
            <RouteCard
              href="/connect?route=speaking"
              number="03"
              title="Speaking &amp; Keynotes"
              body="Executive keynotes, talks, and leadership events"
              sla="24h SLA"
            />
            <RouteCard
              href="/connect?route=media"
              number="04"
              title="Press &amp; Media"
              body="Tier-one media, interview requests, and statements"
              sla="4h SLA"
            />
            <RouteCard
              href="/connect?route=creative"
              number="05"
              title="Film &amp; Creative"
              body="Screenings, distribution, licensing, and creative projects"
              sla="72h SLA"
            />
            <RouteCard
              href="/connect?route=impact"
              number="06"
              title="Community &amp; Impact"
              body="Civic initiatives, youth mentorship, and partnerships"
              sla="48h SLA"
            />
          </div>
          <div className="section-footer-action" style={{ marginTop: 'var(--space-8)', justifyContent: 'center' }}>
            <Link href="/connect" className="cta cta--primary">
              Choose Your Route <Arrow />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function AboutPage() {
  return (
    <>
      {/* ABOUT-01 / MOD-ABOUT-BIO — approved Copy Deck wording, trimmed to the Visual Design System's own
          "hero deck: 35–65 words" limit (Density limits table). The rest of the same approved paragraph
          isn't dropped — it's carried into the "Operating point of view" section below, which has room
          for full prose instead of a cramped 0.65fr sidebar column. Secondary CTA renders disabled
          (destination={null}) until AST-020 (bio files) clears the Asset Register — honest, not a dead link. */}
      <InnerHero
        eyebrow="About Tel"
        title="Build value. Develop leaders. Leave stronger systems behind."
        body="Tel K. Ganesan is an Executive Chairman, enterprise builder, investor, and producer. From Detroit, he has built and supported businesses, creative projects, and community initiatives across cultures and industries. Kyyba remains the flagship proof of his operating journey."
        pageId="ABOUT"
        cta={{ id: 'CTA-ABOUT-PRIMARY', label: 'Explore Enterprise & Investments', destination: '/enterprise-investments' }}
        secondaryCta={{ id: 'CTA-ABOUT-BIO-DOWNLOAD', label: 'Download Approved Bio' }}
      />
      <section className="section section--spacious">
        <div className="container split-story">
          <SectionIntro
            eyebrow="Operating point of view"
            title="Builder first. Titles second."
            body="Today, Tel focuses his time where founder judgment matters most: enterprise value, consequential relationships, leadership development, selective investment, narrative, and legacy. His work is grounded in a simple belief: possibility becomes durable only when people, systems, and purpose grow together. Credibility is strongest when it is shown through decisions, systems, and the work itself. The story here is organized around the disciplines that connect each chapter."
          />
          <figure className="quote-panel">
            <blockquote className="pull-quote">Possibility matters most when someone accepts the responsibility to build it.</blockquote>
            <figcaption className="signature-block__byline">
              <span className="signature-block__portrait">
                <Image src="/images/tel-k-ganesan-casual.jpg" alt="" fill sizes="72px" style={{ objectPosition: 'center 18%' }} />
              </span>
              <span>
                <strong>Tel K. Ganesan</strong>
                <small>Executive Chairman</small>
              </span>
            </figcaption>
          </figure>
        </div>
      </section>
      {/* ABOUT-02 / MOD-ABOUT-TIMELINE — phase-based, no invented dates: the approved Copy Deck timeline
          carries [VERIFY year] markers on every line, which the Publication Gate forbids shipping. */}
      <section className="section section--mist">
        <div className="container">
          <SectionIntro eyebrow="The journey" title="A progression of disciplines" body="From Detroit's engineering ecosystem to cross-border enterprises and leadership platforms." />
          <div className="journey-layout">
            <div className="journey-visual">
              <div className="journey-visual__image">
                <Image
                  src="/images/tel/tel-wayne-state-award.png"
                  alt="Tel K. Ganesan at an engineering recognition event in Detroit"
                  fill
                  sizes="(max-width: 900px) 100vw, 45vw"
                  style={{ objectFit: 'cover', objectPosition: 'center 20%' }}
                />
              </div>
              <div className="journey-visual__caption">
                {/* CLAIM-012/013/014-style recognition claim: no cleared source record exists yet
                    for the specific institution/award name, so the caption stays generic until
                    Communications/Legal verify and log it in the Claim Register. */}
                <strong>Detroit Engineering Community</strong>
                <span>A recognition moment from Tel&rsquo;s engineering community in Detroit &mdash; full citation pending verification.</span>
              </div>
            </div>
            <ol className="journey-line">
              {[
                ['Foundation', 'An engineer’s instinct for systems, precision, and useful outcomes.'],
                ['Enterprise', 'The shift from solving a problem to building an organization that can solve it repeatedly.'],
                ['Expansion', 'Applying an operator’s lens to capital, leaders, ideas, and cultural platforms.'],
                ['Legacy', 'Directing experience toward value that equips others to build.'],
              ].map(([title, body]) => (
                <li key={title}>
                  <span className="journey-line__dot" aria-hidden="true" /><div><h3>{title}</h3><p>{body}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
      {/* ABOUT-04 / MOD-ABOUT-PRINCIPLES — the five approved operating principles, Copy Deck wording verbatim */}
      <section className="section principles-section">
        <div className="container">
          <SectionIntro eyebrow="Operating principles" title="What the journey taught me." />
          <div className="principle-bento">
            {[
              ['See potential before consensus forms', 'Opportunity often appears first as something incomplete or overlooked.'],
              ['Build the system, not dependence on the founder', 'A strong organization can decide and execute without constant rescue.'],
              ['Connect worlds with respect', 'Cross-cultural work succeeds when people translate context—not just words.'],
              ['Persist in the purpose; stay flexible about the vehicle', 'Commitment needs milestone gates and the courage to change course.'],
              ['Protect the capacity behind the contribution', 'Health, reflection, and relationships are executive infrastructure.'],
            ].map(([title, body], index) => (
              <article key={title} className="principle-card">
                <span className="principle-card__num">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      {/* ABOUT-05 / MOD-ABOUT-HUMAN-CONTEXT ("Current focus") — approved Copy Deck wording verbatim,
          presented as a single focused editorial panel rather than forcing it into the two-column
          split-story layout (which expects a substantial second column, not a lone CTA). No CTA here:
          ABOUT-07 immediately below is the page's one designated closing route back to the flagship
          proof, so repeating the same primary CTA in both sections back-to-back was redundant. */}
      <section className="section section--mist">
        <div className="container">
          <div className="insight-band">
            <div className="insight-band__marker">
              <p className="eyebrow eyebrow--gold">The current chapter</p>
            </div>
            <div className="insight-band__content">
              <h2>From operator everywhere to steward of what matters most.</h2>
              <p>
                Tel now concentrates on decisions where his experience is difficult to replace: strengthening
                Kyyba’s long-term value, developing decision-capable leaders, allocating capital, building
                strategic relationships, shaping a coherent public narrative, supporting selected creative and
                impact work, and protecting the energy required to do it well.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* ABOUT-06 / MOD-ABOUT-RECOGNITION intentionally not rendered yet: CLAIM-012/013/014 in the Claim
          Register are still Evidence Requested / Conflict / Not Started. FR-EVD-05 forbids shipping a
          recognition module before its claims are verified — add it once Legal/Communications clear them. */}
      {/* ABOUT-07 / MOD-ABOUT-ENTERPRISE-BRIDGE — closing route back to the flagship proof. This is the
          page's sole repeat of CTA-ABOUT-PRIMARY outside the hero (pages.ts: "One primary action per page") —
          intentionally the only other CTA button on this page. */}
      <section className="section section--spacious">
        <div className="container">
          <SectionIntro eyebrow="Where the story leads" title="See the enterprise built on this record." body="Kyyba remains the clearest evidence of how this operating approach performs at scale." />
          <div className="section-footer-action">
            <Link href="/enterprise-investments" className="cta cta--primary">
              Explore Enterprise &amp; Investments <Arrow />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

function EnterprisePage() {
  return (
    <>
      <InnerHero
        eyebrow="Enterprise & investments"
        title="Operating experience before opportunity."
        body="A disciplined portfolio begins with a clear view of how value is built: through capable people, accountable systems, and patient execution."
        pageId="ENTERPRISE"
        cta={{ id: 'CTA-ENTERPRISE-PRIMARY', label: 'Discuss a Strategic Partnership', destination: 'strategic-partnership', type: 'inquiry' }}
      />
      {/* MOD-ENTERPRISE-KYYBA-FLAGSHIP — a dark asymmetric split (seal + wordmark against narrative +
          qualitative badges), distinct from every other section on this page and from the homepage's own
          flagship treatment, so Kyyba still reads as "the anchor" without feeling like a reused block. */}
      <section className="section enterprise-flagship">
        <div className="container enterprise-flagship__grid">
          <div className="enterprise-flagship__seal">
            <div className="enterprise-flagship__logo">
              <Image src="/images/kyyba-logo.png" alt="Kyyba" width={280} height={140} style={{ width: 'auto', height: 'auto' }} />
            </div>
            <p className="enterprise-flagship__tagline">Global Technology &amp; Engineering Solutions</p>
          </div>
          <div className="enterprise-flagship__content">
            <p className="eyebrow eyebrow--gold">Kyyba</p>
            <h2>The anchor of the enterprise story.</h2>
            <p>
              Kyyba is presented as the primary operating proof behind the wider portfolio. It establishes the
              builder’s lens before any investment or adjacent platform is introduced.
            </p>
            <div className="enterprise-flagship__badges">
              <span>Mobility &amp; Automotive</span>
              <span>Cross-Border Teams</span>
              <span>Enterprise Scale</span>
            </div>
          </div>
        </div>
      </section>
      {/* MOD-ENTERPRISE-APPROACH — a horizontal step-rail (numbered markers on a connecting line, no
          card boxes) so this reads as an ordered method rather than four interchangeable tiles. */}
      <section className="section section--spacious section--mist">
        <div className="container">
          <SectionIntro eyebrow="Value-building method" title="A selective, operator-led lens" body="The aim is not to display activity. It is to make the logic behind each enterprise or relationship understandable." />
          <ol className="step-rail">
            {[
              ['01', 'Possibility', 'A real need, capable people, and room to create differentiated value.'],
              ['02', 'Alignment', 'Shared expectations about role, authority, timing, and the outcome being built.'],
              ['03', 'Execution', 'An operating model that can turn intention into repeatable performance.'],
              ['04', 'Durability', 'Value designed to remain relevant beyond a single cycle or personality.'],
            ].map(([number, title, body]) => (
              <li key={number}>
                <span className="step-rail__num">{number}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      {/* MOD-ENTERPRISE-PORTFOLIO / MOD-ENTERPRISE-ENTITY-ROUTES — no individual portfolio companies are
          named here: none have an approved Claim Register / Evidence Source entry yet, so this stays at
          the category level, as three plain pillars (no link, no arrow) rather than cards that imply
          three different destinations when only one — the strategic-partnership route — actually exists.
          That one real action is a single CTA below the row instead. */}
      <section className="section section--spacious">
        <div className="container">
          <SectionIntro eyebrow="Portfolio architecture" title="Built, backed, and connected" />
          <div className="pillar-row">
            {[
              ['A', 'Operating enterprises', 'Built through direct leadership and execution.'],
              ['B', 'Investment relationships', 'Selected for strategic fit and value potential.'],
              ['C', 'Strategic partnerships', 'Qualified opportunities with clear mutual value.'],
            ].map(([mark, title, body]) => (
              <article key={mark} className="pillar">
                <span className="pillar__mark" aria-hidden="true">{mark}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
          <div className="section-footer-action">
            <CtaLink
              pageId="ENTERPRISE"
              moduleId="MOD-ENTERPRISE-ENTITY-ROUTES"
              ctaId="CTA-ENTERPRISE-PORTFOLIO"
              label="Discuss a Strategic Partnership"
              destination="strategic-partnership"
              destinationType="inquiry"
            />
          </div>
        </div>
      </section>
      {/* MOD-ENTERPRISE-QUALIFICATION — an icon-anchored criteria grid rather than a plain checklist,
          so each of the four pass/fail questions gets a distinct visual identity. */}
      <section className="section section--spacious section--mist">
        <div className="container">
          <SectionIntro eyebrow="Before a conversation starts" title="What makes a relationship worth pursuing" body="These are the questions applied before any enterprise, investment, or partnership discussion moves forward." />
          <div className="criteria-grid">
            {[
              { Icon: TargetIcon, title: 'Aligned purpose', body: 'The opportunity connects to where real value can be built, not just where capital can be placed.' },
              { Icon: LeadershipIcon, title: 'Capable leadership', body: 'People are in place, or being built, who can own execution without constant intervention.' },
              { Icon: DocumentIcon, title: 'Clear terms', body: 'Role, authority, timeline, and the outcome being built are explicit before any commitment.' },
              { Icon: ShieldIcon, title: 'Durable fit', body: 'The relationship is designed to create value beyond a single transaction or cycle.' },
            ].map(({ Icon, title, body }) => (
              <article key={title} className="criteria-card">
                <span className="criteria-card__icon"><Icon /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
          <div className="section-footer-action">
            <CtaLink
              pageId="ENTERPRISE"
              moduleId="MOD-ENTERPRISE-QUALIFICATION"
              ctaId="CTA-ENTERPRISE-QUALIFICATION"
              label="Discuss a Strategic Partnership"
              destination="strategic-partnership"
              destinationType="inquiry"
            />
          </div>
        </div>
      </section>
    </>
  )
}

function IdeasPage({ articlesPage = 1, articlesTag }: { articlesPage?: number; articlesTag?: string }) {
  return (
    <>
      <InnerHero
        eyebrow="Ideas"
        title="Frameworks for people who choose to build."
        body="A focused home for thinking about enterprise, leadership, possibility, and the inner patterns that shape outward action."
        pageId="IDEAS"
        cta={{ id: 'CTA-IDEAS-PRIMARY', label: "Subscribe to Tel's Ideas", destination: '#subscribe' }}
      />
      <IdeasArticlesSection page={articlesPage} tag={articlesTag} />
      {/* MOD-IDEAS-FEATURED / MOD-IDEAS-FRAMEWORKS / MOD-IDEAS-MIND-TRAP — Mind Trap is the one
          published framework, so it satisfies "featured" content honestly without inventing an
          article that doesn't exist yet. The 3-step mental model is a genuine sequence (notice, then
          question, then choose), so it reuses the step-rail pattern built for Enterprise's method —
          same component, new icons, not a copy-paste repeat of that page's content.
          The "Listen to Mind Trap" CTA below is a REAL, verified official destination (Tel's own
          Mind Trap podcast, mindtrappodcast.com — confirmed via web search: hosted by Tel K. Ganesan
          and Danielle E. Thomas), already used the same way from the homepage's MindTrapSection.
          Routed through CtaLink's `destinationType="external"` branch so it gets the baseline's
          `outbound_referral` tracking and http/https validation, not a bare <a> tag. */}
      <section className="section section--spacious" id="frameworks">
        <div className="container">
          <div className="framework-row">
            <SectionIntro eyebrow="Featured framework" title="Mind Trap" body="The distance between possibility and progress is often created by the assumptions we stop examining. Mind Trap turns that hidden friction into something a leader can see and work through." />
            <div className="framework-spotlight">
              <div className="framework-spotlight__logo-wrap">
                <Image
                  src="/images/mindtrap/mind-trap-logo.png"
                  alt="Mind Trap Framework and Podcast official logo"
                  width={260}
                  height={140}
                  style={{ width: 'auto', height: '80px', objectFit: 'contain' }}
                />
              </div>
              <div className="framework-spotlight__info">
                <span className="eyebrow eyebrow--gold">Official Framework & Series</span>
                <p>Mind Trap explores the subconscious beliefs and operational friction that keep high-potential leaders from their next breakthrough.</p>
              </div>
            </div>
          </div>
          <ol className="step-rail step-rail--three">
            {[
              { Icon: EyeIcon, title: 'Notice the pattern', body: 'See the belief or habit operating quietly beneath a decision.' },
              { Icon: QuestionIcon, title: 'Question the limit', body: 'Test whether that assumption is still true, or just familiar.' },
              { Icon: CompassMoveIcon, title: 'Choose the next move', body: 'Act on what is actually possible, not what was merely assumed.' },
            ].map(({ Icon, title, body }) => (
              <li key={title}>
                <span className="step-rail__num step-rail__num--icon"><Icon /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
          <div className="section-footer-action">
            <CtaLink
              pageId="IDEAS"
              moduleId="MOD-IDEAS-MIND-TRAP"
              ctaId="CTA-IDEAS-MINDTRAP-LISTEN"
              label="Listen to Mind Trap"
              destination="https://mindtrappodcast.com/"
              destinationType="external"
              emphasis="secondary"
            />
            <Link href="/#ideas" className="text-link">See the interactive experience <Arrow /></Link>
          </div>
        </div>
      </section>
      <section className="section section--mist">
        <div className="container">
          <SectionIntro eyebrow="Explore by theme" title="Ideas designed for action" />
          <div className="editorial-grid editorial-grid--three">
            {[
              ['Enterprise', 'Building useful systems, resilient teams, and enduring value.'],
              ['Leadership', 'Making clear decisions when the answer is not obvious.'],
              ['Possibility', 'Recognizing the beliefs and structures that define what happens next.'],
            ].map(([title, body], index) => <article className="editorial-card" key={title}><span className="editorial-card__index">0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </div>
      </section>
      <section className="section newsletter-panel" id="subscribe">
        <div className="container newsletter-panel__grid">
          <div className="newsletter-panel__visual">
            <Image
              src="/images/ideas-editorial.webp"
              alt="Open leather-bound journal with handwritten notes and fountain pen on a wooden desk — evoking contemplative ideas and editorial craftsmanship"
              width={560}
              height={360}
              style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
            />
          </div>
          <div className="newsletter-panel__content">
            <p className="eyebrow eyebrow--gold">A considered note</p>
            <h2>Ideas worth returning to.</h2>
            <p>The new editorial subscription will open with the publication platform. Until then, explore the framework and return as the library grows.</p>
            <Link className="text-link text-link--inverse" href="/ideas#frameworks">Explore the framework <Arrow /></Link>
          </div>
        </div>
      </section>
    </>
  )
}

function CulturePage() {
  return (
    <>
      <InnerHero
        eyebrow="Film & culture"
        title="Build the story. Move the culture."
        body="Creative work is presented with the same discipline as enterprise work: verified roles, official destinations, rights-cleared assets, and the story behind why the work matters."
        pageId="CULTURE"
        cta={{ id: 'CTA-CULTURE-PRIMARY', label: 'View Selected Work', destination: '#selected-work' }}
      />
      {/* The visual anchor here is the Kyyba Films brand mark itself (the studio behind this work),
          not a specific title's poster — confirmed real via kyybafilms.com (kyybafilms.com/images/logo.png),
          Tel K. Ganesan's own production studio. Downloaded from that official domain since it's a
          verified, currently-live asset; swap for a higher-resolution file if Ankit/Tel provide one. */}
      <section className="section section--spacious" id="selected-work">
        <div className="container culture-split culture-split--page">
          <div className="culture-art">
            <Image src="/images/kyyba-films-logo.png" alt="Kyyba Films" width={778} height={477} style={{ width: '55%', height: 'auto' }} />
          </div>
          <div><p className="eyebrow">The creative lens</p><h2>Storytelling as an act of enterprise.</h2><p className="section-intro__body">A story begins as possibility. It requires vision, capital, collaboration, execution, and an audience. That shared discipline is what connects film and culture to the broader builder’s journey.</p></div>
        </div>
      </section>
      {/* MOD-CULTURE-SELECTED-WORK / MOD-CULTURE-PROJECT-CARDS / MOD-CULTURE-ROLE-CREDIT /
          MOD-CULTURE-COLLABORATION — reuses the same verified `films` data (poster, credit, cast)
          already live on the homepage's FilmCultureSection, so nothing here is invented. Cards are
          not links: MOD-CULTURE-OFFICIAL-MEDIA needs a real official destination per title (IMDb,
          trailer, streaming) which isn't in the data yet — flag for Ankit/Tel rather than fabricate one
          or self-link to this same page. */}
      <section className="section section--mist">
        <div className="container">
          <SectionIntro eyebrow="Selected work" title="A curated record, not a catalogue" body="Verified credits with official external destinations." />
          <div className="project-grid">
            {films.map((film) => (
              <article key={film.id} className="project-card">
                <div className="project-card__poster">
                  <Image src={film.image} alt={film.alt} fill sizes="(max-width: 760px) 100vw, 33vw" />
                  <span className="project-card__category">{film.category}</span>
                </div>
                <div className="project-card__body">
                  <h3>{film.title}</h3>
                  <p className="project-card__role">{film.role}</p>
                  <p>{film.tagline}</p>
                  <p className="project-card__cast">Featuring {film.cast}</p>
                  {film.imdbUrl && (
                    <div style={{ marginTop: '1.2rem' }}>
                      <a
                        href={film.imdbUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}
                      >
                        View on IMDb <Arrow />
                      </a>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function ImpactPage() {
  return (
    <>
      <InnerHero
        eyebrow="Impact"
        title="Contribution made accountable."
        body="Impact is approached as serious work: define the purpose, align the partners, understand the role, and make outcomes visible through evidence."
        pageId="IMPACT"
        cta={{ id: 'CTA-IMPACT-PRIMARY', label: 'Explore an Impact Partnership', destination: 'impact', type: 'inquiry' }}
      />
      <section className="section section--spacious">
        <div className="container split-story split-story--impact">
          <div>
            <SectionIntro eyebrow="The approach" title="Intent is the beginning, not the evidence." body="The impact platform is designed to distinguish aspiration from outcome. Every initiative should make its purpose, partners, geography, and participation route clear." />
            <div className="impact-pillars-row">
              <span className="impact-pillar-tag">Purpose</span>
              <span className="impact-pillar-tag">Partners</span>
              <span className="impact-pillar-tag">Evidence</span>
              <span className="impact-pillar-tag">Durable Value</span>
            </div>
          </div>
          <div className="impact-showcase-visual">
            <div className="impact-showcase-image">
              <Image
                src="/images/tel/tel-jesse-jackson-impact.webp"
                alt="Tel K. Ganesan with Civil Rights leader Rev. Jesse Jackson advocating for community empowerment and economic opportunity"
                fill
                loading="eager"
                sizes="(max-width: 900px) 100vw, 45vw"
                style={{ objectFit: 'cover', objectPosition: 'center 32%' }}
              />
            </div>
            <div className="impact-showcase-caption">
              <strong>Civil Rights, Civic & Community Leadership</strong>
              <span>Tel K. Ganesan with Rev. Jesse Jackson, advocating for economic inclusion, youth mentorship, and sustainable grassroots empowerment.</span>
            </div>
          </div>
        </div>
      </section>
      <section className="section section--mist">
        <div className="container">
          <SectionIntro eyebrow="Participation standard" title="The questions that come first" />
          <div className="process-grid">
            {[
              ['01', 'What changes?', 'A defined need and an outcome worth building toward.'],
              ['02', 'Who owns it?', 'Partners with the authority and capability to do the work.'],
              ['03', 'How is it known?', 'Evidence that can support what is said about the outcome.'],
              ['04', 'Why this role?', 'A clear reason for involvement and a responsible commitment.'],
            ].map(([number, title, body]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </div>
      </section>
    </>
  )
}

function MediaPage() {
  return (
    <>
      <InnerHero
        eyebrow="Media & speaking"
        title="Useful ideas for consequential rooms."
        body="A clear route for event organizers, journalists, and producers to understand the perspective, select a relevant topic, and submit a well-qualified request."
        pageId="MEDIA"
        cta={{ id: 'CTA-MEDIA-PRIMARY', label: 'Book Tel to Speak', destination: 'speaking', type: 'inquiry' }}
      />
      <section className="section section--spacious">
        <div className="container">
          <div className="speaking-feature-grid">
            <div className="speaking-stage-card">
              <div className="speaking-stage-image">
                <Image
                  src="/images/tel/tel-speaking-podium.png"
                  alt="Tel K. Ganesan delivering keynote address at Wayne State University"
                  fill
                  loading="eager"
                  sizes="(max-width: 900px) 100vw, 45vw"
                  style={{ objectFit: 'cover', objectPosition: 'center 15%' }}
                />
              </div>
              <div className="speaking-stage-caption">
                <span className="eyebrow eyebrow--gold">Keynote Speaker & Inductee</span>
                <p>Addressing engineering graduates, global summits, and executive assemblies on purpose and enterprise execution.</p>
              </div>
            </div>
            <div className="speaking-feature-content">
              <SectionIntro
                eyebrow="Keynote perspective"
                title="Tested in boardrooms. Delivered for action."
                body="Tel speaks from three decades of operating in competitive global markets. Rather than generic motivational theory, his keynotes address the friction, choices, and systems that determine whether high-stakes initiatives succeed."
              />
              <div className="speaking-editorial-card">
                <div className="speaking-editorial-thumb">
                  <Image
                    src="/images/tel/tel-media-tv-interview.png"
                    alt="Tel K. Ganesan television broadcast interview on The Noon Show"
                    width={110}
                    height={75}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div className="speaking-editorial-desc">
                  <h3>Broadcast & Keynote Formats</h3>
                  <p>Television and podcast broadcasts, executive keynotes, summit fireside chats, and global leadership roundtables.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section section--mist">
        <div className="container">
          <SectionIntro eyebrow="Speaking themes" title="Built from operating experience" body="Themes are framed for leaders, founders, and teams navigating growth, reinvention, and the responsibility to turn vision into execution." />
          <div className="editorial-grid editorial-grid--three">
            {[
              ['Building possibility', 'How leaders move from a compelling idea to a structure that can carry it.'],
              ['Leadership under complexity', 'Clarity, ownership, and decision-making when the path is uncertain.'],
              ['Enterprise meets culture', 'What builders can learn from story, audience, and creative risk.'],
            ].map(([title, body], index) => <article className="editorial-card" key={title}><span className="editorial-card__index">0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </div>
      </section>
      {/* MOD-MEDIA-PRESS-KIT — Approved executive one-sheet, biography, and media assets */}
      <section className="section" id="press-kit" aria-labelledby="press-kit-heading">
        <div className="container">
          <div
            style={{
              background: '#141c24',
              borderRadius: '12px',
              padding: 'clamp(2rem, 4vw, 3rem)',
              color: '#ffffff',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '2rem',
              border: '1px solid rgba(211, 162, 70, 0.28)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.24)',
            }}
          >
            <div style={{ maxWidth: '640px' }}>
              <span className="eyebrow eyebrow--gold" style={{ color: '#d3a246' }}>PRESS KIT &amp; ASSETS</span>
              <h2 id="press-kit-heading" style={{ fontSize: 'clamp(1.5rem, 2.2vw, 2rem)', margin: '0.4rem 0 0.8rem', color: '#ffffff' }}>
                Executive Biography &amp; Media Kit
              </h2>
              <p style={{ margin: 0, color: '#c4ccd4', fontSize: '0.98rem', lineHeight: 1.6 }}>
                The approved executive one-sheet, verified speaking topics and media summaries will be published here once they have been reviewed. For press assets now, please use the Media route below.
              </p>
            </div>
            <div>
              {/* The press kit is withheld until its biography claims are approved (Claim Register,
                  FR-EVD-05). Re-enable DownloadButton with the approved file when cleared. */}
              <span
                className="cta cta--secondary"
                aria-disabled="true"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.95rem 2rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(211, 162, 70, 0.45)',
                  color: '#d3a246',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'not-allowed',
                  opacity: 0.85,
                }}
              >
                Press kit &mdash; available after approval
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="section media-route">
        <div className="container media-route__grid">
          <div><p className="eyebrow eyebrow--gold">The right route matters</p><h2>Speaking request or media deadline?</h2></div>
          <div className="route-grid route-grid--two">
            <RouteCard href="/connect?route=speaking" number="01" title="Speaking" body="Event, audience, objective, date, format, and budget" />
            <RouteCard href="/connect?route=media" number="02" title="Media" body="Outlet, topic, format, deadline, and requested assets" />
          </div>
        </div>
      </section>
    </>
  )
}

function PolicyPage({ accessibility = false }: { accessibility?: boolean }) {
  const pageId = accessibility ? 'ACCESSIBILITY' : 'PRIVACY'
  return (
    <>
      <InnerHero
        eyebrow={accessibility ? 'Accessibility' : 'Privacy'}
        title={accessibility ? 'A more usable web, by design.' : 'Clear choices. Respectful handling.'}
        body={accessibility ? 'This platform is being built to WCAG 2.2 AA expectations, with keyboard access, visible focus, readable contrast, and resilient responsive layouts.' : 'The platform collects only the information needed to route inquiries and keeps optional analytics behind an explicit visitor choice.'}
        pageId={pageId}
        cta={{ id: accessibility ? 'CTA-ACCESSIBILITY-PRIMARY' : 'CTA-PRIVACY-PRIMARY', label: accessibility ? 'Request accessibility help' : 'Contact the privacy owner', destination: 'general', type: 'inquiry' }}
      />
      <section className="section section--spacious">
        <div className="container container--narrow policy-copy">
          {accessibility ? (
            <>
              <h2>Current commitment</h2>
              <p>The experience supports keyboard navigation, clear heading order, visible focus states, text resizing, reduced-motion preferences, and mobile reflow. Content and interaction testing remain part of every release.</p>
              <h2>Need another format?</h2>
              <p>If a page, document, or interaction is difficult to use, submit an accessibility request through the general inquiry route. Include the page address, the barrier you encountered, and the format or assistance that would help.</p>
            </>
          ) : (
            <>
              <h2>Information you choose to provide</h2>
              <p>Inquiry forms request contact details and route-specific context so the responsible owner can assess and answer the request. Optional marketing consent is separate from inquiry consent.</p>
              <h2>Analytics choice</h2>
              <p>Analytics remain off until you explicitly accept them. You can decline at first visit or change the choice later from the footer.</p>
              <h2>Responsible routing</h2>
              <p>Submissions are routed by inquiry type. The website does not present a routine direct-to-executive channel, and a submission is not represented as delivered unless the system confirms delivery.</p>
            </>
          )}
        </div>
      </section>
    </>
  )
}

function TermsPage() {
  return (
    <>
      <InnerHero
        eyebrow="Terms of Use"
        title="Clear terms for using this website."
        body="This page sets out the terms that govern your use of this website, its content, and the routes it offers to connect with the team."
        pageId="TERMS"
      />
      <section className="section section--spacious">
        <div className="container container--narrow policy-copy">
          <h2>Acceptance of these terms</h2>
          <p>By using this website, you agree to these Terms of Use. If you do not agree, please do not use the site.</p>
          <h2>Content and intellectual property</h2>
          <p>Text, images, video, and other material on this site belong to Tel K. Ganesan or the respective rights holders credited alongside them, and are made available for your personal, non-commercial viewing. Reproducing, redistributing, or commercially reusing any material without prior written permission is not permitted.</p>
          <h2>External links</h2>
          <p>This site links to official third-party destinations, including partner organizations and platforms. Those sites operate under their own terms and privacy practices, which are not controlled by this website.</p>
          <h2>No professional advice</h2>
          <p>Content published here reflects perspective and experience. It is not financial, legal, medical, or investment advice, and should not be relied on as a substitute for advice from a qualified professional.</p>
          <h2>Availability and accuracy</h2>
          <p>The site is provided on an as-is, as-available basis. While reasonable care is taken to keep information current, no warranty is made that content is complete, uninterrupted, or error-free.</p>
          <h2>Limitation of liability</h2>
          <p>To the extent permitted by law, Tel K. Ganesan and the team behind this site are not liable for losses arising from your use of, or inability to use, the site or its content.</p>
          <h2>Changes to these terms</h2>
          <p>These terms may be updated from time to time. Continued use of the site after a change is posted constitutes acceptance of the revised terms.</p>
          <h2>Contact</h2>
          <p>Questions about these terms can be submitted through the general inquiry route on the Connect page.</p>
        </div>
      </section>
    </>
  )
}

export function BaselinePage({
  pageId,
  articlesPage,
  articlesTag,
}: {
  pageId: string
  articlesPage?: number
  articlesTag?: string
}) {
  switch (pageId as PageId) {
    case 'HOME': return <HomePage />
    case 'ABOUT': return <AboutPage />
    case 'ENTERPRISE': return <EnterprisePage />
    case "IDEAS": return <IdeasPage articlesPage={articlesPage} articlesTag={articlesTag} />
    case 'CULTURE': return <CulturePage />
    case 'IMPACT': return <ImpactPage />
    case 'MEDIA': return <MediaPage />
    case 'PRIVACY': return <PolicyPage />
    case 'TERMS': return <TermsPage />
    case 'ACCESSIBILITY': return <PolicyPage accessibility />
    default: return null
  }
}
