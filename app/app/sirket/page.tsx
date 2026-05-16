'use client'

// MODULE LICENSE: sirket/dashboard
// Ana Modül: Şirket Yönetimi (sirket)
// Alt Modül: Dashboard

import { PageBanner } from '@/components/ui/PageBanner'
import { Building2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function SirketDashboardPage() {
  const modules = [
    {
      title: 'Şirketlerimiz',
      description: 'Yönetilen şirketler listesi ve detayları',
      href: '/app/sirket/companies',
      icon: Building2,
      color: 'bg-blue-500'
    },
    {
      title: 'Teşkilat ve Kadro',
      description: 'Birimler, kadrolar ve organizasyon yapısı',
      href: '/app/sirket/teskilat',
      icon: Building2,
      color: 'bg-green-500'
    },
    {
      title: 'Süreçlerimiz',
      description: 'Onay süreçleri ve iş akışları',
      href: '/app/sirket/surecler',
      icon: Building2,
      color: 'bg-purple-500'
    },
    {
      title: 'Tesislerimiz',
      description: 'Bina, ofis ve lokasyon yönetimi',
      href: '/app/sirket/tesisler',
      icon: Building2,
      color: 'bg-orange-500'
    },
    {
      title: 'Şirket Araçlarımız',
      description: 'Araç filosu ve araç takibi',
      href: '/app/sirket/araclar',
      icon: Building2,
      color: 'bg-red-500'
    },
    {
      title: 'Demirbaş ve Zimmetler',
      description: 'Sabit kıymetler ve zimmet yönetimi',
      href: '/app/sirket/demirbas',
      icon: Building2,
      color: 'bg-teal-500'
    }
  ]

  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title="Şirket Yönetimi"
        subtitle="Şirket yapılandırması ve organizasyon yönetimi"
        icon={<Building2 size={24} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group block p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-lg ${module.color} bg-opacity-10`}>
                <module.icon className={`w-6 h-6 ${module.color.replace('bg-', 'text-')}`} />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              {module.title}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {module.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Placeholder for future widgets */}
      <div className="mt-8 p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Dashboard widget&apos;ları yakında eklenecek
        </p>
      </div>
    </div>
  )
}
