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
      url.origin === self.location.origin &&
      url.pathname.startsWith('/api/'),
    handler: 'NetworkOnly',
    options: {
      cacheName: 'eden-api-network-only',
    },
  },
  {
    urlPattern: ({ request }) => request.mode === 'navigate',
    handler: 'NetworkOnly',
    options: {
      cacheName: 'eden-navigation-network-only',
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
  serverExternalPackages: ['@napi-rs/canvas'],
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://0.0.0.0:3000',
    'https://app1.edengrup.com',
  ],
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
