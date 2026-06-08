'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useModuleLicense } from '@/hooks/useModuleLicense'
import { useModules } from '@/lib/security/moduleStore'
import { usePermissions } from '@/lib/security/permissionStore'
import { findNavigationItemByPath } from '@/lib/navigation/navigationRegistry'
import { getCurrentReleaseEnvironment } from '@/lib/release/environment'
import { getRouteReleaseDecision } from '@/lib/release/releaseVisibility'
import { canSeeDevelopmentSurface, type TenantEntitlements } from '@/lib/licensing/tenantEntitlements'
import { resolveMenuItemVisibility } from '@/lib/visibility/runtimeVisibilityResolver'
import type { RuntimeVisibilityContext, VisibilityDecision } from '@/lib/visibility/visibility.types'
import {
  formatVersionBadge,
  getMaturityBadgeClass,
  getMaturityLabel,
  getModuleVersionInfo,
  getPageVersionInfo,
  getPageVersionInfoByHref,
  type ModuleVersionInfo,
  type PageVersionInfo,
} from '@/lib/product/versionManifest'
import {
  Home, Users, Building2, CreditCard, Package, ShoppingCart,
  Settings, Factory, Wrench, ChevronRight, LogOut, Download,
  List, AlertCircle, FolderOpen, Wallet, X, Headphones, Tags, ListChecks, Handshake, FileArchive, FileText
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  href?: string
  disabled?: boolean
  moduleKey?: string
  contractModuleKey?: string
  children?: {
    label: string
    href: string
    pageId?: string
    disabled?: boolean
    moduleKey?: string
    contractModuleKey?: string
    submoduleKey?: string
  }[]
}

