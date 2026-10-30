/**
 * One-time import of the website content that used to live in frontend code, so it can be
 * managed from the admin (Film & Culture, Impact, Enterprises):
 *   - the three films       -> projects    (homepage carousel + /film-culture)
 *   - the impact focus areas -> initiatives (homepage tabs + /impact)
 *   - the four venture cards -> entities    (homepage "Enterprise & investments")
 *
 * Values are copied verbatim from frontend/src/frontend/data/{films,impact}.ts and
 * PremiumHomePage.tsx, so the site renders exactly as before. Records that already exist (by
 * slug) are left alone unless --force is passed, so admin edits are never overwritten.
 *
 *   npm run import:site-content            # dry run
 *   npm run import:site-content -- --apply
 */
import { data } from '../src/data/client'
import { connectDatabase, disconnectDatabase } from '../src/db'

const apply = process.argv.includes('--apply')
const force = process.argv.includes('--force')

const films = [
  {
    slug: 'trap-city',
    title: 'TRAP CITY',
    category: 'FEATURE FILM',
    creditWording: 'A Film by Tel K. Ganesan • Producer',
    tagline: 'Music, redemption, and the price of ambition.',
    cast: 'Brandon T. Jackson • Jeezy • Clifton Powell • Erica Pinkett',
    posterPath: '/images/films/trap-city-crisp.webp',
    posterAlt: 'Trap City movie poster - A Tel K. Ganesan production starring Brandon T. Jackson and Jeezy',
    cardHref: '/film-culture',
    imdbUrl: 'https://www.imdb.com/title/tt10850254/',
    officialUrl: 'https://kyybafilms.com/',
  },
  {
    slug: '18-half',
    title: '18½',
    category: 'POLITICAL THRILLER',
    creditWording: 'Tel K. Ganesan • Executive Producer',
    tagline: 'The 18½-minute gap that changed American history.',
    cast: 'Willa Fitzgerald • John Magaro • Richard Kind',
    posterPath: '/images/films/18-half-crisp.webp',
    posterAlt: '18 1/2 movie poster - Executive Produced by Tel K. Ganesan',
    cardHref: '/film-culture',
    imdbUrl: 'https://www.imdb.com/title/tt11855216/',
    officialUrl: 'https://kyybafilms.com/',
  },
  {
    slug: 'celebrity-crush',
    title: 'CELEBRITY CRUSH',
    category: 'PSYCHOLOGICAL THRILLER',
    creditWording: 'Tel K. Ganesan • Producer',
    tagline: 'When fandom turns into a dangerous obsession.',
    cast: 'Oliver Robins • Alissa Schneider',
    posterPath: '/images/films/celebrity-crush-crisp.webp',
    posterAlt: 'Celebrity Crush movie poster - Produced by Tel K. Ganesan',
    cardHref: '/film-culture',
    imdbUrl: 'https://www.imdb.com/title/tt9140410/',
    officialUrl: 'https://kyybafilms.com/',
  },
]

const pillars = [
  {
    slug: 'education',
    tag: 'Focus Area 01',
    shortLabel: 'Youth & Education',
    title: 'Youth & Education Empowerment',
    summary: 'Expanding access to digital literacy, STEM scholarships, and leadership mentorship for underrepresented students.',
    focusArea: 'Digital Literacy & STEM',
  },
  {
    slug: 'community',
    tag: 'Focus Area 02',
    shortLabel: 'Urban Revitalization',
    title: 'Urban Revitalization & Community Support',
    summary: 'Grassroots programs supporting community health initiatives, urban infrastructure, and sustainable local development.',
    focusArea: 'Community & Health Equity',
  },
  {
    slug: 'entrepreneurship',
    tag: 'Focus Area 03',
    shortLabel: 'Enterprise & Equity',
    title: 'Enterprise & Founder Mentorship',
    summary: 'Opening global venture networks, capital access, and executive guidance for early-stage diverse entrepreneurs.',
    focusArea: 'Mentorship & Advisory',
  },
]

const ventures = [
  {
    slug: 'kyyba',
    name: 'Kyyba Group',
    cardTag: '01 / Flagship enterprise',
    summary: 'Technology, engineering innovation, and global talent working across borders to create value.',
    cardHref: '/enterprise-investments',
    cardImagePath: '/images/ventures/kyyba-logo-official.png',
    cardImageAlt: 'Kyyba Group Official Logo',
    cardPills: ['IT & Engineering', 'Global Talent', 'Scale'],
    cardSize: 'hero',
    cardTheme: 'light',
    isFlagship: true,
  },
  {
    slug: 'strategic-investments',
    name: 'Strategic Investments',
    cardTag: '02 / Ventures & capital',
    summary: 'Backing exceptional founders, scalable platforms, and disruptive next-generation systems.',
    cardHref: '/enterprise-investments',
    cardPills: ['Seed to Growth', 'Founder-First', 'Ecosystem'],
    cardSize: 'wide',
    cardTheme: 'dark',
  },
  {
    slug: 'new-ventures',
    name: 'New Ventures',
    cardTag: '03 / Media & studios',
    summary: 'Expanding frontiers across film production, music, and culture-shaping creative IP.',
    cardHref: '/enterprise-investments',
    cardPills: ['Kyyba Films', 'Trap City'],
    cardSize: 'regular',
    cardTheme: 'dark',
  },
  {
    slug: 'global-opportunities',
    name: 'Global Opportunities',
    cardTag: '04 / Smart ecosystems',
    summary: 'Crossing international markets, revitalizing urban centers, and driving long-term value.',
    cardHref: '/enterprise-investments',
    cardPills: ['Vision 2030', 'Urban Tech'],
    cardSize: 'regular',
    cardTheme: 'dark',
  },
]

const NOTE = 'Imported from the website code (already public before the admin existed).'

async function upsert(collection: 'projects' | 'initiatives' | 'entities', slug: string, doc: Record<string, unknown>) {
  const existing = await data.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0, pagination: false })
  const current = existing.docs[0] as { id: string } | undefined
  if (current && !force) {
    console.log(`  = ${collection}/${slug} already exists, left unchanged`)
    return
  }
  console.log(`  ${current ? '~ update' : '+ create'} ${collection}/${slug}${apply ? '' : ' (dry run)'}`)
  if (!apply) return
  if (current) await data.update({ collection, id: current.id, data: doc })
  else await data.create({ collection, data: { slug, ...doc } })
}

async function main() {
  await connectDatabase()
  console.log(apply ? 'Importing site content…' : 'Dry run (pass --apply to write):')

  for (const [i, f] of films.entries()) {
    const { slug, ...rest } = f
    await upsert('projects', slug, { ...rest, summary: f.tagline, displayAs: 'card', creditStatus: 'verified', displayOrder: (i + 1) * 10, baselineNotes: NOTE, _status: 'published' })
  }
  for (const [i, p] of pillars.entries()) {
    const { slug, ...rest } = p
    await upsert('initiatives', slug, { ...rest, displayAs: 'card', legalStatus: 'program', displayOrder: (i + 1) * 10, baselineNotes: NOTE, _status: 'published' })
  }
  for (const [i, v] of ventures.entries()) {
    const { slug, ...rest } = v
    await upsert('entities', slug, { ...rest, displayAs: 'card', relationshipStatus: 'current', displayOrder: (i + 1) * 10, baselineNotes: NOTE, _status: 'published' })
  }

  await disconnectDatabase()
  console.log('Done.')
}

main().catch(async (error) => {
  console.error(error)
  await disconnectDatabase().catch(() => undefined)
  process.exit(1)
})
