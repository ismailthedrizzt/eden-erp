'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, Filter, RefreshCw } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef, WidgetDef } from '@/components/ui/SmartDataTable'
import { EntityForm, FormField, FormMode, FormTab } from '@/components/ui/EntityForm'
import { Toast } from '@/components/ui/Toast'
import { usePermissions } from '@/lib/security/permissionStore'
import { preAccountingService } from '@/lib/modules/accounting/pre-accounting/preAccounting.service'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { MOVEMENT_STATUSES, MOVEMENT_TYPES, PAYMENT_METHODS, ROW_HEALTH_LABELS } from '@/lib/modules/accounting/shared/accounting.constants'
import type { AccountMovementRow } from '@/lib/modules/accounting/shared/accounting.types'

const columns: ColumnDef[] = [
  { key: 'movement_date', label: 'Tarih', type: 'date', width: 120, sortable: true },
  { key: 'movement_type', label: 'Ä°ÅŸlem Tipi', type: 'text', width: 150 },
  { key: 'performed_by_name', label: 'Ä°ÅŸlemi Yapan', type: 'text', width: 190 },
  { key: 'counterparty_name', label: 'KarÅŸÄ± Taraf', type: 'text', width: 220 },
  { key: 'amount', label: 'Tutar', type: 'number', width: 120 },
  { key: 'currency', label: 'Para Birimi', type: 'text', width: 100 },
  { key: 'payment_method', label: 'Ã–deme YÃ¶ntemi', type: 'text', width: 170 },
  { key: 'document_label', label: 'Belge', type: 'text', width: 130 },
  { key: 'bank_label', label: 'Banka/Kart', type: 'text', width: 130 },
  { key: 'status', label: 'Durum', type: 'text', width: 130 },
  { key: 'health_label', label: 'SaÄŸlÄ±k', type: 'text', width: 170 },
]

