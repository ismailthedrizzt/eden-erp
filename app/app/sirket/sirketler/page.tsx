'use client'

// MODULE LICENSE: sirket/sirketler
// Ana Modül: Şirket Yönetimi (sirket)
// Alt Modül: Şirketlerimiz

import { PageBanner } from '@/components/ui/PageBanner'
import { Building2 } from 'lucide-react'

export default function SirketlerPage() {
  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title="Şirketlerimiz"
        subtitle="Yönetilen şirketler listesi"
        icon={<Building2 size={24} />}
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Şirketler Yönetimi
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Bu sayfa şirket listesi ve yönetimi için hazırlanacak.
          </p>
        </div>
      </div>
    </div>
  )
}
