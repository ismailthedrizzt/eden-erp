'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useModuleLicense } from '@/hooks/useModuleLicense'
import {
  Home, Users, Building2, CreditCard, Package, ShoppingCart,
  Settings, Factory, Wrench, ChevronRight, LogOut, Download,
  BarChart2, List, AlertCircle, FolderOpen, Wallet, X
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  href?: string
  badge?: string
  disabled?: boolean
  moduleKey?: string
  children?: {
    label: string
    href: string
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
    label: '�irket Y�netimi',
    icon: <Building2 size={16} />,
    moduleKey: 'sirket',
    children: [
      { label: '�irketlerimiz', href: '/app/sirket/companies', moduleKey: 'sirket', submoduleKey: 'companies' },
      { label: 'Ortaklar�m�z', href: '/app/sirket/companies/partners', moduleKey: 'sirket' },
      { label: 'Ortakl�k ��lemleri', href: '/app/sirket/ortaklik-islemleri', moduleKey: 'sirket' },
      { label: 'Temsilcilerimiz', href: '/app/sirket/companies/representatives', moduleKey: 'sirket' },
      { label: 'Payda�lar�m�z', href: '/app/sirket/companies/stakeholders', moduleKey: 'sirket' },
      { label: 'Te�kilat ve Kadro', href: '/app/sirket/teskilat', moduleKey: 'sirket', submoduleKey: 'teskilat' },
      { label: 'S�re�lerimiz', href: '/app/sirket/surecler', moduleKey: 'sirket', submoduleKey: 'surecler' },
      { label: 'Tesislerimiz', href: '/app/sirket/tesisler', moduleKey: 'sirket', submoduleKey: 'tesisler' },
      { label: 'Ara�lar�m�z', href: '/app/sirket/araclar', moduleKey: 'sirket', submoduleKey: 'araclar' },
      { label: 'Demirba�lar', href: '/app/sirket/demirbas', moduleKey: 'sirket', submoduleKey: 'demirbas' },
    ],
  },
  {
    id: 'ik',
    label: '�nsan Kaynaklar�',
    icon: <Users size={16} />,
    moduleKey: 'ik',
    children: [
      { label: '�al��anlar�m�z', href: '/app/ik/employees', moduleKey: 'ik', submoduleKey: 'employees' },
      { label: '�zin Y�netimi', href: '/app/ik/izin', disabled: true },
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
      { label: '�n Muhasebe Hareketleri', href: '/app/muhasebe/on-muhasebe-hareketleri', moduleKey: 'muhasebe' },
      { label: 'Banka Hesaplar� ve Kartlar�', href: '/app/muhasebe/banka-hesaplari-ve-kartlari', moduleKey: 'muhasebe', submoduleKey: 'banka-hesaplari-ve-kartlari' },
      { label: 'Hesap ve Kart Hareketleri', href: '/app/muhasebe/hesap-ve-kart-hareketleri', moduleKey: 'muhasebe', submoduleKey: 'hesap-ve-kart-hareketleri' },
    ],
  },  {
    id: 'stok',
    label: 'Stok Y�netimi',
    icon: <Package size={16} />,
    badge: 'Yak�nda',
    children: [
      { label: '�r�n Listesi', href: '/app/stok/urunler', disabled: true },
      { label: 'Depo Hareketleri', href: '/app/stok/hareketler', disabled: true },
      { label: 'Say�m', href: '/app/stok/sayim', disabled: true },
    ],
  },
  {
    id: 'satis',
    label: 'Sat��',
    icon: <ShoppingCart size={16} />,
    badge: 'Yak�nda',
    children: [
      { label: 'Teklifler', href: '/app/satis/teklifler', disabled: true },
      { label: 'Sipari�ler', href: '/app/satis/siparisler', disabled: true },
      { label: 'M��teriler', href: '/app/satis/musteriler', disabled: true },
    ],
  },
  {
    id: 'uretim',
    label: '�retim',
    icon: <Factory size={16} />,
    badge: 'Yak�nda',
    children: [
      { label: '�� Emirleri', href: '/app/uretim/is-emirleri', disabled: true },
      { label: 'Re�eteler', href: '/app/uretim/receteler', disabled: true },
    ],
  },
  {
    id: 'servis',
    label: 'Teknik Servis',
    icon: <Wrench size={16} />,
    badge: 'Yak�nda',
    children: [
      { label: 'Servis Kay�tlar�', href: '/app/servis/kayitlar', disabled: true },
    ],
  },
  {
    id: 'sys',
    label: 'Sistem Y�netimi',
    icon: <Settings size={16} />,
    children: [
      { label: 'Mod�l Lisanslar�', href: '/app/sistem/module-licenses' },
      { label: 'Sistem Parametreleri', href: '/app/sistem/system-parameters' },
      { label: 'Entegrasyon Ayarlar�', href: '/app/sistem/entegrasyon-ayarlari', moduleKey: 'sistem', submoduleKey: 'entegrasyon-ayarlari' },
      { label: 'Kullan�c�lar', href: '/app/sistem/kullanicilar', disabled: true },
      { label: 'Roller & Yetkiler', href: '/app/sistem/roller', disabled: true },
      { label: 'Sistem Loglar�', href: '/app/sistem/loglar', disabled: true },
    ],
  },
]

