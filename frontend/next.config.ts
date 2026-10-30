import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

/** The Express API in ../backend. Server-side only; browsers reach it through the rewrites below. */
const BACKEND_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '')

const nextConfig: NextConfig = {
  // Public backend endpoints keep the URLs they had when the CMS ran inside this app, so media
  // links stored in content (/api/assets/file/...) and monitors (/api/health) keep working.
  // The internal API (/api/internal/*) is deliberately NOT exposed.
  async rewrites() {
    return [
      { source: '/api/assets/file/:filename', destination: `${BACKEND_URL}/api/assets/file/:filename` },
      { source: '/api/health', destination: `${BACKEND_URL}/api/health` },
      { source: '/api/cron/:path*', destination: `${BACKEND_URL}/api/cron/:path*` },
      // Admin panel API (staff session cookie, same-origin only).
      { source: '/api/admin/:path*', destination: `${BACKEND_URL}/api/admin/:path*` },
    ]
  },
  // Lets an unknown URL show the site's own 404 (with navigation) instead of Next's bare default.
  experimental: { globalNotFound: true },
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 80, 85, 90, 92],
    localPatterns: [
      {
        pathname: '/api/assets/file/**',
      },
      {
        pathname: '/images/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // SAMEORIGIN (not DENY) so a future admin live preview can frame the site itself.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Report-only for now: browsers log what WOULD be blocked (see the console) without
          // breaking anything. Review the logs on staging, then switch the key to
          // 'Content-Security-Policy' to enforce it.
          {
            key: 'Content-Security-Policy-Report-Only',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://www.google-analytics.com https://*.googletagmanager.com https://*.public.blob.vercel-storage.com",
              "connect-src 'self' https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.public.blob.vercel-storage.com https://vercel.com",
              "frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default nextConfig
