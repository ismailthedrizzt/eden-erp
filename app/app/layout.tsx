'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { PendingActionsBell } from '@/components/layout/PendingActionsBell'
import { Building2, Check, ChevronDown, Loader2, Menu, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModuleLicenseProvider } from '@/hooks/useModuleLicense'
import { PermissionProvider } from '@/lib/security/permissionStore'
import { ModuleProvider } from '@/lib/security/moduleStore'
import { GuidedSystemTour } from '@/components/onboarding/GuidedSystemTour'
import { cacheUiPreferences, readCachedUiPreferences, syncUiPreferencesPatch } from '@/lib/user-state/client'
import { setStoredTenantId, tenantRequestHeaders } from '@/lib/tenancy/client'
import type { SessionBootstrapResponse, UiThemePreference } from '@/lib/user-state/types'

const BREADCRUMBS: Record<string, string> = {
  '/app': 'Ana Sayfa',
  '/app/ik': 'İnsan Kaynakları',
  '/app/ik/teskilat': 'İnsan Kaynakları › Teşkilat & Kadro',
  '/app/ik/employees': 'İnsan Kaynakları › Çalışanlarımız',
  '/app/ik/employees/ekle': 'İnsan Kaynakları › Çalışanlarımız › Çalışan Ekle',
  '/app/muhasebe': 'Muhasebe',
  '/app/muhasebe/cari-kartlar': 'Muhasebe › Cari Kartlar',
  '/app/muhasebe/on-muhasebe-hareketleri': 'Muhasebe › Ön Muhasebe Hareketleri',
  '/app/muhasebe/dashboard': 'Muhasebe › Dashboard',
  '/app/muhasebe/islemler': 'Muhasebe › İşlemler',
  '/app/muhasebe/borclar': 'Muhasebe › Borç Takip',
  '/app/muhasebe/projeler': 'Muhasebe › Proje Özeti',
  '/app/muhasebe/hesaplar': 'Muhasebe › Hesaplar',
  '/app/urun-ve-hizmetler': 'Ürün ve Hizmetler › Genel Bakış',
  '/app/urun-ve-hizmetler/urun-kartlari': 'Ürün ve Hizmetler › Ürün Kartları',
  '/app/urun-ve-hizmetler/hizmet-kartlari': 'Ürün ve Hizmetler › Hizmet Kartları',
  '/app/urun-ve-hizmetler/lisans-abonelik-urunleri': 'Ürün ve Hizmetler › Lisans / Abonelik Ürünleri',
  '/app/urun-ve-hizmetler/seri-numarali-urunler': 'Ürün ve Hizmetler › Seri Numaralı Ürünler',
  '/app/urun-ve-hizmetler/garanti-sablonlari': 'Ürün ve Hizmetler › Garanti Şablonları',
  '/app/urun-ve-hizmetler/bakim-paketleri': 'Ürün ve Hizmetler › Bakım Paketleri',
  '/app/satis-sonrasi': 'Satış Sonrası Hizmetler › Genel Bakış',
  '/app/satis-sonrasi/garanti-takip': 'Satış Sonrası Hizmetler › Garanti Takip',
  '/app/satis-sonrasi/lisans-takip': 'Satış Sonrası Hizmetler › Lisans Takip',
  '/app/satis-sonrasi/servis-destek-kayitlari': 'Satış Sonrası Hizmetler › Servis ve Destek Kayıtları',
  '/app/satis-sonrasi/bakim-sozlesme-takip': 'Satış Sonrası Hizmetler › Bakım ve Sözleşme Takip',
  '/app/satis-sonrasi/musterideki-urunler': 'Satış Sonrası Hizmetler › Müşterideki Ürünler',
  '/app/gorev-ve-proje-yonetimi': 'Görev ve Proje Yönetimi › Genel Bakış',
  '/app/gorev-ve-proje-yonetimi/gorevler': 'Görev ve Proje Yönetimi › Görevler',
  '/app/gorev-ve-proje-yonetimi/projeler': 'Görev ve Proje Yönetimi › Projeler',
  '/app/gorev-ve-proje-yonetimi/kanban-board': 'Görev ve Proje Yönetimi › Kanban Board',
  '/app/gorev-ve-proje-yonetimi/backlog': 'Görev ve Proje Yönetimi › Backlog',
  '/app/gorev-ve-proje-yonetimi/sprintler': 'Görev ve Proje Yönetimi › Sprintler',
  '/app/gorev-ve-proje-yonetimi/takvim': 'Görev ve Proje Yönetimi › Takvim',
  '/app/gorev-ve-proje-yonetimi/zaman-takibi': 'Görev ve Proje Yönetimi › Zaman Takibi',
  '/app/gorev-ve-proje-yonetimi/is-akislari': 'Görev ve Proje Yönetimi › İş Akışları',
  '/app/gorev-ve-proje-yonetimi/raporlar': 'Görev ve Proje Yönetimi › Raporlar',
  '/app/sistem/module-licenses': 'Sistem Yönetimi › Modül Lisansları',
  '/app/sistem/system-parameters': 'Sistem Yönetimi › Sistem Parametreleri',
  '/app/sistem/kullanici-talepleri': 'Sistem Yönetimi › Kullanıcı Kayıt Talepleri',
}

