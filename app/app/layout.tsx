'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { DemoModeBadge } from '@/components/layout/DemoModeBadge'
import { PendingActionsBell } from '@/components/layout/PendingActionsBell'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { Bell, Building2, Check, ChevronDown, ChevronLeft, Home, LayoutDashboard, ListChecks, Loader2, Map, Menu, Monitor, Moon, MoreHorizontal, Palette, Star, Sun, User, Users, WalletCards } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DEFAULT_VISUAL_THEME_ID,
  LEGACY_DESIGN_LAB_THEME_STORAGE_KEY,
  VISUAL_THEME_CHANGE_EVENT,
  VISUAL_THEME_LABELS,
  VISUAL_THEME_STORAGE_KEY,
  findThemeConcept,
  getEdenThemeCssVars,
  normalizeThemeConceptId,
  themeConcepts,
  type ThemeConceptId,
} from '@/components/design-lab/themeConcepts'
import { ModuleLicenseProvider } from '@/hooks/useModuleLicense'
import { PermissionProvider } from '@/lib/security/permissionStore'
import { ModuleProvider, type ClientModuleRuntime } from '@/lib/security/moduleStore'
import { GuidedSystemTour } from '@/components/onboarding/GuidedSystemTour'
import { ActionGuideProvider } from '@/components/ai/ActionGuideContext'
import { ActionGuideSearch } from '@/components/ai/ActionGuideSearch'
import { CopilotPanel } from '@/components/ai/CopilotPanel'
import { cacheUiPreferences, readCachedUiPreferences, syncUiPreferencesPatch } from '@/lib/user-state/client'
import { setStoredTenantId, tenantRequestHeaders } from '@/lib/tenancy/client'
import { apiClient } from '@/lib/api/apiClient'
import { getCurrentReleaseEnvironment } from '@/lib/release/environment'
import { canShowRouteInNavigation } from '@/lib/release/releaseVisibility'
import type { SessionBootstrapResponse, UiAppearancePreference } from '@/lib/user-state/types'

const THEME_TRANSITION_SUPPRESS_MS = 120

const APPEARANCE_LABELS: Record<UiAppearancePreference, string> = {
  system: 'Sistem',
  light: 'Aydinlik',
  dark: 'Karanlik',
}

const APPEARANCE_OPTIONS = [
  {
    id: 'system' as const,
    label: APPEARANCE_LABELS.system,
    description: 'Cihaz ayarini izler',
    icon: Monitor,
  },
  {
    id: 'light' as const,
    label: APPEARANCE_LABELS.light,
    description: 'Aydinlik arayuz',
    icon: Sun,
  },
  {
    id: 'dark' as const,
    label: APPEARANCE_LABELS.dark,
    description: 'Karanlik arayuz',
    icon: Moon,
  },
]

const BREADCRUMBS: Record<string, string> = {
  '/app': 'Ana Sayfa',
  '/app/yardim': 'Yardim Merkezi',
  '/app/ik': 'İnsan Kaynakları',
  '/app/ik/teskilat': 'İnsan Kaynakları › Teşkilat & Kadro',
  '/app/ik/calisanlar': 'İnsan Kaynakları › Çalışanlar',
  '/app/ik/employees': 'İnsan Kaynakları › Çalışanlarımız',
  '/app/ik/employees/ekle': 'İnsan Kaynakları › Çalışanlarımız › Çalışan Ekle',
  '/app/muhasebe': 'Muhasebe',
  '/app/muhasebe/cari-kartlar': 'Muhasebe › Cari Kartlar',
  '/app/muhasebe/cari-hareketler': 'Muhasebe › Cari Hareketler',
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
  '/app/satis/sozlesmeler': 'Satış › Sözleşme Yönetimi',
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
  '/app/sistem/e-postalar': 'Sistem Yönetimi › Sistem E-postaları',
  '/app/ayarlar/bildirimler': 'Bildirimler › Bildirim Ayarları',
  '/app/sistem': 'Sistem Yonetimi > Admin Console',
  '/app/sistem/genel': 'Sistem Yonetimi > Genel Ayarlar',
  '/app/sistem/moduller': 'Sistem Yonetimi > Moduller',
  '/app/sistem/ozellikler': 'Sistem Yonetimi > Ozellikler',
  '/app/sistem/saglik': 'Sistem Yonetimi > Sistem Sagligi',
  '/app/sistem/outbox': 'Sistem Yonetimi > Outbox',
  '/app/sistem/entegrasyonlar': 'Sistem Yonetimi > Entegrasyonlar',
  '/app/sistem/teknik': 'Sistem Yonetimi > Teknik',
  '/app/design-lab': 'Sistem Yonetimi > Tasarim Laboratuvari',
  '/app/sistem/ai-copilot': 'Sistem Yonetimi > AI Copilot',
  '/app/sirket/companies': 'Şirket Yönetimi › Şirketlerimiz',
  '/app/sirket/companies/partners': 'Şirket Yönetimi › Ortaklarımız',
  '/app/sirket/companies/representatives': 'Şirket Yönetimi › Temsilcilerimiz',
  '/app/sirket/companies/branches': 'Şirket Yönetimi › Şubelerimiz',
  '/app/sirket/companies/stakeholders': 'Şirket Yönetimi › Paydaşlarımız',
}

