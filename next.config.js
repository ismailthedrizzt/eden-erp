/** @type {import('next').NextConfig} */
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

module.exports = nextConfig