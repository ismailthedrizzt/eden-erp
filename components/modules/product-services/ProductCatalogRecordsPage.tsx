'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Archive, Barcode, CheckCircle2, FileText, Handshake, KeyRound, Package, Plus, ShieldCheck, Wrench, type LucideIcon } from 'lucide-react'
import { EntityForm, type FormMode } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { useModuleLicense } from '@/hooks/useModuleLicense'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'
import { isDraftRecord } from '@/lib/forms/entityState'
import { usePermissions } from '@/lib/security/permissionStore'
import {
  PRODUCT_SERVICES_MODULE_KEY,
  decorateProductCatalogRecord,
  getProductCatalogColumns,
  getProductCatalogHeroFields,
  getProductCatalogRecordSubtitle,
  getProductCatalogRecordTitle,
  getProductCatalogTabs,
  isProductCatalogRecordActive,
  productServicesAreaByKey,
  validateProductCatalogRecord,
} from '@/lib/modules/product-services/productServices.config'
import { PRODUCT_SERVICES_PERMISSIONS } from '@/lib/modules/product-services/productServices.permissions'
import { createProductCatalogRecordSeed, getProductCatalogRecordsByArea } from '@/lib/modules/product-services/productServices.mock'
import type { ProductCatalogRecord, ProductServicesAreaKey } from '@/lib/modules/product-services/productServices.types'

type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }

const AREA_ICON = {
  'urun-kartlari': Package,
  'hizmet-kartlari': Handshake,
  'lisans-abonelik-urunleri': KeyRound,
  'seri-numarali-urunler': Barcode,
  'garanti-sablonlari': ShieldCheck,
  'bakim-paketleri': Wrench,
} satisfies Record<ProductServicesAreaKey, LucideIcon>