type TenantWorkspaceOption = {
  id: string
  name: string
  logoUrl?: string | null
  role_key?: string | null
  role_label?: string | null
  is_default?: boolean
  is_current?: boolean
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const forceTourToken = searchParams.get('tour') === '1' ? searchParams.toString() : ''
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [workspaceName, setWorkspaceName] = useState('Çalışma Alanı')
  const [workspaceLogoUrl, setWorkspaceLogoUrl] = useState<string | null>(null)
  const [workspaceLogoFailed, setWorkspaceLogoFailed] = useState(false)
  const [workspaceOptions, setWorkspaceOptions] = useState<TenantWorkspaceOption[]>([])
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const [workspaceSwitchError, setWorkspaceSwitchError] = useState<string | null>(null)
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState<string | null>(null)
  const [tourOpen, setTourOpen] = useState(false)
  const [tourShouldOpen, setTourShouldOpen] = useState(false)
  const [tourInitialStep, setTourInitialStep] = useState<string | null>(null)
  const [tourClosedThisSession, setTourClosedThisSession] = useState(false)
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const cachedPreferences = readCachedUiPreferences()
    setDark(applyThemePreference(cachedPreferences.theme))
    setCollapsed(Boolean(cachedPreferences.sidebarCollapsed))

    const forceTour = new URLSearchParams(window.location.search).get('tour') === '1'
      || window.localStorage.getItem('eden.forceSystemTour') === 'true'
    if (forceTour) {
      window.localStorage.removeItem('eden.forceSystemTour')
      setTourInitialStep(null)
      setTourShouldOpen(true)
      setTourClosedThisSession(false)
    }

    let cancelled = false

    fetch('/api/session/bootstrap', {
      cache: 'no-store',
      headers: tenantRequestHeaders(),
    })
      .then(async response => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || 'Oturum hazirligi tamamlanamadi.')
        return payload as SessionBootstrapResponse
      })
      .then(payload => {
        if (cancelled) return
        setWorkspaceId(payload.workspace?.id || null)
        setWorkspaceName(payload.workspace?.name || 'Çalışma Alanı')
        setWorkspaceLogoUrl(payload.workspace?.logoUrl || null)
        setWorkspaceLogoFailed(false)
        cacheUiPreferences(payload.userState.uiPreferences)
        setDark(applyThemePreference(payload.userState.uiPreferences.theme))
        setCollapsed(Boolean(payload.userState.uiPreferences.sidebarCollapsed))
        setTourInitialStep(payload.userState.introCurrentStep)
        setTourShouldOpen(forceTour || Boolean(payload.userState.shouldShowSystemTour))
      })
      .catch(() => {
        // Ana ekran, tanitim veya tercih hazirligi aksasa da acilmaya devam eder.
      })

    fetch('/api/tenants/options', {
      cache: 'no-store',
      headers: tenantRequestHeaders(),
    })
      .then(async response => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || 'Calisma alanlari yuklenemedi.')
        return payload.data as TenantWorkspaceOption[]
      })
      .then(options => {
        if (cancelled) return
        const rows = Array.isArray(options) ? options : []
        setWorkspaceOptions(rows)

        const current = rows.find(option => option.is_current)
        if (current) {
          setWorkspaceId(current.id)
          setWorkspaceName(current.name || 'Calisma Alani')
          setWorkspaceLogoUrl(current.logoUrl || null)
          setWorkspaceLogoFailed(false)
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!workspaceMenuOpen) return

    function closeOnOutsideClick(event: MouseEvent) {
      if (!workspaceMenuRef.current?.contains(event.target as Node)) {
        setWorkspaceMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [workspaceMenuOpen])

  useEffect(() => {
    if (tourShouldOpen && !tourClosedThisSession && pathname === '/app') {
      setTourOpen(true)
    }
  }, [pathname, tourClosedThisSession, tourShouldOpen])

  useEffect(() => {
    if (!forceTourToken) return

    setTourInitialStep(null)
    setTourClosedThisSession(false)
    setTourShouldOpen(true)
    setTourOpen(false)

    const timer = window.setTimeout(() => setTourOpen(true), 0)
    return () => window.clearTimeout(timer)
  }, [forceTourToken])

  useEffect(() => {
    if (tourOpen && collapsed) setCollapsed(false)
  }, [collapsed, tourOpen])

  function toggleTheme() {
    const nextTheme: UiThemePreference = dark ? 'light' : 'dark'
    setDark(applyThemePreference(nextTheme))
    localStorage.setItem('theme', nextTheme)
    syncUiPreferencesPatch({ theme: nextTheme }).catch(() => undefined)
  }

  function toggleSidebar() {
    setCollapsed(previous => {
      const next = !previous
      syncUiPreferencesPatch({ sidebarCollapsed: next }).catch(() => undefined)
      return next
    })
  }

  async function switchWorkspace(option: TenantWorkspaceOption) {
    if (option.id === workspaceId || option.is_current) {
      setWorkspaceMenuOpen(false)
      return
    }

    setWorkspaceSwitchError(null)
    setSwitchingWorkspaceId(option.id)

    try {
      const response = await fetch('/api/tenants/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...tenantRequestHeaders(),
        },
        body: JSON.stringify({ tenant_id: option.id }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Calisma alani degistirilemedi.')

      setStoredTenantId(option.id)
      window.location.reload()
    } catch (error) {
      setWorkspaceSwitchError(error instanceof Error ? error.message : 'Calisma alani degistirilemedi.')
      setSwitchingWorkspaceId(null)
    }
  }

  const breadcrumb = BREADCRUMBS[pathname] ?? 'Eden ERP'
  const breadcrumbParts = breadcrumb.includes('›') ? breadcrumb.split('›') : breadcrumb.split('›')
  const isPublicSetupRoute = pathname.startsWith('/app/sistem/kurulum')

  if (isPublicSetupRoute) {
    return (
      <div className={cn('min-h-screen overflow-y-auto bg-gray-50 p-5 dark:bg-[#09141e]', dark && 'dark')}>
        {children}
      </div>
    )
  }

  return (
    <ModuleLicenseProvider>
      <ModuleProvider>
        <PermissionProvider>
          <div className={cn('flex h-screen overflow-hidden', dark && 'dark')}>
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
              <Sidebar
                collapsed={collapsed}
                mobileOpen={false}
                onMobileClose={() => {}}
                onExpand={() => {
                  setCollapsed(false)
                  syncUiPreferencesPatch({ sidebarCollapsed: false }).catch(() => undefined)
                }}
              />
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
          <header
            data-tour-id="app-header"
            className="h-14 bg-white dark:bg-eden-navy-2 border-b border-gray-200 dark:border-eden-navy
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
                onClick={toggleSidebar}
                className="hidden lg:flex w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 items-center justify-center
                           text-gray-500 hover:bg-gray-50 dark:hover:bg-eden-navy transition-colors"
              >
                <Menu size={15} />
              </button>
              <div ref={workspaceMenuRef} data-tour-id="workspace-switcher" className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setWorkspaceMenuOpen(open => !open)}
                  className="flex min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-eden-navy-2 dark:text-gray-200 dark:hover:bg-eden-navy"
                  title={workspaceName}
                >
                  {workspaceLogoUrl && !workspaceLogoFailed ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-eden-navy">
                      <img
                        src={workspaceLogoUrl}
                        alt=""
                        className="h-full w-full object-contain"
                        onError={() => setWorkspaceLogoFailed(true)}
                      />
                    </span>
                  ) : (
                    <Building2 size={14} className="shrink-0 text-eden-green" />
                  )}
                  <span className="max-w-36 truncate">{workspaceName}</span>
                  <ChevronDown size={13} className={cn('shrink-0 text-gray-400 transition-transform', workspaceMenuOpen && 'rotate-180')} />
                </button>

                {workspaceMenuOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-eden-navy-2">
                    <div className="max-h-80 overflow-y-auto py-1">
                      {workspaceOptions.length ? workspaceOptions.map(option => {
                        const isCurrent = option.id === workspaceId || option.is_current
                        const isSwitching = switchingWorkspaceId === option.id

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => switchWorkspace(option)}
                            disabled={Boolean(switchingWorkspaceId)}
                            className={cn(
                              'flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-70 dark:hover:bg-eden-navy',
                              isCurrent && 'bg-gray-50 dark:bg-eden-navy'
                            )}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white text-eden-green dark:border-gray-700 dark:bg-eden-navy">
                              {option.logoUrl ? (
                                <img src={option.logoUrl} alt="" className="h-full w-full object-contain" />
                              ) : (
                                <Building2 size={16} />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-semibold text-gray-800 dark:text-gray-100">{option.name}</span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                                {option.role_label && <span>{option.role_label}</span>}
                                {option.is_default && <span>Varsayilan</span>}
                              </span>
                            </span>
                            {isSwitching ? (
                              <Loader2 size={15} className="shrink-0 animate-spin text-gray-400" />
                            ) : isCurrent ? (
                              <Check size={15} className="shrink-0 text-eden-green" />
                            ) : null}
                          </button>
                        )
                      }) : (
                        <div className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">Erisilebilir baska calisma alani yok.</div>
                      )}
                    </div>
                    {workspaceSwitchError && (
                      <div className="border-t border-gray-200 px-3 py-2 text-xs text-red-600 dark:border-gray-700 dark:text-red-300">
                        {workspaceSwitchError}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                Eden ERP ›{' '}
                <span className="text-gray-700 dark:text-gray-200 font-medium">
                  {breadcrumbParts.length > 1 ? breadcrumbParts.pop()?.trim() : breadcrumb}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PendingActionsBell />
              <div data-tour-id="user-settings" className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                data-tour-id="theme-toggle"
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center
                           text-gray-500 hover:bg-gray-50 dark:hover:bg-eden-navy transition-colors"
                title="Tema"
              >
                {dark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              {/* User Profile */}
              <div data-tour-id="header-user-info" className="flex items-center gap-2.5">
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
            </div>
          </header>

          {/* Content */}
          <main data-tour-id="page-template" className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#09141e] p-5">
            {children}
          </main>
            </div>
            <GuidedSystemTour
              open={tourOpen}
              initialStepId={tourInitialStep}
              onOpenChange={(nextOpen) => {
                setTourOpen(nextOpen)
                if (!nextOpen) setTourClosedThisSession(true)
              }}
            />
          </div>
        </PermissionProvider>
      </ModuleProvider>
    </ModuleLicenseProvider>
  )
}

function applyThemePreference(theme: UiThemePreference) {
  const prefersDark = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  const shouldUseDark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', shouldUseDark)
  return shouldUseDark
}