type TenantWorkspaceOption = {
  id: string
  name: string
  logoUrl?: string | null
  lightLogoUrl?: string | null
  darkLogoUrl?: string | null
  role_key?: string | null
  role_label?: string | null
  is_default?: boolean
  is_current?: boolean
}

type ThemedLogoSource = {
  logoUrl?: string | null
  lightLogoUrl?: string | null
  darkLogoUrl?: string | null
}

type CurrentUserProfile = {
  id?: string | null
  displayName?: string | null
  roleKey?: string | null
  roleLabel?: string | null
  avatarUrl?: string | null
  email?: string | null
  phone?: string | null
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-[#09141e]" />}>
      <AppLayoutShell>{children}</AppLayoutShell>
    </Suspense>
  )
}

function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const forceTourToken = searchParams.get('tour') === '1' ? searchParams.toString() : ''
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [appearanceMode, setAppearanceMode] = useState<UiAppearancePreference>('system')
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [workspaceName, setWorkspaceName] = useState('Çalışma Alanı')
  const [workspaceLogo, setWorkspaceLogo] = useState<ThemedLogoSource>({})
  const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserProfile | null>(null)
  const [workspaceLogoFailed, setWorkspaceLogoFailed] = useState(false)
  const [workspaceOptions, setWorkspaceOptions] = useState<TenantWorkspaceOption[]>([])
  const [bootstrapModules, setBootstrapModules] = useState<ClientModuleRuntime[]>([])
  const [sessionBootstrapLoading, setSessionBootstrapLoading] = useState(true)
  const [workspaceOptionsLoading, setWorkspaceOptionsLoading] = useState(true)
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const [workspaceSwitchError, setWorkspaceSwitchError] = useState<string | null>(null)
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState<string | null>(null)
  const [defaultingWorkspaceId, setDefaultingWorkspaceId] = useState<string | null>(null)
  const [tourOpen, setTourOpen] = useState(false)
  const [tourShouldOpen, setTourShouldOpen] = useState(false)
  const [tourInitialStep, setTourInitialStep] = useState<string | null>(null)
  const [tourClosedThisSession, setTourClosedThisSession] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null)
  const [visualThemeId, setVisualThemeId] = useState<ThemeConceptId>(DEFAULT_VISUAL_THEME_ID)

  useEffect(() => {
    setIsOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false)

    function updateNetworkState() {
      setIsOffline(!navigator.onLine)
    }

    window.addEventListener('online', updateNetworkState)
    window.addEventListener('offline', updateNetworkState)

    const cachedPreferences = readCachedUiPreferences()
    const cachedAppearance = cachedPreferences.appearanceMode || cachedPreferences.theme || 'system'
    setAppearanceMode(cachedAppearance)
    setDark(applyAppearancePreference(cachedAppearance))
    setVisualThemeId(normalizeThemeConceptId(cachedPreferences.visualTheme) || DEFAULT_VISUAL_THEME_ID)
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

    fetch('/api/auth/me', {
      cache: 'no-store',
      headers: tenantRequestHeaders(),
    })
      .then(async response => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || 'Kullanici profili yuklenemedi.')
        return (payload.data || payload) as CurrentUserProfile
      })
      .then(profile => {
        if (cancelled || !profile) return
        setCurrentUserProfile({
          id: profile.id || null,
          displayName: profile.displayName || null,
          roleKey: profile.roleKey || null,
          roleLabel: profile.roleLabel || null,
          avatarUrl: profile.avatarUrl || null,
          email: profile.email || null,
          phone: profile.phone || null,
        })
      })
      .catch(() => undefined)

    fetch('/api/user/preferences', {
      cache: 'no-store',
      headers: tenantRequestHeaders(),
    })
      .then(async response => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || 'Kullanici tercihleri yuklenemedi.')
        return payload.data?.uiPreferences || payload.uiPreferences
      })
      .then(preferences => {
        if (cancelled || !preferences) return
        const nextPreferences = cacheUiPreferences(preferences)
        const nextAppearance = nextPreferences.appearanceMode || nextPreferences.theme || 'system'
        setAppearanceMode(nextAppearance)
        setDark(applyAppearancePreference(nextAppearance))
        setVisualThemeId(normalizeThemeConceptId(nextPreferences.visualTheme) || DEFAULT_VISUAL_THEME_ID)
        setCollapsed(Boolean(nextPreferences.sidebarCollapsed))
      })
      .catch(() => undefined)

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
        setWorkspaceLogo(payload.workspace || {})
        setWorkspaceLogoFailed(false)
        setBootstrapModules((payload.modules || []) as ClientModuleRuntime[])
        if (payload.workspace?.id) setStoredTenantId(payload.workspace.id)
        cacheUiPreferences(payload.userState.uiPreferences)
        const nextAppearance = payload.userState.uiPreferences.appearanceMode || payload.userState.uiPreferences.theme || 'system'
        setAppearanceMode(nextAppearance)
        setDark(applyAppearancePreference(nextAppearance))
        setVisualThemeId(normalizeThemeConceptId(payload.userState.uiPreferences.visualTheme) || DEFAULT_VISUAL_THEME_ID)
        setCollapsed(Boolean(payload.userState.uiPreferences.sidebarCollapsed))
        setTourInitialStep(payload.userState.introCurrentStep)
        setTourShouldOpen(forceTour || Boolean(payload.userState.shouldShowSystemTour))
      })
      .catch(() => {
        // Ana ekran, tanitim veya tercih hazirligi aksasa da acilmaya devam eder.
      })
      .finally(() => {
        if (!cancelled) setSessionBootstrapLoading(false)
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
          setWorkspaceLogo(current)
          setWorkspaceLogoFailed(false)
          setStoredTenantId(current.id)
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setWorkspaceOptionsLoading(false)
      })

    return () => {
      cancelled = true
      window.removeEventListener('online', updateNetworkState)
      window.removeEventListener('offline', updateNetworkState)
    }
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

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

  const workspacesLoading = sessionBootstrapLoading || workspaceOptionsLoading

  useEffect(() => {
    if (!workspacesLoading && tourShouldOpen && !tourClosedThisSession && pathname.startsWith('/app')) {
      setTourOpen(true)
    }
  }, [pathname, tourClosedThisSession, tourShouldOpen, workspacesLoading])

  useEffect(() => {
    if (!forceTourToken) return

    setTourInitialStep(null)
    setTourClosedThisSession(false)
    setTourShouldOpen(true)
    setTourOpen(false)

    if (workspacesLoading) return

    const timer = window.setTimeout(() => setTourOpen(true), 0)
    return () => window.clearTimeout(timer)
  }, [forceTourToken, workspacesLoading])

  useEffect(() => {
    if (tourOpen && collapsed) setCollapsed(false)
  }, [collapsed, tourOpen])

  useEffect(() => {
    const storedThemeId = normalizeThemeConceptId(
      window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY)
        || window.localStorage.getItem(LEGACY_DESIGN_LAB_THEME_STORAGE_KEY)
    )
    if (storedThemeId) setVisualThemeId(storedThemeId)

    function handleVisualThemeChange(event: Event) {
      const themeId = (event as CustomEvent<{ themeId?: unknown }>).detail?.themeId
      const normalized = normalizeThemeConceptId(themeId)
      if (normalized) setVisualThemeId(normalized)
    }

    window.addEventListener(VISUAL_THEME_CHANGE_EVENT, handleVisualThemeChange)
    return () => window.removeEventListener(VISUAL_THEME_CHANGE_EVENT, handleVisualThemeChange)
  }, [])

  useEffect(() => {
    applyVisualThemePreference(visualThemeId, dark ? 'dark' : 'light')
  }, [visualThemeId, dark])

  useEffect(() => {
    if (appearanceMode !== 'system') return

    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mediaQuery) return

    const handleSystemAppearanceChange = () => {
      setDark(applyAppearancePreference('system'))
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemAppearanceChange)
      return () => mediaQuery.removeEventListener('change', handleSystemAppearanceChange)
    }

    mediaQuery.addListener(handleSystemAppearanceChange)
    return () => mediaQuery.removeListener(handleSystemAppearanceChange)
  }, [appearanceMode])

  useEffect(() => {
    if (searchParams.get('open') !== 'action-center') return
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('eden:open-action-center'))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [searchParams])

  function changeAppearanceMode(nextAppearance: UiAppearancePreference) {
    setAppearanceMode(nextAppearance)
    setDark(applyAppearancePreference(nextAppearance))
    syncUiPreferencesPatch({ appearanceMode: nextAppearance }).catch(() => undefined)
  }

  function changeVisualTheme(themeId: ThemeConceptId) {
    setVisualThemeId(themeId)
    applyVisualThemePreference(themeId, dark ? 'dark' : 'light')
    syncUiPreferencesPatch({ visualTheme: themeId }).catch(() => undefined)
    window.dispatchEvent(new CustomEvent(VISUAL_THEME_CHANGE_EVENT, {
      detail: { themeId },
    }))
  }

  function startSystemTour() {
    setTourInitialStep(null)
    setTourClosedThisSession(false)
    setTourShouldOpen(true)
    setTourOpen(false)
    window.setTimeout(() => setTourOpen(true), 0)
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

      const workspace = payload.data?.workspace || option
      setStoredTenantId(option.id)
      setWorkspaceId(option.id)
      setWorkspaceName(workspace.name || option.name || 'Calisma Alani')
      setWorkspaceLogo(workspace)
      setWorkspaceLogoFailed(false)
      setWorkspaceOptions(previous => previous.map(row => row.id === option.id
        ? {
            ...row,
            name: workspace.name || row.name,
            logoUrl: workspace.logoUrl ?? row.logoUrl,
            lightLogoUrl: workspace.lightLogoUrl ?? row.lightLogoUrl,
            darkLogoUrl: workspace.darkLogoUrl ?? row.darkLogoUrl,
            is_current: true,
          }
        : { ...row, is_current: false }
      ))
      setWorkspaceMenuOpen(false)
      apiClient.invalidate()

      try {
        const bootstrapResponse = await fetch('/api/session/bootstrap', {
          cache: 'no-store',
          headers: tenantRequestHeaders(option.id),
        })
        const bootstrapPayload = await bootstrapResponse.json().catch(() => ({}))
        if (bootstrapResponse.ok) {
          const nextBootstrap = bootstrapPayload as SessionBootstrapResponse
          setBootstrapModules((nextBootstrap.modules || []) as ClientModuleRuntime[])
          cacheUiPreferences(nextBootstrap.userState.uiPreferences)
          const nextAppearance = nextBootstrap.userState.uiPreferences.appearanceMode || nextBootstrap.userState.uiPreferences.theme || 'system'
          setAppearanceMode(nextAppearance)
          setDark(applyAppearancePreference(nextAppearance))
          setVisualThemeId(normalizeThemeConceptId(nextBootstrap.userState.uiPreferences.visualTheme) || DEFAULT_VISUAL_THEME_ID)
          setCollapsed(Boolean(nextBootstrap.userState.uiPreferences.sidebarCollapsed))
          setTourInitialStep(nextBootstrap.userState.introCurrentStep)
          setTourShouldOpen(Boolean(nextBootstrap.userState.shouldShowSystemTour))
        }
      } catch {
        // Calisma alani zaten degisti; bootstrap tazelemesi aksarsa sayfa refresh yeni veriyi getirir.
      }

      router.refresh()
      window.location.reload()
      return
    } catch (error) {
      setWorkspaceSwitchError(error instanceof Error ? error.message : 'Calisma alani degistirilemedi.')
      setSwitchingWorkspaceId(null)
    }
  }

  async function setDefaultWorkspace(option: TenantWorkspaceOption) {
    if (option.is_default || defaultingWorkspaceId) return

    setWorkspaceSwitchError(null)
    setDefaultingWorkspaceId(option.id)

    try {
      const response = await fetch('/api/tenants/default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...tenantRequestHeaders(),
        },
        body: JSON.stringify({ tenant_id: option.id }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Varsayilan calisma alani degistirilemedi.')

      setWorkspaceOptions(previous => previous.map(row => ({
        ...row,
        is_default: row.id === option.id,
      })))
    } catch (error) {
      setWorkspaceSwitchError(error instanceof Error ? error.message : 'Varsayilan calisma alani degistirilemedi.')
    } finally {
      setDefaultingWorkspaceId(null)
    }
  }

  const breadcrumb = BREADCRUMBS[pathname] ?? ''
  const breadcrumbParts = breadcrumb.split('›').map(part => part.trim()).filter(Boolean)
  const isPublicSetupRoute = pathname.startsWith('/app/sistem/kurulum')
  const workspaceLogoUrl = resolveThemedLogoUrl(workspaceLogo, dark)
  const currentUserDisplayName = currentUserProfile?.displayName || currentUserProfile?.email || currentUserProfile?.phone || ''
  const currentUserRoleLabel = currentUserProfile?.roleLabel || currentUserProfile?.roleKey || ''

  useEffect(() => {
    setWorkspaceLogoFailed(false)
  }, [workspaceLogoUrl])

  if (isPublicSetupRoute) {
    return (
      <ActionGuideProvider>
        <div className={cn('min-h-screen overflow-y-auto bg-gray-50 p-5 dark:bg-[#09141e]', dark && 'dark')}>
          {children}
        </div>
      </ActionGuideProvider>
    )
  }

  if (workspacesLoading) {
    return <WorkspaceLoadingScreen dark={dark} />
  }

  return (
    <ModuleLicenseProvider key={`licenses-${workspaceId || 'default'}`}>
      <ModuleProvider key={`modules-${workspaceId || 'default'}`} initialModules={bootstrapModules}>
        <PermissionProvider>
          <ActionGuideProvider>
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
                             px-3 sm:px-5 flex items-center justify-between gap-3 flex-shrink-0 z-10">
          
            <div className="flex min-w-0 items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden h-9 w-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center
                           text-gray-500 hover:bg-gray-50 dark:hover:bg-eden-navy transition-colors"
                aria-label="Mobil menuyu ac"
              >
                <Menu size={16} />
              </button>
              {/* Desktop Toggle */}
              <button
                onClick={toggleSidebar}
                className="hidden h-9 w-9 rounded-lg border border-gray-200 dark:border-gray-700 items-center justify-center lg:flex
                           text-gray-500 hover:bg-gray-50 dark:hover:bg-eden-navy transition-colors"
              >
                <Menu size={16} />
              </button>
              <DemoModeBadge />
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
                        const optionLogoUrl = resolveThemedLogoUrl(option, dark)

                        return (
                          <div
                            key={option.id}
                            className={cn(
                              'flex w-full items-center gap-2 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-eden-navy',
                              isCurrent && 'bg-gray-50 dark:bg-eden-navy'
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => switchWorkspace(option)}
                              disabled={Boolean(switchingWorkspaceId || defaultingWorkspaceId)}
                              className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left disabled:cursor-wait disabled:opacity-70"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white text-eden-green dark:border-gray-700 dark:bg-eden-navy">
                                {optionLogoUrl ? (
                                  <img src={optionLogoUrl} alt="" className="h-full w-full object-contain" />
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
                            </button>
                            {defaultingWorkspaceId === option.id ? (
                              <Loader2 size={15} className="shrink-0 animate-spin text-gray-400" />
                            ) : option.is_default ? (
                              <Star size={15} className="shrink-0 fill-eden-green text-eden-green" aria-label="Varsayilan calisma alani" />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDefaultWorkspace(option)}
                                disabled={Boolean(switchingWorkspaceId || defaultingWorkspaceId)}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-white hover:text-eden-green disabled:cursor-wait disabled:opacity-60 dark:hover:bg-eden-navy-3"
                                title="Varsayilan yap"
                                aria-label={`${option.name} varsayilan yap`}
                              >
                                <Star size={14} />
                              </button>
                            )}
                            {isSwitching ? (
                              <Loader2 size={15} className="shrink-0 animate-spin text-gray-400" />
                            ) : isCurrent ? (
                              <Check size={15} className="shrink-0 text-eden-green" />
                            ) : null}
                          </div>
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
              {!!breadcrumbParts.length && (
                <div className="hidden min-w-0 items-center gap-1 text-xs text-gray-400 dark:text-gray-500 md:flex">
                  {breadcrumbParts.map((part, index) => (
                    <span key={`${part}-${index}`} className={cn('min-w-0 truncate', index === breadcrumbParts.length - 1 && 'font-medium text-gray-700 dark:text-gray-200')}>
                      {index > 0 && <span className="mx-1 text-gray-300 dark:text-gray-600">›</span>}
                      {part}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1" />
            <div className="flex items-center gap-2 sm:gap-3">
              <PendingActionsBell />
              <button
                type="button"
                onClick={startSystemTour}
                data-tour-id="guided-tour-button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-eden-navy"
                title="Sistem turunu başlat"
                aria-label="Sistem turunu başlat"
              >
                <Map size={16} />
              </button>
              <UserProfileMenu
                profile={currentUserProfile}
                displayName={currentUserDisplayName}
                roleLabel={currentUserRoleLabel}
                activeThemeId={visualThemeId}
                appearanceMode={appearanceMode}
                activeDark={dark}
                onVisualThemeChange={changeVisualTheme}
                onAppearanceModeChange={changeAppearanceMode}
              />
            </div>
          </header>

          {isOffline && (
            <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              Internet baglantisi yok. Kayit degistiren islemler icin baglanti gereklidir.
            </div>
          )}

          {/* Content */}
          <main data-tour-id="page-template" className="flex-1 overflow-y-auto bg-gray-50 p-3 pb-24 dark:bg-[#09141e] sm:p-5 sm:pb-5">
            {children}
          </main>
          <MobileBottomNavigation pathname={pathname} onOpenMenu={() => setMobileMenuOpen(true)} />
            </div>
            <GuidedSystemTour
              open={!workspacesLoading && tourOpen}
              initialStepId={tourInitialStep}
              onOpenChange={(nextOpen) => {
                setTourOpen(nextOpen)
                if (!nextOpen) setTourClosedThisSession(true)
              }}
            />
            <ActionGuideSearch headless />
            <CopilotPanel />
          </div>
          </ActionGuideProvider>
        </PermissionProvider>
      </ModuleProvider>
    </ModuleLicenseProvider>
  )
}


function UserProfileMenu({
  profile,
  displayName,
  roleLabel,
  activeThemeId,
  appearanceMode,
  activeDark,
  onVisualThemeChange,
  onAppearanceModeChange,
}: {
  profile: CurrentUserProfile | null
  displayName: string
  roleLabel: string
  activeThemeId: ThemeConceptId
  appearanceMode: UiAppearancePreference
  activeDark: boolean
  onVisualThemeChange: (themeId: ThemeConceptId) => void
  onAppearanceModeChange: (appearanceMode: UiAppearancePreference) => void
}) {
  const [open, setOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<'theme' | 'appearance' | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeTheme = themeConcepts.find(theme => theme.id === activeThemeId)
  const activeAppearanceLabel = APPEARANCE_LABELS[appearanceMode] || APPEARANCE_LABELS.system
  const ActiveAppearanceIcon = appearanceMode === 'system' ? Monitor : activeDark ? Moon : Sun

  useEffect(() => {
    if (!open) return

    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setActivePanel(null)
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        setActivePanel(null)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div
      ref={containerRef}
      data-tour-id="user-settings"
      className="relative"
    >
      <button
        type="button"
        data-tour-id="header-user-info"
        data-avatar-loaded={profile?.avatarUrl ? 'true' : 'false'}
        onClick={() => {
          setOpen(previous => {
            const nextOpen = !previous
            if (!nextOpen) setActivePanel(null)
            return nextOpen
          })
        }}
        className="flex h-9 min-w-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-1.5 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-eden-navy-2 dark:text-gray-200 dark:hover:bg-eden-navy sm:px-2"
        title="Profil ve tercihler"
        aria-label="Profil ve tercihleri ac"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {(profile?.avatarUrl || displayName) ? (
          <UserAvatar
            name={displayName}
            photoUrl={profile?.avatarUrl}
            size="xs"
            showTooltip={false}
            className="h-7 w-7 border border-white/70 shadow-sm dark:border-gray-700"
          />
        ) : (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-gray-100 text-gray-400 shadow-sm dark:border-gray-700 dark:bg-eden-navy dark:text-gray-500"
            aria-hidden="true"
          >
            <User size={14} />
          </span>
        )}
        {(displayName || roleLabel) && (
          <span className="hidden min-w-0 text-left sm:block">
            {displayName && (
              <span className="block max-w-32 truncate text-xs font-medium text-gray-700 dark:text-gray-200">{displayName}</span>
            )}
            {roleLabel && (
              <span className="block max-w-32 truncate text-[10px] text-gray-500 dark:text-gray-400">{roleLabel}</span>
            )}
          </span>
        )}
        <ChevronDown size={13} className={cn('hidden shrink-0 text-gray-400 transition-transform sm:block', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          data-tour-id="profile-menu"
          className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-1rem)] overflow-visible rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-eden-navy-2"
          role="menu"
          aria-label="Profil ve tercihler"
        >
          <div className="flex items-center gap-2.5 border-b border-gray-200 px-3 py-3 dark:border-gray-700">
            {(profile?.avatarUrl || displayName) ? (
              <UserAvatar
                name={displayName}
                photoUrl={profile?.avatarUrl}
                size="sm"
                showTooltip={false}
                className="h-9 w-9 border border-gray-100 shadow-sm dark:border-gray-700"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-100 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-eden-navy dark:text-gray-500">
                <User size={16} />
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                {displayName || 'Kullanici'}
              </span>
              {roleLabel && (
                <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{roleLabel}</span>
              )}
            </span>
          </div>

          <div className="py-1">
            <div className="relative">
              <button
                type="button"
                data-tour-id="visual-theme-selector"
                data-active-theme-id={activeThemeId}
                onClick={() => setActivePanel(panel => panel === 'theme' ? null : 'theme')}
                onMouseEnter={() => setActivePanel('theme')}
                onFocus={() => setActivePanel('theme')}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-eden-navy',
                  activePanel === 'theme' && 'bg-gray-50 dark:bg-eden-navy'
                )}
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={activePanel === 'theme'}
              >
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-eden-blue dark:border-gray-700 dark:bg-eden-navy-3 dark:text-sky-200">
                  <Palette size={15} />
                  <span
                    className="absolute bottom-1 right-1 h-2 w-2 rounded-full border border-white dark:border-eden-navy-3"
                    style={{ backgroundColor: activeTheme?.colors.accentWarm || '#b88932' }}
                    aria-hidden="true"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-gray-800 dark:text-gray-100">Tema</span>
                  <span className="mt-0.5 block truncate text-[10px] text-gray-500 dark:text-gray-400">
                    {activeTheme?.name || VISUAL_THEME_LABELS[activeThemeId]}
                  </span>
                </span>
                <ChevronLeft size={15} className="shrink-0 text-gray-400" />
              </button>

              {activePanel === 'theme' && (
                <div
                  data-tour-id="visual-theme-options"
                  className="absolute right-0 top-full z-[60] mt-2 w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-eden-navy-2 sm:right-full sm:top-0 sm:mr-2 sm:mt-0"
                  role="menu"
                  aria-label="Tema secenekleri"
                >
                  <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
                    <div className="text-[10px] font-semibold uppercase tracking-normal text-gray-400 dark:text-gray-500">Tema</div>
                    <div className="mt-0.5 text-xs font-semibold text-gray-800 dark:text-gray-100">
                      {activeTheme?.name || VISUAL_THEME_LABELS[activeThemeId]}
                    </div>
                  </div>
                  <div className="py-1">
                    {themeConcepts.map(theme => {
                      const selected = theme.id === activeThemeId
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          data-theme-id={theme.id}
                          onClick={() => {
                            onVisualThemeChange(theme.id)
                            setActivePanel(null)
                          }}
                          className={cn(
                            'flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-eden-navy',
                            selected && 'bg-gray-50 dark:bg-eden-navy'
                          )}
                          role="menuitemradio"
                          aria-checked={selected}
                        >
                          <span
                            className="h-5 w-5 shrink-0 rounded-md border border-white shadow-sm dark:border-eden-navy-3"
                            style={{ backgroundColor: theme.colors.accentPrimary }}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-gray-800 dark:text-gray-100">{VISUAL_THEME_LABELS[theme.id] || theme.name}</span>
                            <span className="mt-0.5 block truncate text-[10px] text-gray-500 dark:text-gray-400">{theme.personality.join(' / ')}</span>
                          </span>
                          {selected && (
                            <Check size={15} className="shrink-0 text-eden-green" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                data-tour-id="theme-toggle"
                onClick={() => setActivePanel(panel => panel === 'appearance' ? null : 'appearance')}
                onMouseEnter={() => setActivePanel('appearance')}
                onFocus={() => setActivePanel('appearance')}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-eden-navy',
                  activePanel === 'appearance' && 'bg-gray-50 dark:bg-eden-navy'
                )}
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={activePanel === 'appearance'}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-eden-navy-3 dark:text-gray-200">
                  <ActiveAppearanceIcon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-gray-800 dark:text-gray-100">Gorunum</span>
                  <span className="mt-0.5 block truncate text-[10px] text-gray-500 dark:text-gray-400">
                    {activeAppearanceLabel}
                  </span>
                </span>
                <ChevronLeft size={15} className="shrink-0 text-gray-400" />
              </button>

              {activePanel === 'appearance' && (
                <div
                  data-tour-id="appearance-mode-options"
                  className="absolute right-0 top-full z-[60] mt-2 w-64 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-eden-navy-2 sm:right-full sm:top-0 sm:mr-2 sm:mt-0"
                  role="menu"
                  aria-label="Gorunum secenekleri"
                >
                  <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
                    <div className="text-[10px] font-semibold uppercase tracking-normal text-gray-400 dark:text-gray-500">Gorunum</div>
                    <div className="mt-0.5 text-xs font-semibold text-gray-800 dark:text-gray-100">{activeAppearanceLabel}</div>
                  </div>
                  <div className="py-1">
                    {APPEARANCE_OPTIONS.map(option => {
                      const selected = option.id === appearanceMode
                      const Icon = option.icon
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            onAppearanceModeChange(option.id)
                            setActivePanel(null)
                          }}
                          className={cn(
                            'flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-eden-navy',
                            selected && 'bg-gray-50 dark:bg-eden-navy'
                          )}
                          role="menuitemradio"
                          aria-checked={selected}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-eden-navy-3 dark:text-gray-200">
                            <Icon size={14} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-gray-800 dark:text-gray-100">{option.label}</span>
                            <span className="mt-0.5 block truncate text-[10px] text-gray-500 dark:text-gray-400">{option.description}</span>
                          </span>
                          {selected && (
                            <Check size={15} className="shrink-0 text-eden-green" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MobileBottomNavigation({ pathname, onOpenMenu }: { pathname: string; onOpenMenu: () => void }) {
  const releaseEnv = getCurrentReleaseEnvironment()
  const items = [
    { label: 'Ana', href: '/app', icon: Home },
    { label: 'Sirket', href: '/app/sirket/companies', icon: Building2 },
    { label: 'Cari', href: '/app/muhasebe/cari-kartlar', icon: WalletCards },
    { label: 'IK', href: '/app/ik/calisanlar', icon: Users },
    { label: 'Panel', href: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Gorev', href: '/app/gorev-ve-proje-yonetimi/gorevler', icon: ListChecks },
  ].filter(item => canShowRouteInNavigation(item.href, releaseEnv))

  return (
    <nav
      aria-label="Mobil ana gezinme"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1.5 shadow-[0_-10px_30px_rgba(15,34,51,0.12)] backdrop-blur dark:border-gray-800 dark:bg-eden-navy-2/95 lg:hidden"
    >
      <div className="grid grid-cols-3 gap-1">
        {items.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold transition-colors',
                active
                  ? 'bg-eden-blue/10 text-eden-blue dark:bg-eden-blue/25 dark:text-white'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-eden-navy'
              )}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('eden:open-action-center'))}
          className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-eden-navy"
          aria-label="Is merkezini ac"
        >
          <Bell size={17} />
          <span>Is</span>
        </button>
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-eden-navy"
          aria-label="Daha fazla menu ac"
        >
          <MoreHorizontal size={17} />
          <span>Daha</span>
        </button>
      </div>
    </nav>
  )
}

function WorkspaceLoadingScreen({ dark }: { dark: boolean }) {
  return (
    <div className={cn('flex min-h-screen items-center justify-center px-5', dark ? 'dark bg-[#09141e]' : 'bg-gray-50')}>
      <div
        role="status"
        aria-live="polite"
        className="flex w-full max-w-sm flex-col items-center rounded-xl border border-gray-200 bg-white px-6 py-7 text-center shadow-sm dark:border-gray-800 dark:bg-eden-navy-2"
      >
        <Loader2 size={30} className="animate-spin text-eden-green" />
        <div className="mt-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Çalışma alanları yükleniyor
        </div>
        <div className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
          Yetki ve modül bilgileri hazırlanıyor.
        </div>
      </div>
    </div>
  )
}

function applyAppearancePreference(theme: UiAppearancePreference) {
  const prefersDark = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  const shouldUseDark = theme === 'dark' || (theme === 'system' && prefersDark)
  const root = document.documentElement

  if (root.classList.contains('dark') !== shouldUseDark) {
    root.classList.add('theme-transition-suppressed')
    root.classList.toggle('dark', shouldUseDark)
    window.setTimeout(() => root.classList.remove('theme-transition-suppressed'), THEME_TRANSITION_SUPPRESS_MS)
  }

  return shouldUseDark
}

function applyVisualThemePreference(themeId: ThemeConceptId, appearance: 'light' | 'dark') {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const theme = findThemeConcept(themeId)
  const vars = getEdenThemeCssVars(theme, appearance)

  root.dataset.visualTheme = theme.id
  root.dataset.appearanceMode = appearance
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}

function resolveThemedLogoUrl(source: ThemedLogoSource | null | undefined, dark: boolean) {
  if (!source) return null
  return dark
    ? source.darkLogoUrl || source.lightLogoUrl || source.logoUrl || null
    : source.lightLogoUrl || source.logoUrl || source.darkLogoUrl || null
}