export function ProductCatalogRecordsPage({ areaKey }: { areaKey: ProductServicesAreaKey }) {
  const area = productServicesAreaByKey[areaKey]
  const Icon = AREA_ICON[areaKey]
  const permissions = usePermissions()
  const { isModuleActive, isSubmoduleActive } = useModuleLicense()
  const [rows, setRows] = useState<ProductCatalogRecord[]>(() => getProductCatalogRecordsByArea(areaKey))
  const [pageState, setPageState] = useState<PageState>('list')
  const [selected, setSelected] = useState<ProductCatalogRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [includePassive, setIncludePassive] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const canManage = permissions.can(PRODUCT_SERVICES_PERMISSIONS.manage)
  const canView = canManage || permissions.can(PRODUCT_SERVICES_PERMISSIONS.view)
  const canCreate = canManage || permissions.can(PRODUCT_SERVICES_PERMISSIONS.create)
  const canEdit = canManage || permissions.can(PRODUCT_SERVICES_PERMISSIONS.edit)
  const canDelete = canManage || permissions.can(PRODUCT_SERVICES_PERMISSIONS.delete)
  const moduleAvailable = isModuleActive(PRODUCT_SERVICES_MODULE_KEY) && isSubmoduleActive(PRODUCT_SERVICES_MODULE_KEY, areaKey)

  const activeRows = rows.filter(isProductCatalogRecordActive)
  const visibleRows = includePassive ? rows.filter(row => !row.is_deleted || row.deleted_at) : activeRows
  const decoratedRows = useMemo(() => visibleRows.map(decorateProductCatalogRecord), [visibleRows])
  const formMode: FormMode = pageState === 'create'
    ? 'create'
    : selected?.is_deleted || !selected?.is_active
      ? 'passive'
      : pageState === 'edit'
        ? 'edit'
        : 'view'
  const formLoadStages = createProgressiveFormLoadStages({
    mode: formMode,
    hasSnapshot: pageState !== 'create' && !!selected,
    detailReady: pageState !== 'create' && !!selected,
    referencesReady: true,
  })

  function startCreate() {
    const seed = createProductCatalogRecordSeed(areaKey, area.codePrefix)
    setSelected(seed)
    setPageState('create')
  }

  function openRow(row: ProductCatalogRecord) {
    setSelected(rows.find(item => item.id === row.id) || row)
    setPageState('view')
  }

  async function saveRecord(data: Record<string, any>, mode: FormMode) {
    if (!selected) return
    const missing = validateProductCatalogRecord(areaKey, data)
    if (missing.length > 0) {
      setToast({ type: 'error', title: 'Zorunlu alanlar eksik', message: missing.join(', ') })
      return
    }

    setSaving(true)
    try {
      const timestamp = new Date().toISOString()
      if (mode === 'create') {
        const nextRecord = normalizeSavedRecord({
          ...selected,
          ...data,
          id: crypto.randomUUID?.() || `catalog-${Date.now()}`,
          code: data.code && data.code !== `${area.codePrefix}-YENI` ? data.code : buildRecordCode(rows, area.codePrefix),
          is_active: data.is_active ?? true,
          is_deleted: false,
          created_at: timestamp,
          updated_at: timestamp,
        })
        setRows(current => [nextRecord, ...current])
        setSelected(nextRecord)
        setPageState('view')
        setToast({ type: 'success', title: 'Kaydedildi', message: `${area.singularTitle} oluşturuldu.` })
        return
      }

      const nextRecord = normalizeSavedRecord({
        ...selected,
        ...data,
        updated_at: timestamp,
      })
      setRows(current => current.map(row => row.id === nextRecord.id ? nextRecord : row))
      setSelected(nextRecord)
      setPageState('view')
      setToast({ type: 'success', title: 'Güncellendi', message: `${area.singularTitle} güncellendi.` })
    } finally {
      setSaving(false)
    }
  }

  async function passivateRecord() {
    if (!selected) return
    setDeleting(true)
    try {
      if (isDraftRecord(selected as Record<string, any>)) {
        setRows(current => current.filter(row => row.id !== selected.id))
        setSelected(null)
        setPageState('list')
        setToast({ type: 'success', title: 'Kalici silindi', message: `${area.singularTitle} taslagi kalici olarak silindi.` })
        return
      }

      const nextRecord = normalizeSavedRecord({
        ...selected,
        is_active: false,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as ProductCatalogRecord)
      setRows(current => current.map(row => row.id === nextRecord.id ? nextRecord : row))
      setSelected(nextRecord)
      setToast({ type: 'warning', title: 'Pasife alındı', message: `${area.singularTitle} soft-delete ile pasife alındı.` })
    } finally {
      setDeleting(false)
    }
  }

  async function activateRecord() {
    if (!selected) return
    setDeleting(true)
    try {
      const nextRecord = normalizeSavedRecord({
        ...selected,
        is_active: true,
        is_deleted: false,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      } as ProductCatalogRecord)
      setRows(current => current.map(row => row.id === nextRecord.id ? nextRecord : row))
      setSelected(nextRecord)
      setToast({ type: 'success', title: 'Aktif edildi', message: `${area.singularTitle} tekrar aktif edildi.` })
    } finally {
      setDeleting(false)
    }
  }

  if (!moduleAvailable) {
    return <UnavailableState title={area.title} icon={<Icon size={24} />} />
  }

  if (!canView) {
    return <PermissionState title={area.title} icon={<Icon size={24} />} />
  }

  return (
    <div className="relative space-y-5">
      <PageBanner
        mode={pageState === 'list' ? 'list' : 'form'}
        formMode={formMode === 'edit' ? 'edit' : formMode === 'create' ? 'create' : 'view'}
        title={pageState === 'list' ? area.title : pageState === 'create' ? `Yeni ${area.singularTitle}` : selected ? getProductCatalogRecordTitle(selected) : area.singularTitle}
        subtitle={pageState === 'list' ? area.description : 'Merkezi ürün/hizmet kataloğu kaydını modül kullanım işaretleriyle yönetin.'}
        icon={<Icon size={24} />}
        onAddClick={pageState === 'list' ? startCreate : undefined}
        addButtonText="Yeni Kayıt"
        addButtonDisabled={!canCreate}
        customButtonIcon={<Plus size={16} />}
        onBackClick={pageState === 'list' ? undefined : () => { setPageState('list'); setSelected(null) }}
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {pageState === 'list' ? (
        <>
          <CatalogSummaryStrip totalCount={rows.filter(row => !row.is_deleted).length} activeCount={activeRows.length} passiveCount={rows.length - activeRows.length} />
          <SmartDataTable
            columns={getProductCatalogColumns(areaKey)}
            data={decoratedRows}
            loading={false}
            defaultView="list"
            storageKey={`product-services-${areaKey}`}
            emptyText={area.emptyText}
            onRowClick={(row: any) => openRow(row)}
            showPassiveToggle
            includePassive={includePassive}
            includePassiveLabel="Pasif kayıtları göster"
            onIncludePassiveChange={setIncludePassive}
          />
        </>
      ) : selected ? (
        <EntityForm
          mode={formMode}
          entityName={area.title}
          entityNameSingular={area.singularTitle}
          heroFields={getProductCatalogHeroFields(areaKey)}
          tabs={getProductCatalogTabs(areaKey)}
          data={selected}
          saving={saving}
          deleting={deleting}
          loadStages={formLoadStages}
          canCreate={canCreate}
          canEdit={canEdit}
          access={{
            canInsert: canCreate,
            canEdit,
            canPassivate: canDelete,
          }}
          heroLeftPanel={<CatalogHeroPanel record={selected} icon={<Icon size={22} />} />}
          showHeroHeader
          onSave={saveRecord}
          onCancel={() => pageState === 'edit' ? setPageState('view') : setPageState('list')}
          onModeChange={(nextMode) => setPageState(nextMode === 'create' ? 'create' : nextMode)}
          onDelete={canDelete ? passivateRecord : undefined}
          onActivate={canDelete ? activateRecord : undefined}
          enableHistory
        />
      ) : null}
    </div>
  )
}

function CatalogSummaryStrip({ totalCount, activeCount, passiveCount }: { totalCount: number; activeCount: number; passiveCount: number }) {
  const items = [
    { label: 'Toplam Kayıt', value: totalCount, icon: FileText, color: 'text-blue-700 bg-blue-50 border-blue-100 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-900/60' },
    { label: 'Aktif', value: activeCount, icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-900/60' },
    { label: 'Pasif', value: Math.max(0, passiveCount), icon: Archive, color: 'text-slate-700 bg-slate-50 border-slate-100 dark:text-slate-300 dark:bg-slate-900/40 dark:border-slate-800' },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map(item => (
        <div key={item.label} className={`rounded-lg border p-4 ${item.color}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium opacity-75">{item.label}</p>
              <p className="mt-1 text-2xl font-bold">{item.value}</p>
            </div>
            <item.icon size={22} />
          </div>
        </div>
      ))}
    </div>
  )
}

function CatalogHeroPanel({ record, icon }: { record: ProductCatalogRecord; icon: ReactNode }) {
  const active = isProductCatalogRecordActive(record)
  const healthClass = active
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
    : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200'

  return (
    <div className={`rounded-lg border p-4 ${healthClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium opacity-70">Katalog Durumu</p>
          <p className="mt-1 text-lg font-bold">{active ? 'Aktif' : 'Pasif'}</p>
        </div>
        {icon}
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="opacity-70">Kod</span>
          <span className="truncate font-medium">{record.code || ('serial_number' in record ? record.serial_number : '-')}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="opacity-70">Kapsam</span>
          <span className="truncate font-medium">{getProductCatalogRecordSubtitle(record) || '-'}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="opacity-70">Şirket</span>
          <span className="truncate font-medium">{record.company_name || '-'}</span>
        </div>
      </div>
    </div>
  )
}

function UnavailableState({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div>
      <PageBanner mode="list" title={title} subtitle="Modül lisansı pasif olduğu için sayfa kullanılamıyor." icon={icon} />
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Bu alt modül sistem ayarlarından aktif edildiğinde kayıt ekranları kullanılabilir.
      </div>
    </div>
  )
}

function PermissionState({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div>
      <PageBanner mode="list" title={title} subtitle="Bu sayfayı görüntülemek için yetki gerekiyor." icon={icon} />
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Gerekli izin: {PRODUCT_SERVICES_PERMISSIONS.view}
      </div>
    </div>
  )
}

function normalizeSavedRecord(record: ProductCatalogRecord): ProductCatalogRecord {
  if ('serial_number' in record) {
    return {
      ...record,
      code: record.code || record.serial_number,
      name: record.name || record.serial_number || record.product_service_item_name,
    }
  }

  return record
}

function buildRecordCode(rows: ProductCatalogRecord[], prefix: string) {
  const year = new Date().getFullYear()
  const count = rows.filter(row => row.code?.startsWith(`${prefix}-${year}`)).length + 1
  return `${prefix}-${year}-${String(count).padStart(3, '0')}`
}
