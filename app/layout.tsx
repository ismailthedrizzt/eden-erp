import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PWAStatus } from '@/components/pwa/PWAStatus'
import { APP_CACHE_VERSION, APP_CACHE_VERSION_KEY } from '@/lib/pwa/cacheVersion'

const themeInitScript = `
(() => {
  const authRoutePattern = /^\\/(login|register|kaydol|forgot-password|auth)(\\/|$)/;
  const isAuthRoute = authRoutePattern.test(window.location.pathname || '');
  if (isAuthRoute) {
    document.documentElement.classList.remove('dark');
    delete document.documentElement.dataset.appearanceMode;
    delete document.documentElement.dataset.appearance;
    delete document.documentElement.dataset.visualTheme;
    delete document.documentElement.dataset.edenTheme;
    document.documentElement.dataset.authSurface = 'true';
    return;
  }

  try {
    delete document.documentElement.dataset.authSurface;
    const raw = localStorage.getItem('eden.uiPreferences');
    const preferences = raw ? JSON.parse(raw) : {};
    const legacyTheme = localStorage.getItem('theme');
    const theme = preferences.appearanceMode || preferences.theme || legacyTheme || 'system';
    const visualTheme = preferences.visualTheme
      || localStorage.getItem('eden.visualTheme')
      || localStorage.getItem('eden.designLab.activeTheme')
      || 'hikmet';
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = theme === 'dark' || (theme === 'system' && prefersDark);
    const visualThemeAliases = {
      classicCurrent: 'hikmet',
      executivePremium: 'atlas',
      executive_premium: 'atlas',
      art_deco: 'atlas',
      art_deco_premium: 'atlas',
      anatolianModern: 'bozkir',
      anatolian_modern: 'bozkir',
      anatolian_60s: 'bozkir',
      technicalCommand: 'avangard',
      technical_command: 'avangard',
      command: 'avangard',
      command_bauhaus: 'avangard',
      green_atelier: 'tabiat',
      yesil_atolye: 'tabiat',
      pop_studio: 'avangard',
    };
    const normalizedVisualTheme = visualThemeAliases[visualTheme] || visualTheme;
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dataset.appearanceMode = dark ? 'dark' : 'light';
    document.documentElement.dataset.appearance = dark ? 'dark' : 'light';
    document.documentElement.dataset.visualTheme = normalizedVisualTheme;
    document.documentElement.dataset.edenTheme = normalizedVisualTheme;
  } catch {
    document.documentElement.classList.remove('dark');
    delete document.documentElement.dataset.appearanceMode;
    delete document.documentElement.dataset.appearance;
    delete document.documentElement.dataset.visualTheme;
    delete document.documentElement.dataset.edenTheme;
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