const NAV: NavItem[] = [
  {
    id: 'ana',
    label: 'Ana Sayfa',
    icon: <Home size={16} />,
    href: '/app',
  },
  {
    id: 'sirket',
    label: 'Şirket Yönetimi',
    icon: <Building2 size={16} />,
    moduleKey: 'sirket',
    contractModuleKey: 'companies',
    children: [
      { label: 'Şirketlerimiz', href: '/app/sirket/companies', moduleKey: 'sirket', submoduleKey: 'companies' },
      { label: 'Şubelerimiz', href: '/app/sirket/companies/branches', moduleKey: 'sirket', submoduleKey: 'branches' },
      { label: 'Ortaklarımız', href: '/app/sirket/companies/partners', moduleKey: 'sirket' },
      { label: 'Temsilcilerimiz', href: '/app/sirket/companies/representatives', moduleKey: 'sirket' },
      { label: 'Paydaşlarımız', href: '/app/sirket/companies/stakeholders', moduleKey: 'sirket' },
      { label: 'Teşkilat ve Kadro', href: '/app/sirket/teskilat', moduleKey: 'sirket', submoduleKey: 'teskilat' },
      { label: 'Süreçlerimiz', href: '/app/sirket/surecler', moduleKey: 'sirket', submoduleKey: 'surecler' },
      { label: 'Tesislerimiz', href: '/app/sirket/tesisler', moduleKey: 'sirket', submoduleKey: 'tesisler' },
      { label: 'Araçlarımız', href: '/app/sirket/araclar', moduleKey: 'sirket', submoduleKey: 'araclar' },
      { label: 'Demirbaşlar', href: '/app/sirket/demirbas', moduleKey: 'sirket', submoduleKey: 'demirbas' },
    ],
  },
  {
    id: 'ik',
    label: 'İnsan Kaynakları',
    icon: <Users size={16} />,
    moduleKey: 'ik',
    children: [
      { label: 'Çalışanlarımız', href: '/app/ik/calisanlar', moduleKey: 'ik', submoduleKey: 'employees' },
      { label: 'İzin Yönetimi', href: '/app/ik/izin', disabled: true },
      { label: 'Performans', href: '/app/ik/performans', disabled: true },
    ],
  },
  {
    id: 'muhasebe',
    label: 'Muhasebe',
    icon: <CreditCard size={16} />,
    moduleKey: 'muhasebe',
    children: [
      { label: 'Cari Kartlar', href: '/app/muhasebe/cari-kartlar', moduleKey: 'muhasebe' },
      { label: 'Ön Muhasebe Hareketleri', href: '/app/muhasebe/on-muhasebe-hareketleri', moduleKey: 'muhasebe' },
      { label: 'Banka Hesapları ve Kartları', href: '/app/muhasebe/banka-hesaplari-ve-kartlari', moduleKey: 'muhasebe', submoduleKey: 'banka-hesaplari-ve-kartlari' },
      { label: 'Hesap ve Kart Hareketleri', href: '/app/muhasebe/hesap-ve-kart-hareketleri', moduleKey: 'muhasebe', submoduleKey: 'hesap-ve-kart-hareketleri' },
    ],
  },
  {
    id: 'project_management',
    label: 'Görev ve Proje Yönetimi',
    icon: <ListChecks size={16} />,
    moduleKey: 'project_management',
    children: [
      { label: 'Genel Bakış', href: '/app/gorev-ve-proje-yonetimi', moduleKey: 'project_management' },
      { label: 'Görevler', href: '/app/gorev-ve-proje-yonetimi/gorevler', moduleKey: 'project_management', submoduleKey: 'gorevler' },
      { label: 'Projeler', href: '/app/gorev-ve-proje-yonetimi/projeler', moduleKey: 'project_management', submoduleKey: 'projeler' },
      { label: 'Kanban Board', href: '/app/gorev-ve-proje-yonetimi/kanban-board', moduleKey: 'project_management', submoduleKey: 'kanban-board' },
      { label: 'Backlog', href: '/app/gorev-ve-proje-yonetimi/backlog', moduleKey: 'project_management', submoduleKey: 'backlog' },
      { label: 'Sprintler', href: '/app/gorev-ve-proje-yonetimi/sprintler', moduleKey: 'project_management', submoduleKey: 'sprintler' },
      { label: 'Takvim', href: '/app/gorev-ve-proje-yonetimi/takvim', moduleKey: 'project_management', submoduleKey: 'takvim' },
      { label: 'Zaman Takibi', href: '/app/gorev-ve-proje-yonetimi/zaman-takibi', moduleKey: 'project_management', submoduleKey: 'zaman-takibi' },
      { label: 'İş Akışları', href: '/app/gorev-ve-proje-yonetimi/is-akislari', moduleKey: 'project_management', submoduleKey: 'is-akislari' },
      { label: 'Raporlar', href: '/app/gorev-ve-proje-yonetimi/raporlar', moduleKey: 'project_management', submoduleKey: 'raporlar' },
    ],
  },
  {
    id: 'uretim',
    label: 'Üretim',
    icon: <Factory size={16} />,
    moduleKey: 'uretim',
    children: [
      { label: 'İş Emirleri', href: '/app/uretim/is-emirleri', disabled: true },
      { label: 'Reçeteler', href: '/app/uretim/receteler', disabled: true },
    ],
  },
  {
    id: 'stok',
    label: 'Stok Yönetimi',
    icon: <Package size={16} />,
    moduleKey: 'stok',
    children: [
      { label: 'Ürün Listesi', href: '/app/stok/urunler', disabled: true },
      { label: 'Depo Hareketleri', href: '/app/stok/hareketler', disabled: true },
      { label: 'Sayım', href: '/app/stok/sayim', disabled: true },
    ],
  },
  {
    id: 'crm',
    label: 'CRM / Paydaşlar',
    icon: <Handshake size={16} />,
    moduleKey: 'crm',
    children: [
      { label: 'Paydaşlar', href: '/app/crm/paydaslar', moduleKey: 'crm', submoduleKey: 'paydaslar' },
      { label: 'Müşteriler', href: '/app/crm/paydaslar?type=customer', moduleKey: 'crm', submoduleKey: 'musteriler' },
      { label: 'Tedarikçiler', href: '/app/crm/paydaslar?type=supplier', moduleKey: 'crm', submoduleKey: 'tedarikciler' },
      { label: 'Leadler', href: '/app/crm/paydaslar?type=lead', moduleKey: 'crm', submoduleKey: 'leadler' },
    ],
  },
  {
    id: 'contracts',
    label: 'S?zle?meler',
    icon: <FileText size={16} />,
    href: '/app/sozlesmeler',
    moduleKey: 'contracts',
    contractModuleKey: 'contracts',
  },
  {
    id: 'documents',
    label: 'Belgeler',
    icon: <FileArchive size={16} />,
    href: '/app/belgeler',
    moduleKey: 'documents',
    contractModuleKey: 'documents',
  },
  {
    id: 'product_services',
    label: 'Ürün ve Hizmetler',
    icon: <Tags size={16} />,
    moduleKey: 'product_services',
    children: [
      { label: 'Genel Bakış', href: '/app/urun-ve-hizmetler', moduleKey: 'product_services' },
      { label: 'Ürün/Hizmet Kataloğu', href: '/app/urun-ve-hizmetler/katalog', moduleKey: 'product_services', submoduleKey: 'katalog' },
    ],
  },
  {
    id: 'satis',
    label: 'Satış',
    icon: <ShoppingCart size={16} />,
    moduleKey: 'satis',
    children: [
      { label: 'Teklifler', href: '/app/satis/teklifler', disabled: true },
      { label: 'Siparişler', href: '/app/satis/siparisler', disabled: true },
      { label: 'Müşteriler', href: '/app/satis/musteriler', disabled: true },
    ],
  },
  {
    id: 'after_sales',
    label: 'Satış Sonrası Hizmetler',
    icon: <Headphones size={16} />,
    moduleKey: 'after_sales',
    children: [
      { label: 'Genel Bakış', href: '/app/satis-sonrasi', moduleKey: 'after_sales' },
      { label: 'Kurulu Ürünler', href: '/app/satis-sonrasi/kurulu-urunler', moduleKey: 'after_sales', submoduleKey: 'kurulu-urunler' },
      { label: 'Servis Talepleri', href: '/app/satis-sonrasi/servis-talepleri', moduleKey: 'after_sales', submoduleKey: 'servis-talepleri' },
      { label: 'Servis Kayıtları', href: '/app/satis-sonrasi/servis-kayitlari', moduleKey: 'after_sales', submoduleKey: 'servis-kayitlari' },
      { label: 'Bakımı Gelenler', href: '/app/satis-sonrasi/bakimi-gelenler', moduleKey: 'after_sales', submoduleKey: 'bakimi-gelenler' },
    ],
  },
  {
    id: 'servis',
    label: 'Teknik Servis',
    icon: <Wrench size={16} />,
    moduleKey: 'servis',
    children: [
      { label: 'Servis Kayıtları', href: '/app/servis/kayitlar', disabled: true },
    ],
  },
  {
    id: 'sys',
    label: 'Sistem Yönetimi',
    icon: <Settings size={16} />,
    moduleKey: 'sistem',
    children: [
      { label: 'Aboneliğim', href: '/app/aboneligim', moduleKey: 'sistem', contractModuleKey: 'settings' },
      { label: 'Modül Lisansları', href: '/app/sistem/module-licenses' },
      { label: 'Lisanslar', href: '/app/sistem/lisanslar', moduleKey: 'sistem', contractModuleKey: 'adminConsole' },
      { label: 'Sistem Parametreleri', href: '/app/sistem/system-parameters' },
      { label: 'Entegrasyon Ayarları', href: '/app/sistem/entegrasyon-ayarlari', moduleKey: 'sistem', submoduleKey: 'entegrasyon-ayarlari' },
      { label: 'Kullanıcı Talepleri', href: '/app/sistem/kullanici-talepleri' },
      { label: 'Tasarım Laboratuvarı', href: '/app/design-lab', moduleKey: 'sistem', contractModuleKey: 'adminConsole' },
      { label: 'Admin Console', href: '/app/sistem', moduleKey: 'sistem', contractModuleKey: 'adminConsole' },
      { label: 'Genel Ayarlar', href: '/app/sistem/genel', moduleKey: 'sistem', contractModuleKey: 'adminConsole' },
      { label: 'Moduller', href: '/app/sistem/moduller', moduleKey: 'sistem', contractModuleKey: 'adminConsole' },
      { label: 'Ozellikler', href: '/app/sistem/ozellikler', moduleKey: 'sistem', contractModuleKey: 'adminConsole' },
      { label: 'Sistem Sagligi', href: '/app/sistem/saglik', moduleKey: 'sistem', contractModuleKey: 'adminConsole' },
      { label: 'Outbox', href: '/app/sistem/outbox', moduleKey: 'sistem', contractModuleKey: 'adminConsole' },
      { label: 'Entegrasyonlar', href: '/app/sistem/entegrasyonlar', moduleKey: 'sistem', contractModuleKey: 'adminConsole' },
      { label: 'Teknik', href: '/app/sistem/teknik', moduleKey: 'sistem', contractModuleKey: 'adminConsole' },
      { label: 'AI Copilot', href: '/app/sistem/ai-copilot', moduleKey: 'aiCopilot', contractModuleKey: 'aiCopilot' },
      { label: 'Data Import', href: '/app/sistem/import', moduleKey: 'sistem', contractModuleKey: 'importExport' },
      { label: 'Data Export / Bulk', href: '/app/sistem/export', moduleKey: 'sistem', contractModuleKey: 'importExport' },
      { label: 'Veri Kalitesi', href: '/app/sistem/veri-kalitesi', moduleKey: 'sistem', contractModuleKey: 'dataQuality' },
      { label: 'Sistem E-postalari', href: '/app/sistem/e-postalar', moduleKey: 'sistem', contractModuleKey: 'notifications' },
      { label: 'Kullanıcılar', href: '/app/sistem/kullanicilar', disabled: true },
      { label: 'Roller & Yetkiler', href: '/app/sistem/roller', disabled: true },
      { label: 'Sistem Logları', href: '/app/sistem/loglar', disabled: true },
    ],
  },
]

