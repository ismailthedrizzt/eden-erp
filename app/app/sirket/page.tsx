'use client'
// MODULE LICENSE: sirket/dashboard
// Ana Modul: Sirket Yonetimi (sirket)
// Alt Modul: Dashboard

import { PageBanner } from '@/components/ui/PageBanner'
import { Building2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { companyHubPageContract } from '@/contracts/pages/company/company-hub.page.contract'

const iconByName = { Building2 } as const

export default function SirketDashboardPage() {
  const { banner, moduleCards, emptyWidgetMessage } = companyHubPageContract.dashboard
  const BannerIcon = iconByName[banner.icon]

  return (
    <div className="space-y-6">
      <PageBanner mode="list" title={banner.title} subtitle={banner.subtitle} icon={<BannerIcon size={24} />} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {moduleCards.map((module) => {
          const ModuleIcon = iconByName[module.icon]
          return (
            <Link key={module.href} href={module.href} className="group block p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-lg ${module.colorClass} bg-opacity-10`}>
                  <ModuleIcon className={`w-6 h-6 ${module.colorClass.replace('bg-', 'text-')}`} />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{module.title}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{module.description}</p>
            </Link>
          )
        })}
      </div>

      <div className="mt-8 p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <p className="text-center text-gray-500 dark:text-gray-400">{emptyWidgetMessage}</p>
      </div>
    </div>
  )
}
