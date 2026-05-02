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
        const response = await fetch(apiBasePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Kayıt oluşturulamadı')
        }
        
        setToast({ type: 'success', message: lifecycleMessages?.createSuccess || 'Personel kaydı oluşturuldu' })
      } else {
        // Update existing personel
        const response = await fetch(`${apiBasePath}/${selectedPersonel?.id}`, {
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
        setToast({ type: 'success', message: lifecycleMessages?.updateSuccess || 'Personel bilgileri güncellendi' })
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
      const response = await fetch(`${apiBasePath}/${selectedPersonel.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Silme işlemi başarısız')
      }
      
      setToast({ type: 'success', message: lifecycleMessages?.deleteSuccess || 'Personel kaydı silindi' })
      await yenile()
      setPageState('list')
    } catch (err: any) {
      setFormError(err.message)
      throw err
    } finally {
      setDeleting(false)
    }
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
        title: 'Çalışanlar',
        subtitle: 'Personel kayıtlarını yönetin',
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
      create: 'Yeni Personel',
      view: personelName || 'Personel Detayı',
      edit: personelName || 'Personel Düzenle'
    } as const
    
    const modeSubtitles = {
      create: 'Yeni personel kaydı oluştur',
      view: 'Personel bilgilerini görüntüle',
      edit: 'Personel bilgilerini güncelle'
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
            heroFields={toEntityFormFields(moduleConfig.form.hero.fields)}
            tabs={toEntityFormTabs(moduleConfig.form.tabs)}
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