const SIDEBAR_CONTRACT_MODULE_BY_HREF: Record<string, string> = {
  '/app/sirket/companies': 'companies',
  '/app/sirket/companies/branches': 'branches',
  '/app/sirket/companies/partners': 'partners',
  '/app/sirket/companies/representatives': 'representatives',
  '/app/sirket/teskilat': 'organization',
  '/app/sirket/tesisler': 'facilities',
  '/app/ik': 'hr',
  '/app/ik/calisanlar': 'hr',
  '/app/ik/employees': 'hr',
  '/app/ik/personel': 'hr',
  '/app/crm/paydaslar': 'crm',
  '/app/sirket/paydaslar': 'crm',
  '/app/muhasebe': 'accounting',
  '/app/urun-ve-hizmetler': 'product_services',
  '/app/satis-sonrasi': 'after_sales',
  '/app/gorev-ve-proje-yonetimi': 'project_management',
  '/app/belgeler': 'documents',
  '/app/sozlesmeler': 'contracts',
  '/app/ayarlar/bildirimler': 'notifications',
  '/app/design-lab': 'adminConsole',
  '/app/sistem': 'adminConsole',
  '/app/sistem/genel': 'adminConsole',
  '/app/sistem/moduller': 'adminConsole',
  '/app/sistem/ozellikler': 'adminConsole',
  '/app/sistem/saglik': 'adminConsole',
  '/app/sistem/outbox': 'adminConsole',
  '/app/sistem/entegrasyonlar': 'adminConsole',
  '/app/sistem/teknik': 'adminConsole',
  '/app/sistem/ai-copilot': 'aiCopilot',
  '/app/aboneligim': 'settings',
  '/app/sistem/lisanslar': 'adminConsole',
  '/app/sistem/module-licenses': 'settings',
  '/app/sistem/import': 'importExport',
  '/app/sistem/export': 'importExport',
  '/app/sistem/veri-kalitesi': 'dataQuality',
  '/app/sistem/e-postalar': 'notifications',
}

