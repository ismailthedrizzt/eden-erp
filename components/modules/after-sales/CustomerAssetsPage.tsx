'use client'

import { useMemo, useState } from 'react'
import { Archive, CheckCircle2, FileText, Package, Plus, ShieldCheck } from 'lucide-react'
import { EntityForm, type FormMode } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { useModuleLicense } from '@/hooks/useModuleLicense'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'
import { isDraftRecord } from '@/lib/forms/entityState'
import { usePermissions } from '@/lib/security/permissionStore'
import { AFTER_SALES_MODULE_KEY } from '@/lib/modules/after-sales/afterSales.config'
import { AFTER_SALES_PERMISSIONS } from '@/lib/modules/after-sales/afterSales.permissions'
import {
  customerAssetStatusLabels,
  decorateCustomerAsset,
  formatCatalogDate,
  getCustomerAssetColumns,
  getCustomerAssetHeroFields,
  getCustomerAssetTabs,
  validateCustomerAsset,
} from '@/lib/modules/product-services/productServices.config'
import { createCustomerAssetSeed, customerAssetsMockRecords } from '@/lib/modules/product-services/productServices.mock'
import type { CustomerAsset } from '@/lib/modules/product-services/productServices.types'

type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }

export function CustomerAssetsPage() {
  const permissions = usePermissions()
  const { isModuleActive, isSubmoduleActive } = useModuleLicense()
  const [rows, setRows] = useState<CustomerAsset[]>(() => customerAssetsMockRecords)
  const [pageState, setPageState] = useState<PageState>('list')
  const [selected, setSelected] = useState<CustomerAsset | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [includePassive, setIncludePassive] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const canManage = permissions.can(AFTER_SALES_PERMISSIONS.manage)
  const canView = canManage || permissions.can(AFTER_SALES_PERMISSIONS.view)
  const canCreate = canManage || permissions.can(AFTER_SALES_PERMISSIONS.create)
  const canEdit = canManage || permissions.can(AFTER_SALES_PERMISSIONS.edit)
  const canDelete = canManage || permissions.can(AFTER_SALES_PERMISSIONS.delete)
  const moduleAvailable = isModuleActive(AFTER_SALES_MODULE_KEY) && isSubmoduleActive(AFTER_SALES_MODULE_KEY, 'musterideki-urunler')

  const activeRows = rows.filter(row => !row.is_deleted && row.is_active)
  const visibleRows = includePassive ? rows : activeRows
  const decoratedRows = useMemo(() => visibleRows.map(decorateCustomerAsset), [visibleRows])
  const warrantyWarningCount = activeRows.filter(row => row.status === 'out_of_warranty' || row.warranty_status?.toLocaleLowerCase('tr-TR').includes('yaklaşıyor')).length
  const licenseWarningCount = activeRows.filter(row => row.status === 'license_expired' || row.license_status?.toLocaleLowerCase('tr-TR').includes('yaklaşıyor')).length
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
    setSelected(createCustomerAssetSeed())
    setPageState('create')
  }

  function openRow(row: CustomerAsset) {
    setSelected(rows.find(item => item.id === row.id) || row)
    setPageState('view')
  }

  async function saveAsset(data: Record<string, any>, mode: FormMode) {
    if (!selected) return
    const missing = validateCustomerAsset(data)
    if (missing.length > 0) {
      setToast({ type: 'error', title: 'Zorunlu alanlar eksik', message: missing.join(', ') })
      return
    }

    setSaving(true)
    try {
      const timestamp = new Date().toISOString()
      if (mode === 'create') {
        const nextAsset: CustomerAsset = {
          ...selected,
          ...data,
          id: crypto.randomUUID?.() || `asset-${Date.now()}`,
          customer_asset_no: data.customer_asset_no && data.customer_asset_no !== 'MUR-YENI' ? data.customer_asset_no : buildAssetNo(rows),
          is_active: data.is_active ?? true,
          is_deleted: false,
          created_at: timestamp,
          updated_at: timestamp,
        }
        setRows(current => [nextAsset, ...current])
        setSelected(nextAsset)
        setPageState('view')
        setToast({ type: 'success', title: 'Kaydedildi', message: 'Müşterideki ürün kaydı oluşturuldu.' })
        return
      }

      const nextAsset: CustomerAsset = {
        ...selected,
        ...data,
        updated_at: timestamp,
      }
      setRows(current => current.map(row => row.id === nextAsset.id ? nextAsset : row))
      setSelected(nextAsset)
      setPageState('view')
      setToast({ type: 'success', title: 'Güncellendi', message: 'Müşterideki ürün kaydı güncellendi.' })
    } finally {
      setSaving(false)
    }
  }

  async function passivateAsset() {
    if (!selected) return
    setDeleting(true)
    try {
      if (isDraftRecord(selected as Record<string, any>)) {
        setRows(current => current.filter(row => row.id !== selected.id))
        setSelected(null)
        setPageState('list')
        setToast({ type: 'success', title: 'Kalici silindi', message: 'Musterideki urun taslagi kalici olarak silindi.' })
        return
      }

      const nextAsset: CustomerAsset = {
        ...selected,
        is_active: false,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setRows(current => current.map(row => row.id === nextAsset.id ? nextAsset : row))
      setSelected(nextAsset)
      setToast({ type: 'warning', title: 'Pasife alındı', message: 'Müşterideki ürün soft-delete ile pasife alındı.' })
    } finally {
      setDeleting(false)
    }
  }

  async function activateAsset() {
    if (!selected) return
    setDeleting(true)
    try {
      const nextAsset: CustomerAsset = {
        ...selected,
        is_active: true,
        is_deleted: false,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      }
      setRows(current => current.map(row => row.id === nextAsset.id ? nextAsset : row))
      setSelected(nextAsset)
      setToast({ type: 'success', title: 'Aktif edildi', message: 'Müşterideki ürün tekrar aktif edildi.' })
    } finally {
      setDeleting(false)
    }
  }

  if (!moduleAvailable) {
    return <UnavailableState />
  }

  if (!canView) {
    return <PermissionState />
  }

  return (
    <div className="relative space-y-5">
      <PageBanner
        mode={pageState === 'list' ? 'list' : 'form'}
        formMode={formMode === 'edit' ? 'edit' : formMode === 'create' ? 'create' : 'view'}
        title={pageState === 'list' ? 'Müşterideki Ürünler' : pageState === 'create' ? 'Yeni Müşterideki Ürün' : selected?.customer_asset_no || 'Müşterideki Ürün'}
        subtitle={pageState === 'list' ? 'Müşteriye teslim edilmiş veya müşteride kullanılan ürün, cihaz, lisans ve hizmet örneklerini takip edin.' : 'Genel ürün/hizmet kartı ile müşterideki gerçek örneği birbirinden ayrı yönetin.'}
        icon={<Package size={24} />}
        onAddClick={pageState === 'list' ? startCreate : undefined}
        addButtonText="Yeni Kayıt"
        addButtonDisabled={!canCreate}
        customButtonIcon={<Plus size={16} />}
        onBackClick={pageState === 'list' ? undefined : () => { setPageState('list'); setSelected(null) }}
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {pageState === 'list' ? (
        <>
          <AssetSummaryStrip activeCount={activeRows.length} warrantyWarningCount={warrantyWarningCount} licenseWarningCount={licenseWarningCount} passiveCount={rows.length - activeRows.length} />
          <SmartDataTable
            columns={getCustomerAssetColumns()}
            data={decoratedRows}
            loading={false}
            defaultView="list"
            storageKey="after-sales-customer-assets"
            emptyText="Müşterideki ürün kaydı bulunamadı"
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
          entityName="Müşterideki Ürünler"
          entityNameSingular="Müşterideki Ürün"
          heroFields={getCustomerAssetHeroFields()}
          tabs={getCustomerAssetTabs()}
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
          heroLeftPanel={<CustomerAssetHeroPanel asset={selected} />}
          showHeroHeader
          onSave={saveAsset}
          onCancel={() => pageState === 'edit' ? setPageState('view') : setPageState('list')}
          onModeChange={(nextMode) => setPageState(nextMode === 'create' ? 'create' : nextMode)}
          onDelete={canDelete ? passivateAsset : undefined}
          onActivate={canDelete ? activateAsset : undefined}
          enableHistory
        />
      ) : null}
    </div>
  )
}

