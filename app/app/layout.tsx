'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { Menu, Sun, Moon, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const BREADCRUMBS: Record<string, string> = {
  '/': 'Ana Sayfa',
  '/ik/teskilat': 'İK › Teşkilat & Kadro',
  '/ik/personel': 'İK › Personel Listesi',
  '/ik/personel-ekle': 'İK › Personel Ekle',
  '/muhasebe/dashboard': 'Muhasebe › Dashboard',
  '/muhasebe/islemler': 'Muhasebe › İşlemler',
  '/muhasebe/borclar': 'Muhasebe › Borç Takip',
  '/muhasebe/projeler': 'Muhasebe › Proje Özeti',
  '/muhasebe/hesaplar': 'Muhasebe › Hesaplar',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(false)

  function toggleTheme() {
    setDark(!dark)
    document.documentElement.classList.toggle('dark', !dark)
  }

  const breadcrumb = BREADCRUMBS[pathname] ?? 'Eden ERP'

  return (
    <div className={cn('flex h-screen overflow-hidden', dark && 'dark')}>
      <Sidebar collapsed={collapsed} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white dark:bg-eden-navy-2 border-b border-gray-200 dark:border-eden-navy
                           px-5 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center
                         text-gray-500 hover:bg-gray-50 dark:hover:bg-eden-navy transition-colors"
            >
              <Menu size={15} />
            </button>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Eden ERP ›{' '}
              <span className="text-gray-700 dark:text-gray-200 font-medium">
                {breadcrumb.includes('›') ? breadcrumb.split('›').pop()?.trim() : breadcrumb}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center
                         text-gray-500 hover:bg-gray-50 dark:hover:bg-eden-navy transition-colors"
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button className="btn btn-primary text-xs flex items-center gap-1.5 h-8 px-3">
              <Plus size={14} />
              Yeni İşlem
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#09141e] p-5">
          {children}
        </main>
      </div>
    </div>
  )
}
