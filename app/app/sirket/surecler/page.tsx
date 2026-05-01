'use client'

// MODULE LICENSE: sirket/surecler
// Ana Modül: Şirket Yönetimi (sirket)
// Alt Modül: Süreçlerimiz

import { PageBanner } from '@/components/ui/PageBanner'
import { Workflow, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function SureclerPage() {
  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title="Süreçlerimiz"
        subtitle="Onay süreçleri ve iş akışları yönetimi"
        icon={<Workflow size={24} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/app/sirket/surecler/tanimlar"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Süreç Tanımları
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Onay süreci şablonları ve tanımları
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/app/sirket/surecler/aktif"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Aktif Süreçler
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Devam eden onay süreçleri
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/app/sirket/surecler/raporlar"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Süreç Raporları
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Performans ve analiz raporları
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/app/sirket/surecler/izleme"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Süreç İzleme
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Anlık süreç takibi ve dashboard
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
        <div className="text-center">
          <Workflow className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Süreç Yönetimi
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Onay süreçleri ve iş akışları için yönetim ekranları yakında eklenecek.
          </p>
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            Detaylı mimari için: docs/architecture/WorkflowEngine.md
          </p>
        </div>
      </div>
    </div>
  )
}
