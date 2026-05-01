'use client'

/**
 * ERP PAGE TEMPLATE: Şirketler Yönetimi
 * 
 * This page follows the standard ERP data management pattern:
 * - PageBanner: Header with "Create New" action
 * - SmartDataTable: List view with row selection
 * - SirketForm: Create/View/Edit in drawer with full features
 * 
 * @see docs/templates/ERPPageTemplate.md
 * @see components/modules/sirket/SirketForm.tsx
 * @see components/modules/sirket/DocumentLoader.tsx
 * @see components/modules/sirket/LogoUploader.tsx
 */

import { useState } from 'react'
import { Building2, FileText, Globe, Phone, Mail } from 'lucide-react'
import { useSirketler } from '@/hooks/useSirketler'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef } from '@/components/ui/SmartDataTable'
import { SirketForm } from '@/components/modules/sirket/SirketForm'
import { Drawer } from '@/components/ui/Drawer'
import { Toast } from '@/components/ui/Toast'
import type { Sirket } from '@/types/sirket'

// Extended type for table display
type SirketTableRow = Sirket & {
  adres_ozet: string
}

// Page state type following ERP pattern
type PageState = 'list' | 'create' | 'view' | 'edit'

const columns: ColumnDef[] = [
  {
    key: 'kisa_unvan',
    label: 'Şirket Adı',
    type: 'text',
    width: 200,
    sortable: true,
    category: 'Kimlik'
  },
  {
    key: 'ticari_unvan',
    label: 'Ticari Ünvan',
    type: 'text',
    width: 280,
    sortable: true,
    category: 'Kimlik'
  },
  {
    key: 'vkn_tckn',
    label: 'VKN/TCKN',
    type: 'text',
    width: 120,
    sortable: true,
    category: 'Kimlik'
  },
  {
    key: 'vergi_dairesi',
    label: 'Vergi Dairesi',
    type: 'text',
    width: 130,
    sortable: true,
    category: 'Vergi'
  },
  {
    key: 'sirket_turu',
    label: 'Şirket Türü',
    type: 'enum',
    width: 140,
    sortable: true,
    category: 'Tescil'
  },
  {
    key: 'adres_ozet',
    label: 'Adres',
    type: 'text',
    width: 250,
    category: 'Adres'
  },
  {
    key: 'telefon',
    label: 'Telefon',
    type: 'text',
    width: 140,
    category: 'İletişim'
  },
  {
    key: 'email',
    label: 'Email',
    type: 'text',
    width: 200,
    category: 'İletişim'
  },
  {
    key: 'is_active',
    label: 'Durum',
    type: 'boolean',
    width: 100,
    sortable: true,
    category: 'Durum'
  }
]

export default function SirketlerPage() {
  const { data: sirketler, loading, error: listError, yenile } = useSirketler()
  
  // Page state
  const [pageState, setPageState] = useState<PageState>('list')
  const [selectedSirket, setSelectedSirket] = useState<Sirket | null>(null)
  
  // Form state
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  
  // Drawer open state
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Transform data for table
  const tableData: SirketTableRow[] = (sirketler || []).map(s => ({
    ...s,
    adres_ozet: `${s.ilce || ''}, ${s.il || ''}`
  }))

  // Event Handlers
  const handleAddClick = () => {
    setSelectedSirket(null)
    setFormError(null)
    setPageState('create')
    setDrawerOpen(true)
  }

  const handleRowClick = (row: SirketTableRow) => {
    setSelectedSirket(row)
    setFormError(null)
    setPageState('view')
    setDrawerOpen(true)
  }

  const handleEditClick = () => {
    setPageState('edit')
  }

  const handleClose = () => {
    setDrawerOpen(false)
    setPageState('list')
    setSelectedSirket(null)
    setFormError(null)
  }

  const handleSave = async (data: Record<string, any>, mode: PageState) => {
    setSaving(true)
    setFormError(null)
    
    try {
      // Prepare data for API
      const apiData = {
        ...data,
        // Remove temporary fields that shouldn't be saved directly
        logolar: undefined,
        dokumanlar: undefined,
        ortaklar: undefined,
        temsilciler: undefined
      }

      if (mode === 'create') {
        const response = await fetch('/api/sirketler', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData)
        })
        
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Şirket oluşturulamadı')
        }
        
        setToast({ type: 'success', message: 'Şirket kaydı oluşturuldu' })
      } else {
        const response = await fetch(`/api/sirketler/${selectedSirket?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData)
        })
        
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Güncelleme başarısız')
        }
        
        setToast({ type: 'success', message: 'Şirket bilgileri güncellendi' })
      }
      
      yenile()
      handleClose()
    } catch (err: any) {
      setFormError(err.message || 'Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSirket) return
    
    if (!confirm(`"${selectedSirket.kisa_unvan}" şirketini silmek istediğinize emin misiniz?`)) {
      return
    }
    
    setDeleting(true)
    
    try {
      const response = await fetch(`/api/sirketler/${selectedSirket.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Silme işlemi başarısız')
      }
      
      setToast({ type: 'success', message: 'Şirket kaydı silindi' })
      yenile()
      handleClose()
    } catch (err: any) {
      setFormError(err.message || 'Silme işlemi sırasında hata oluştu')
    } finally {
      setDeleting(false)
    }
  }

  const getDrawerTitle = () => {
    switch (pageState) {
      case 'create': return 'Yeni Şirket'
      case 'view': return selectedSirket?.kisa_unvan || 'Şirket Detayı'
      case 'edit': return `${selectedSirket?.kisa_unvan || ''} - Düzenle`
      default: return ''
    }
  }

  const getDrawerSubtitle = () => {
    switch (pageState) {
      case 'create': return 'Yeni şirket kaydı oluşturun'
      case 'view': return 'Şirket bilgilerini görüntüleyin'
      case 'edit': return 'Şirket bilgilerini güncelleyin'
      default: return ''
    }
  }

  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title="Şirketlerimiz"
        subtitle="Yönetilen şirketler listesi"
        icon={<Building2 size={24} />}
        onActionClick={handleAddClick}
        actionLabel="Yeni Şirket"
      />

      {listError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
        </div>
      )}

      <SmartDataTable
        columns={columns}
        data={tableData}
        loading={loading}
        onRowClick={handleRowClick}
        entityName="Şirket"
        groupByCategory
        showExport
        columnSelector
        views={{
          default: { name: 'Varsayılan', columns: ['kisa_unvan', 'ticari_unvan', 'vkn_tckn', 'vergi_dairesi', 'adres_ozet', 'is_active'] },
          iletisim: { name: 'İletişim', columns: ['kisa_unvan', 'telefon', 'email', 'adres_ozet', 'is_active'] },
          vergi: { name: 'Vergi', columns: ['kisa_unvan', 'vkn_tckn', 'vergi_dairesi', 'sirket_turu', 'is_active'] }
        }}
        defaultView="default"
      />

      {/* Form Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={handleClose}
        title={getDrawerTitle()}
        subtitle={getDrawerSubtitle()}
        size="xl"
      >
        <SirketForm
          mode={pageState}
          sirket={selectedSirket}
          onSave={handleSave}
          onCancel={handleClose}
          saving={saving}
          deleting={deleting}
          onDelete={pageState !== 'create' ? handleDelete : undefined}
          error={formError}
        />
      </Drawer>

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
