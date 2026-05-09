/** @type {import('next-pwa').RuntimeCaching[]} */
const runtimeCaching = [
  {
    urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-fonts-webfonts',
      expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
    },
  },
  {
    urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'google-fonts-stylesheets',
      expiration: { maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 },
    },
  },
  {
    urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-images',
      expiration: { maxEntries: 96, maxAgeSeconds: 30 * 24 * 60 * 60 },
    },
  },
  {
    urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/.*/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'supabase-storage-assets',
      expiration: { maxEntries: 96, maxAgeSeconds: 24 * 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    urlPattern: ({ url, request }) =>
      request.method === 'GET' &&
      url.origin === self.location.origin &&
      url.pathname.startsWith('/api/') &&
      !url.pathname.startsWith('/api/auth/'),
    handler: 'NetworkFirst',
    options: {
      cacheName: 'eden-api-get',
      networkTimeoutSeconds: 5,
      expiration: { maxEntries: 48, maxAgeSeconds: 10 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    urlPattern: ({ request }) => request.mode === 'navigate',
    handler: 'NetworkFirst',
    options: {
      cacheName: 'eden-pages',
      networkTimeoutSeconds: 5,
      expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
]

/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline',
  },
  runtimeCaching,
})

const nextConfig = {
  experimental: {
    // App Router is stable in Next.js 14
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

module.exports = withPWA(nextConfig)
