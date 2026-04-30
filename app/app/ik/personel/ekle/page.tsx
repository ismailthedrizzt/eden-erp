'use client'

import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import PersonelForm from '@/components/modules/ik/PersonelForm'

export default function PersonelEklePage() {
  const router = useRouter()

  return (
    <>
      <PageBanner
        title="Çalışan Ekle"
        icon={<Users size={24} />}
        onAddClick={() => router.back()}
        addButtonText="Listeye Dön"
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