const SECTION_LABELS: Record<string, string> = {
  ik: '�nsan Kaynaklar�',
  muhasebe: 'Muhasebe',
  stok: 'Stok & Sat��',
  satis: '',
  uretim: '�retim & Servis',
  servis: '',
  sys: 'Y�netim',
}

interface SidebarProps {
  collapsed?: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export default function Sidebar({ collapsed = false, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { isModuleActive, isSubmoduleActive } = useModuleLicense()
  const [openMods, setOpenMods] = useState<string[]>([])

  function toggleMod(id: string) {
    setOpenMods(prev => (prev.includes(id) ? [] : [id]))
  }

  function isModActive(item: NavItem): boolean {
    if (item.href) return pathname === item.href
    return item.children?.some(c => pathname.startsWith(c.href)) ?? false
  }

  // Auto-open active module on mount
  const renderItem = (item: NavItem, idx: number) => {
    const isActive = isModActive(item)
    const isOpen = openMods.includes(item.id)
    const hasChildren = !!item.children?.length
    const showLabel = SECTION_LABELS[item.id]

    // Check if module is active (in production, hide if inactive)
    const isModuleAvailable = !item.moduleKey || isModuleActive(item.moduleKey)

    // In production, completely hide inactive modules
    const isProd = process.env.NODE_ENV === 'production'
    if (isProd && !isModuleAvailable) return null

    return (
      <div key={item.id}>
        {/* Section label */}
        {showLabel && !collapsed && (
          <div className="text-[9px] font-semibold text-white/25 uppercase tracking-widest
                          px-2 pt-3 pb-1 mt-1">
            {showLabel}
          </div>
        )}

        {/* Main nav item */}
        {item.href ? (
          <Link href={item.href}
                className={cn('ni', isActive && 'active')}>
            <span className={cn('flex-shrink-0 opacity-60', isActive && 'opacity-90')}>{item.icon}</span>
            {!collapsed && <span className="flex-1">{item.label}</span>}
          </Link>
        ) : (
          <button
            onClick={() => toggleMod(item.id)}
            className={cn('ni', (isActive || isOpen) && 'open')}
          >
            <span className={cn('flex-shrink-0 opacity-60', (isActive || isOpen) && 'opacity-90')}>
              {item.icon}
            </span>
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-eden-gold/20 text-eden-gold rounded-full">
                    {item.badge}
                  </span>
                )}
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

              // In production, completely hide inactive submodules
              if (isProd && !isSubmoduleAvailable) return null

              // In dev, show but disable if inactive
              const isDisabled = child.disabled || (!isSubmoduleAvailable && !isProd)

              return (
                <Link
                  key={child.href}
                  href={isDisabled ? '#' : child.href}
                  onClick={e => isDisabled && e.preventDefault()}
                  className={cn(
                    'sni',
                    pathname === child.href && 'active',
                    isDisabled && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 flex-shrink-0" />
                  {child.label}
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
      mobileOpen ? 'w-64' : (collapsed ? 'w-16' : 'w-64')
    )}>
      {/* Logo & Mobile Close */}
      <div className="px-4 py-4 border-b border-white/[0.07] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-eden-blue rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 3l9 4.5-9 4.5-9-4.5L12 3zM3 12l9 4.5 9-4.5M3 17l9 4.5 9-4.5"/>
            </svg>
          </div>
          {!collapsed && !mobileOpen && (
            <div className="min-w-0">
              <div className="text-[9px] font-semibold text-eden-gold uppercase tracking-widest">Eden Teknoloji</div>
              <div className="text-sm font-bold font-display text-white mt-0.5">ERP</div>
            </div>
          )}
          {mobileOpen && (
            <div className="min-w-0">
              <div className="text-[9px] font-semibold text-eden-gold uppercase tracking-widest">Eden Teknoloji</div>
              <div className="text-sm font-bold font-display text-white mt-0.5">ERP</div>
            </div>
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
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-thin">
        {NAV.map((item, idx) => renderItem(item, idx))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-white/[0.07] flex-shrink-0">
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              document.cookie = 'demo_auth=; path=/; max-age=0; sameSite=lax'
              window.location.href = '/login'
            }
          }}
          className="ni text-white/35 text-xs"
        >
          <LogOut size={14} className="opacity-60 flex-shrink-0" />
          {!collapsed && <span>��k�� Yap</span>}
        </button>
      </div>
    </aside>
  )
}

