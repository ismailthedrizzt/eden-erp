'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowDownUp, Check, Clock, Download, Eye, Filter, FileText, History, Pencil, Plus, RotateCcw, Send, X } from 'lucide-react'
import { EntityForm, FormField, FormMode } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable } from '@/components/ui/SmartDataTable'
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
import type { OwnershipTransaction } from '@/lib/modules/ownership-transactions/ownershipTransactions.types'

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
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

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
  const selectedPartnerHasEntry = selectedCompanyId && selectedPartnerId
    ? hasOwnershipEntry(transactions, selectedCompanyId, selectedPartnerId, newEntryTransactionType)
    : false
  const availableTransactionTypes = selectedPartnerId
    ? selectedPartnerHasEntry
      ? transactionTypes.filter(type => type !== newEntryTransactionType)
      : [newEntryTransactionType]
    : transactionTypes

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
      setCompanies(companyRows.map((company: any) => ({
        value: company.id,
        label: company.ticari_unvan || company.kisa_unvan || 'Şirket',
      })))
      setPartners(partnerRows.filter((partner: any) => !partner.is_deleted).map((partner: any) => ({
        value: partner.id,
        label: partner.display_name || partner.ortak_adi || 'Ortak',
        company_id: partner.sirket_id || partner.company_id,
        owner_kind: partner.owner_kind,
        photo_logo: Array.isArray(partner.photo_logo) ? partner.photo_logo : [],
        person_id: partner.person_id || null,
        organization_id: partner.organization_id || null,
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
      startCreate(companyId || undefined, partnerId || undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, companies])

  const tableData = transactions.map(transaction => {
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
  })

  function startCreate(companyId?: string, partnerId?: string) {
    const nextCompanyId = companyId || (companies.length === 1 ? companies[0]?.value : '')
    const companyPartners = partners.filter(partner => !nextCompanyId || partner.company_id === nextCompanyId)
    const nextPartnerId = partnerId || (companyPartners.length === 1 ? companyPartners[0].value : '')
    const nextTransactionType = resolveTransactionTypeForPartner(
      transactions,
      nextCompanyId,
      nextPartnerId,
      '',
      newEntryTransactionType,
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
    const nextTransactionType = resolveTransactionTypeForPartner(
      transactions,
      nextCompanyId,
      nextPartnerId,
      currentType,
      newEntryTransactionType,
    )
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
    try {
      const response = await fetch(`/api/ownership-transactions/${row.id}`)
      const payload = await response.json()
      if (response.ok && payload.data) setSelected(normalizeForForm(payload.data))
    } catch {
      // List row is enough for initial display.
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
      const payload = normalizePayload(data, companies, partnerOptions)
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
          />
        </div>
      )}

      {pageState !== 'list' && (
        <div className="mt-6 space-y-4">
          {hasSelectedCompanyWithoutPartners && (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <div>Bu şirkete kayıtlı ortak bulunamadı. Önce Ortaklarımız sayfasından ortak kaydı oluşturmalısınız.</div>
              <Link href="/app/sirket/sirketler/ortaklar" className="inline-flex w-fit items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-gray-900 dark:text-amber-200">
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
              title: selectedPartner?.owner_kind === 'tuzel_kisi' ? 'Logo' : 'Fotoğraf',
              dataField: 'photo_logo',
              readOnly: true,
              slots: [
                {
                  id: 'photo_logo',
                  title: selectedPartner?.owner_kind === 'tuzel_kisi' ? 'Logo' : 'Fotoğraf',
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

function hasOwnershipEntry(transactions: OwnershipTransaction[], companyId: string, partnerId: string, newEntryTransactionType: string) {
  if (!companyId || !partnerId) return false

  return transactions.some(transaction => (
    !transaction.is_deleted &&
    transaction.company_id === companyId &&
    transaction.status !== 'cancelled' &&
    transaction.status !== 'reversed' &&
    (String(transaction.transaction_type) === newEntryTransactionType || String(transaction.transaction_type) === 'Yeni Ortak Girişi') &&
    (
      transaction.affected_partner_id === partnerId ||
      transaction.to_partner_id === partnerId ||
      transaction.from_partner_id === partnerId
    )
  ))
}

function resolveTransactionTypeForPartner(
  transactions: OwnershipTransaction[],
  companyId: string,
  partnerId: string,
  currentType: string,
  newEntryTransactionType: string,
) {
  if (!companyId || !partnerId) return currentType || ''
  const hasEntry = hasOwnershipEntry(transactions, companyId, partnerId, newEntryTransactionType)

  if (!hasEntry) return newEntryTransactionType
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
    payload.affected_partner_id = payload.affected_partner_id || payload.to_partner_id
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
