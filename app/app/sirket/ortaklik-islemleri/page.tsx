'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowDownUp, Check, Clock, Download, Eye, Filter, FileText, History, Pencil, Plus, RotateCcw, Send, X } from 'lucide-react'
import { EntityForm, FormField, FormMode } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, type SortConfig } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import {
  approvalStatusLabels,
  getPartyFieldVisibility,
  ownershipTransactionColumns,
  privilegeTypeOptions,
  statusLabels,
  transactionTypes,
} from '@/lib/modules/ownership-transactions/ownershipTransactions.config'
import { getOwnershipTransactionCapabilities } from '@/lib/modules/ownership-transactions/ownershipTransactions.permissions'
import { ownershipTransactionsService } from '@/lib/modules/ownership-transactions/ownershipTransactions.service'
import { companyService } from '@/lib/services/companyService'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'
import type { OwnershipTransaction } from '@/lib/modules/ownership-transactions/ownershipTransactions.types'
import type { ListMeta } from '@/lib/api/listEndpoint'

type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }
type Option = { value: string; label: string }

interface PartnerOption extends Option {
  company_id: string
  owner_kind?: string
  photo_logo?: any[]
  person_id?: string | null
  organization_id?: string | null
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
  const [selected, setSelected] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [referenceLoading, setReferenceLoading] = useState(false)
  const [referenceError, setReferenceError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [listQuery, setListQuery] = useState({ page: 1, pageSize: 50, search: '', sort: 'created_at', direction: 'desc' as 'asc' | 'desc' })
  const [listMeta, setListMeta] = useState<ListMeta>({ page: 1, pageSize: 50, total: 0, totalPages: 1 })

  const capabilities = getOwnershipTransactionCapabilities()
  const formMode: FormMode = pageState === 'create' ? 'create' : pageState === 'edit' ? 'edit' : 'view'
  const selectedCompanyId = selected?.company_id || (companies.length === 1 ? companies[0]?.value : '')
  const partnerOptions = partners.filter(partner => !selectedCompanyId || partner.company_id === selectedCompanyId)
  const partnerNameById = useMemo(() => Object.fromEntries(partners.map(partner => [partner.value, partner.label])), [partners])
  const companyNameById = useMemo(() => Object.fromEntries(companies.map(company => [company.value, company.label])), [companies])
  const newEntryTransactionType = transactionTypes[0]
  const selectedPartnerId = selected?.affected_partner_id || selected?.to_partner_id || selected?.from_partner_id || ''
  const selectedPartner = partners.find(partner => partner.value === selectedPartnerId) || null
  const selectedFormData = useMemo(
    () => selected ? { ...selected, photo_logo: selectedPartner?.photo_logo || selected.photo_logo || [] } : undefined,
    [selected, selectedPartner],
  )
  const selectedOwnershipSummary = getCurrentOwnershipSummary(transactions, selectedCompanyId, selectedPartnerId)
  const availableTransactionTypes = selectedPartnerId
    ? selectedOwnershipSummary.canCreateInitialOwnership
      ? [newEntryTransactionType]
      : selectedOwnershipSummary.partnerShare > 0
        ? transactionTypes.filter(type => type !== newEntryTransactionType)
        : transactionTypes.filter(type => type !== newEntryTransactionType && !['Pay Devri', 'Kısmi Pay Devri', 'Ortaklıktan Çıkış'].includes(type))
    : transactionTypes
  const formLoadStages = createProgressiveFormLoadStages({
    mode: formMode,
    hasSnapshot: pageState !== 'create' && !!selected,
    detailLoading,
    detailError: !!formError,
    detailReady: pageState !== 'create' && !!selected && !detailLoading,
    hasMaster: !!(selectedPartner?.person_id || selectedPartner?.organization_id),
    referencesLoading: referenceLoading,
    referencesReady: companies.length > 0 || partners.length > 0,
    referencesError: referenceError,
  })

  const loadReferenceData = useCallback(async (force = false) => {
    setReferenceLoading(true)
    setReferenceError(false)
    try {
    const [companyPayload, partnerPayload] = await Promise.all([
      companyService.list({ useCache: !force }),
      companyService.partnersList({ useCache: !force }),
    ])

    const companyRows = Array.isArray(companyPayload.data) ? companyPayload.data : []
    const partnerRows = Array.isArray(partnerPayload.data) ? partnerPayload.data : []

    setCompanies(companyRows.map((company: any) => ({
      value: company.id,
      label: company.trade_name || company.short_name || 'Sirket',
    })))
    setPartners(partnerRows.filter((partner: any) => !partner.is_deleted).map((partner: any) => ({
      value: partner.id,
      label: partner.display_name || partner.partner_name || 'Ortak',
      company_id: partner.company_id || partner.company_id,
      owner_kind: partner.owner_kind,
      photo_logo: Array.isArray(partner.photo_logo) ? partner.photo_logo : [],
      person_id: partner.person_id || null,
      organization_id: partner.organization_id || null,
    })))
    } catch (error) {
      setReferenceError(true)
      throw error
    } finally {
      setReferenceLoading(false)
    }
  }, [])

  const loadData = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      if (force) {
        ownershipTransactionsService.invalidateList()
        companyService.invalidateRelations()
      }
      const transactionPayload = await ownershipTransactionsService.list(listQuery)
      setTransactions(Array.isArray(transactionPayload.data) ? transactionPayload.data : [])
      setListMeta(transactionPayload.meta ?? { page: listQuery.page, pageSize: listQuery.pageSize, total: transactionPayload.data?.length ?? 0, totalPages: 1 })
      loadReferenceData(force).catch(() => {
        setCompanies([])
        setPartners([])
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [listQuery, loadReferenceData])
  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const mode = searchParams.get('mode')
    const companyId = searchParams.get('company_id')
    const partnerId = searchParams.get('partner_id')
    if (mode === 'create' || companyId || partnerId) {
      startCreate(companyId || undefined, partnerId || undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, companies])

  function startCreate(companyId?: string, partnerId?: string) {
    const nextCompanyId = companyId || (companies.length === 1 ? companies[0]?.value : '')
    const companyPartners = partners.filter(partner => !nextCompanyId || partner.company_id === nextCompanyId)
    const nextPartnerId = partnerId || (companyPartners.length === 1 ? companyPartners[0].value : '')
    const nextTransactionType = resolveTransactionTypeForPartner(
      transactions,
      nextCompanyId,
      nextPartnerId,
      '',
    )
    const partner = partners.find(item => item.value === nextPartnerId)
    setSelected({
      company_id: nextCompanyId || '',
      affected_partner_id: nextPartnerId || '',
      to_partner_id: nextTransactionType === newEntryTransactionType ? nextPartnerId : '',
      transaction_type: nextTransactionType,
      photo_logo: partner?.photo_logo || [],
      transaction_date: new Date().toISOString().slice(0, 10),
      effective_date: '',
      status: 'draft',
      approval_status: 'draft',
      workflow_status: 'draft',
    })
    setFormError(null)
    setPageState('create')
  }

  function handleFormFieldChange(field: string, value: any, nextData: Record<string, any>) {
    if (!['company_id', 'affected_partner_id', 'transaction_type'].includes(field)) return

    const nextCompanyId = field === 'company_id' ? value : nextData.company_id
    let nextPartnerId = field === 'affected_partner_id' ? value : nextData.affected_partner_id
    const companyPartners = partners.filter(partner => !nextCompanyId || partner.company_id === nextCompanyId)

    if (field === 'company_id') {
      const currentPartnerBelongsToCompany = companyPartners.some(partner => partner.value === nextPartnerId)
      nextPartnerId = currentPartnerBelongsToCompany
        ? nextPartnerId
        : companyPartners.length === 1
          ? companyPartners[0].value
          : ''
    }

    const currentType = field === 'transaction_type' ? value : nextData.transaction_type
    const resolvedTransactionType = resolveTransactionTypeForPartner(
      transactions,
      nextCompanyId,
      nextPartnerId,
      currentType,
    )
    const summary = getCurrentOwnershipSummary(transactions, nextCompanyId, nextPartnerId)
    const allowedTypes = nextPartnerId
      ? summary.canCreateInitialOwnership
        ? [newEntryTransactionType]
        : summary.partnerShare > 0
          ? transactionTypes.filter(type => type !== newEntryTransactionType)
          : transactionTypes.filter(type => type !== newEntryTransactionType && !['Pay Devri', 'Kısmi Pay Devri', 'Ortaklıktan Çıkış'].includes(type))
      : transactionTypes
    const nextTransactionType = allowedTypes.includes(resolvedTransactionType as any) ? resolvedTransactionType : ''
    const partner = partners.find(item => item.value === nextPartnerId)

    setSelected(prev => ({
      ...(prev || {}),
      ...nextData,
      company_id: nextCompanyId || '',
      affected_partner_id: nextPartnerId || '',
      transaction_type: nextTransactionType,
      to_partner_id: nextTransactionType === newEntryTransactionType
        ? nextPartnerId || ''
        : nextData.to_partner_id || '',
      photo_logo: partner?.photo_logo || [],
    }))
  }

  const handleOpen = async (row: OwnershipTransaction) => {
    setSelected(normalizeForForm(row))
    setPageState('view')
    setFormError(null)
    setDetailLoading(true)
    try {
      const detail = await ownershipTransactionsService.get(row.id)
      if (detail) setSelected(normalizeForForm(detail))
    } catch {
      // List row is enough for initial display.
    } finally {
      setDetailLoading(false)
    }
  }

  const handleEdit = async (row: OwnershipTransaction) => {
    await handleOpen(row)
    setPageState('edit')
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
      await loadData(true)
      if (payload.data) setSelected(normalizeForForm(payload.data))
    } catch (err: any) {
      setToast({ type: 'error', title: 'İşlem Başarısız', message: err.message })
    }
  }

  const handleSave = async (data: Record<string, any>, mode: FormMode) => {
    setSaving(true)
    setFormError(null)
    try {
      const payload = normalizePayload(data, companies, partners)
      const response = await fetch(mode === 'create' ? '/api/ownership-transactions' : `/api/ownership-transactions/${selected?.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Ortaklık işlemi kaydedilemedi')
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: mode === 'create' ? 'Ortaklık işlemi oluşturuldu' : 'Ortaklık işlemi güncellendi' })
      await loadData(true)
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

  const tableData = useMemo(() => transactions.map(transaction => {
    const partnerId = transaction.affected_partner_id || transaction.to_partner_id || transaction.from_partner_id || ''
    return {
      ...transaction,
      company_name: companyNameById[transaction.company_id] || '-',
      partner_name: partnerId ? partnerNameById[partnerId] || '-' : '-',
      share_effect: formatPercent(transaction.share_ratio),
      voting_effect: formatPercent(transaction.new_voting_ratio ?? transaction.voting_ratio),
      profit_effect: formatPercent(transaction.new_profit_ratio ?? transaction.profit_ratio),
      privilege_effect: transaction.has_privileged_share
        ? transaction.privilege_type || 'Var'
        : transaction.has_veto_right
          ? 'Veto Hakkı'
          : transaction.has_board_nomination_right
            ? 'YK Aday Gösterme'
            : '-',
      status_label: statusLabels[transaction.status] || transaction.status,
      approval_status_label: approvalStatusLabels[transaction.approval_status] || transaction.approval_status,
      row_actions: <RowActions row={transaction} capabilities={capabilities} onAction={handleWorkflowAction} onOpen={handleOpen} onEdit={handleEdit} />,
    }
  }), [capabilities, companyNameById, partnerNameById, transactions])

  const handleListSortChange = (sorts: SortConfig[]) => {
    const sort = sorts[0]
    setListQuery(prev => ({ ...prev, page: 1, sort: sort?.key || 'created_at', direction: sort?.direction || 'desc' }))
  }

  const formFields = buildFormFields(companies, partnerOptions, selected, transactions, availableTransactionTypes)
  const hasSelectedCompanyWithoutPartners = !!selectedCompanyId && partnerOptions.length === 0

  return (
    <div className="relative">
      <PageBanner
        mode={pageState === 'list' ? 'list' : 'form'}
        title={pageState === 'list' ? 'Ortaklık İşlemleri' : selected?.transaction_no || 'Yeni Ortaklık İşlemi'}
        subtitle={pageState === 'list'
          ? 'Mevcut ortaklar üzerinde yapılan hisse, pay devri, oy hakkı, kar payı ve imtiyaz işlemlerini yönetin.'
          : selected?.transaction_type || 'Mevcut ortak için ortaklık hakkı işlemi kaydedin.'}
        icon={<ArrowDownUp size={24} />}
        {...(pageState === 'list'
          ? { onAddClick: () => startCreate(), addButtonText: 'Ekle' }
          : { onBackClick: () => setPageState('list'), formMode })}
      />

      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {pageState === 'list' && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            <ToolbarButton icon={<Filter size={16} />} label="Filtreler" />
            <ToolbarButton icon={<Download size={16} />} label="Dışa Aktar" />
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{error}</div>}
          <SmartDataTable
            columns={ownershipTransactionColumns}
            data={tableData}
            loading={loading}
            defaultView="list"
            storageKey="ownership-transactions-table"
            emptyText="Ortaklık işlemi bulunamadı"
            onRowClick={handleOpen}
            onRefresh={loadData}
            defaultPageSize={listQuery.pageSize}
            pagination={{
              mode: 'server',
              page: listMeta.page,
              pageSize: listMeta.pageSize,
              total: listMeta.total,
              onPageChange: page => setListQuery(prev => ({ ...prev, page })),
              onPageSizeChange: pageSize => setListQuery(prev => ({ ...prev, page: 1, pageSize })),
              onSearchChange: search => setListQuery(prev => ({ ...prev, page: 1, search })),
              onSortChange: handleListSortChange,
            }}
          />
        </div>
      )}

      {pageState !== 'list' && (
        <div className="mt-6 space-y-4">
          {hasSelectedCompanyWithoutPartners && (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <div>Bu şirkete kayıtlı ortak bulunamadı. Önce Ortaklarımız sayfasından ortak kaydı oluşturmalısınız.</div>
              <Link href="/app/sirket/companies/partners" className="inline-flex w-fit items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-gray-900 dark:text-amber-200">
                <Plus size={16} />
                Ortaklarımız Sayfasına Git
              </Link>
            </div>
          )}
          <EntityForm
            mode={formMode}
            entityName="Ortaklık İşlemleri"
            entityNameSingular="Ortaklık İşlemi"
            heroFields={formFields}
            tabs={[]}
            data={selectedFormData}
            saving={saving}
            error={formError}
            loadStages={formLoadStages}
            canEdit={capabilities.canEdit}
            canCreate={capabilities.canInsert}
            onSave={handleSave}
            onCancel={() => setPageState('list')}
            onModeChange={(mode) => setPageState(mode === 'create' ? 'create' : mode === 'edit' ? 'edit' : 'view')}
            onFieldChange={handleFormFieldChange}
            additionalActions={selected?.id ? (
              <WorkflowButtons row={selected as OwnershipTransaction} capabilities={capabilities} onAction={handleWorkflowAction} />
            ) : null}
            imageSlot={{
              title: selectedPartner?.owner_kind === 'organization' ? 'Logo' : 'Fotoğraf',
              dataField: 'photo_logo',
              readOnly: true,
              slots: [
                {
                  id: 'photo_logo',
                  title: selectedPartner?.owner_kind === 'organization' ? 'Logo' : 'Fotoğraf',
                  required: false,
                },
              ],
            }}
            documentSlot={{
              title: 'Belge Referansı',
              dataField: 'document_files',
              slots: [
                { id: 'belge_referansi', title: 'Belge Referansı', required: false },
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

function getCurrentOwnershipSummary(transactions: OwnershipTransaction[], companyId: string, partnerId?: string) {
  const today = new Date().toISOString().slice(0, 10)
  const shares = new Map<string, number>()

  transactions
    .filter(transaction => (
      transaction.company_id === companyId &&
      transaction.approval_status === 'approved' &&
      transaction.status === 'active' &&
      !transaction.is_deleted &&
      (transaction.effective_date || transaction.transaction_date) <= today
    ))
    .forEach(transaction => {
      const shareRatio = Number(transaction.share_ratio || 0)
      if (transaction.to_partner_id) {
        shares.set(transaction.to_partner_id, Number(shares.get(transaction.to_partner_id) || 0) + shareRatio)
      }
      if (transaction.from_partner_id && ['Pay Devri', 'Kısmi Pay Devri', 'Ortaklıktan Çıkış'].includes(transaction.transaction_type)) {
        shares.set(transaction.from_partner_id, Number(shares.get(transaction.from_partner_id) || 0) - shareRatio)
      }
      if (transaction.affected_partner_id && transaction.affected_partner_id !== transaction.to_partner_id) {
        shares.set(transaction.affected_partner_id, Number(shares.get(transaction.affected_partner_id) || 0) + shareRatio)
      }
    })

  const totalShare = Array.from(shares.values()).reduce((sum, value) => sum + Math.max(0, value), 0)
  const partnerShare = partnerId ? Math.max(0, Number(shares.get(partnerId) || 0)) : 0

  return {
    totalShare,
    partnerShare,
    canCreateInitialOwnership: !!partnerId && partnerShare <= 0.0001 && totalShare < 99.99,
  }
}

function resolveTransactionTypeForPartner(
  transactions: OwnershipTransaction[],
  companyId: string,
  partnerId: string,
  currentType: string,
) {
  const newEntryTransactionType = transactionTypes[0]
  if (!companyId || !partnerId) return currentType || ''
  const summary = getCurrentOwnershipSummary(transactions, companyId, partnerId)

  if (summary.canCreateInitialOwnership) return newEntryTransactionType
  return currentType === newEntryTransactionType ? '' : currentType || ''
}

function buildFormFields(companies: Option[], partners: Option[], selected: Record<string, any> | null, transactions: OwnershipTransaction[], availableTransactionTypes: readonly string[]): FormField[] {
  const transactionType = selected?.transaction_type || ''
  const newEntryTransactionType = transactionTypes[0]
  const partyVisibility = getPartyFieldVisibility(transactionType)
  const partnerSelect = partners.length ? partners : [{ value: '', label: 'Önce Ortaklarımız sayfasından ortak kaydı oluşturun' }]
  const transactionSelect = transactions.map(transaction => ({
    value: transaction.id,
    label: `${transaction.transaction_no || 'İşlem'} - ${transaction.transaction_type}`,
  }))

  return [
    { name: 'company_id', label: 'Şirket', type: 'select', required: true, searchable: true, options: companies, defaultValue: companies.length === 1 ? companies[0].value : undefined },
    { name: 'affected_partner_id', label: 'Ortak', type: 'select', required: true, searchable: true, options: partnerSelect, defaultValue: partners.length === 1 ? partners[0].value : undefined, disabledWhen: { field: 'company_id', operator: 'empty' } },
    { name: 'transaction_type', label: 'İşlem Tipi', type: 'select', required: true, searchable: true, options: availableTransactionTypes.map(value => ({ value, label: value })), disabledWhen: { field: 'affected_partner_id', operator: 'empty' }, defaultValue: availableTransactionTypes.length === 1 ? availableTransactionTypes[0] : undefined },
    { name: 'transaction_date', label: 'İşlem Tarihi', type: 'date', required: true },
    { name: 'effective_date', label: 'Yürürlük Başlangıç Tarihi', type: 'date', placeholder: 'Boş bırakılırsa işlem tarihi yürürlük başlangıcı kabul edilir.' },

    ...(partyVisibility.showFrom || partyVisibility.showExit ? [{ name: 'from_partner_id', label: partyVisibility.showExit ? 'Çıkan Ortak' : 'Devreden Ortak', type: 'select' as const, searchable: true, required: true, options: partnerSelect, defaultValue: partners.length === 1 ? partners[0].value : undefined }] : []),
    ...(partyVisibility.showTo && transactionType !== newEntryTransactionType ? [{ name: 'to_partner_id', label: transactionType === 'Ortaklıktan Çıkış' ? 'Payların Devredileceği Ortak' : 'Devralan Ortak', type: 'select' as const, searchable: true, required: true, options: partnerSelect, defaultValue: partners.length === 1 ? partners[0].value : undefined }] : []),

    { name: 'share_ratio', label: transactionType === 'Pay Devri' || transactionType === 'Kısmi Pay Devri' ? 'Devredilen Hisse Oranı' : transactionType === 'Ortaklıktan Çıkış' ? 'Devredilecek Hisse Oranı' : 'Hisse Oranı', type: 'number', visibleWhen: { field: 'transaction_type', includes: ['Yeni Ortaklık Girişi', 'Pay Devri', 'Kısmi Pay Devri', 'Ortaklıktan Çıkış'] } },
    { name: 'voting_ratio', label: transactionType === 'Pay Devri' || transactionType === 'Kısmi Pay Devri' ? 'Oy Hakkı Etkisi' : 'Oy Hakkı Oranı', type: 'number', visibleWhen: { field: 'transaction_type', includes: ['Yeni Ortaklık Girişi', 'Pay Devri', 'Kısmi Pay Devri'] } },
    { name: 'profit_ratio', label: transactionType === 'Pay Devri' || transactionType === 'Kısmi Pay Devri' ? 'Kar Payı Etkisi' : 'Kar Payı Oranı', type: 'number', visibleWhen: { field: 'transaction_type', includes: ['Yeni Ortaklık Girişi', 'Pay Devri', 'Kısmi Pay Devri'] } },
    { name: 'exit_reason', label: 'Çıkış Nedeni', type: 'textarea', colSpan: 3, visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Ortaklıktan Çıkış' } },

    { name: 'old_voting_ratio', label: 'Eski Oy Hakkı', type: 'number', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Oy Hakkı Değişikliği' } },
    { name: 'new_voting_ratio', label: 'Yeni Oy Hakkı', type: 'number', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Oy Hakkı Değişikliği' } },
    { name: 'old_profit_ratio', label: 'Eski Kar Payı Oranı', type: 'number', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Kar Payı Oranı Değişikliği' } },
    { name: 'new_profit_ratio', label: 'Yeni Kar Payı Oranı', type: 'number', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Kar Payı Oranı Değişikliği' } },
    { name: 'justification', label: 'Gerekçe', type: 'textarea', colSpan: 3, visibleWhen: { field: 'transaction_type', includes: ['Oy Hakkı Değişikliği', 'Kar Payı Oranı Değişikliği', 'İmtiyazlı Pay Kaldırma'] } },

    { name: 'has_privileged_share', label: 'İmtiyazlı Pay Var mı?', type: 'checkbox', visibleWhen: { field: 'transaction_type', includes: ['Yeni Ortaklık Girişi', 'İmtiyazlı Pay Tanımı'] } },
    { name: 'privilege_type', label: 'İmtiyaz Türü', type: 'select', searchable: true, options: privilegeTypeOptions.map(value => ({ value, label: value })), visibleWhen: { field: 'transaction_type', includes: ['Yeni Ortaklık Girişi', 'İmtiyazlı Pay Tanımı'] } },
    { name: 'privilege_description', label: 'İmtiyaz Açıklaması', type: 'textarea', colSpan: 3, visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'İmtiyazlı Pay Tanımı' } },
    { name: 'privilege_start_date', label: 'Başlangıç Tarihi', type: 'date', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'İmtiyazlı Pay Tanımı' } },
    { name: 'has_veto_right', label: 'Veto Hakkı Var mı?', type: 'checkbox', visibleWhen: { field: 'transaction_type', includes: ['Yeni Ortaklık Girişi', 'İmtiyazlı Pay Tanımı'] } },
    { name: 'has_board_nomination_right', label: 'Yönetim Kurulu Aday Gösterme Hakkı Var mı?', type: 'checkbox', visibleWhen: { field: 'transaction_type', includes: ['Yeni Ortaklık Girişi', 'İmtiyazlı Pay Tanımı'] } },
    { name: 'removed_privilege_type', label: 'Kaldırılan İmtiyaz Türü', type: 'select', searchable: true, options: privilegeTypeOptions.map(value => ({ value, label: value })), visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'İmtiyazlı Pay Kaldırma' } },
    { name: 'removal_date', label: 'Kaldırma Tarihi', type: 'date', visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'İmtiyazlı Pay Kaldırma' } },

    { name: 'correction_transaction_id', label: 'Düzeltilecek İşlem', type: 'select', searchable: true, options: transactionSelect, visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Düzeltme Kaydı' } },
    { name: 'correction_reason', label: 'Düzeltme Nedeni', type: 'textarea', colSpan: 3, visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Düzeltme Kaydı' } },
    { name: 'new_values', label: 'Yeni Değerler', type: 'textarea', colSpan: 3, visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Düzeltme Kaydı' } },
    { name: 'reversal_transaction_id', label: 'Tersine Çevrilecek İşlem', type: 'select', searchable: true, options: transactionSelect, visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Ters Kayıt' } },
    { name: 'reversal_reason', label: 'Ters Kayıt Nedeni', type: 'textarea', colSpan: 3, visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Ters Kayıt' } },

    { name: 'document_reference_id', label: 'Belge Referansı', type: 'text' },
    { name: 'notes', label: 'Açıklama', type: 'textarea', colSpan: 3 },
    { name: 'status', label: 'Durum', type: 'select', options: Object.entries(statusLabels).map(([value, label]) => ({ value, label })) },
    { name: 'approval_status', label: 'Onay Durumu', type: 'select', options: Object.entries(approvalStatusLabels).map(([value, label]) => ({ value, label })) },
  ]
}

function normalizeForForm(row: OwnershipTransaction) {
  return {
    ...row,
    affected_partner_id: row.affected_partner_id || row.to_partner_id || row.from_partner_id || '',
    document_files: row.document_files || [],
    history: row.history || [],
  }
}

function normalizePayload(raw: Record<string, any>, companies: Option[], partners: Option[]) {
  const payload = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== '' && value !== undefined))
  if (typeof payload.new_values === 'string') payload.new_values = parseJsonValue(payload.new_values, {})
  payload.company_id = payload.company_id || companies[0]?.value
  const singlePartnerId = partners.length === 1 ? partners[0].value : ''
  if (payload.transaction_type === 'Yeni Ortaklık Girişi') {
    payload.to_partner_id = payload.to_partner_id || payload.affected_partner_id || singlePartnerId
    delete payload.affected_partner_id
  }
  if (['Oy Hakkı Değişikliği', 'Kar Payı Oranı Değişikliği', 'İmtiyazlı Pay Tanımı', 'İmtiyazlı Pay Kaldırma'].includes(String(payload.transaction_type || ''))) {
    payload.affected_partner_id = payload.affected_partner_id || singlePartnerId
  }
  payload.effective_date = payload.effective_date || payload.transaction_date
  payload.status = payload.status || 'draft'
  payload.approval_status = payload.approval_status || 'draft'
  payload.workflow_status = payload.workflow_status || payload.approval_status
  payload.document_status = payload.document_reference_id || (Array.isArray(payload.document_files) && payload.document_files.length > 0) ? 'Yüklendi' : 'Belge Yok'

  delete payload.currency
  delete payload.transfer_price
  delete payload.capital_amount
  delete payload.new_capital_amount
  delete payload.committed_capital_amount
  delete payload.capital_distribution
  delete payload.commitment_date
  delete payload.share_units
  delete payload.nominal_value
  delete payload.decision_reference_id
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

function RowActions({ row, capabilities, onAction, onOpen, onEdit }: { row: OwnershipTransaction; capabilities: ReturnType<typeof getOwnershipTransactionCapabilities>; onAction: any; onOpen: (row: OwnershipTransaction) => void; onEdit: (row: OwnershipTransaction) => void }) {
  return (
    <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
      <IconAction title="Görüntüle" onClick={() => onOpen(row)} icon={<Eye size={14} />} />
      {capabilities.canEdit && row.approval_status !== 'approved' && <IconAction title="Düzenle" onClick={() => onEdit(row)} icon={<Pencil size={14} />} />}
      {capabilities.canEdit && row.approval_status === 'draft' && <IconAction title="Onaya Gönder" onClick={() => onAction('send-approval', row)} icon={<Send size={14} />} />}
      {capabilities.canApprove && row.approval_status === 'pending_approval' && <IconAction title="Onayla" onClick={() => onAction('approve', row)} icon={<Check size={14} />} />}
      {capabilities.canApprove && row.approval_status === 'pending_approval' && <IconAction title="Reddet" onClick={() => onAction('reject', row)} icon={<X size={14} />} />}
      {capabilities.canCancel && row.status !== 'cancelled' && <IconAction title="İptal Et" onClick={() => onAction('cancel', row)} icon={<X size={14} />} />}
      {capabilities.canReverse && row.approval_status === 'approved' && <IconAction title="Ters Kayıt Oluştur" onClick={() => onAction('reverse', row)} icon={<RotateCcw size={14} />} />}
      <IconAction title="Geçmiş" onClick={() => onOpen(row)} icon={<History size={14} />} />
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
  return <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">{icon}{label}</button>
}

function IconAction({ title, icon, onClick }: { title: string; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" title={title} onClick={onClick} className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">{icon}</button>
}

function formatPercent(value: unknown) {
  const number = Number(value || 0)
  return number > 0 ? `%${number.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}` : '-'
}

function workflowActionLabel(action: string) {
  return ({
    'send-approval': 'İşlem onaya gönderildi',
    approve: 'İşlem onaylandı',
    reject: 'İşlem reddedildi',
    cancel: 'İşlem iptal edildi',
    reverse: 'Ters kayıt taslağı oluşturuldu',
  } as Record<string, string>)[action] || 'İşlem tamamlandı'
}
