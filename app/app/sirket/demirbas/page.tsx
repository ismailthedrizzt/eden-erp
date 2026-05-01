'use client'

// MODULE LICENSE: sirket/demirbas
// Ana Modül: Şirket Yönetimi (sirket)
// Alt Modül: Demirbaş ve Zimmetler

import { PageBanner } from '@/components/ui/PageBanner'
import { Package, Tag, ArrowRight, QrCode } from 'lucide-react'
import Link from 'next/link'

export default function DemirbasPage() {
  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title="Demirbaş ve Zimmetler"
        subtitle="Sabit kıymetler ve zimmet yönetimi"
        icon={<Package size={24} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/app/sirket/demirbas/envanter"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-teal-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Envanter
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Tüm demirbaş kayıtları
              </p>
            </div>
            <Package className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/app/sirket/demirbas/kategoriler"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-teal-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Kategoriler
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Demirbaş kategori ve tipleri
              </p>
            </div>
            <Tag className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/app/sirket/demirbas/zimmet"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-teal-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Zimmet Yönetimi
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Personel zimmet atamaları
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/app/sirket/demirbas/barkod"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-teal-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Barkod / QR
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Barkod oluşturma ve tarayıcı
              </p>
            </div>
            <QrCode className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/app/sirket/demirbas/raporlar"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-teal-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Raporlar
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Envanter ve amortisman raporları
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/app/sirket/demirbas/sayim"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-teal-500 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Sayım
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Periyodik sayım ve kontrol
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Demirbaş Yönetimi
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Sabit kıymetler ve zimmet yönetimi ekranları yakında eklenecek.
          </p>
        </div>
      </div>
    </div>
  )
}
