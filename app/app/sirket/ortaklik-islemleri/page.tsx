'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowDownUp, Check, Clock, ExternalLink, FileText, History, Plus, RotateCcw, Send, ShieldAlert, X } from 'lucide-react'
import { EntityForm, FormField, FormMode, FormTab } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { buildOwnershipTransactionsDashboard } from '@/lib/modules/ownership-transactions/ownershipTransactionsDashboard.config'
import {
  approvalStatusLabels,
  capitalTransactionTypes,
  documentStatusOptions,
  getPartyFieldVisibility,
  ownershipTransactionColumns,
  privilegeTypeOptions,
  statusLabels,
  transactionReasonOptions,
  transactionTypes,
} from '@/lib/modules/ownership-transactions/ownershipTransactions.config'
import { CapitalPaymentReconciliationService } from '@/lib/modules/ownership-transactions/CapitalPaymentReconciliationService'
import { getOwnershipTransactionCapabilities } from '@/lib/modules/ownership-transactions/ownershipTransactions.permissions'
import type { CapitalPaymentMovement, CurrentOwnershipRow, OwnershipTransaction } from '@/lib/modules/ownership-transactions/ownershipTransactions.types'

type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }
type Option = { value: string; label: string }

interface PartnerOption extends Option {
  company_id: string
  owner_kind?: string
}

export default function OwnershipTransactionsPage() {
  return (
    <Suspense fallback={<OwnershipTransactionsFallback />}>
      <OwnershipTransactionsContent />
    </Suspense>
  )
}

function OwnershipTransactionsFallback() {
  return (
    <div className="space-y-4">
      <PageBanner
        mode="list"
        title="Ortaklık İşlemleri"
        subtitle="Ortaklık işlemleri yükleniyor"
        icon={<ArrowDownUp size={24} />}
      />
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">
        Yükleniyor...
      </div>
    </div>
  )
}

