'use client'

// MODULE LICENSE: sirket/araclar
// Ana Modül: Şirket Yönetimi (sirket)
// Alt Modül: Şirket Araçlarımız

import { PageBanner } from '@/components/ui/PageBanner'
import { Car, Truck, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function AraclarPage() {
  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title="Şirket Araçlarımız"
        subtitle="Araç filosu ve araç takibi"
        icon={<Car size={24} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/app/sirket/araclar/filo"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-red-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Araç Filosu
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Tüm şirket araçları listesi
              </p>
            </div>
            <Car className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/app/sirket/araclar/takip"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-red-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Araç Takibi
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                GPS takip ve konum bilgileri
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/app/sirket/araclar/bakim"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-red-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Bakım ve Servis
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Periyodik bakım ve servis kayıtları
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/app/sirket/araclar/giderler"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-red-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Yakıt ve Giderler
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Araç gider takibi ve raporlama
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/app/sirket/araclar/zimmet"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-red-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Araç Zimmetleri
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Çalışan araç atamaları
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/app/sirket/araclar/ticari"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-red-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Ticari Araçlar
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Kamyon, van ve iş makineleri
              </p>
            </div>
            <Truck className="w-5 h-5 text-gray-400" />
          </div>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
        <div className="text-center">
          <Car className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Araç Yönetimi
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Araç filosu ve takip ekranları yakında eklenecek.
          </p>
        </div>
      </div>
    </div>
  )
}