function AssetSummaryStrip({ activeCount, warrantyWarningCount, licenseWarningCount, passiveCount }: { activeCount: number; warrantyWarningCount: number; licenseWarningCount: number; passiveCount: number }) {
  const items = [
    { label: 'Aktif Ürün', value: activeCount, icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-900/60' },
    { label: 'Garanti Uyarısı', value: warrantyWarningCount, icon: ShieldCheck, color: 'text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-900/60' },
    { label: 'Lisans Uyarısı', value: licenseWarningCount, icon: FileText, color: 'text-blue-700 bg-blue-50 border-blue-100 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-900/60' },
    { label: 'Pasif', value: Math.max(0, passiveCount), icon: Archive, color: 'text-slate-700 bg-slate-50 border-slate-100 dark:text-slate-300 dark:bg-slate-900/40 dark:border-slate-800' },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

function CustomerAssetHeroPanel({ asset }: { asset: CustomerAsset }) {
  const active = !asset.is_deleted && asset.is_active
  const tone = asset.status === 'out_of_warranty' || asset.status === 'license_expired'
    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
    : active
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
      : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200'

  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium opacity-70">Müşteri Varlığı</p>
          <p className="mt-1 text-lg font-bold">{customerAssetStatusLabels[asset.status] || asset.status}</p>
        </div>
        <Package size={22} />
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="opacity-70">Müşteri</span>
          <span className="truncate font-medium">{asset.customer_display_name || '-'}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="opacity-70">Ürün</span>
          <span className="truncate font-medium">{asset.product_service_item_name || '-'}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="opacity-70">Garanti</span>
          <span className="font-medium">{formatCatalogDate(asset.warranty_end_date)}</span>
        </div>
      </div>
    </div>
  )
}

function UnavailableState() {
  return (
    <div>
      <PageBanner mode="list" title="Müşterideki Ürünler" subtitle="Modül lisansı pasif olduğu için sayfa kullanılamıyor." icon={<Package size={24} />} />
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Bu alt modül sistem ayarlarından aktif edildiğinde kayıt ekranları kullanılabilir.
      </div>
    </div>
  )
}

function PermissionState() {
  return (
    <div>
      <PageBanner mode="list" title="Müşterideki Ürünler" subtitle="Bu sayfayı görüntülemek için yetki gerekiyor." icon={<Package size={24} />} />
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Gerekli izin: {AFTER_SALES_PERMISSIONS.view}
      </div>
    </div>
  )
}

function buildAssetNo(rows: CustomerAsset[]) {
  const year = new Date().getFullYear()
  const count = rows.filter(row => row.customer_asset_no.startsWith(`MUR-${year}`)).length + 1
  return `MUR-${year}-${String(count).padStart(3, '0')}`
}