function OwnershipTransactionsContent() {
  const searchParams = useSearchParams()
  const [pageState, setPageState] = useState<PageState>('list')
  const [transactions, setTransactions] = useState<OwnershipTransaction[]>([])
  const [companies, setCompanies] = useState<Option[]>([])
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [currentOwnership, setCurrentOwnership] = useState<CurrentOwnershipRow[]>([])
  const [linkedCapitalMovements, setLinkedCapitalMovements] = useState<CapitalPaymentMovement[]>([])
  const [selected, setSelected] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  const capabilities = getOwnershipTransactionCapabilities()
  const formMode: FormMode = pageState === 'create' ? 'create' : pageState === 'edit' ? 'edit' : 'view'
  const selectedCompanyId = selected?.company_id || companies[0]?.value
  const partnerOptions = partners.filter(partner => !selectedCompanyId || partner.company_id === selectedCompanyId)
  const partnerNameById = useMemo(() => Object.fromEntries(partners.map(partner => [partner.value, partner.label])), [partners])
  const companyNameById = useMemo(() => Object.fromEntries(companies.map(company => [company.value, company.label])), [companies])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [transactionResponse, companyResponse, partnerResponse] = await Promise.all([
        fetch('/api/ownership-transactions'),
        fetch('/api/sirketler?is_active=true'),
        fetch('/api/sirketler/ortaklar'),
      ])
      const [transactionPayload, companyPayload, partnerPayload] = await Promise.all([
        transactionResponse.json(),
        companyResponse.json(),
        partnerResponse.json(),
      ])
      if (!transactionResponse.ok) throw new Error(transactionPayload.error || 'Ortaklık işlemleri yüklenemedi')
      if (!companyResponse.ok) throw new Error(companyPayload.error || 'Şirketler yüklenemedi')
      if (!partnerResponse.ok) throw new Error(partnerPayload.error || 'Ortaklar yüklenemedi')

      const companyRows = Array.isArray(companyPayload.data) ? companyPayload.data : []
      const partnerRows = Array.isArray(partnerPayload.data) ? partnerPayload.data : []
      setTransactions(Array.isArray(transactionPayload.data) ? transactionPayload.data : [])
      setCompanies(companyRows.map((company: any) => ({ value: company.id, label: company.ticari_unvan || company.kisa_unvan || 'Şirket' })))
      setPartners(partnerRows.filter((partner: any) => !partner.is_deleted).map((partner: any) => ({
        value: partner.id,
        label: partner.display_name || partner.ortak_adi || 'Ortak',
        company_id: partner.sirket_id || partner.company_id,
        owner_kind: partner.owner_kind,
      })))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const mode = searchParams.get('mode')
    const companyId = searchParams.get('company_id')
    const partnerId = searchParams.get('partner_id')
    if (mode === 'create' || companyId || partnerId) {
      setSelected({
        company_id: companyId || companies[0]?.value || '',
        to_partner_id: partnerId || '',
        affected_partner_id: partnerId || '',
        transaction_type: '',
        transaction_date: new Date().toISOString().slice(0, 10),
        effective_date: new Date().toISOString().slice(0, 10),
        status: 'draft',
        approval_status: 'draft',
        workflow_status: 'draft',
        currency: 'TRY',
        document_status: 'Belge Yok',
      })
      setPageState('create')
    }
  }, [searchParams, companies])

  useEffect(() => {
    if (!selectedCompanyId) return
    fetch(`/api/companies/${selectedCompanyId}/current-ownership`)
      .then(response => response.json())
      .then(payload => setCurrentOwnership(Array.isArray(payload.data) ? payload.data : []))
      .catch(() => setCurrentOwnership([]))
  }, [selectedCompanyId])

  useEffect(() => {
    if (!selected?.id) {
      setLinkedCapitalMovements([])
      return
    }

    fetch(`/api/muhasebe/on-muhasebe-hareketleri?linked_ownership_transaction_id=${selected.id}`)
      .then(response => response.json())
      .then(payload => setLinkedCapitalMovements(Array.isArray(payload.data) ? payload.data : []))
      .catch(() => setLinkedCapitalMovements([]))
  }, [selected?.id])

  const tableData = transactions.map(transaction => ({
    ...transaction,
    company_name: companyNameById[transaction.company_id] || '-',
    from_partner_name: transaction.from_partner_id ? partnerNameById[transaction.from_partner_id] || '-' : '-',
    to_partner_name: transaction.to_partner_id ? partnerNameById[transaction.to_partner_id] || '-' : '-',
    affected_partner_name: transaction.affected_partner_id ? partnerNameById[transaction.affected_partner_id] || '-' : '-',
    status_label: statusLabels[transaction.status] || transaction.status,
    approval_status_label: approvalStatusLabels[transaction.approval_status] || transaction.approval_status,
    row_actions: <RowActions row={transaction} capabilities={capabilities} onAction={handleWorkflowAction} onOpen={handleOpen} />,
  }))

  const dashboardWidgets = useMemo(() => buildOwnershipTransactionsDashboard(transactions), [transactions])

  const handleOpen = async (row: OwnershipTransaction) => {
    setSelected(normalizeForForm(row))
    setPageState('view')
    setFormError(null)
    try {
      const response = await fetch(`/api/ownership-transactions/${row.id}`)
      const payload = await response.json()
      if (response.ok && payload.data) setSelected(normalizeForForm(payload.data))
    } catch {
      // List data is enough for initial display.
    }
  }

  async function handleWorkflowAction(action: 'send-approval' | 'approve' | 'reject' | 'cancel' | 'reverse', row: OwnershipTransaction) {
    try {
      const response = await fetch(`/api/ownership-transactions/${row.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'İşlem tamamlanamadı')
      setToast({ type: 'success', title: 'İşlem Tamamlandı', message: workflowActionLabel(action) })
      await loadData()
      if (payload.data) setSelected(normalizeForForm(payload.data))
    } catch (err: any) {
      setToast({ type: 'error', title: 'İşlem Başarısız', message: err.message })
    }
  }

  const handleSave = async (data: Record<string, any>, mode: FormMode) => {
    setSaving(true)
    setFormError(null)
    try {
      const payload = normalizePayload(data, companies)
      const response = await fetch(mode === 'create' ? '/api/ownership-transactions' : `/api/ownership-transactions/${selected?.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Ortaklık işlemi kaydedilemedi')
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: mode === 'create' ? 'Ortaklık işlemi oluşturuldu' : 'Ortaklık işlemi güncellendi' })
      await loadData()
      setSelected(result.data ? normalizeForForm(result.data) : null)
      setPageState('list')
    } catch (err: any) {
      setFormError(err.message)
      setToast({ type: 'error', title: 'Kayıt Başarısız', message: err.message })
      throw err
    } finally {
      setSaving(false)
    }
  }

  const formFields = buildFormFields(companies, partnerOptions)
  const formTabs = buildFormTabs(currentOwnership, selected, partnerNameById, linkedCapitalMovements)
  const banner = pageState === 'list'
    ? {
        mode: 'list' as const,
        title: 'Ortaklık İşlemleri',
        subtitle: 'Hisse, oy hakkı, kar payı, sermaye ve ortaklık haklarındaki değişiklikleri işlem bazlı yönetin.',
        addButtonText: 'Ekle',
        onAddClick: () => {
          setSelected({
            company_id: companies[0]?.value || '',
            transaction_type: '',
            transaction_date: new Date().toISOString().slice(0, 10),
            effective_date: new Date().toISOString().slice(0, 10),
            status: 'draft',
            approval_status: 'draft',
            workflow_status: 'draft',
            currency: 'TRY',
            document_status: 'Belge Yok',
          })
          setPageState('create')
        },
      }
    : {
        mode: 'form' as const,
        formMode,
        title: selected?.transaction_no || 'Yeni Ortaklık İşlemi',
        subtitle: selected?.transaction_type || 'Ortaklık haklarını işlem bazlı yönetin',
        onBackClick: () => setPageState('list'),
      }

  return (
    <div className="relative">
      <PageBanner
        mode={banner.mode}
        title={banner.title}
        subtitle={banner.subtitle}
        icon={<ArrowDownUp size={24} />}
        {...(banner.mode === 'list'
          ? { onAddClick: banner.onAddClick, addButtonText: banner.addButtonText }
          : { onBackClick: banner.onBackClick, formMode: banner.formMode })}
      />

      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {pageState === 'list' && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            <ToolbarButton icon={<ShieldAlert size={16} />} label="Filtreler" />
            <ToolbarButton icon={<Send size={16} />} label="Onaya Gönder" />
            <ToolbarButton icon={<FileText size={16} />} label="Dışa Aktar" />
            <ToolbarButton icon={<History size={16} />} label="Geçmiş" />
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{error}</div>}
          <SmartDataTable
            columns={ownershipTransactionColumns}
            data={tableData}
            loading={loading}
            dashboardWidgets={dashboardWidgets}
            defaultView="list"
            storageKey="ownership-transactions-table"
            emptyText="Ortaklık işlemi bulunamadı"
            onRowClick={handleOpen}
            onRefresh={loadData}
          />
        </div>
      )}

      {pageState !== 'list' && (
        <div className="mt-6">
          <EntityForm
            mode={formMode}
            entityName="Ortaklık İşlemleri"
            entityNameSingular="Ortaklık İşlemi"
            heroFields={formFields}
            tabs={formTabs}
            data={selected || undefined}
            saving={saving}
            error={formError}
            canEdit={capabilities.canEdit}
            canCreate={capabilities.canInsert}
            onSave={handleSave}
            onCancel={() => setPageState('list')}
            onModeChange={(mode) => setPageState(mode === 'create' ? 'create' : mode === 'edit' ? 'edit' : 'view')}
            additionalActions={selected?.id ? (
              <WorkflowButtons row={selected as OwnershipTransaction} capabilities={capabilities} onAction={handleWorkflowAction} />
            ) : null}
            enableHistory
            documentSlot={{
              title: 'Belgeler',
              dataField: 'document_files',
              slots: [
                { id: 'pay_devir_sozlesmesi', title: 'Pay Devir Sözleşmesi', required: false },
                { id: 'ortaklar_kurulu_karari', title: 'Ortaklar Kurulu Kararı', required: false },
                { id: 'yonetim_kurulu_karari', title: 'Yönetim Kurulu Kararı', required: false },
                { id: 'genel_kurul_karari', title: 'Genel Kurul Kararı', required: false },
                { id: 'pay_defteri', title: 'Pay Defteri Kaydı', required: false },
                { id: 'ticaret_sicil', title: 'Ticaret Sicil Gazetesi', required: false },
                { id: 'imza_beyani', title: 'İmza Beyanı', required: false },
                { id: 'sermaye_artirim', title: 'Sermaye Artırım Belgesi', required: false },
                { id: 'sermaye_azaltim', title: 'Sermaye Azaltım Belgesi', required: false },
                { id: 'diger', title: 'Diğer Belgeler', required: false },
              ],
              acceptedTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
              maxSizeMB: 20,
            }}
          />
        </div>
      )}
    </div>
  )
}

