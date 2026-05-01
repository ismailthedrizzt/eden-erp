'use client'

// MODULE LICENSE: sirket/teskilat
// Ana Modül: Şirket Yönetimi (sirket)
// Alt Modül: Teşkilat ve Kadro

import { PageBanner } from '@/components/ui/PageBanner'
import { Building2, Users, Network } from 'lucide-react'
import Link from 'next/link'

export default function TeskilatPage() {
  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title="Teşkilat ve Kadro"
        subtitle="Birimler, kadrolar ve organizasyon yapısı"
        icon={<Network size={24} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/app/sirket/teskilat/birimler"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Birimler
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Organizasyon birimleri ve hiyerarşi
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/app/sirket/teskilat/kadrolar"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Kadrolar
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pozisyonlar ve kadro yönetimi
              </p>
            </div>
          </div>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
        <div className="text-center">
          <Network className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Teşkilat Yönetimi
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Birimler ve kadrolar için detay yönetim ekranları yakında eklenecek.
          </p>
        </div>
      </div>
    </div>
  )
}
