import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PWAStatus } from '@/components/pwa/PWAStatus'

const themeInitScript = `
(() => {
  try {
    const raw = localStorage.getItem('eden.uiPreferences');
    const preferences = raw ? JSON.parse(raw) : {};
    const legacyTheme = localStorage.getItem('theme');
    const theme = preferences.theme || legacyTheme || 'system';
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && prefersDark));
  } catch {
    document.documentElement.classList.remove('dark');
  }
})();
`

export const metadata: Metadata = {
  title: 'Eden Teknoloji ERP',
  description: 'Eden Teknoloji Kurumsal Kaynak Planlama Sistemi',
  manifest: '/manifest.json',
  applicationName: 'Eden ERP',
  appleWebApp: {
    capable: true,
    title: 'Eden ERP',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#1e3a5f',
  colorScheme: 'light dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning className="h-full bg-gray-50 dark:bg-[#09141e]">
        {children}
        <PWAStatus />
      </body>
    </html>
  )
}
