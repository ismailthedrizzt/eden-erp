import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Eden Teknoloji ERP',
  description: 'Eden Teknoloji Kurumsal Kaynak Planlama Sistemi',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#1e3a5f',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body suppressHydrationWarning className="h-full bg-gray-50 dark:bg-[#09141e]">
        {children}
      </body>
    </html>
  )
}
