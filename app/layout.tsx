import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PWAStatus } from '@/components/pwa/PWAStatus'
import { APP_CACHE_VERSION, APP_CACHE_VERSION_KEY } from '@/lib/pwa/cacheVersion'

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

const cacheMaintenanceScript = `
(() => {
  try {
    const version = ${JSON.stringify(APP_CACHE_VERSION)};
    const key = ${JSON.stringify(APP_CACHE_VERSION_KEY)};
    const reloadKey = 'eden-sw-cache-refresh';
    const current = localStorage.getItem(key);
    if (!version || current === version) return;
    localStorage.setItem(key, version);
    if (!current) return;

    const jobs = [];
    if ('caches' in window) {
      jobs.push(caches.keys().then(keys => Promise.all(keys.map(cacheKey => caches.delete(cacheKey)))));
    }
    if ('serviceWorker' in navigator) {
      jobs.push(navigator.serviceWorker.getRegistrations().then(registrations =>
        Promise.all(registrations.map(registration => registration.update().catch(() => undefined)))
      ));
    }

    Promise.all(jobs).finally(() => {
      if (sessionStorage.getItem(reloadKey) === version) return;
      sessionStorage.setItem(reloadKey, version);
      window.location.reload();
    });
  } catch {}
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
        <script dangerouslySetInnerHTML={{ __html: cacheMaintenanceScript }} />
      </head>
      <body suppressHydrationWarning className="h-full bg-gray-50 dark:bg-[#09141e]">
        {children}
        <PWAStatus />
      </body>
    </html>
  )
}
