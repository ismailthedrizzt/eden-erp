'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home, Users, Building2, CreditCard, Package, ShoppingCart,
  Settings, Factory, Wrench, ChevronRight, LogOut, Download,
  BarChart2, List, AlertCircle, FolderOpen, Wallet
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  href?: string
  badge?: string
  disabled?: boolean
  children?: {
    label: string
    href: string
    disabled?: boolean
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
    id: 'ik',
    label: 'İnsan Kaynakları',
    icon: <Users size={16} />,
    children: [
      { label: 'Teşkilat & Kadro', href: '/app/ik/teskilat' },
      { label: 'Personel Listesi', href: '/app/ik/personel' },
      { label: 'Personel Ekle', href: '/app/ik/personel-ekle' },
      { label: 'İzin Yönetimi', href: '/app/ik/izin', disabled: true },
      { label: 'Performans', href: '/app/ik/performans', disabled: true },
    ],
  },
  {
    id: 'muhasebe',
    label: 'Muhasebe',
    icon: <CreditCard size={16} />,
    children: [
      { label: 'Dashboard', href: '/app/muhasebe/dashboard' },
      { label: 'Tüm İşlemler', href: '/app/muhasebe/islemler' },
      { label: 'Borç Takip', href: '/app/muhasebe/borclar' },
      { label: 'Proje Özeti', href: '/app/muhasebe/projeler' },
      { label: 'Hesaplar', href: '/app/muhasebe/hesaplar' },
    ],
  },
  {
    id: 'stok',
    label: 'Stok Yönetimi',
    icon: <Package size={16} />,
    badge: 'Yakında',
    children: [
      { label: 'Ürün Listesi', href: '/app/stok/urunler', disabled: true },
      { label: 'Depo Hareketleri', href: '/app/stok/hareketler', disabled: true },
      { label: 'Sayım', href: '/app/stok/sayim', disabled: true },
    ],
  },
  {
    id: 'satis',
    label: 'Satış',
    icon: <ShoppingCart size={16} />,
    badge: 'Yakında',
    children: [
      { label: 'Teklifler', href: '/app/satis/teklifler', disabled: true },
      { label: 'Siparişler', href: '/app/satis/siparisler', disabled: true },
      { label: 'Müşteriler', href: '/app/satis/musteriler', disabled: true },
    ],
  },
  {
    id: 'uretim',
    label: 'Üretim',
    icon: <Factory size={16} />,
    badge: 'Yakında',
    children: [
      { label: 'İş Emirleri', href: '/app/uretim/is-emirleri', disabled: true },
      { label: 'Reçeteler', href: '/app/uretim/receteler', disabled: true },
    ],
  },
  {
    id: 'servis',
    label: 'Teknik Servis',
    icon: <Wrench size={16} />,
    badge: 'Yakında',
    children: [
      { label: 'Servis Kayıtları', href: '/app/servis/kayitlar', disabled: true },
    ],
  },
  {
    id: 'sys',
    label: 'Sistem Yönetimi',
    icon: <Settings size={16} />,
    children: [
      { label: 'Kullanıcılar', href: '/app/sistem/kullanicilar', disabled: true },
      { label: 'Roller & Yetkiler', href: '/app/sistem/roller', disabled: true },
      { label: 'Sistem Logları', href: '/app/sistem/loglar', disabled: true },
    ],
  },
]

const SECTION_LABELS: Record<string, string> = {
  ik: 'İnsan Kaynakları',
  muhasebe: 'Muhasebe',
  stok: 'Stok & Satış',
  satis: '',
  uretim: 'Üretim & Servis',
  servis: '',
  sys: 'Yönetim',
}

export default function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname()
  const [openMods, setOpenMods] = useState<string[]>(['muhasebe', 'ik'])

  function toggleMod(id: string) {
    setOpenMods(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
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
            {item.children!.map(child => (
              <Link
                key={child.href}
                href={child.disabled ? '#' : child.href}
                onClick={e => child.disabled && e.preventDefault()}
                className={cn(
                  'sni',
                  pathname === child.href && 'active',
                  child.disabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 flex-shrink-0" />
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className={cn(
      'flex flex-col bg-eden-navy transition-all duration-200 overflow-hidden flex-shrink-0',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/[0.07] flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 bg-eden-blue rounded-lg flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 3l9 4.5-9 4.5-9-4.5L12 3zM3 12l9 4.5 9-4.5M3 17l9 4.5 9-4.5"/>
          </svg>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-[9px] font-semibold text-eden-gold uppercase tracking-widest">Eden Teknoloji</div>
            <div className="text-sm font-bold font-display text-white mt-0.5">ERP</div>
          </div>
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
          {!collapsed && <span>Çıkış Yap</span>}
        </button>
      </div>
    </aside>
  )
}
