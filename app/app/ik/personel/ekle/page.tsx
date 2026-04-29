'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import PersonelForm from '@/components/modules/ik/PersonelForm'

export default function PersonelEklePage() {
  const router = useRouter()

  return (
    <>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <span className="hover:text-gray-900 dark:hover:text-white cursor-pointer" onClick={() => router.push('/')}>Eden ERP</span>
        <span>/</span>
        <span className="hover:text-gray-900 dark:hover:text-white cursor-pointer" onClick={() => router.push('/app/ik')}>İnsan Kaynakları</span>
        <span>/</span>
        <span className="hover:text-gray-900 dark:hover:text-white cursor-pointer" onClick={() => router.push('/app/ik/personel')}>Çalışanlar</span>
        <span>/</span>
        <span className="text-gray-900 dark:text-white font-medium">Çalışan Ekle</span>
      </nav>

      <PageBanner
        title="Çalışan Ekle"
        icon={<ChevronLeft size={24} />}
        onAddClick={() => router.back()}
        addButtonText="Geri Dön"
      />

      <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <PersonelForm
          onSuccess={() => router.push('/app/ik/personel')}
          onCancel={() => router.back()}
        />
      </div>
    </>
  )
}
