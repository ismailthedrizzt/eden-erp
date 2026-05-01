'use client'

/**
 * ERP PAGE TEMPLATE: Şirketler Yönetimi
 * 
 * This page follows the standard ERP data management pattern:
 * - PageBanner: Header with "Create New" action
 * - SmartDataTable: List view with row selection
 * - SirketForm: Create/View/Edit in-page (no drawer/modal)
 * 
 * @see docs/templates/ERPPageTemplate.md
 * @see components/modules/sirket/SirketForm.tsx
 * @see components/modules/sirket/DocumentLoader.tsx
 * @see components/modules/sirket/LogoUploader.tsx
 */

import { useState } from 'react'
import { Building2, ArrowLeft } from 'lucide-react'
import { useSirketler } from '@/hooks/useSirketler'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef } from '@/components/ui/SmartDataTable'
import { SirketForm } from '@/components/modules/sirket/SirketForm'
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
  }

  const handleRowClick = (row: SirketTableRow) => {
    setSelectedSirket(row)
    setFormError(null)
    setPageState('view')
  }

  const handleBackToList = () => {
    setPageState('list')
    setSelectedSirket(null)
    setFormError(null)
    yenile()
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
      
      handleBackToList()
    } catch (err: any) {
      setFormError(err.message || 'Bir hata oluştu')
      throw err
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
      handleBackToList()
    } catch (err: any) {
      setFormError(err.message || 'Silme işlemi sırasında hata oluştu')
      throw err
    } finally {
      setDeleting(false)
    }
  }

  const getBannerTitle = () => {
    switch (pageState) {
      case 'create': return 'Yeni Şirket'
      case 'view': return selectedSirket?.kisa_unvan || 'Şirket Detayı'
      case 'edit': return `${selectedSirket?.kisa_unvan || ''} - Düzenle`
      default: return 'Şirketlerimiz'
    }
  }

  const getBannerSubtitle = () => {
    switch (pageState) {
      case 'create': return 'Yeni şirket kaydı oluşturun'
      case 'view': return 'Şirket bilgilerini görüntüleyin'
      case 'edit': return 'Şirket bilgilerini güncelleyin'
      default: return 'Yönetilen şirketler listesi'
    }
  }

  // LIST VIEW
  if (pageState === 'list') {
    return (
      <div className="space-y-6">
        <PageBanner
          mode="list"
          title={getBannerTitle()}
          subtitle={getBannerSubtitle()}
          icon={<Building2 size={24} />}
          onAddClick={handleAddClick}
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
          defaultView="list"
        />

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

  // FORM VIEW (Create/View/Edit)
  return (
    <div className="space-y-6">
      <PageBanner
        mode="form"
        formMode={pageState === 'view' ? 'view' : pageState === 'edit' ? 'edit' : 'create'}
        title={getBannerTitle()}
        subtitle={getBannerSubtitle()}
        icon={<Building2 size={24} />}
        onBackClick={handleBackToList}
      />

      {formError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
        </div>
      )}

      <SirketForm
        mode={pageState}
        sirket={selectedSirket}
        onSave={handleSave}
        onCancel={handleBackToList}
        saving={saving}
        deleting={deleting}
        onDelete={pageState !== 'create' ? handleDelete : undefined}
        error={formError}
      />

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
