/** Small line icons for the admin menu (20×20, currentColor). */
const PATHS: Record<string, string> = {
  dashboard: 'M3 13h6V3H3zm0 4h6v-2H3zm8 0h6V7h-6zm0-14v2h6V3z',
  post: 'M4 3h9l3 3v11H4zM7 8h6M7 11h6M7 14h4',
  page: 'M5 2h7l4 4v12H5zM12 2v4h4',
  media: 'M3 4h14v12H3zM3 13l4-4 3 3 3-3 4 4M13 7.5a1 1 0 1 1 0 .01',
  building: 'M4 18V4h8v14M12 8h4v10M7 7h2M7 10h2M7 13h2M2 18h16',
  film: 'M3 4h14v12H3zM6 4v12M14 4v12M3 8h3M3 12h3M14 8h3M14 12h3',
  heart: 'M10 17s-6-3.6-6-8a3.5 3.5 0 0 1 6-2.4A3.5 3.5 0 0 1 16 9c0 4.4-6 8-6 8z',
  download: 'M10 3v10M6 9l4 4 4-4M4 16h12',
  leads: 'M3 4h14v4H3zM3 8l2 8h10l2-8M8 12h4',
  mail: 'M3 5h14v10H3zM3 5l7 6 7-6',
  'users-group': 'M7 9a3 3 0 1 0 0-.01M2 17c0-3 2.2-5 5-5s5 2 5 5M14 8a2.5 2.5 0 1 0 0-.01M13 12c2.6 0 5 1.6 5 4.5',
  shield: 'M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5zM7 10l2 2 4-4',
  folder: 'M2 5h6l2 2h8v9H2z',
  route: 'M4 16a2 2 0 1 0 0-.01M16 4a2 2 0 1 0 0-.01M4 14V9a3 3 0 0 1 3-3h7',
  redirect: 'M4 6h9a3 3 0 0 1 0 6H6M8 9l-3 3 3 3',
  user: 'M10 9a3.5 3.5 0 1 0 0-.01M3 18c0-3.9 3.1-6 7-6s7 2.1 7 6',
  list: 'M7 5h10M7 10h10M7 15h10M3 5h.01M3 10h.01M3 15h.01',
  send: 'M2 10l16-7-6 16-3-6zM9 13l9-10',
  settings: 'M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM10 1v3M10 16v3M1 10h3M16 10h3M3.6 3.6l2.1 2.1M14.3 14.3l2.1 2.1M3.6 16.4l2.1-2.1M14.3 5.7l2.1-2.1',
  home: 'M3 10l7-6 7 6M5 9v8h10V9',
  logout: 'M8 4H4v12h4M12 6l4 4-4 4M16 10H8',
  menu: 'M3 5h14M3 10h14M3 15h14',
  eye: 'M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6S1.5 10 1.5 10zM10 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  trash: 'M3 5h14M8 5V3h4v2M5 5l1 12h8l1-12M8.5 8.5v5M11.5 8.5v5',
}

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? PATHS.page} />
    </svg>
  )
}
