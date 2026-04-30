'use client'

// MODULE LICENSE: ik/personel
// Ana Modül: İnsan Kaynakları (ik)
// Alt Modül: Çalışanlar (personel)

import { useRouter } from 'next/navigation'
import { usePersonel } from '@/hooks/usePersonel'
import { Users } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef, WidgetDef } from '@/components/ui/SmartDataTable'
import type { Personel } from '@/types'

type PersonelTableRow = Personel & { fullname: string; birim_adi: string; kadro_unvani: string }

export default function CalisanlarPage() {
  const router = useRouter()
  const { data: personel, loading, error, yenile } = usePersonel()

  // Transform data to include computed fields
  const tableData = (personel || []).map(p => ({
    ...p,
    fullname: `${p.ad || ''} ${p.soyad || ''}`.trim(),
    birim_adi: p.birim?.ad || '-',
    kadro_unvani: p.kadro?.unvan || '-'
  }))

  // Column definitions for SmartDataTable
  const columns: ColumnDef[] = [
    {
      key: 'fotograf_url',
      label: 'Fotoğraf',
      type: 'image',
      required: true,
      visible: true,
      width: 60,
      fixedWidth: true,
      sortable: false,
      filterable: false,
      render: (value) => (
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-gray-500">-</span>
          )}
        </div>
      )
    },
    {
      key: 'fullname',
      label: 'Adı Soyadı',
      type: 'text',
      required: true,
      visible: true,
      width: 200,
      minWidth: 120,
      sortable: true,
      filterable: true
    },
    {
      key: 'tc_kimlik',
      label: 'TC Kimlik',
      type: 'text',
      width: 120,
      sortable: true,
      filterable: true
    },
    {
      key: 'uyruk',
      label: 'Uyruk',
      type: 'enum',
      width: 100,
      sortable: true,
      filterable: true,
      enumOptions: ['tc', 'yabanci']
    },
    {
      key: 'cinsiyet',
      label: 'Cinsiyet',
      type: 'enum',
      width: 100,
      sortable: true,
      filterable: true,
      enumOptions: ['erkek', 'kadin']
    },
    {
      key: 'dogum_tarihi',
      label: 'Doğum Tarihi',
      type: 'date',
      width: 130,
      sortable: true,
      filterable: true,
      render: (value) => value ? new Date(value).toLocaleDateString('tr-TR') : '-'
    },
    {
      key: 'cep_telefonu',
      label: 'Telefon',
      type: 'text',
      width: 130,
      sortable: false,
      filterable: true
    },
    {
      key: 'email',
      label: 'E-posta',
      type: 'text',
      width: 200,
      sortable: true,
      filterable: true
    },
    {
      key: 'birim_adi',
      label: 'Birim',
      type: 'text',
      width: 150,
      sortable: true,
      filterable: true,
      moduleDependency: 'teskilat'
    },
    {
      key: 'kadro_unvani',
      label: 'Ünvan',
      type: 'text',
      width: 180,
      sortable: true,
      filterable: true,
      moduleDependency: 'teskilat'
    },
    {
      key: 'calisma_durumu',
      label: 'Durum',
      type: 'enum',
      width: 110,
      sortable: true,
      filterable: true,
      enumOptions: ['gorevde', 'izinde', 'ayrilmis'],
      render: (value) => {
        const colors: Record<string, string> = {
          gorevde: 'bg-green-100 text-green-800',
          izinde: 'bg-yellow-100 text-yellow-800',
          ayrilmis: 'bg-red-100 text-red-800'
        }
        const labels: Record<string, string> = {
          gorevde: 'Görevde',
          izinde: 'İzinde',
          ayrilmis: 'Ayrılmış'
        }
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
            {labels[value] || value}
          </span>
        )
      }
    },
    {
      key: 'sgk_giris',
      label: 'SGK Giriş',
      type: 'date',
      width: 130,
      sortable: true,
      filterable: true,
      render: (value) => value ? new Date(value).toLocaleDateString('tr-TR') : '-'
    }
  ]

  // Widget definitions for quick info
  const widgets: WidgetDef<PersonelTableRow>[] = [
    {
      key: 'total',
      label: 'Toplam Çalışan',
      render: () => tableData.length
    },
    {
      key: 'active',
      label: 'Görevde',
      render: () => tableData.filter(p => p.calisma_durumu === 'gorevde').length
    },
    {
      key: 'onLeave',
      label: 'İzinde',
      render: () => tableData.filter(p => p.calisma_durumu === 'izinde').length
    },
    {
      key: 'left',
      label: 'Ayrılmış',
      render: () => tableData.filter(p => p.calisma_durumu === 'ayrilmis').length
    }
  ]

  return (
    <>
      <PageBanner
        title="Çalışanlar"
        icon={<Users size={24} />}
        onAddClick={() => router.push('/app/ik/personel/ekle')}
        addButtonText="Ekle"
      />

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">Hata: {error}</p>
        </div>
      )}

      <div className="mt-6">
        <SmartDataTable<PersonelTableRow>
          data={tableData}
          columns={columns}
          title="Personel Listesi"
          storageKey="personel-list"
          widgets={widgets}
          defaultView="list"
          defaultPageSize={25}
          pageSizeOptions={[10, 25, 50, 100]}
          loading={loading}
          emptyText="Henüz personel kaydı bulunmamaktadır."
          realtime={true}
          pollingInterval={30000}
          onRowClick={(row) => router.push(`/app/ik/personel/${row.id}`)}
          onRefresh={yenile}
        />
      </div>
    </>
  )
}
