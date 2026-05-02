'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { Menu, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModuleLicenseProvider } from '@/hooks/useModuleLicense'

const BREADCRUMBS: Record<string, string> = {
  '/app': 'Ana Sayfa',
  '/app/ik': 'İnsan Kaynakları',
  '/app/ik/teskilat': 'İnsan Kaynakları › Teşkilat & Kadro',
  '/app/ik/personel': 'İnsan Kaynakları › Çalışanlarımız',
  '/app/ik/personel/ekle': 'İnsan Kaynakları › Çalışanlarımız › Çalışan Ekle',
  '/app/muhasebe/dashboard': 'Muhasebe › Dashboard',
  '/app/muhasebe/islemler': 'Muhasebe › İşlemler',
  '/app/muhasebe/borclar': 'Muhasebe › Borç Takip',
  '/app/muhasebe/projeler': 'Muhasebe › Proje Özeti',
  '/app/muhasebe/hesaplar': 'Muhasebe › Hesaplar',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark'
    }
    return false
  })

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setDark(savedTheme === 'dark')
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    }
  }, [])

  function toggleTheme() {
    const newDark = !dark
    setDark(newDark)
    document.documentElement.classList.toggle('dark', newDark)
    localStorage.setItem('theme', newDark ? 'dark' : 'light')
  }

  const breadcrumb = BREADCRUMBS[pathname] ?? 'Eden ERP'

  return (
    <ModuleLicenseProvider>
      <div className={cn('flex h-screen overflow-hidden', dark && 'dark')}>
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar collapsed={collapsed} mobileOpen={false} onMobileClose={() => {}} />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Mobile Sidebar */}
            <div className="fixed left-0 top-0 h-full z-50 lg:hidden">
              <Sidebar collapsed={false} mobileOpen={true} onMobileClose={() => setMobileMenuOpen(false)} />
            </div>
          </>
        )}

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Topbar */}
          <header className="h-14 bg-white dark:bg-eden-navy-2 border-b border-gray-200 dark:border-eden-navy
                             px-3 sm:px-5 flex items-center justify-between flex-shrink-0 z-10">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center
                           text-gray-500 hover:bg-gray-50 dark:hover:bg-eden-navy transition-colors"
              >
                <Menu size={18} />
              </button>
              {/* Desktop Toggle */}
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 items-center justify-center
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
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center
                           text-gray-500 hover:bg-gray-50 dark:hover:bg-eden-navy transition-colors"
              >
                {dark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              {/* User Profile */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-eden-blue flex items-center justify-center
                                text-[10px] font-bold text-white">
                  İİ
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">İsmail ILGAR</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Yönetici</div>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#09141e] p-5">
            {children}
          </main>
        </div>
      </div>
    </ModuleLicenseProvider>
  )
}
