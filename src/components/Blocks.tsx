import Link from 'next/link'

import type { Page } from '@/payload-types'
import { CtaLink } from './CtaLink'

type ModuleBlock = NonNullable<Page['modules']>[number]

/**
 * Renders approved content modules. Each rendered module carries its MOD ID as a data
 * attribute so QA can trace what is on screen back to the baseline (FR-CONT-01).
 */
export function Blocks({ modules, pageId }: { modules: ModuleBlock[] | null | undefined; pageId: string }) {
  if (!modules || modules.length === 0) {
    return (
      <section className="section">
        <div className="container">
          <div className="empty-state">
            <p>
              <strong>No published modules yet.</strong>
            </p>
            <p>
              This template is built and routable, but its content is still in draft. Approved copy and evidence are
              a G1 (Content Ready) dependency.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      {modules.map((block, index) => (
        <section
          key={block.id ?? index}
          className={index % 2 === 1 ? 'section section--alt' : 'section'}
          data-module-id={'moduleId' in block ? block.moduleId : undefined}
          data-page-id={pageId}
        >
          <div className="container">
            <BlockBody block={block} pageId={pageId} />
          </div>
        </section>
      ))}
    </>
  )
}

function BlockBody({ block, pageId }: { block: ModuleBlock; pageId: string }) {
  switch (block.blockType) {
    case 'hero':
      return (
        <div>
          {block.eyebrow && <p className="page-header__eyebrow">{block.eyebrow}</p>}
          <h1>{block.heading}</h1>
          {block.statement && <p className="section__lede">{block.statement}</p>}
        </div>
      )

    case 'richText':
      return (
        <div>
          {block.heading && <h2>{block.heading}</h2>}
          {/* Rich text rendering is a Phase 1 task; the module renders its heading and
              structure now so the template is real rather than mocked. */}
          {!block.body && <p className="section__lede">Body copy pending editorial approval.</p>}
        </div>
      )

    case 'proof':
      return (
        <div>
          <h2>{block.heading}</h2>
          {block.body && <p className="section__lede">{block.body}</p>}
          {block.points && block.points.length > 0 && (
            <ul className="card-grid">
              {block.points.map((point, i) => (
                <li className="card" key={point.id ?? i}>
                  <h3>{point.label}</h3>
                  {point.detail && <p>{point.detail}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )

    case 'timeline':
      return (
        <div>
          <h2>{block.heading}</h2>
          <ol className="card-grid">
            {(block.entries ?? []).map((entry, i) => (
              <li className="card" key={entry.id ?? i}>
                <h3>{entry.title}</h3>
                <p>
                  <strong>{entry.period}</strong>
                  {entry.roleStatus === 'former' && ' — former role'}
                </p>
                {entry.detail && <p>{entry.detail}</p>}
              </li>
            ))}
          </ol>
        </div>
      )

    case 'cardGrid':
      return (
        <div>
          <h2>{block.heading}</h2>
          {block.intro && <p className="section__lede">{block.intro}</p>}
          <div className="empty-state">
            <p>No published {block.source} yet. Cards appear here once records clear the evidence gate.</p>
          </div>
        </div>
      )

    case 'ctaModule':
      return (
        <div>
          <h2>{block.heading}</h2>
          {block.body && <p className="section__lede">{block.body}</p>}
          <CtaLink
            pageId={pageId}
            moduleId={block.moduleId ?? undefined}
            ctaId={block.ctaId}
            label={block.label}
            destination={block.destination}
            destinationType={block.destinationType}
            emphasis={block.emphasis === 'primary' ? 'primary' : 'secondary'}
          />
        </div>
      )

    case 'newsletter':
      return (
        <div>
          <h2>{block.heading}</h2>
          {block.body && <p className="section__lede">{block.body}</p>}
          <p>
            <Link href="/ideas#subscribe" className="cta cta--secondary">
              Subscribe to Tel&rsquo;s Ideas
            </Link>
          </p>
        </div>
      )

    default:
      return null
  }
}
