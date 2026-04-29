'use client'

// MODULE LICENSE: ik/personel
// Ana Modül: İnsan Kaynakları (ik)
// Alt Modül: Çalışanlar (personel)

import { useRouter } from 'next/navigation'
import { usePersonel } from '@/hooks/usePersonel'
import { Users } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import DataTable, { Column } from '@/components/ui/DataTable'

export default function CalisanlarPage() {
  const router = useRouter()
  const { data: personel, loading, yenile } = usePersonel()

  const columns: Column<any>[] = [
    {
      key: 'photo',
      header: 'Resim',
      width: '80px',
      align: 'center',
      sortable: false,
      render: (row) => (
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
          {row.photo ? (
            <img src={row.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-gray-500">-</span>
          )}
        </div>
      )
    },
    {
      key: 'fullname',
      header: 'Adı Soyadı',
      sortable: true,
      render: (row) => `${row.ad || ''} ${row.soyad || ''}`
    },
    {
      key: 'dogum_tarihi',
      header: 'Doğum Tarihi',
      sortable: true,
      render: (row) => row.dogum_tarihi ? new Date(row.dogum_tarihi).toLocaleDateString('tr-TR') : '-'
    },
    {
      key: 'birim',
      header: 'Birim',
      sortable: true,
      render: (row) => row.unit || '-'
    },
    {
      key: 'position',
      header: 'Görevi',
      sortable: true,
      render: (row) => row.position || '-'
    }
  ]

  return (
    <>
      <PageBanner
        title="Çalışanlar"
        icon={<Users size={24} />}
        onAddClick={() => router.push('/app/ik/personel/ekle')}
        addButtonText="+Ekle"
        showAddIcon={false}
      />

      <div className="mt-6">
        <DataTable
          data={personel}
          columns={columns}
          loading={loading}
          searchPlaceholder="Çalışan ara..."
          enableCardView={true}
        />
      </div>
    </>
  )
}