const SIDEBAR_CONTRACT_MODULE_BY_LEGACY_KEY: Record<string, string> = {
  ik: 'hr',
  reporting: 'reporting',
  muhasebe: 'accounting',
  crm: 'crm',
  product_services: 'product_services',
  after_sales: 'after_sales',
  project_management: 'project_management',
  documents: 'documents',
  contracts: 'contracts',
  notifications: 'notifications',
  aiCopilot: 'aiCopilot',
  dataQuality: 'dataQuality',
  adminConsole: 'adminConsole',
  sistem: 'settings',
}

type NavChildItem = NonNullable<NavItem['children']>[number]

function resolveSidebarContractModuleKey(item: NavItem | NavChildItem, parent?: NavItem) {
  return item.contractModuleKey
    || findNavigationItemByPath(item.href || '')?.moduleKey
    || SIDEBAR_CONTRACT_MODULE_BY_HREF[item.href || '']
    || (item.moduleKey ? SIDEBAR_CONTRACT_MODULE_BY_LEGACY_KEY[item.moduleKey] : null)
    || parent?.contractModuleKey
    || (parent?.moduleKey ? SIDEBAR_CONTRACT_MODULE_BY_LEGACY_KEY[parent.moduleKey] : null)
    || null
}

function isBlockedRuntimeStatus(status: string) {
  return status === 'setup_required' || status === 'dependency_missing'
}