function buildFormFields(companies: Option[], partners: Option[]): FormField[] {
  const partnerSelect = partners.length ? partners : [{ value: '', label: 'Önce Ortaklar sayfasından ortak oluşturun' }]
  return [
    { name: 'company_id', label: 'Şirket', type: 'select', required: true, searchable: true, options: companies, defaultValue: companies.length === 1 ? companies[0].value : undefined },
    { name: 'transaction_type', label: 'İşlem Tipi', type: 'select', required: true, searchable: true, options: transactionTypes.map(value => ({ value, label: value })) },
    { name: 'transaction_date', label: 'İşlem Tarihi', type: 'date', required: true },
    { name: 'effective_date', label: 'Geçerlilik Tarihi', type: 'date', required: true },
  ]
}

function buildFormTabs(currentOwnership: CurrentOwnershipRow[], selected: Record<string, any> | null, partnerNameById: Record<string, string>, linkedCapitalMovements: CapitalPaymentMovement[]): FormTab[] {
  const partyVisibility = getPartyFieldVisibility(selected?.transaction_type)
  const partnerSelect = Object.entries(partnerNameById).map(([value, label]) => ({ value, label }))
  const isCapitalTransaction = capitalTransactionTypes.includes(selected?.transaction_type || '')
  const partnerFields: FormField[] = [
    ...(partyVisibility.showFrom || partyVisibility.showExit ? [{ name: 'from_partner_id', label: partyVisibility.showExit ? 'Çıkan Ortak' : 'Devreden Ortak', type: 'select' as const, searchable: true, options: partnerSelect }] : []),
    ...(partyVisibility.showTo ? [{ name: 'to_partner_id', label: selected?.transaction_type === 'Yeni Ortak Girişi' ? 'Yeni Ortak' : selected?.transaction_type === 'Ortaklıktan Çıkış' ? 'Payların Devredileceği Ortak' : 'Devralan Ortak', type: 'select' as const, searchable: true, options: partnerSelect }] : []),
    ...(partyVisibility.showAffected ? [{ name: 'affected_partner_id', label: selected?.transaction_type === 'Sermaye Taahhüdü' ? 'Ortak' : 'Etkilenen Ortak', type: 'select' as const, searchable: true, options: partnerSelect }] : []),
    { name: 'exit_reason', label: 'Çıkış Nedeni', type: 'textarea', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Ortaklıktan Çıkış' } },
    { name: 'document_reference_id', label: 'Belge Referansı', type: 'text' },
  ]

  return [
    {
      id: 'genel',
      label: 'Genel',
      fields: [
        { name: 'transaction_no', label: 'İşlem No', type: 'text' },
        { name: 'transaction_type', label: 'İşlem Tipi', type: 'select', searchable: true, options: transactionTypes.map(value => ({ value, label: value })) },
        { name: 'company_id', label: 'Şirket', type: 'text' },
        { name: 'transaction_date', label: 'İşlem Tarihi', type: 'date' },
        { name: 'effective_date', label: 'Geçerlilik Tarihi', type: 'date' },
        { name: 'transaction_reason', label: 'İşlem Nedeni', type: 'select', searchable: true, options: transactionReasonOptions.map(value => ({ value, label: value })) },
        { name: 'status', label: 'Durum', type: 'select', options: Object.entries(statusLabels).map(([value, label]) => ({ value, label })) },
      ],
    },
    { id: 'taraflar', label: 'Taraflar ve Paylar', fields: [
      ...partnerFields,
      { name: 'share_ratio', label: selected?.transaction_type === 'Pay Devri' || selected?.transaction_type === 'Kısmi Pay Devri' ? 'Devredilen Pay Oranı' : selected?.transaction_type === 'Ortaklıktan Çıkış' ? 'Devredilecek Pay Oranı' : 'Hisse Oranı', type: 'number', visibleWhen: { field: 'transaction_type', includes: ['Yeni Ortak Girişi', 'Pay Devri', 'Kısmi Pay Devri', 'Ortaklıktan Çıkış', 'Sermaye Artırımı', 'Sermaye Azaltımı'] } },
      { name: 'share_units', label: 'Pay Adedi', type: 'number', visibleWhen: { field: 'transaction_type', includes: ['Sermaye Artırımı', 'Sermaye Azaltımı', 'Düzeltme Kaydı'] } },
      { name: 'nominal_value', label: 'Nominal Değer', type: 'number', visibleWhen: { field: 'transaction_type', includes: ['Sermaye Artırımı', 'Sermaye Azaltımı', 'Düzeltme Kaydı'] } },
      { name: 'transfer_price', label: 'Devir Bedeli', type: 'number', visibleWhen: { field: 'transaction_type', includes: ['Pay Devri', 'Kısmi Pay Devri'] } },
      { name: 'currency', label: 'Para Birimi', type: 'select', options: ['TRY', 'USD', 'EUR', 'GBP'].map(value => ({ value, label: value })), visibleWhen: { field: 'transaction_type', includes: ['Yeni Ortak Girişi', 'Pay Devri', 'Kısmi Pay Devri', 'Sermaye Taahhüdü', 'Sermaye Artırımı', 'Sermaye Azaltımı'] } },
      { name: 'committed_capital_amount', label: 'Sermaye Taahhüdü', type: 'number', visibleWhen: { field: 'transaction_type', includes: ['Yeni Ortak Girişi', 'Sermaye Taahhüdü'] } },
      { name: 'capital_amount', label: selected?.transaction_type === 'Sermaye Artırımı' ? 'Artırım Tutarı' : selected?.transaction_type === 'Sermaye Azaltımı' ? 'Azaltım Tutarı' : 'Sermaye Tutarı', type: 'number', visibleWhen: { field: 'transaction_type', includes: ['Sermaye Artırımı', 'Sermaye Azaltımı'] } },
      { name: 'new_capital_amount', label: 'Yeni Sermaye Tutarı', type: 'number', visibleWhen: { field: 'transaction_type', includes: ['Sermaye Artırımı', 'Sermaye Azaltımı'] } },
      { name: 'capital_distribution', label: 'Pay Dağılımı', type: 'textarea', colSpan: 3, visibleWhen: { field: 'transaction_type', includes: ['Sermaye Artırımı', 'Sermaye Azaltımı'] } },
      { name: 'commitment_date', label: 'Taahhüt Tarihi', type: 'date', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Sermaye Taahhüdü' } },
    ] },
    {
      id: 'oy_imtiyaz',
      label: 'Oy ve İmtiyazlar',
      fields: [
        { name: 'voting_ratio', label: selected?.transaction_type === 'Pay Devri' || selected?.transaction_type === 'Kısmi Pay Devri' ? 'Oy Hakkı Etkisi' : 'Oy Hakkı Oranı', type: 'number', visibleWhen: { field: 'transaction_type', includes: ['Yeni Ortak Girişi', 'Pay Devri', 'Kısmi Pay Devri'] } },
        { name: 'old_voting_ratio', label: 'Eski Oy Hakkı', type: 'number', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Oy Hakkı Değişikliği' } },
        { name: 'new_voting_ratio', label: 'Yeni Oy Hakkı', type: 'number', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Oy Hakkı Değişikliği' } },
        { name: 'profit_ratio', label: selected?.transaction_type === 'Pay Devri' || selected?.transaction_type === 'Kısmi Pay Devri' ? 'Kar Payı Etkisi' : 'Kar Payı Oranı', type: 'number', visibleWhen: { field: 'transaction_type', includes: ['Yeni Ortak Girişi', 'Pay Devri', 'Kısmi Pay Devri'] } },
        { name: 'old_profit_ratio', label: 'Eski Kar Payı Oranı', type: 'number', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Kar Payı Oranı Değişikliği' } },
        { name: 'new_profit_ratio', label: 'Yeni Kar Payı Oranı', type: 'number', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Kar Payı Oranı Değişikliği' } },
        { name: 'justification', label: 'Gerekçe', type: 'textarea', colSpan: 3, visibleWhen: { field: 'transaction_type', includes: ['Oy Hakkı Değişikliği', 'Kar Payı Oranı Değişikliği', 'İmtiyazlı Pay Kaldırma'] } },
        { name: 'has_veto_right', label: 'Veto Hakkı Var mı?', type: 'checkbox' },
        { name: 'has_board_nomination_right', label: 'Yönetim Kurulu Aday Gösterme Hakkı Var mı?', type: 'checkbox' },
        { name: 'has_privileged_share', label: 'İmtiyazlı Pay Var mı?', type: 'checkbox' },
        { name: 'privilege_type', label: 'İmtiyaz Türü', type: 'select', searchable: true, options: privilegeTypeOptions.map(value => ({ value, label: value })) },
        { name: 'privilege_description', label: 'İmtiyaz Açıklaması', type: 'textarea', colSpan: 3, visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'İmtiyazlı Pay Tanımı' } },
        { name: 'privilege_start_date', label: 'Başlangıç Tarihi', type: 'date', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'İmtiyazlı Pay Tanımı' } },
        { name: 'privilege_end_date', label: 'Bitiş Tarihi', type: 'date', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'İmtiyazlı Pay Tanımı' } },
        { name: 'removed_privilege_type', label: 'Kaldırılan İmtiyaz Türü', type: 'select', searchable: true, options: privilegeTypeOptions.map(value => ({ value, label: value })), visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'İmtiyazlı Pay Kaldırma' } },
        { name: 'removal_date', label: 'Kaldırma Tarihi', type: 'date', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'İmtiyazlı Pay Kaldırma' } },
      ],
    },
    {
      id: 'belgeler',
      label: 'Belgeler',
      fields: [
        { name: 'document_status', label: 'Belge Durumu', type: 'select', options: documentStatusOptions.map(value => ({ value, label: value })) },
        { name: 'document_reference_id', label: 'Belge Referansı', type: 'text' },
        { name: 'decision_reference_id', label: 'Karar Referansı', type: 'text' },
        { name: 'representative_action', label: 'Temsilci Aksiyonu', type: 'custom', colSpan: 3, render: () => <RepresentativeActionPanel selected={selected} partnerNameById={partnerNameById} /> },
      ],
    },
    {
      id: 'cari',
      label: 'Cari Hareketler',
      fields: [
        { name: 'capital_summary', label: 'Sermaye Ödeme Özeti', type: 'custom', colSpan: 3, render: () => isCapitalTransaction ? <CapitalPaymentSummaryCard selected={selected} movements={linkedCapitalMovements} /> : <ReadOnlyValue value="Bu işlem tipi sermaye ödeme özeti gerektirmez." /> },
        { name: 'linked_capital_movements', label: 'Bağlı Cari Hareketler', type: 'custom', colSpan: 3, render: () => <CapitalMovementsPanel selected={selected} movements={linkedCapitalMovements} /> },
      ],
    },
    {
      id: 'etkiler',
      label: 'Etkiler',
      fields: [
        { name: 'impact_preview', label: 'Etkiler', type: 'custom', colSpan: 3, render: () => <ImpactPreview rows={currentOwnership} selected={selected} partnerNameById={partnerNameById} /> },
      ],
    },
    {
      id: 'gecmis',
      label: 'Geçmiş',
      fields: [
        { name: 'approval_status', label: 'Onay Durumu', type: 'select', options: Object.entries(approvalStatusLabels).map(([value, label]) => ({ value, label })) },
        { name: 'approved_at', label: 'Onay Tarihi', type: 'date' },
        { name: 'description', label: 'Açıklama', type: 'textarea', colSpan: 3, visibleWhen: { field: 'transaction_type', includes: ['Düzeltme Kaydı', 'Ters Kayıt'] } },
        { name: 'correction_transaction_id', label: 'Düzeltilecek İşlem', type: 'text', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Düzeltme Kaydı' } },
        { name: 'correction_reason', label: 'Düzeltme Nedeni', type: 'textarea', colSpan: 3, visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Düzeltme Kaydı' } },
        { name: 'new_values', label: 'Yeni Değerler', type: 'textarea', colSpan: 3, visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Düzeltme Kaydı' } },
        { name: 'reversal_transaction_id', label: 'Tersine Çevrilecek İşlem', type: 'text', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Ters Kayıt' } },
        { name: 'reversal_reason', label: 'Ters Kayıt Nedeni', type: 'textarea', colSpan: 3, visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Ters Kayıt' } },
        { name: 'history', label: 'Geçmiş', type: 'custom', colSpan: 3, render: ({ value }) => <HistoryPanel value={Array.isArray(value) ? value : []} /> },
      ],
    },
  ]
}

function ImpactPreview({ rows, selected, partnerNameById }: { rows: CurrentOwnershipRow[]; selected: Record<string, any> | null; partnerNameById: Record<string, string> }) {
  const after = simulateImpact(rows, selected, partnerNameById)
  const warnings = buildImpactWarnings(after)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ImpactSection title="İşlem Öncesi Ortaklık Yapısı" rows={rows} />
      <ImpactSection title="İşlem Sonrası Ortaklık Yapısı" rows={after} />
      <div className="lg:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="mb-2 font-semibold">Uyarılar</div>
        {warnings.length ? warnings.map(warning => <div key={warning}>{warning}</div>) : <div>Kritik uyarı yok.</div>}
      </div>
    </div>
  )
}

function ImpactSection({ title, rows }: { title: string; rows: CurrentOwnershipRow[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-sm text-gray-500">Onaylı işlem kaynaklı yapı yok.</div>}
        {rows.map(row => (
          <div key={row.partner_id} className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-200">{row.display_name}</span>
            <span className="font-semibold text-gray-900 dark:text-white">%{Number(row.current_share_ratio || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HistoryPanel({ value }: { value: any[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h4 className="mb-3 text-sm font-semibold">İşlem Geçmişi</h4>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          {value.length ? value.map((item, index) => <div key={index}>{item.action || item.field || 'Değişiklik'} - {item.changed_at ? new Date(item.changed_at).toLocaleString('tr-TR') : ''}</div>) : <div>Henüz geçmiş yok.</div>}
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h4 className="mb-3 text-sm font-semibold">Teknik Değişiklik Geçmişi</h4>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          {value.filter(item => item.field).length ? value.filter(item => item.field).map((item, index) => (
            <div key={index}>{item.field}: {String(item.old_value ?? '-')} → {String(item.new_value ?? '-')}</div>
          )) : <div>Teknik değişiklik kaydı yok.</div>}
        </div>
      </div>
    </div>
  )
}

function RowActions({ row, capabilities, onAction, onOpen }: { row: OwnershipTransaction; capabilities: ReturnType<typeof getOwnershipTransactionCapabilities>; onAction: any; onOpen: (row: OwnershipTransaction) => void }) {
  return (
    <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
      <IconAction title="Görüntüle" onClick={() => onOpen(row)} icon={<FileText size={14} />} />
      {capabilities.canEdit && row.approval_status !== 'approved' && <IconAction title="Düzenle" onClick={() => onOpen(row)} icon={<Clock size={14} />} />}
      {capabilities.canEdit && row.approval_status === 'draft' && <IconAction title="Onaya Gönder" onClick={() => onAction('send-approval', row)} icon={<Send size={14} />} />}
      {capabilities.canApprove && row.approval_status === 'pending_approval' && <IconAction title="Onayla" onClick={() => onAction('approve', row)} icon={<Check size={14} />} />}
      {capabilities.canApprove && row.approval_status === 'pending_approval' && <IconAction title="Reddet" onClick={() => onAction('reject', row)} icon={<X size={14} />} />}
      {capabilities.canCancel && row.status !== 'cancelled' && <IconAction title="İptal Et" onClick={() => onAction('cancel', row)} icon={<X size={14} />} />}
      {capabilities.canReverse && row.approval_status === 'approved' && <IconAction title="Ters İşlem Oluştur" onClick={() => onAction('reverse', row)} icon={<RotateCcw size={14} />} />}
    </div>
  )
}

function WorkflowButtons({ row, capabilities, onAction }: { row: OwnershipTransaction; capabilities: ReturnType<typeof getOwnershipTransactionCapabilities>; onAction: any }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {capabilities.canEdit && row.approval_status === 'draft' && <button type="button" onClick={() => onAction('send-approval', row)} className="rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30">Onaya Gönder</button>}
      {capabilities.canApprove && row.approval_status === 'pending_approval' && <button type="button" onClick={() => onAction('approve', row)} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30">Onayla</button>}
      {capabilities.canApprove && row.approval_status === 'pending_approval' && <button type="button" onClick={() => onAction('reject', row)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30">Reddet</button>}
      {capabilities.canCancel && row.status !== 'cancelled' && <button type="button" onClick={() => onAction('cancel', row)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900">İptal Et</button>}
    </div>
  )
}

function ToolbarButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">{icon}{label}</button>
}

function IconAction({ title, icon, onClick }: { title: string; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" title={title} onClick={onClick} className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">{icon}</button>
}

function ReadOnlyValue({ value }: { value: string }) {
  return <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">{value}</div>
}

function RepresentativeActionPanel({ selected, partnerNameById }: { selected: Record<string, any> | null; partnerNameById: Record<string, string> }) {
  const partnerId = selected?.to_partner_id || selected?.affected_partner_id || selected?.from_partner_id || ''
  const href = `/app/sirket/sirketler/temsilciler?mode=create&company_id=${selected?.company_id || ''}&partner_id=${partnerId}&document_reference_id=${selected?.document_reference_id || ''}&source_ownership_transaction_id=${selected?.id || ''}`

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
      <div className="font-semibold">Temsil yetkisi bu sayfada tutulmaz.</div>
      <p className="mt-1">İmza, banka, GİB, SGK, sözleşme, mesul müdür ve kanuni temsilci yetkileri Temsilciler modülünde yönetilir.</p>
      <a href={href} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-3 py-2 font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-gray-900 dark:text-blue-300">
        <ExternalLink size={16} />
        Bu işleme dayanarak temsilci kaydı oluştur
      </a>
      {partnerId && <div className="mt-2 text-xs opacity-80">Aktarılacak ortak: {partnerNameById[partnerId] || partnerId}</div>}
    </div>
  )
}

function CapitalPaymentSummaryCard({ selected, movements }: { selected: Record<string, any> | null; movements: CapitalPaymentMovement[] }) {
  const summary = CapitalPaymentReconciliationService.summarize(selected as Partial<OwnershipTransaction>, movements)
  const items = [
    ['Taahhüt Edilen Sermaye', summary.committedCapital],
    ['Ödenen Sermaye', summary.paidCapital],
    ['Kalan Sermaye Borcu', summary.remainingCapitalDebt],
    ['Fazla Ödeme', summary.overpayment],
  ]

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
          <div className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{Number(value || 0).toLocaleString('tr-TR')}</div>
        </div>
      ))}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
        <div className="text-xs text-emerald-700 dark:text-emerald-300">Ödeme Durumu</div>
        <div className="mt-1 text-sm font-semibold text-emerald-900 dark:text-emerald-100">{summary.paymentStatus}</div>
      </div>
    </div>
  )
}

function CapitalMovementsPanel({ selected, movements }: { selected: Record<string, any> | null; movements: CapitalPaymentMovement[] }) {
  const listHref = selected?.id ? `/app/muhasebe/on-muhasebe-hareketleri?linked_ownership_transaction_id=${selected.id}` : '/app/muhasebe/on-muhasebe-hareketleri'
  const createHref = `/app/muhasebe/on-muhasebe-hareketleri?mode=create&movement_type=Sermaye%20Ödemesi&company_id=${selected?.company_id || ''}&linked_ownership_transaction_id=${selected?.id || ''}`

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <a href={listHref} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
          <ExternalLink size={16} />
          Bağlı Cari Hareketleri Gör
        </a>
        <a href={createHref} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30">
          <Plus size={16} />
          Yeni Sermaye Ödemesi Hareketi Oluştur
        </a>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-10 gap-2 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {['Tarih', 'Hareket Tipi', 'Ortak', 'Tutar', 'Para Birimi', 'Sermaye İlişki Tipi', 'Mahsup Tutarı', 'Durum', 'Belge', 'İşlemler'].map(label => <div key={label}>{label}</div>)}
        </div>
        {movements.length ? movements.map(movement => (
          <div key={movement.id} className="grid grid-cols-10 gap-2 border-t border-gray-100 px-3 py-2 text-xs text-gray-700 dark:border-gray-800 dark:text-gray-200">
            <div>{movement.movement_date}</div>
            <div>{movement.movement_type}</div>
            <div>{movement.partner_name || '-'}</div>
            <div>{Number(movement.amount || 0).toLocaleString('tr-TR')}</div>
            <div>{movement.currency}</div>
            <div>{movement.capital_relation_type || '-'}</div>
            <div>{Number(movement.offset_amount || 0).toLocaleString('tr-TR')}</div>
            <div>{movement.status}</div>
            <div>{movement.document_reference_id || '-'}</div>
            <div><a className="text-blue-600 dark:text-blue-300" href={`${listHref}&movement_id=${movement.id}`}>Aç</a></div>
          </div>
        )) : (
          <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">Bağlı cari hareket bulunamadı. Sermaye ödemesi Cari Hareketler / Ön Muhasebe Hareketleri formunda oluşturulur.</div>
        )}
      </div>
    </div>
  )
}

function normalizeForForm(row: OwnershipTransaction) {
  return {
    ...row,
    document_files: row.document_files || [],
    history: row.history || [],
    impact_preview: null,
  }
}

function normalizePayload(raw: Record<string, any>, companies: Option[]) {
  const payload = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== '' && value !== undefined))
  if (typeof payload.capital_distribution === 'string') {
    payload.capital_distribution = parseJsonValue(payload.capital_distribution, [])
  }
  if (typeof payload.new_values === 'string') {
    payload.new_values = parseJsonValue(payload.new_values, {})
  }
  payload.company_id = payload.company_id || companies[0]?.value
  payload.currency = payload.currency || 'TRY'
  payload.document_status = payload.document_status || 'Belge Yok'
  payload.status = payload.status || 'draft'
  payload.approval_status = payload.approval_status || 'draft'
  payload.workflow_status = payload.workflow_status || payload.approval_status
  delete payload.impact_preview
  return payload
}

function parseJsonValue(value: string, fallback: any) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function simulateImpact(rows: CurrentOwnershipRow[], selected: Record<string, any> | null, partnerNameById: Record<string, string>) {
  if (!selected) return rows
  const map = new Map(rows.map(row => [row.partner_id, { ...row }]))
  const apply = (partnerId: string | undefined, direction: 1 | -1) => {
    if (!partnerId) return
    const row = map.get(partnerId) || {
      company_id: selected.company_id,
      partner_id: partnerId,
      display_name: partnerNameById[partnerId] || 'Seçili ortak',
      current_share_ratio: 0,
      current_voting_ratio: 0,
      current_profit_ratio: 0,
      current_capital_amount: 0,
      current_share_units: 0,
      has_veto_right: false,
      has_board_nomination_right: false,
      has_privileged_share: false,
    }
    row.current_share_ratio = Math.max(0, Number(row.current_share_ratio || 0) + Number(selected.share_ratio || 0) * direction)
    row.current_voting_ratio = Math.max(0, Number(row.current_voting_ratio || 0) + Number(selected.voting_ratio || 0) * direction)
    row.current_profit_ratio = Math.max(0, Number(row.current_profit_ratio || 0) + Number(selected.profit_ratio || 0) * direction)
    row.current_capital_amount = Math.max(0, Number(row.current_capital_amount || 0) + Number(selected.capital_amount || 0) * direction)
    row.current_share_units = Math.max(0, Number(row.current_share_units || 0) + Number(selected.share_units || 0) * direction)
    map.set(partnerId, row as CurrentOwnershipRow)
  }
  apply(selected.to_partner_id, 1)
  if (['Pay Devri', 'Kısmi Pay Devri', 'Ortaklıktan Çıkış', 'Sermaye Azaltımı'].includes(selected.transaction_type)) apply(selected.from_partner_id, -1)
  apply(selected.affected_partner_id, 1)
  return Array.from(map.values())
}

function buildImpactWarnings(rows: CurrentOwnershipRow[]) {
  const warnings: string[] = []
  const totalShare = rows.reduce((sum, row) => sum + Number(row.current_share_ratio || 0), 0)
  const totalVoting = rows.reduce((sum, row) => sum + Number(row.current_voting_ratio || 0), 0)
  if (rows.length && Math.abs(totalShare - 100) > 0.01) warnings.push('Toplam hisse 100% değil')
  if (rows.length && Math.abs(totalVoting - 100) > 0.01) warnings.push('Toplam oy hakkı 100% değil')
  return warnings
}

function workflowActionLabel(action: string) {
  return ({
    'send-approval': 'İşlem onaya gönderildi',
    approve: 'İşlem onaylandı ve hesaplamalara dahil edildi',
    reject: 'İşlem reddedildi',
    cancel: 'İşlem iptal edildi',
    reverse: 'Ters işlem taslağı oluşturuldu',
  } as Record<string, string>)[action] || 'İşlem tamamlandı'
}