export default function PreAccountingMovementsPage() {
  const { can } = usePermissions()
  const [rows, setRows] = useState<AccountMovementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pageState, setPageState] = useState<'list' | 'create' | 'view' | 'edit'>('list')
  const [selected, setSelected] = useState<AccountMovementRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [refs, setRefs] = useState<{ persons: any[]; organizations: any[]; companies: any[] }>({ persons: [], organizations: [], companies: [] })
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; title?: string; message: string } | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [movementPayload, refPayload] = await Promise.all([
        preAccountingService.getList(),
        preAccountingService.getReferences(),
      ])
      setRows(Array.isArray(movementPayload.data) ? movementPayload.data : [])
      setRefs({ persons: refPayload.persons || [], organizations: refPayload.organizations || [], companies: refPayload.companies || [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const tableData = rows.map(row => ({
    ...row,
    document_label: documentLabel(row.document_status),
    bank_label: bankLabel(row.bank_match_status),
    health_label: ROW_HEALTH_LABELS[row.row_health_status] || row.row_health_status,
  }))

  const formMode: FormMode = pageState === 'create' ? 'create' : pageState === 'edit' ? 'edit' : 'view'
  const personOptions = refs.persons.map(person => ({ value: person.id, label: `${person.full_name}${person.national_id ? ` (${person.national_id})` : ''}` }))
  const organizationOptions = refs.organizations.map(org => ({ value: org.id, label: `${org.legal_name}${org.tax_number ? ` (${org.tax_number})` : ''}` }))
  const companyOptions = refs.companies.map(company => ({ value: company.id, label: company.kisa_unvan || company.ticari_unvan }))

  const heroFields: FormField[] = [
    { name: 'company_id', label: 'Åirket', type: 'select', options: companyOptions },
    { name: 'movement_type', label: 'Ä°ÅŸlem Tipi', type: 'select', required: true, options: MOVEMENT_TYPES.map(value => ({ value, label: value })) },
    { name: 'performed_by_person_id', label: 'Ä°ÅŸlemi Yapan', type: 'select', required: true, searchable: true, options: personOptions },
    { name: 'counterparty_kind', label: 'KarÅŸÄ± Taraf Tipi', type: 'select', required: true, options: [{ value: 'person', label: 'GerÃ§ek KiÅŸi' }, { value: 'organization', label: 'TÃ¼zel KiÅŸi' }] },
    { name: 'counterparty_person_id', label: 'KarÅŸÄ± Taraf KiÅŸi', type: 'select', searchable: true, options: personOptions, visibleWhen: { field: 'counterparty_kind', operator: 'equals', value: 'person' }, requiredWhen: { field: 'counterparty_kind', operator: 'equals', value: 'person' } },
    { name: 'counterparty_organization_id', label: 'KarÅŸÄ± Taraf Kurum', type: 'select', searchable: true, options: organizationOptions, visibleWhen: { field: 'counterparty_kind', operator: 'equals', value: 'organization' }, requiredWhen: { field: 'counterparty_kind', operator: 'equals', value: 'organization' } },
    { name: 'movement_date', label: 'Tarih', type: 'date', required: true },
    { name: 'direction', label: 'YÃ¶n', type: 'select', required: true, options: [{ value: 'debit', label: 'BorÃ§' }, { value: 'credit', label: 'Alacak' }] },
    { name: 'amount', label: 'Tutar', type: 'number', required: true },
    { name: 'currency', label: 'Para Birimi', type: 'select', required: true, options: [{ value: 'TRY', label: 'TRY' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }] },
    { name: 'payment_method', label: 'Ã–deme YÃ¶ntemi', type: 'select', required: true, options: PAYMENT_METHODS.map(value => ({ value, label: value })) },
    { name: 'document_status', label: 'Belge Durumu', type: 'select', options: [{ value: 'none', label: 'Yok' }, { value: 'waiting', label: 'Bekleniyor' }, { value: 'matched', label: 'EÅŸleÅŸti' }, { value: 'missing', label: 'Eksik' }] },
    { name: 'description', label: 'AÃ§Ä±klama', type: 'textarea', colSpan: 3 },
  ]

  const tabs: FormTab[] = [
    { id: 'matching', label: 'EÅŸleÅŸtirme', fields: [
      { name: 'invoice_match_status', label: 'Fatura', type: 'select', options: invoiceOptions() },
      { name: 'bank_match_status', label: 'Banka/Kart', type: 'select', options: bankOptions() },
      { name: 'reconciliation_status', label: 'Mutabakat', type: 'select', options: [{ value: 'none', label: 'Yok' }, { value: 'waiting', label: 'Bekleniyor' }, { value: 'matched', label: 'EÅŸleÅŸti' }] },
      { name: 'row_health_status', label: 'SatÄ±r SaÄŸlÄ±ÄŸÄ±', type: 'select', options: Object.entries(ROW_HEALTH_LABELS).map(([value, label]) => ({ value, label })) },
    ] },
    { id: 'workflow', label: 'Durum', fields: [
      { name: 'status', label: 'Durum', type: 'select', options: MOVEMENT_STATUSES.map(value => ({ value, label: value })) },
      { name: 'workflow_status', label: 'Workflow', type: 'select', options: [{ value: 'none', label: 'Yok' }, { value: 'pending', label: 'Onay Bekliyor' }, { value: 'approved', label: 'OnaylandÄ±' }, { value: 'rejected', label: 'Reddedildi' }] },
    ] },
    { id: 'history', label: 'GeÃ§miÅŸ', fields: [{ name: 'history', label: 'GeÃ§miÅŸ', type: 'custom', colSpan: 3, render: () => <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700">Audit ve geÃ§miÅŸ kayÄ±tlarÄ± iÃ§in hazÄ±r alan.</div> }] },
  ]

  const widgets: WidgetDef<any>[] = useMemo(() => [
    { key: 'total', label: 'Hareket', render: () => tableData.length },
    { key: 'draft', label: 'Taslak', render: () => tableData.filter(row => row.status === 'Taslak').length },
    { key: 'approved', label: 'OnaylÄ±', render: () => tableData.filter(row => ['OnaylandÄ±', 'KesinleÅŸti'].includes(row.status)).length },
    { key: 'review', label: 'Ä°nceleme', render: () => tableData.filter(row => row.row_health_status === 'manual_review_required').length },
  ], [tableData])

  const save = async (data: Record<string, any>) => {
    setSaving(true)
    try {
      await preAccountingService.create(data)
      preAccountingService.invalidate()
      setToast({ type: 'success', title: 'Kaydedildi', message: 'Ã–n muhasebe hareketi oluÅŸturuldu.' })
      setPageState('list')
      setSelected(null)
      await loadData()
    } catch (error) {
      setToast({ type: 'error', title: 'Hata', message: error instanceof Error ? error.message : 'Kaydedilemedi' })
      throw error
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <PageBanner
        mode={pageState === 'list' ? 'list' : 'form'}
        formMode={pageState === 'list' ? undefined : formMode}
        title={pageState === 'list' ? 'Ã–n Muhasebe Hareketleri' : pageState === 'create' ? 'Yeni Hareket' : selected?.description || 'Hareket DetayÄ±'}
        subtitle={pageState === 'list' ? 'Harcama, Ã¶deme, tahsilat ve cari hareketleri sade bir ekrandan yÃ¶netin.' : 'Ã–n muhasebe hareketi'}
        icon={<FileText size={24} />}
        onAddClick={pageState === 'list' && can(ACCOUNTING_PERMISSIONS.preAccountingInsert) ? () => { setSelected(null); setPageState('create') } : undefined}
        addButtonText="Yeni Hareket Ekle"
        onBackClick={pageState === 'list' ? undefined : () => setPageState('list')}
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {pageState === 'list' ? (
        <div className="mt-6">
          <div className="mb-3 flex justify-end gap-2">
            <button className="btn"><Filter size={16} />Filtreler</button>
            <button className="btn"><RefreshCw size={16} />EÅŸleÅŸtirme Ã‡alÄ±ÅŸtÄ±r</button>
            <button className="btn"><Download size={16} />DÄ±ÅŸa Aktar</button>
          </div>
          <SmartDataTable columns={columns} data={tableData} loading={loading} widgets={widgets} defaultView="list" storageKey="pre-accounting-movements" emptyText="Ã–n muhasebe hareketi bulunamadÄ±" onRefresh={loadData} onRowClick={(row) => { setSelected(row); setPageState('view') }} />
        </div>
      ) : (
        <div className="mt-6">
          <EntityForm mode={formMode} entityName="Ã–n Muhasebe Hareketleri" entityNameSingular="Hareket" heroFields={heroFields} tabs={tabs} data={selected || { movement_date: new Date().toISOString().slice(0, 10), currency: 'TRY', exchange_rate: 1, status: 'Taslak', document_status: 'none', invoice_match_status: 'none', bank_match_status: 'none', reconciliation_status: 'none', row_health_status: 'missing_document' }} saving={saving} onSave={save} onCancel={() => setPageState('list')} onModeChange={(nextMode) => setPageState(nextMode)} canCreate={can(ACCOUNTING_PERMISSIONS.preAccountingInsert)} canEdit={can(ACCOUNTING_PERMISSIONS.preAccountingEdit)} enableHistory />
        </div>
      )}
    </div>
  )
}

function documentLabel(value: string) {
  return ({ none: 'Yok', waiting: 'Bekleniyor', matched: 'EÅŸleÅŸti', missing: 'Eksik' } as Record<string, string>)[value] || value
}

function bankLabel(value: string) {
  return ({ none: 'Yok', waiting: 'Bekleniyor', matched: 'EÅŸleÅŸti', manual_match: 'Manuel EÅŸleÅŸti', not_found: 'BulunamadÄ±' } as Record<string, string>)[value] || value
}

function invoiceOptions() {
  return ['none', 'waiting', 'matched', 'mismatch_amount', 'mismatch_counterparty', 'rejected', 'cancelled', 'disputed', 'approved', 'posted'].map(value => ({ value, label: value }))
}

function bankOptions() {
  return ['none', 'waiting', 'matched', 'mismatch_amount', 'mismatch_date', 'mismatch_counterparty', 'not_found', 'manual_match'].map(value => ({ value, label: value }))
}