function runtimeRedirectFor(status: string) {
  if (status === 'setup_required') return '/app/sistem/kurulum'
  if (status === 'unlicensed') return '/app/aboneligim'
  return null
}

type SidebarVersionInfo = ModuleVersionInfo | PageVersionInfo

function SidebarVersionBadge({ info, compact = false }: { info: SidebarVersionInfo; compact?: boolean }) {
  return (
    <span
      title={getVersionTitle(info.label, info)}
      className={cn(
        getMaturityBadgeClass(info.maturity),
        'shrink-0',
        compact ? 'px-1 py-0.5 text-[8px]' : 'px-1.5 py-0.5 text-[9px]',
      )}
    >
      {formatVersionBadge(info.version, info.maturity)}
    </span>
  )
}

function getVersionTitle(label: string, info?: SidebarVersionInfo) {
  if (!info) return label
  return [
    label,
    formatVersionBadge(info.version, info.maturity),
    getMaturityLabel(info.maturity),
    info.notes,
  ].filter(Boolean).join(' · ')
}

function SidebarVisibilityBadge({ decision }: { decision: VisibilityDecision }) {
  if (decision.status === 'available') return null
  const badgeLabel = decision.status === 'setup_required'
    ? 'Kurulum'
    : decision.status === 'unlicensed'
      ? 'Lisans'
      : decision.status === 'dependency_missing'
        ? 'Gerekli'
        : decision.status === 'permission_denied'
          ? 'Yetki'
          : 'Kapali'
  return (
    <span
      title={decision.reason}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-100"
    >
      <AlertCircle size={10} />
      {badgeLabel}
    </span>
  )
}

function navItemToVisibilityInput(
  item: NavItem | NavChildItem,
  moduleKey: string | null,
  parent?: NavItem
) {
  const registryItem = item.href ? findNavigationItemByPath(item.href) : null
  return {
    key: 'id' in item ? item.id : item.href || item.label,
    label: item.label,
    path: item.href,
    moduleKey: moduleKey || registryItem?.moduleKey || parent?.contractModuleKey,
    permission: registryItem?.permission,
    fallbackPermission: registryItem?.fallbackPermission,
    featureFlag: registryItem?.featureFlag,
  }
}

function titleWithDecision(title: string, decision: VisibilityDecision) {
  return decision.reason ? `${title} - ${decision.reason}` : title
}

interface SidebarProps {
  collapsed?: boolean
  mobileOpen?: boolean
  tenantEntitlements?: TenantEntitlements | null
  onMobileClose?: () => void
  onExpand?: () => void
}

