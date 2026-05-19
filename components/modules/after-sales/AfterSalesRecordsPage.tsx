'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Archive, CalendarClock, CheckCircle2, FileText, KeyRound, Plus, ShieldCheck, Wrench, type LucideIcon } from 'lucide-react'
import { EntityForm, type FormMode } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { useModuleLicense } from '@/hooks/useModuleLicense'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'
import { isDraftRecord } from '@/lib/forms/entityState'
import { usePermissions } from '@/lib/security/permissionStore'
import {
  AFTER_SALES_MODULE_KEY,
  afterSalesAreaByKey,
  afterSalesStatusLabels,
  decorateAfterSalesRow,
  formatAfterSalesDate,
  getAfterSalesColumns,
  getAfterSalesHealth,
  getAfterSalesHeroFields,
  getAfterSalesTabs,
  isAfterSalesWarning,
} from '@/lib/modules/after-sales/afterSales.config'
import { AFTER_SALES_PERMISSIONS } from '@/lib/modules/after-sales/afterSales.permissions'
import { createAfterSalesRecordSeed, getAfterSalesRecordsByArea } from '@/lib/modules/after-sales/afterSales.mock'
import type { AfterSalesAreaKey, AfterSalesRecord } from '@/lib/modules/after-sales/afterSales.types'

type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }

const AREA_ICON = {
  'garanti-takip': ShieldCheck,
  'lisans-takip': KeyRound,
  'servis-destek-kayitlari': Wrench,
  'bakim-sozlesme-takip': CalendarClock,
} satisfies Record<AfterSalesAreaKey, LucideIcon>

const RECORD_PREFIX = {
  warranty: 'GAR',
  license: 'LIS',
  service: 'SRV',
  maintenance_contract: 'BAK',
} as const

