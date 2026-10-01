/**
 * Verified filmography data — shared between the homepage's FilmCultureSection (a client
 * component, for its poster carousel) and the /film-culture interior page (a server component).
 *
 * Kept in a plain, non-'use client' module on purpose: importing a data export from a 'use client'
 * file into a server component does not reliably resolve at runtime (it can come back `undefined`
 * even though it type-checks fine), so this is the single source of truth both sides import from.
 */
export interface FilmItem {
  id: string
  title: string
  category: string
  role: string
  tagline: string
  cast: string
  image: string
  alt: string
  href: string
  imdbUrl?: string
  officialUrl?: string
}

export const films: FilmItem[] = [
  {
    id: 'trap-city',
    title: 'TRAP CITY',
    category: 'FEATURE FILM',
    role: 'A Film by Tel K. Ganesan • Producer',
    tagline: 'Music, redemption, and the price of ambition.',
    cast: 'Brandon T. Jackson • Jeezy • Clifton Powell • Erica Pinkett',
    image: '/images/films/trap-city-crisp.webp',
    alt: 'Trap City movie poster - A Tel K. Ganesan production starring Brandon T. Jackson and Jeezy',
    href: '/film-culture',
    imdbUrl: 'https://www.imdb.com/title/tt10850254/',
    officialUrl: 'https://kyybafilms.com/',
  },
  {
    id: '18-half',
    title: '18½',
    category: 'POLITICAL THRILLER',
    role: 'Tel K. Ganesan • Executive Producer',
    tagline: 'The 18½-minute gap that changed American history.',
    cast: 'Willa Fitzgerald • John Magaro • Richard Kind',
    image: '/images/films/18-half-crisp.webp',
    alt: '18 1/2 movie poster - Executive Produced by Tel K. Ganesan',
    href: '/film-culture',
    imdbUrl: 'https://www.imdb.com/title/tt11855216/',
    officialUrl: 'https://kyybafilms.com/',
  },
  {
    id: 'celebrity-crush',
    title: 'CELEBRITY CRUSH',
    category: 'PSYCHOLOGICAL THRILLER',
    role: 'Tel K. Ganesan • Producer',
    tagline: 'When fandom turns into a dangerous obsession.',
    cast: 'Oliver Robins • Alissa Schneider',
    image: '/images/films/celebrity-crush-crisp.webp',
    alt: 'Celebrity Crush movie poster - Produced by Tel K. Ganesan',
    href: '/film-culture',
    imdbUrl: 'https://www.imdb.com/title/tt9140410/',
    officialUrl: 'https://kyybafilms.com/',
  },
]
