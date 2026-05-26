'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useModuleLicense } from '@/hooks/useModuleLicense'
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
  BarChart2, List, AlertCircle, FolderOpen, Wallet, X, Headphones, Tags, ListChecks
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  href?: string
  disabled?: boolean
  moduleKey?: string
  children?: {
    label: string
    href: string
    pageId?: string
    disabled?: boolean
    moduleKey?: string
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
      { label: 'Çalışanlarımız', href: '/app/ik/employees', moduleKey: 'ik', submoduleKey: 'employees' },
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
    id: 'product_services',
    label: 'Ürün ve Hizmetler',
    icon: <Tags size={16} />,
    moduleKey: 'product_services',
    children: [
      { label: 'Genel Bakış', href: '/app/urun-ve-hizmetler', moduleKey: 'product_services' },
      { label: 'Ürün Kartları', href: '/app/urun-ve-hizmetler/urun-kartlari', moduleKey: 'product_services', submoduleKey: 'urun-kartlari' },
      { label: 'Hizmet Kartları', href: '/app/urun-ve-hizmetler/hizmet-kartlari', moduleKey: 'product_services', submoduleKey: 'hizmet-kartlari' },
      { label: 'Lisans / Abonelik Ürünleri', href: '/app/urun-ve-hizmetler/lisans-abonelik-urunleri', moduleKey: 'product_services', submoduleKey: 'lisans-abonelik-urunleri' },
      { label: 'Seri Numaralı Ürünler', href: '/app/urun-ve-hizmetler/seri-numarali-urunler', moduleKey: 'product_services', submoduleKey: 'seri-numarali-urunler' },
      { label: 'Garanti Şablonları', href: '/app/urun-ve-hizmetler/garanti-sablonlari', moduleKey: 'product_services', submoduleKey: 'garanti-sablonlari' },
      { label: 'Bakım Paketleri', href: '/app/urun-ve-hizmetler/bakim-paketleri', moduleKey: 'product_services', submoduleKey: 'bakim-paketleri' },
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
      { label: 'Garanti Takip', href: '/app/satis-sonrasi/garanti-takip', moduleKey: 'after_sales', submoduleKey: 'garanti-takip' },
      { label: 'Lisans Takip', href: '/app/satis-sonrasi/lisans-takip', moduleKey: 'after_sales', submoduleKey: 'lisans-takip' },
      { label: 'Servis ve Destek Kayıtları', href: '/app/satis-sonrasi/servis-destek-kayitlari', moduleKey: 'after_sales', submoduleKey: 'servis-destek-kayitlari' },
      { label: 'Bakım ve Sözleşme Takip', href: '/app/satis-sonrasi/bakim-sozlesme-takip', moduleKey: 'after_sales', submoduleKey: 'bakim-sozlesme-takip' },
      { label: 'Müşterideki Ürünler', href: '/app/satis-sonrasi/musterideki-urunler', moduleKey: 'after_sales', submoduleKey: 'musterideki-urunler' },
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
      { label: 'Modül Lisansları', href: '/app/sistem/module-licenses' },
      { label: 'Sistem Parametreleri', href: '/app/sistem/system-parameters' },
      { label: 'Entegrasyon Ayarları', href: '/app/sistem/entegrasyon-ayarlari', moduleKey: 'sistem', submoduleKey: 'entegrasyon-ayarlari' },
      { label: 'Kullanıcı Talepleri', href: '/app/sistem/kullanici-talepleri' },
      { label: 'Kullanıcılar', href: '/app/sistem/kullanicilar', disabled: true },
      { label: 'Roller & Yetkiler', href: '/app/sistem/roller', disabled: true },
      { label: 'Sistem Logları', href: '/app/sistem/loglar', disabled: true },
    ],
  },
]

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

interface SidebarProps {
  collapsed?: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
  onExpand?: () => void
}

export default function Sidebar({ collapsed = false, mobileOpen = false, onMobileClose, onExpand }: SidebarProps) {
  const pathname = usePathname()
  const { isModuleActive, isSubmoduleActive } = useModuleLicense()
  const [openMods, setOpenMods] = useState<string[]>([])

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
    const isActive = isModActive(item)
    const isOpen = openMods.includes(item.id)
    const hasChildren = !!item.children?.length
    const moduleVersionInfo = getModuleVersionInfo(item.moduleKey)
    const itemTitle = getVersionTitle(item.label, moduleVersionInfo)

    // Check if module is active (in production, hide if inactive)
    const isModuleAvailable = !item.moduleKey || isModuleActive(item.moduleKey)

    // In production, completely hide inactive modules
    const isProd = process.env.NODE_ENV === 'production'
    if (isProd && !isModuleAvailable) return null

    return (
      <div key={item.id} data-tour-id={item.id === 'sirket' ? 'sidebar-pages' : undefined}>
        {/* Main nav item */}
        {item.href ? (
          <Link href={item.href}
                title={collapsed && !mobileOpen ? itemTitle : undefined}
                onClick={() => {
                  if (collapsed && !mobileOpen) onExpand?.()
                }}
                className={cn('ni', isActive && 'active')}>
            <span className={cn('flex-shrink-0 opacity-60', isActive && 'opacity-90')}>{item.icon}</span>
            {!collapsed && <span className="flex-1">{item.label}</span>}
          </Link>
        ) : (
          <button
            onClick={() => toggleMod(item.id)}
            title={collapsed && !mobileOpen ? itemTitle : undefined}
            className={cn('ni', (isActive || isOpen) && 'open')}
          >
            <span className={cn('flex-shrink-0 opacity-60', (isActive || isOpen) && 'opacity-90')}>
              {item.icon}
            </span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
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
            {item.children!.map(child => {
              // Check if submodule is active
              const isSubmoduleAvailable = !child.moduleKey || !child.submoduleKey ||
                isSubmoduleActive(child.moduleKey, child.submoduleKey)
              const pageVersionInfo = child.pageId
                ? getPageVersionInfo(child.moduleKey || item.moduleKey, child.pageId)
                : getPageVersionInfoByHref(child.moduleKey || item.moduleKey, child.href)
              const childTitle = getVersionTitle(child.label, pageVersionInfo)

              // In production, completely hide inactive submodules
              if (isProd && !isSubmoduleAvailable) return null

              // In dev, show but disable if inactive
              const isDisabled = child.disabled || (!isSubmoduleAvailable && !isProd)

              return (
                <Link
                  key={child.href}
                  href={isDisabled ? '#' : child.href}
                  title={childTitle}
                  onClick={e => isDisabled && e.preventDefault()}
                  className={cn(
                    'sni',
                    pathname === child.href && 'active',
                    isDisabled && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 flex-shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{child.label}</span>
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
      'flex flex-col bg-eden-navy transition-all duration-200 overflow-hidden flex-shrink-0 h-full',
      mobileOpen ? 'w-80' : (collapsed ? 'w-16' : 'w-80')
    )}
      data-tour-id="sidebar-menu"
    >
      {/* Logo & Mobile Close */}
      <div className="px-4 py-4 border-b border-white/[0.07] flex items-center justify-between flex-shrink-0">
        <div className="flex min-w-0 items-center">
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
            <Image
              src="/brand/eden-logo-colored.png"
              alt="Eden Teknoloji"
              width={192}
              height={86}
              className="h-auto max-h-14 w-36 object-contain"
              priority
            />
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

