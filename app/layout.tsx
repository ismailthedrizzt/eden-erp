import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Eden Teknoloji ERP',
  description: 'Eden Teknoloji Kurumsal Kaynak Planlama Sistemi',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="h-full bg-gray-50 dark:bg-[#09141e]">
        {children}
      </body>
    </html>
  )
}
