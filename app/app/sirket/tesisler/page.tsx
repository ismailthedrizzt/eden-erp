'use client'

// MODULE LICENSE: sirket/tesisler
// Ana Modül: Şirket Yönetimi (sirket)
// Alt Modül: Tesislerimiz

import { PageBanner } from '@/components/ui/PageBanner'
import { Building, MapPin, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function TesislerPage() {
  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title="Tesislerimiz"
        subtitle="Bina, ofis ve lokasyon yönetimi"
        icon={<Building size={24} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/app/sirket/tesisler/binalar"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Binalar
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Bina kayıtları ve bilgileri
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/app/sirket/tesisler/ofisler"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Ofisler
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Ofis ve departman lokasyonları
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/app/sirket/tesisler/lokasyonlar"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Lokasyonlar
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Coğrafi lokasyon ve adres yönetimi
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/app/sirket/tesisler/haritalar"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Harita Görünümü
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Lokasyonların harita üzerinde gösterimi
              </p>
            </div>
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
        <div className="text-center">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Tesis Yönetimi
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Bina, ofis ve lokasyon yönetimi ekranları yakında eklenecek.
          </p>
        </div>
      </div>
    </div>
  )
}