export default function Sidebar({ collapsed = false, mobileOpen = false, tenantEntitlements = null, onMobileClose, onExpand }: SidebarProps) {
  const pathname = usePathname()
  const { isModuleActive, isSubmoduleActive } = useModuleLicense()
  const moduleRuntime = useModules()
  const permissionRuntime = usePermissions()
  const releaseEnv = getCurrentReleaseEnvironment()
  const [openMods, setOpenMods] = useState<string[]>([])
  const visibilityContext = useMemo<RuntimeVisibilityContext>(() => ({
    currentPage: pathname,
    permissions: Array.from(permissionRuntime.permissions),
    modules: moduleRuntime.runtimeModules,
    tenantEntitlements,
  }), [moduleRuntime.runtimeModules, pathname, permissionRuntime.permissions, tenantEntitlements])
  const showTenantDevelopmentSurfaces = canSeeDevelopmentSurface(tenantEntitlements)

  useEffect(() => {
    const activeModule = NAV.find(item => item.children?.some(child => pathname.startsWith(child.href)))?.id
    if (!activeModule) return
    setOpenMods(prev => prev.includes(activeModule) ? prev : [activeModule])
  }, [pathname])

  function toggleMod(id: string) {
    if (collapsed && !mobileOpen) {
      onExpand?.()
      setOpenMods([id])
      return
    }
    setOpenMods(prev => (prev.includes(id) ? [] : [id]))
  }

  function isModActive(item: NavItem): boolean {
    if (item.href) return pathname === item.href
    return item.children?.some(c => pathname.startsWith(c.href)) ?? false
  }

  // Auto-open active module on mount
  const renderItem = (item: NavItem) => {
    const releaseUserContext = {
      permissions: visibilityContext.permissions,
      tenantEntitlements,
    }
    const itemReleaseDecision = item.href
      ? getRouteReleaseDecision(item.href, releaseEnv, 'navigation', releaseUserContext)
      : null
    const visibleChildren = item.children?.filter(child =>
      getRouteReleaseDecision(child.href, releaseEnv, 'navigation', releaseUserContext).visible
    ) || []

    if (item.href && !itemReleaseDecision?.visible) return null
    if (!item.href && item.children?.length && visibleChildren.length === 0) return null

    const isActive = isModActive(item)
    const isOpen = openMods.includes(item.id)
    const hasChildren = visibleChildren.length > 0
    const showMenuVersionInfo = showTenantDevelopmentSurfaces
    const moduleVersionInfo = showMenuVersionInfo ? getModuleVersionInfo(item.moduleKey) : undefined
    const itemTitle = getVersionTitle(item.label, moduleVersionInfo)
    const contractModuleKey = resolveSidebarContractModuleKey(item)
    const runtimeStatus = contractModuleKey ? moduleRuntime.getRuntimeStatus(contractModuleKey) : 'available'
    const visibilityDecision = resolveMenuItemVisibility(
      navItemToVisibilityInput(item, contractModuleKey),
      { ...visibilityContext, moduleKey: contractModuleKey || undefined }
    )
    const legacyModuleAvailable = !item.moduleKey || isModuleActive(item.moduleKey)
    const runtimeRedirect = visibilityDecision.setupAction?.targetPage || runtimeRedirectFor(runtimeStatus)
    const releaseBlocksClick = itemReleaseDecision
      ? !itemReleaseDecision.enabled && itemReleaseDecision.releaseReason !== 'coming_soon'
      : false
    const isItemDisabled = item.disabled || !legacyModuleAvailable || !visibilityDecision.enabled || releaseBlocksClick

    if (!visibilityDecision.visible) return null

    return (
      <div key={item.id} data-tour-id={item.id === 'sirket' ? 'sidebar-pages' : undefined}>
        {/* Main nav item */}
        {item.href ? (
          <Link href={runtimeRedirect || item.href}
                title={collapsed && !mobileOpen ? titleWithDecision(itemTitle, visibilityDecision) : visibilityDecision.reason}
                onClick={e => {
                  if (isItemDisabled && !runtimeRedirect) e.preventDefault()
                  if (collapsed && !mobileOpen) onExpand?.()
                }}
                className={cn('ni', isActive && 'active', isItemDisabled && 'opacity-60')}>
            <span className={cn('flex-shrink-0 opacity-60', isActive && 'opacity-90')}>{item.icon}</span>
            {!collapsed && <span className="flex-1">{item.label}</span>}
            {!collapsed && <SidebarVisibilityBadge decision={visibilityDecision} />}
          </Link>
        ) : (
          <button
            onClick={() => toggleMod(item.id)}
            title={collapsed && !mobileOpen ? titleWithDecision(itemTitle, visibilityDecision) : visibilityDecision.reason}
            className={cn('ni', (isActive || isOpen) && 'open', isItemDisabled && 'opacity-70')}
          >
            <span className={cn('flex-shrink-0 opacity-60', (isActive || isOpen) && 'opacity-90')}>
              {item.icon}
            </span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                <SidebarVisibilityBadge decision={visibilityDecision} />
                {moduleVersionInfo && <SidebarVersionBadge info={moduleVersionInfo} />}
                <ChevronRight
                  size={12}
                  className={cn('text-white/30 transition-transform duration-200', isOpen && 'rotate-90')}
                />
              </>
            )}
          </button>
        )}

        {/* Sub items */}
        {hasChildren && !collapsed && (
          <div className={cn(
            'overflow-hidden transition-all duration-200',
            isOpen ? 'max-h-96' : 'max-h-0'
          )}>
            {visibleChildren.map(child => {
              // Check if submodule is active
              const isSubmoduleAvailable = !child.moduleKey || !child.submoduleKey ||
                isSubmoduleActive(child.moduleKey, child.submoduleKey)
              const childReleaseDecision = getRouteReleaseDecision(child.href, releaseEnv, 'navigation', releaseUserContext)
              const childContractModuleKey = resolveSidebarContractModuleKey(child, item)
              const childRuntimeStatus = childContractModuleKey ? moduleRuntime.getRuntimeStatus(childContractModuleKey) : runtimeStatus
              const childDecision = resolveMenuItemVisibility(
                navItemToVisibilityInput(child, childContractModuleKey, item),
                { ...visibilityContext, moduleKey: childContractModuleKey || contractModuleKey || undefined }
              )
              const childRuntimeRedirect = childDecision.setupAction?.targetPage || runtimeRedirectFor(childRuntimeStatus)
              const pageVersionInfo = showMenuVersionInfo
                ? child.pageId
                  ? getPageVersionInfo(child.moduleKey || item.moduleKey, child.pageId)
                  : getPageVersionInfoByHref(child.moduleKey || item.moduleKey, child.href)
                : undefined
              const childTitle = getVersionTitle(child.label, pageVersionInfo)

              if (!childDecision.visible) return null

              const childReleaseBlocksClick = !childReleaseDecision.enabled
                && childReleaseDecision.releaseReason !== 'coming_soon'
              const isDisabled = child.disabled
                || !isSubmoduleAvailable
                || !childDecision.enabled
                || isBlockedRuntimeStatus(childRuntimeStatus)
                || childReleaseBlocksClick

              return (
                <Link
                  key={child.href}
                  href={childRuntimeRedirect || (isDisabled ? '#' : child.href)}
                  title={titleWithDecision(childTitle, childDecision)}
                  onClick={e => isDisabled && !childRuntimeRedirect && e.preventDefault()}
                  className={cn(
                    'sni',
                    pathname === child.href && 'active',
                    isDisabled && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 flex-shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{child.label}</span>
                  <SidebarVisibilityBadge decision={childDecision} />
                  {pageVersionInfo && <SidebarVersionBadge info={pageVersionInfo} compact />}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className={cn(
      'flex flex-col transition-all duration-200 overflow-hidden flex-shrink-0 h-full',
      mobileOpen ? 'w-80' : (collapsed ? 'w-16' : 'w-80')
    )}
      data-tour-id="sidebar-menu"
      style={{
        background: 'linear-gradient(180deg, var(--eden-nav-bg), color-mix(in srgb, var(--eden-nav-bg) 82%, var(--eden-accent) 18%))',
        borderColor: 'var(--eden-border)',
        color: 'var(--eden-nav-text)',
      }}
    >
      {/* Logo & Mobile Close */}
      <div className="px-4 py-4 border-b border-white/[0.07] flex items-center justify-between flex-shrink-0">
        <div className="flex min-w-0 items-center gap-2">
          {collapsed && !mobileOpen ? (
            <Image
              src="/eden-icon-original.png"
              alt="Eden"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
              priority
            />
          ) : (
            <>
              <Image
                src="/brand/eden-logo-colored.png"
                alt="Eden Teknoloji"
                width={192}
                height={86}
                className="h-auto max-h-14 w-36 shrink-0 object-contain"
                priority
              />
            </>
          )}
        </div>
        {/* Mobile Close Button */}
        {mobileOpen && onMobileClose && (
          <button
            onClick={onMobileClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav data-tour-id="sidebar-modules" className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-thin">
        {NAV.map(item => renderItem(item))}
      </nav>

      {/* Footer */}
      <div data-tour-id="sidebar-logout" className="px-2 py-2 border-t border-white/[0.07] flex-shrink-0">
        <button
          onClick={async () => {
            if (typeof window !== 'undefined') {
              await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
              document.cookie = 'demo_auth=; path=/; max-age=0; sameSite=lax'
              window.location.href = '/login'
            }
          }}
          className="ni text-white/35 text-xs"
        >
          <LogOut size={14} className="opacity-60 flex-shrink-0" />
          {!collapsed && <span>Çıkış Yap</span>}
        </button>
      </div>
    </aside>
  )
}
