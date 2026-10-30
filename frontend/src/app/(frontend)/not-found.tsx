import Link from 'next/link'

import { PRIMARY_NAVIGATION } from '@/baseline/pages'

/**
 * 404. Offers real navigation rather than bouncing the visitor to Home - the baseline
 * explicitly forbids treating every missing URL as a redirect to Home.
 */
export default function NotFound() {
  return (
    <div className="container">
      <header className="page-header">
        <p className="page-header__eyebrow">404</p>
        <h1>That page could not be found</h1>
        <p className="section__lede">
          The address may be out of date. These are the main sections of the site.
        </p>
      </header>
      <ul className="card-grid">
        {PRIMARY_NAVIGATION.map((page) => (
          <li className="card" key={page.pageId}>
            <h2>
              <Link href={page.path}>{page.title}</Link>
            </h2>
            <p>{page.purpose}</p>
          </li>
        ))}
      </ul>
      <p>
        <Link href="/search">Search the site</Link>
      </p>
    </div>
  )
}
