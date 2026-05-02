'use client'

/**
 * ERP PAGE TEMPLATE: Çalışan Yönetimi
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
import { Users } from 'lucide-react'
import { usePersonel } from '@/hooks/usePersonel'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, WidgetDef } from '@/components/ui/SmartDataTable'
import { EntityForm, FormMode } from '@/components/ui/EntityForm'
import { Toast } from '@/components/ui/Toast'
import { personelModuleConfig, PersonelTableRow } from '@/lib/modules/personel.config'
import { toEntityFormFields, toEntityFormTabs } from '@/types/module-config'
import type { Personel } from '@/types'

// Page state type following ERP pattern
type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning', title?: string, message: string }
type SaveError = Error & { toast?: ToastState }

export default function PersonelYonetimPage() {
  const { data: personel, loading: listLoading, error: listError, yenile } = usePersonel()
  const moduleConfig = personelModuleConfig
  const apiBasePath = moduleConfig.entity.apiBasePath || '/api/ik/personel'
  const lifecycleMessages = moduleConfig.form.lifecycle?.messages
  
  // Page state
  const [pageState, setPageState] = useState<PageState>('list')
  const [selectedPersonel, setSelectedPersonel] = useState<Personel | null>(null)
  
  // Form state
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

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
    const payload = normalizeEmployeePayload(data)
    
    try {
      if (mode === 'create') {
        // Create new employee
        const response = await fetch(apiBasePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          throw await createSaveError(response, 'Kayıt oluşturulamadı')
        }
        
        setToast({ type: 'success', title: 'Kayıt Başarılı', message: lifecycleMessages?.createSuccess || 'Çalışan kaydı oluşturuldu' })
      } else {
        // Update existing employee
        const response = await fetch(`${apiBasePath}/${selectedPersonel?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          throw await createSaveError(response, 'Güncelleme başarısız')
        }
        
        const result = await response.json()
        setSelectedPersonel(result.data)
        setToast({ type: 'success', title: 'Kayıt Başarılı', message: lifecycleMessages?.updateSuccess || 'Çalışan bilgileri güncellendi' })
      }
      
      // Refresh list and return to list view
      await yenile()
      setPageState('list')
    } catch (err: any) {
      setFormError(err.message)
      setToast(err.toast || { type: 'error', title: 'Kayıt Başarısız', message: err.message })
      throw err
    } finally {
      setSaving(false)
    }
  }

  const normalizeEmployeePayload = (raw: Record<string, any>) => {
    const payload: Record<string, any> = {}

    Object.entries(raw).forEach(([key, value]) => {
      if (value === '') return
      payload[key] = value
    })

    if (payload.telefonlar?.length && !payload.cep_telefonu) {
      payload.cep_telefonu = payload.telefonlar[0]?.numara
    }

    if (payload.epostalar?.length && !payload.email) {
      payload.email = payload.epostalar[0]?.adres
    }

    if (payload.uyruk === 'tc') {
      delete payload.pasaport_no
    } else if (payload.uyruk === 'yabanci') {
      delete payload.tc_kimlik
    }

    if (!payload.sgk_giris) {
      delete payload.isten_ayrilis
      delete payload.isten_cikis_belgeleri
    }

    payload.calisma_durumu = payload.isten_ayrilis ? 'ayrilmis' : 'gorevde'
    return payload
  }

  const handleDelete = async () => {
    if (!selectedPersonel) return
    
    setDeleting(true)
    try {
      const response = await fetch(`${apiBasePath}/${selectedPersonel.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw await createSaveError(response, 'Silme işlemi başarısız')
      }
      
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: lifecycleMessages?.deleteSuccess || 'Çalışan kaydı pasife çekildi' })
      await yenile()
      setPageState('list')
    } catch (err: any) {
      setFormError(err.message)
      setToast(err.toast || { type: 'error', title: 'Kayıt Başarısız', message: err.message })
      throw err
    } finally {
      setDeleting(false)
    }
  }

  const createSaveError = async (response: Response, fallback: string): Promise<SaveError> => {
    const body = await response.json().catch(() => ({}))
    const code = body.code || `HTTP_${response.status}`
    const fieldErrors = body.details?.fieldErrors || {}
    const missingFields = Object.keys(fieldErrors)

    if (code === 'VALIDATION_FAILED' && missingFields.length > 0) {
      const message = missingFields.join(', ')
      const error = new Error(`Eksik Zorunlu Alan [${message}]`) as SaveError
      error.toast = { type: 'warning', title: 'Eksik Zorunlu Alan', message }
      return error
    }

    const message = `${body.error || fallback} [${code}]`
    const error = new Error(message) as SaveError
    error.toast = { type: 'error', title: 'Kayıt Başarısız', message }
    return error
  }

  const withFieldHistory = (field: any) => {
    const history = (selectedPersonel as any)?.field_history?.[field.name || field.key]
    return history ? { ...field, history } : field
  }

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

  // Banner configuration based on page state
  const getBannerConfig = () => {
    if (pageState === 'list') {
      return {
        mode: 'list' as const,
        title: 'Çalışanlarımız',
        subtitle: 'Çalışan kayıtlarını yönetin',
        onAddClick: handleAddClick,
        addButtonText: 'Ekle'
      }
    }
    
    const getPersonelName = () => {
      if (!selectedPersonel) return ''
      return `${selectedPersonel.ad || ''} ${selectedPersonel.soyad || ''}`.trim()
    }
    
    const personelName = getPersonelName()
    
    const modeTitles = {
      create: 'Yeni Çalışan',
      view: personelName || 'Çalışan Detayı',
      edit: personelName || 'Çalışan Düzenle'
    } as const
    
    const modeSubtitles = {
      create: 'Yeni çalışan kaydı oluştur',
      view: 'Çalışan bilgilerini görüntüle',
      edit: 'Çalışan bilgilerini güncelle'
    } as const
    
    return {
      mode: 'form' as const,
      formMode: formMode,
      title: modeTitles[pageState as keyof typeof modeTitles],
      subtitle: modeSubtitles[pageState as keyof typeof modeSubtitles],
      onBackClick: () => setPageState('list')
    }
  }

  const bannerConfig = getBannerConfig()

  return (
    <div className="relative">
      <PageBanner
        mode={bannerConfig.mode}
        {...(bannerConfig.mode === 'form' && { formMode: (bannerConfig as any).formMode })}
        title={bannerConfig.title}
        subtitle={bannerConfig.subtitle}
        icon={<Users size={24} />}
        {...(bannerConfig.mode === 'list' 
          ? { onAddClick: (bannerConfig as any).onAddClick, addButtonText: (bannerConfig as any).addButtonText }
          : { onBackClick: (bannerConfig as any).onBackClick }
        )}
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          title={toast.title}
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
            columns={moduleConfig.list.columns}
            storageKey={moduleConfig.list.storageKey}
            widgets={widgets}
            defaultView={moduleConfig.list.defaultView}
            defaultPageSize={moduleConfig.list.defaultPageSize}
            pageSizeOptions={moduleConfig.list.pageSizeOptions}
            loading={listLoading}
            emptyText={moduleConfig.list.emptyText}
            realtime={moduleConfig.list.realtime}
            pollingInterval={moduleConfig.list.pollingInterval}
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
            entityName={moduleConfig.form.entityName}
            entityNameSingular={moduleConfig.form.entityNameSingular}
            heroFields={toEntityFormFields(moduleConfig.form.hero.fields).map(withFieldHistory)}
            tabs={toEntityFormTabs(moduleConfig.form.tabs).map(tab => ({
              ...tab,
              fields: tab.fields.map(withFieldHistory)
            }))}
            data={selectedPersonel || undefined}
            saving={saving}
            deleting={deleting}
            error={formError}
            onSave={handleSave}
            onCancel={() => setPageState('list')}
            onDelete={handleDelete}
            onModeChange={(mode) => setPageState(mode)}
            onValidationError={(fields) => setToast({
              type: 'warning',
              title: 'Eksik Zorunlu Alan',
              message: fields.join(', ')
            })}
          />
        </div>
      )}
    </div>
  )
}
