'use client'

/**
 * ERP PAGE TEMPLATE: Personel Yönetimi
 * 
 * This page follows the standard ERP data management pattern:
 * - PageBanner: Header with "Create New" action
 * - SmartDataTable: List view with row selection
 * - EntityForm: Create/View/Edit in drawer (no separate pages)
 * 
 * @see docs/templates/ERPPageTemplate.md
 * @see components/ui/EntityForm.md
 * @see components/ui/PageBanner.md
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Phone, Mail, Building2, Briefcase, FileText, UserCircle } from 'lucide-react'
import { usePersonel } from '@/hooks/usePersonel'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef, WidgetDef } from '@/components/ui/SmartDataTable'
import { EntityForm, FormField, FormTab, FormMode } from '@/components/ui/EntityForm'
import { Toast } from '@/components/ui/Toast'
import type { Personel } from '@/types'

// Extended type for table display
type PersonelTableRow = Personel & { 
  fullname: string
  birim_adi: string 
  kadro_unvani: string 
}

// Page state type following ERP pattern
type PageState = 'list' | 'create' | 'view' | 'edit'

export default function PersonelYonetimPage() {
  const router = useRouter()
  const { data: personel, loading: listLoading, error: listError, yenile } = usePersonel()
  
  // Page state
  const [pageState, setPageState] = useState<PageState>('list')
  const [selectedPersonel, setSelectedPersonel] = useState<Personel | null>(null)
  
  // Form state
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Transform data for table
  const tableData: PersonelTableRow[] = (personel || []).map(p => ({
    ...p,
    fullname: `${p.ad || ''} ${p.soyad || ''}`.trim(),
    birim_adi: '-',  // Simplified without teskilat module check
    kadro_unvani: '-'
  }))

  // Event Handlers
  const handleAddClick = () => {
    setSelectedPersonel(null)
    setFormError(null)
    setPageState('create')
  }

  const handleRowClick = (row: PersonelTableRow) => {
    setSelectedPersonel(row as Personel)
    setFormError(null)
    setPageState('view')
  }

  const handleSave = async (data: Record<string, any>, mode: FormMode) => {
    setSaving(true)
    setFormError(null)
    
    try {
      if (mode === 'create') {
        // Create new personel
        const response = await fetch('/api/ik/personel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Kayıt oluşturulamadı')
        }
        
        setToast({ type: 'success', message: 'Personel kaydı oluşturuldu' })
      } else {
        // Update existing personel
        const response = await fetch(`/api/ik/personel/${selectedPersonel?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Güncelleme başarısız')
        }
        
        const result = await response.json()
        setSelectedPersonel(result.data)
        setToast({ type: 'success', message: 'Personel bilgileri güncellendi' })
      }
      
      // Refresh list and return to list view
      await yenile()
      setPageState('list')
    } catch (err: any) {
      setFormError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedPersonel) return
    
    setDeleting(true)
    try {
      const response = await fetch(`/api/ik/personel/${selectedPersonel.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Silme işlemi başarısız')
      }
      
      setToast({ type: 'success', message: 'Personel kaydı silindi' })
      await yenile()
      setPageState('list')
    } catch (err: any) {
      setFormError(err.message)
      throw err
    } finally {
      setDeleting(false)
    }
  }

  // Form Configuration
  const heroFields: FormField[] = [
    { name: 'ad', label: 'Ad', type: 'text', required: true },
    { name: 'soyad', label: 'Soyad', type: 'text', required: true },
    { name: 'tc_kimlik', label: 'TC Kimlik', type: 'text' },
    { 
      name: 'uyruk', 
      label: 'Uyruk', 
      type: 'select',
      options: [
        { value: 'tc', label: 'T.C.' },
        { value: 'yabanci', label: 'Yabancı' }
      ]
    },
    { 
      name: 'cinsiyet', 
      label: 'Cinsiyet', 
      type: 'select',
      options: [
        { value: '', label: 'Seçiniz' },
        { value: 'erkek', label: 'Erkek' },
        { value: 'kadin', label: 'Kadın' }
      ]
    },
    { name: 'dogum_tarihi', label: 'Doğum Tarihi', type: 'date' },
    { name: 'dogum_yeri', label: 'Doğum Yeri', type: 'text' },
    { 
      name: 'kan_grubu', 
      label: 'Kan Grubu', 
      type: 'select',
      options: [
        { value: '', label: 'Seçiniz' },
        { value: 'A+', label: 'A+' },
        { value: 'A-', label: 'A-' },
        { value: 'B+', label: 'B+' },
        { value: 'B-', label: 'B-' },
        { value: 'AB+', label: 'AB+' },
        { value: 'AB-', label: 'AB-' },
        { value: '0+', label: '0+' },
        { value: '0-', label: '0-' }
      ]
    },
    { 
      name: 'medeni_durum', 
      label: 'Medeni Durum', 
      type: 'select',
      options: [
        { value: '', label: 'Seçiniz' },
        { value: 'bekar', label: 'Bekar' },
        { value: 'evli', label: 'Evli' },
        { value: 'dul', label: 'Dul' },
        { value: 'bosanmis', label: 'Boşanmış' }
      ]
    }
  ]

  const tabs: FormTab[] = [
    {
      id: 'iletisim',
      label: 'İletişim',
      icon: <Phone size={16} />,
      fields: [
        { name: 'cep_telefonu', label: 'Cep Telefonu', type: 'tel' },
        { name: 'is_telefonu', label: 'İş Telefonu', type: 'tel' },
        { name: 'email', label: 'E-posta', type: 'email' },
        { name: 'adres', label: 'Adres', type: 'textarea', colSpan: 2 },
        { name: 'il', label: 'İl', type: 'text' },
        { name: 'ilce', label: 'İlçe', type: 'text' }
      ]
    },
    {
      id: 'acil',
      label: 'Acil Durum',
      icon: <UserCircle size={16} />,
      fields: [
        { name: 'acil_kisi_ad', label: 'Acil Kişi Adı', type: 'text' },
        { name: 'acil_kisi_soyad', label: 'Acil Kişi Soyadı', type: 'text' },
        { name: 'acil_kisi_yakinlik', label: 'Yakınlık Derecesi', type: 'text' },
        { name: 'acil_kisi_telefon', label: 'Acil Telefon', type: 'tel' }
      ]
    },
    {
      id: 'calisma',
      label: 'Çalışma',
      icon: <Briefcase size={16} />,
      fields: [
        { 
          name: 'calisma_durumu', 
          label: 'Çalışma Durumu', 
          type: 'select',
          options: [
            { value: 'gorevde', label: 'Görevde' },
            { value: 'izinde', label: 'İzinde' },
            { value: 'ayrilmis', label: 'Ayrılmış' },
            { value: 'askida', label: 'Askıda' }
          ]
        },
        { name: 'sgk_giris', label: 'SGK Giriş Tarihi', type: 'date' },
        { name: 'isten_ayrilis', label: 'İşten Ayrılış', type: 'date' },
        { name: 'iban', label: 'IBAN', type: 'text', colSpan: 2 }
      ]
    },
    {
      id: 'notlar',
      label: 'Notlar',
      icon: <FileText size={16} />,
      fields: [
        { name: 'notlar', label: 'Notlar', type: 'textarea', colSpan: 3 }
      ]
    }
  ]

  // Table columns
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
      category: 'Kişisel'
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
      filterable: true,
      category: 'Kişisel'
    },
    {
      key: 'tc_kimlik',
      label: 'TC Kimlik',
      type: 'text',
      required: true,
      visible: true,
      width: 120,
      sortable: true,
      filterable: true,
      category: 'Kişisel'
    },
    {
      key: 'uyruk',
      label: 'Uyruk',
      type: 'enum',
      required: true,
      visible: true,
      width: 100,
      sortable: true,
      filterable: true,
      enumOptions: ['Türk', 'Yabancı', 'TC', 'YUNAN', 'ALMAN', 'AMERİKALI'],
      category: 'Kişisel'
    },
    {
      key: 'cinsiyet',
      label: 'Cinsiyet',
      type: 'enum',
      required: true,
      visible: true,
      width: 100,
      sortable: true,
      filterable: true,
      enumOptions: ['Erkek', 'Kadın'],
      category: 'Kişisel'
    },
    {
      key: 'dogum_tarihi',
      label: 'Doğum Tarihi',
      type: 'date',
      width: 130,
      sortable: true,
      filterable: true,
      category: 'Kişisel',
      render: (value) => value ? new Date(value).toLocaleDateString('tr-TR') : '-'
    },
    {
      key: 'cep_telefonu',
      label: 'Telefon',
      type: 'text',
      width: 130,
      sortable: false,
      filterable: true,
      category: 'İletişim'
    },
    {
      key: 'email',
      label: 'E-posta',
      type: 'text',
      width: 200,
      sortable: true,
      filterable: true,
      category: 'İletişim'
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

  // Widgets
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

  // Determine form mode for display
  const formMode: FormMode = pageState === 'create' ? 'create' : 
                            pageState === 'edit' ? 'edit' : 'view'

  return (
    <div className="relative">
      <PageBanner
        mode="list"
        title="Çalışanlar"
        subtitle="Personel kayıtlarını yönetin"
        icon={<Users size={24} />}
        onAddClick={handleAddClick}
        addButtonText="Ekle"
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* List View */}
      {pageState === 'list' && (
        <div className="mt-6">
          {listError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400">Hata: {listError}</p>
            </div>
          )}
          
          <SmartDataTable<PersonelTableRow>
            data={tableData}
            columns={columns}
            storageKey="personel-list"
            widgets={widgets}
            defaultView="list"
            defaultPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            loading={listLoading}
            emptyText="Henüz personel kaydı bulunmamaktadır."
            realtime={true}
            pollingInterval={30000}
            onRowClick={handleRowClick}
            onRefresh={yenile}
          />
        </div>
      )}

      {/* Form View (Create/View/Edit) */}
      {pageState !== 'list' && (
        <div className="mt-6">
          <EntityForm
            mode={formMode}
            entityName="Personel"
            entityNameSingular="Personel"
            heroFields={heroFields}
            tabs={tabs}
            data={selectedPersonel || undefined}
            saving={saving}
            deleting={deleting}
            error={formError}
            onSave={handleSave}
            onCancel={() => setPageState('list')}
            onDelete={handleDelete}
            onModeChange={(mode) => setPageState(mode)}
          />
        </div>
      )}
    </div>
  )
}