export function AfterSalesRecordsPage({ areaKey }: { areaKey: AfterSalesAreaKey }) {
  const area = afterSalesAreaByKey[areaKey]
  const Icon = AREA_ICON[areaKey]
  const permissions = usePermissions()
  const { isModuleActive, isSubmoduleActive } = useModuleLicense()
  const [rows, setRows] = useState<AfterSalesRecord[]>(() => getAfterSalesRecordsByArea(areaKey))
  const [pageState, setPageState] = useState<PageState>('list')
  const [selected, setSelected] = useState<AfterSalesRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [includePassive, setIncludePassive] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const canManage = permissions.can(AFTER_SALES_PERMISSIONS.manage)
  const canView = canManage || permissions.can(AFTER_SALES_PERMISSIONS.view)
  const canCreate = canManage || permissions.can(AFTER_SALES_PERMISSIONS.create)
  const canEdit = canManage || permissions.can(AFTER_SALES_PERMISSIONS.edit)
  const canDelete = canManage || permissions.can(AFTER_SALES_PERMISSIONS.delete)
  const moduleAvailable = isModuleActive(AFTER_SALES_MODULE_KEY) && isSubmoduleActive(AFTER_SALES_MODULE_KEY, areaKey)

  const activeRows = rows.filter(row => !row.is_deleted && row.record_status === 'active')
  const visibleRows = includePassive ? rows : activeRows
  const warningRows = activeRows.filter(isAfterSalesWarning)
  const criticalRows = activeRows.filter(row => getAfterSalesHealth(row) === 'critical')
  const decoratedRows = useMemo(() => visibleRows.map(decorateAfterSalesRow), [visibleRows])
  const formMode: FormMode = pageState === 'create'
    ? 'create'
    : selected?.is_deleted || selected?.record_status === 'passive'
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
    const seed = createAfterSalesRecordSeed(area.recordType, RECORD_PREFIX[area.recordType])
    setSelected(seed)
    setPageState('create')
  }

  function openRow(row: AfterSalesRecord) {
    setSelected(rows.find(item => item.id === row.id) || row)
    setPageState('view')
  }

  async function saveRecord(data: Record<string, any>, mode: FormMode) {
    if (!selected) return
    setSaving(true)
    try {
      const timestamp = new Date().toISOString()
      if (mode === 'create') {
        const nextRecord: AfterSalesRecord = {
          ...selected,
          ...data,
          id: crypto.randomUUID?.() || `asr-${Date.now()}`,
          record_no: buildRecordNo(rows, RECORD_PREFIX[area.recordType]),
          record_type: area.recordType,
          warning_count: Number(data.warning_count || selected.warning_count || 0),
          record_status: 'active',
          is_deleted: false,
          created_at: timestamp,
          updated_at: timestamp,
        }
        setRows(current => [nextRecord, ...current])
        setSelected(nextRecord)
        setPageState('view')
        setToast({ type: 'success', title: 'Kaydedildi', message: `${area.singularTitle} oluşturuldu.` })
        return
      }

      const nextRecord: AfterSalesRecord = {
        ...selected,
        ...data,
        warning_count: Number(data.warning_count || selected.warning_count || 0),
        updated_at: timestamp,
      }
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

      const nextRecord: AfterSalesRecord = {
        ...selected,
        record_status: 'passive',
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
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
      const nextRecord: AfterSalesRecord = {
        ...selected,
        record_status: 'active',
        is_deleted: false,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      }
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
        title={pageState === 'list' ? area.title : pageState === 'create' ? `Yeni ${area.singularTitle}` : selected?.title || area.singularTitle}
        subtitle={pageState === 'list' ? area.description : 'Müşteri, şirket, ürün/hizmet ve sorumlu ilişkileriyle satış sonrası kaydı yönetin.'}
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
          <AfterSalesSummaryStrip activeCount={activeRows.length} warningCount={warningRows.length} criticalCount={criticalRows.length} passiveCount={rows.length - activeRows.length} />
          {warningRows.length > 0 && <AfterSalesWarningPanel records={warningRows} />}
          <SmartDataTable
            columns={getAfterSalesColumns()}
            data={decoratedRows}
            loading={false}
            defaultView="list"
            storageKey={`after-sales-${areaKey}`}
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
          heroFields={getAfterSalesHeroFields()}
          tabs={getAfterSalesTabs(area)}
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
          heroLeftPanel={<AfterSalesHeroPanel record={selected} />}
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

function AfterSalesSummaryStrip({ activeCount, warningCount, criticalCount, passiveCount }: { activeCount: number; warningCount: number; criticalCount: number; passiveCount: number }) {
  const items = [
    { label: 'Aktif Kayıt', value: activeCount, icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-900/60' },
    { label: 'Uyarı', value: warningCount, icon: AlertTriangle, color: 'text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-900/60' },
    { label: 'Kritik', value: criticalCount, icon: AlertTriangle, color: 'text-red-700 bg-red-50 border-red-100 dark:text-red-300 dark:bg-red-950/30 dark:border-red-900/60' },
    { label: 'Pasif', value: passiveCount, icon: Archive, color: 'text-slate-700 bg-slate-50 border-slate-100 dark:text-slate-300 dark:bg-slate-900/40 dark:border-slate-800' },
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

function AfterSalesWarningPanel({ records }: { records: AfterSalesRecord[] }) {
  const visible = records.slice(0, 4)
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 text-amber-700 dark:text-amber-300" size={20} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">Yaklaşan bitişler ve kritik açık kayıtlar</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {visible.map(record => (
              <div key={record.id} className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-900/60 dark:bg-gray-900">
                <div className="font-medium text-gray-900 dark:text-white">{record.title}</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {record.customer_display_name} · {afterSalesStatusLabels[record.status] || record.status} · {formatAfterSalesDate(record.end_date || record.renewal_date || record.sla_due_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function AfterSalesHeroPanel({ record }: { record: AfterSalesRecord }) {
  const health = getAfterSalesHealth(record)
  const healthClass = health === 'critical'
    ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200'
    : health === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
      : health === 'passive'
        ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'

  return (
    <div className={`rounded-lg border p-4 ${healthClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium opacity-70">Satış Sonrası Durum</p>
          <p className="mt-1 text-lg font-bold">{health === 'critical' ? 'Kritik' : health === 'warning' ? 'Uyarı' : health === 'passive' ? 'Pasif' : 'Sağlıklı'}</p>
        </div>
        <FileText size={22} />
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="opacity-70">Müşteri</span>
          <span className="truncate font-medium">{record.customer_display_name || '-'}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="opacity-70">Bitiş/SLA</span>
          <span className="font-medium">{formatAfterSalesDate(record.end_date || record.renewal_date || record.sla_due_at)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="opacity-70">Sorumlu</span>
          <span className="truncate font-medium">{record.responsible_employee_name || '-'}</span>
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
        Gerekli izin: {AFTER_SALES_PERMISSIONS.view}
      </div>
    </div>
  )
}

function buildRecordNo(rows: AfterSalesRecord[], prefix: string) {
  const year = new Date().getFullYear()
  const count = rows.filter(row => row.record_no.startsWith(`${prefix}-${year}`)).length + 1
  return `${prefix}-${year}-${String(count).padStart(3, '0')}`
}
