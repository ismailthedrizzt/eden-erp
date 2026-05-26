'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ExternalLink, FileText, GitBranch, PencilLine, XCircle } from 'lucide-react'
import { EntityForm, type FormField, type FormMode, type FormOperationAction, type FormOperationActionGroup, type FormTab } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, type ColumnDef, type SortConfig, type TableStatusFilterOption, type WidgetDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { CompanyBranchOpeningWizard, type BranchOpeningPrecheckContext, type BranchOpeningSubmitPayload } from '@/components/ui/CompanyBranchOpeningWizard'
import { CompanyBranchClosingWizard, type BranchClosingPrecheckContext, type BranchClosingSubmitPayload } from '@/components/ui/CompanyBranchClosingWizard'
import { formControlClass } from '@/components/ui/formControlStyles'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'
import { companyService } from '@/lib/services/companyService'
import { buildOperationToast } from '@/lib/operations/operationClient'

type PageState = 'list' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }
type CompanyOption = { value: string; label: string; record_status?: string; company_status?: string }
type BranchRow = Record<string, any> & { id: string }

const BRANCH_STATUS_FILTER_OPTIONS: TableStatusFilterOption[] = [
  { value: 'active', label: 'Aktif', tone: 'active' },
  { value: 'passive', label: 'Pasif', tone: 'passive' },
  { value: 'closed', label: 'Kapalı', tone: 'neutral' },
]

const branchHeroFields: FormField[] = [
  { name: 'branch_name', label: 'Şube Adı', type: 'text', readOnly: true, required: true },
  { name: 'branch_short_name', label: 'Şube Kısa Adı', type: 'text' },
  { name: 'company_name', label: 'Bağlı Şirket', type: 'text', readOnly: true },
  { name: 'branch_type', label: 'Şube Türü', type: 'select', readOnly: true, options: branchTypeOptions() },
  { name: 'is_official_branch', label: 'Resmi Şube mi?', type: 'checkbox', readOnly: true },
  { name: 'status', label: 'Durum', type: 'text', readOnly: true },
  { name: 'city', label: 'İl', type: 'text', readOnly: true },
  { name: 'district', label: 'İlçe', type: 'text', readOnly: true },
]

export default function CompanyBranchesPage() {
  const searchParams = useSearchParams()
  const initialCompanyId = searchParams.get('company_id') || ''
  const [branches, setBranches] = useState<BranchRow[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [selectedBranch, setSelectedBranch] = useState<BranchRow | null>(null)
  const [pageState, setPageState] = useState<PageState>('list')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [listQuery, setListQuery] = useState({ page: 1, pageSize: 50, search: '', sort: 'branch_name', direction: 'asc' as 'asc' | 'desc' })
  const [listMeta, setListMeta] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 1 })
  const [statusFilters, setStatusFilters] = useState<string[]>(['active', 'passive', 'closed'])
  const [companyFilterId, setCompanyFilterId] = useState(initialCompanyId)
  const [companyPickerOpen, setCompanyPickerOpen] = useState(false)
  const [pickerCompanyId, setPickerCompanyId] = useState(initialCompanyId)
  const [branchOpeningWizard, setBranchOpeningWizard] = useState<{ companyId: string; companyName: string; context: BranchOpeningPrecheckContext } | null>(null)
  const [branchClosingWizard, setBranchClosingWizard] = useState<{ companyId: string; companyName: string; context: BranchClosingPrecheckContext } | null>(null)
  const [wizardSaving, setWizardSaving] = useState(false)
  const formMode: FormMode = pageState === 'edit' && selectedBranch?.record_status !== 'closed' ? 'edit' : selectedBranch?.record_status === 'closed' ? 'passive' : 'view'
  const formLoadStages = createProgressiveFormLoadStages({ mode: formMode, hasSnapshot: !!selectedBranch, detailReady: !!selectedBranch && !detailLoading, referencesReady: companies.length > 0 })

  const loadCompanies = useCallback(async (force = false) => {
    try {
      const result = await companyService.list({ useCache: !force, statuses: ['active'], pageSize: 100 })
      setCompanies((result.data || []).map((company: any) => ({ value: company.id, label: company.trade_name || company.short_name || company.id, record_status: company.record_status, company_status: company.company_status })))
    } catch {
      setCompanies([])
    }
  }, [])

  const loadData = useCallback(async (force = false) => {
    setLoading(true)
    try {
      if (force) companyService.invalidateRelations()
      const result = await companyService.branchesList({ useCache: !force, companyId: companyFilterId || undefined, statuses: statusFilters, page: listQuery.page, pageSize: listQuery.pageSize, search: listQuery.search, sort: listQuery.sort, direction: listQuery.direction })
      setBranches(result.data || [])
      setListMeta(result.meta || { page: listQuery.page, pageSize: listQuery.pageSize, total: 0, totalPages: 1 })
    } catch (error: any) {
      setToast({ type: 'error', title: 'Şubeler Yüklenemedi', message: error?.message || 'Şube listesi alınamadı.' })
    } finally {
      setLoading(false)
    }
  }, [companyFilterId, listQuery.direction, listQuery.page, listQuery.pageSize, listQuery.search, listQuery.sort, statusFilters])

  useEffect(() => { loadCompanies() }, [loadCompanies])
  useEffect(() => { loadData() }, [loadData])

  async function openBranch(row: BranchRow) {
    setDetailLoading(true)
    try {
      const result = await companyService.branchDetail(row.id)
      setSelectedBranch(result.data)
      setPageState('view')
    } catch (error: any) {
      setToast({ type: 'error', title: 'Şube Açılmadı', message: error?.message || 'Şube detayı alınamadı.' })
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleSave(payload: Record<string, any>) {
    if (!selectedBranch?.id) return
    setSaving(true)
    setFormError(null)
    setFieldErrors({})
    try {
      const result = await companyService.updateBranch(selectedBranch.id, {
        branch_short_name: payload.branch_short_name || null,
        phone: payload.phone || null,
        email: payload.email || null,
        responsible_person_id: payload.responsible_person_id || null,
        organization_unit_id: payload.organization_unit_id || null,
        facility_id: payload.facility_id || null,
        notes: payload.notes || null,
        base_version: selectedBranch.version || null,
        base_updated_at: selectedBranch.updated_at || null,
      })
      setSelectedBranch(result.data)
      setPageState('view')
      setToast({ type: 'success', title: 'Şube Güncellendi', message: 'Şube kart bilgileri güncellendi.' })
      await loadData(true)
    } catch (error: any) {
      setFieldErrors(error?.details?.details?.fieldErrors || error?.details?.fieldErrors || {})
      setFormError(error?.message || 'Şube kart bilgileri güncellenemedi.')
      setToast({ type: 'error', title: 'Güncelleme Tamamlanamadı', message: error?.message || 'Şube kart bilgileri güncellenemedi.' })
      throw error
    } finally {
      setSaving(false)
    }
  }

  async function openBranchOpening(companyId?: string) {
    const resolvedCompanyId = companyId || pickerCompanyId
    if (!resolvedCompanyId) return setCompanyPickerOpen(true)
    const company = companies.find(item => item.value === resolvedCompanyId)
    setWizardSaving(true)
    try {
      const result = await companyService.branchOpeningPrecheck(resolvedCompanyId)
      setCompanyPickerOpen(false)
      setBranchOpeningWizard({ companyId: resolvedCompanyId, companyName: company?.label || result.data?.current?.trade_name || 'Şirket', context: result.data })
    } catch (error: any) {
      setToast({ type: 'error', title: 'Ön Kontrol Tamamlanamadı', message: error?.message || 'Şube açılışı ön kontrolü yapılamadı.' })
    } finally {
      setWizardSaving(false)
    }
  }

  async function openBranchClosing(branch?: BranchRow | null) {
    const current = branch || selectedBranch
    if (!current?.company_id) return
    setWizardSaving(true)
    try {
      const result = await companyService.branchClosingPrecheck(current.company_id, current.id)
      setBranchClosingWizard({ companyId: current.company_id, companyName: current.company_name || 'Şirket', context: result.data })
    } catch (error: any) {
      setToast({ type: 'error', title: 'Ön Kontrol Tamamlanamadı', message: error?.message || 'Şube kapanışı ön kontrolü yapılamadı.' })
    } finally {
      setWizardSaving(false)
    }
  }

  async function completeBranchOpening(payload: BranchOpeningSubmitPayload) {
    if (!branchOpeningWizard) return
    setWizardSaving(true)
    try {
      const result = await companyService.completeBranchOpening(branchOpeningWizard.companyId, payload)
      companyService.invalidateList()
      companyService.invalidateRelations()
      setBranchOpeningWizard(null)
      setToast(buildOperationToast(result, { title: 'Şube Açılışı Tamamlandı', message: 'Şube açılışı tamamlandı.' }))
      await loadData(true)
    } catch (error: any) {
      setToast({ type: 'error', title: 'Şube Açılışı Tamamlanamadı', message: error?.message || 'İşlem tamamlanamadı.' })
      throw error
    } finally {
      setWizardSaving(false)
    }
  }

  async function completeBranchClosing(payload: BranchClosingSubmitPayload) {
    if (!branchClosingWizard) return
    setWizardSaving(true)
    try {
      const result = await companyService.completeBranchClosing(branchClosingWizard.companyId, payload)
      companyService.invalidateList()
      companyService.invalidateRelations()
      setBranchClosingWizard(null)
      setToast(buildOperationToast(result, { title: 'Şube Kapanışı Tamamlandı', message: 'Şube kapanışı tamamlandı.' }))
      await loadData(true)
      if (selectedBranch?.id === result.data?.branch?.id) setSelectedBranch(prev => ({ ...(prev || {}), ...result.data.branch }))
    } catch (error: any) {
      setToast({ type: 'error', title: 'Şube Kapanışı Tamamlanamadı', message: error?.message || 'İşlem tamamlanamadı.' })
      throw error
    } finally {
      setWizardSaving(false)
    }
  }

  const columns: ColumnDef[] = useMemo(() => [
    { key: 'record_status', label: 'Durum', type: 'badge', width: 110, render: (_, row) => <StatusBadge status={row.record_status || row.status} /> },
    { key: 'branch_name', label: 'Şube Adı', type: 'text', width: 220 },
    { key: 'branch_short_name', label: 'Şube Kısa Adı', type: 'text', width: 160 },
    { key: 'company_name', label: 'Bağlı Şirket', type: 'text', width: 230 },
    { key: 'branch_type', label: 'Şube Türü', type: 'text', width: 150, render: value => branchTypeLabel(value) },
    { key: 'is_official_branch', label: 'Resmi Şube mi?', type: 'boolean', width: 120 },
    { key: 'city', label: 'İl', type: 'text', width: 120 },
    { key: 'district', label: 'İlçe', type: 'text', width: 120 },
    { key: 'address_summary', label: 'Adres Özeti', type: 'text', width: 190 },
    { key: 'phone', label: 'Telefon', type: 'text', width: 140 },
    { key: 'email', label: 'E-posta', type: 'text', width: 190 },
    { key: 'responsible_person_id', label: 'Şube Sorumlusu / Müdürü', type: 'text', width: 190 },
    { key: 'opening_registration_date', label: 'Açılış Tarihi', type: 'date', width: 130 },
    { key: 'closing_registration_date', label: 'Kapanış Tarihi', type: 'date', width: 130 },
    { key: 'trade_registry_number', label: 'Ticaret Sicil No', type: 'text', width: 150 },
    { key: 'tax_office', label: 'Vergi Dairesi', type: 'text', width: 150 },
    { key: 'sgk_workplace_registry_no', label: 'SGK İşyeri Sicil No', type: 'text', width: 170 },
    { key: 'organization_unit_name', label: 'Bağlı Organizasyon Birimi', type: 'text', width: 210 },
    { key: 'facility_name', label: 'Bağlı Lokasyon/Tesis', type: 'text', width: 180 },
    { key: 'last_operation', label: 'Son İşlem', type: 'text', width: 150, render: value => operationLabel(value) },
    { key: 'actions', label: 'İşlemler', type: 'actions', width: 170, render: (_, row) => <RowActions branch={row} onView={() => openBranch(row)} onCloseBranch={() => openBranchClosing(row)} /> },
  ], [])

  const widgets: WidgetDef<BranchRow>[] = useMemo(() => [
    { key: 'total', label: 'Toplam Şube', render: () => branches.length },
    { key: 'active', label: 'Aktif Şube', render: () => branches.filter(isActiveBranch).length },
    { key: 'official', label: 'Resmi Şube', render: () => branches.filter(row => row.is_official_branch && isActiveBranch(row)).length },
    { key: 'operational', label: 'Ofis / Operasyon Noktası', render: () => branches.filter(row => ['liaison_office', 'operation_point'].includes(String(row.branch_type))).length },
    { key: 'closed', label: 'Kapanmış Şube', render: () => branches.filter(row => row.record_status === 'closed' || row.status === 'closed').length },
  ], [branches])

  const tabs: FormTab[] = useMemo(() => [
    { id: 'general', label: 'Genel Bilgiler', fields: [
      { name: 'branch_name', label: 'Şube Adı', type: 'text', readOnly: true },
      { name: 'branch_short_name', label: 'Kısa Ad', type: 'text' },
      { name: 'company_name', label: 'Bağlı Şirket', type: 'text', readOnly: true },
      { name: 'branch_type', label: 'Şube Türü', type: 'select', readOnly: true, options: branchTypeOptions() },
      { name: 'is_official_branch', label: 'Resmi Şube mi?', type: 'checkbox', readOnly: true },
      { name: 'opening_registration_date', label: 'Açılış Tarihi', type: 'date', readOnly: true },
      { name: 'closing_registration_date', label: 'Kapanış Tarihi', type: 'date', readOnly: true },
      { name: 'record_status', label: 'Durum', type: 'text', readOnly: true },
      { name: 'notes', label: 'Notlar', type: 'textarea', colSpan: 3 },
    ] },
    { id: 'address', label: 'Adres / Lokasyon', fields: [
      { name: 'country', label: 'Ülke', type: 'text', readOnly: true },
      { name: 'city', label: 'İl', type: 'text', readOnly: true },
      { name: 'district', label: 'İlçe', type: 'text', readOnly: true },
      { name: 'neighborhood', label: 'Mahalle/Semt', type: 'text', readOnly: true },
      { name: 'address', label: 'Açık Adres', type: 'textarea', colSpan: 3, readOnly: true },
      { name: 'postal_code', label: 'Posta Kodu', type: 'text', readOnly: true },
      { name: 'phone', label: 'Telefon', type: 'tel' },
      { name: 'email', label: 'E-posta', type: 'email' },
      { name: 'facility_name', label: 'Bağlı Facility / Location', type: 'text', readOnly: true },
    ] },
    { id: 'public', label: 'Kamu / Tescil', fields: [
      { name: 'trade_registry_number', label: 'Ticaret Sicil No', type: 'text', readOnly: true },
      { name: 'trade_registry_office', label: 'Ticaret Sicil Müdürlüğü', type: 'text', readOnly: true },
      { name: 'tax_office', label: 'Vergi Dairesi', type: 'text', readOnly: true },
      { name: 'sgk_workplace_registry_no', label: 'SGK İşyeri Sicil No', type: 'text', readOnly: true },
      { name: 'opening_decision_date', label: 'Açılış Karar Tarihi', type: 'date', readOnly: true },
      { name: 'opening_registration_date', label: 'Açılış Tescil Tarihi', type: 'date', readOnly: true },
      { name: 'trade_registry_gazette_date', label: 'Ticaret Sicil Gazetesi Tarihi', type: 'date', readOnly: true },
      { name: 'trade_registry_gazette_number', label: 'Ticaret Sicil Gazetesi Sayısı', type: 'text', readOnly: true },
      { name: 'closing_decision_date', label: 'Kapanış Karar Tarihi', type: 'date', readOnly: true },
      { name: 'closing_registration_date', label: 'Kapanış Tescil Tarihi', type: 'date', readOnly: true },
    ] },
    { id: 'organization', label: 'Organizasyon Bağlantısı', fields: [
      { name: 'organization_unit_name', label: 'Bağlı Organization Unit', type: 'text', readOnly: true },
      { name: 'responsible_person_id', label: 'Şube Müdürü / Sorumlu Kişi', type: 'text' },
      { name: 'organization_links', label: 'Bağlantılar', type: 'custom', colSpan: 3, render: ({ data }) => <BranchLinks branch={data as BranchRow} /> },
      { name: 'staff_summary', label: 'Personel / Kadro Özeti', type: 'custom', colSpan: 3, render: () => <ReadOnlyNotice text="Şube iç kadro, pozisyon, personel ve hiyerarşi Teşkilat/Kadro modülünden yönetilir." /> },
    ] },
    { id: 'documents', label: 'Belgeler', fields: [{ name: 'branch_documents', label: 'Belgeler', type: 'custom', colSpan: 3, render: ({ data }) => <BranchDocumentsPanel documents={(data.document_files || []) as Record<string, any>[]} /> }] },
    { id: 'history', label: 'Geçmiş', fields: [{ name: 'branch_history', label: 'Geçmiş', type: 'custom', colSpan: 3, render: ({ data }) => <BranchHistoryPanel branch={data as BranchRow} /> }] },
  ], [])

  const handleListSortChange = (sorts: SortConfig[]) => {
    const sort = sorts[0]
    setListQuery(prev => ({ ...prev, page: 1, sort: sort?.key || 'branch_name', direction: sort?.direction || 'asc' }))
  }
  const operationActions = (): FormOperationActionGroup[] => {
    if (!selectedBranch?.id) return []
    const closingAction: FormOperationAction = { key: 'branch_closing', label: 'Şube Kapanışı', icon: <XCircle size={16} />, onClick: () => openBranchClosing(selectedBranch), disabled: !isActiveBranch(selectedBranch), tone: 'danger' }
    const editAction: FormOperationAction = pageState === 'view' && selectedBranch.record_status !== 'closed'
      ? { key: 'edit', label: 'Kart Bilgilerini Güncelle', icon: <PencilLine size={16} />, onClick: () => setPageState('edit'), tone: 'neutral' }
      : { key: 'view', label: 'Görüntüle', icon: <FileText size={16} />, onClick: () => setPageState('view'), hidden: pageState !== 'edit' }
    return [{ key: 'official_updates', actions: [closingAction] }, { key: 'basic_update', actions: [editAction] }]
  }
  const selectedCompanyLabel = companies.find(company => company.value === pickerCompanyId)?.label || ''

  return (
    <div className="relative">
      <PageBanner
        mode={pageState === 'list' ? 'list' : 'form'}
        {...(pageState !== 'list' && { formMode })}
        title={pageState === 'list' ? 'Şubelerimiz' : selectedBranch?.branch_name || 'Şube Detayı'}
        subtitle={pageState === 'list' ? 'Şirketlere bağlı resmi şube, ofis ve operasyon noktalarını yönetin.' : selectedBranch?.company_name || 'Bağlı şirket alt resmi/operasyonel birimi'}
        icon={<GitBranch size={24} />}
        {...(pageState === 'list' ? { onAddClick: () => setCompanyPickerOpen(true), addButtonText: 'Yeni Şube Aç' } : { onBackClick: () => setPageState('list') })}
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}
      {pageState === 'list' && <div className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950">
          <label className="min-w-[260px] text-sm font-medium text-gray-700 dark:text-gray-200">Bağlı Şirket Filtresi<select value={companyFilterId} onChange={event => { setCompanyFilterId(event.target.value); setListQuery(prev => ({ ...prev, page: 1 })) }} className={formControlClass({ className: 'mt-1' })}><option value="">Tüm şirketler</option>{companies.map(company => <option key={company.value} value={company.value}>{company.label}</option>)}</select></label>
          <button type="button" onClick={() => loadData(true)} className="mt-6 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">Yenile</button>
        </div>
        <SmartDataTable columns={columns} data={branches} loading={loading} widgets={widgets} defaultView="list" storageKey="companies-branches-table" emptyText="Şube kaydı bulunamadı" onRowClick={openBranch} onRefresh={() => loadData(true)} defaultPageSize={listQuery.pageSize} pagination={{ mode: 'server', page: listMeta.page, pageSize: listMeta.pageSize, total: listMeta.total, onPageChange: page => setListQuery(prev => ({ ...prev, page })), onPageSizeChange: pageSize => setListQuery(prev => ({ ...prev, page: 1, pageSize })), onSearchChange: search => setListQuery(prev => ({ ...prev, page: 1, search })), onSortChange: handleListSortChange }} activeStatusFilters={statusFilters} statusFilterOptions={BRANCH_STATUS_FILTER_OPTIONS} onStatusFiltersChange={(next) => { setStatusFilters(next.length ? next : ['active']); setListQuery(prev => ({ ...prev, page: 1 })) }} />
      </div>}
      {pageState !== 'list' && selectedBranch && <div className="mt-6"><EntityForm mode={formMode} entityName="Şubelerimiz" entityNameSingular="Şube" heroFields={branchHeroFields} tabs={tabs} data={selectedBranch} saving={saving} loading={detailLoading} error={formError} externalFieldErrors={fieldErrors} loadStages={formLoadStages} showHeroHeader={false} onSave={handleSave} onCancel={() => setPageState('list')} onModeChange={(mode) => setPageState(mode === 'edit' ? 'edit' : 'view')} operationActions={operationActions()} onValidationError={(fields) => setToast({ type: 'warning', title: 'Alanları Kontrol Et', message: fields.join(', ') })} /></div>}
      {companyPickerOpen && <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/45 px-4"><div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-950"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Yeni Şube Aç</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Şube açılışı için bağlı aktif şirketi seçin.</p><label className="mt-5 block text-sm font-medium text-gray-700 dark:text-gray-200">Bağlı Şirket<select value={pickerCompanyId} onChange={event => setPickerCompanyId(event.target.value)} className={formControlClass({ className: 'mt-1' })}><option value="">Şirket seçin</option>{companies.map(company => <option key={company.value} value={company.value}>{company.label}</option>)}</select></label>{selectedCompanyLabel ? <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">{selectedCompanyLabel} için resmi şube açılışı başlatılacak.</div> : null}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setCompanyPickerOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">Vazgeç</button><button type="button" onClick={() => openBranchOpening(pickerCompanyId)} disabled={!pickerCompanyId || wizardSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">Wizardı Aç</button></div></div></div>}
      {branchOpeningWizard && <CompanyBranchOpeningWizard companyName={branchOpeningWizard.companyName} context={branchOpeningWizard.context} saving={wizardSaving} onClose={() => !wizardSaving && setBranchOpeningWizard(null)} onComplete={completeBranchOpening} />}
      {branchClosingWizard && <CompanyBranchClosingWizard companyId={branchClosingWizard.companyId} companyName={branchClosingWizard.companyName} context={branchClosingWizard.context} saving={wizardSaving} onClose={() => !wizardSaving && setBranchClosingWizard(null)} onComplete={completeBranchClosing} />}
    </div>
  )
}

function RowActions({ branch, onView, onCloseBranch }: { branch: BranchRow; onView: () => void; onCloseBranch: () => void }) {
  return <div className="flex items-center gap-2"><button type="button" onClick={(event) => { event.stopPropagation(); onView() }} className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">Görüntüle</button><button type="button" disabled={!isActiveBranch(branch)} onClick={(event) => { event.stopPropagation(); onCloseBranch() }} className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/30">Kapanış</button></div>
}
function BranchLinks({ branch }: { branch: BranchRow }) {
  return <div className="grid gap-3 md:grid-cols-2"><Link href="/app/sirket/teskilat" className="inline-flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900">Teşkilat/Kadro sayfasına git <ExternalLink size={15} /></Link><Link href="/app/sirket/tesisler" className="inline-flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900">Tesisler/Lokasyonlar sayfasına git <ExternalLink size={15} /></Link><ReadOnlyNotice text={`Organizasyon birimi: ${branch.organization_unit_name || '-'}`} /><ReadOnlyNotice text={`Lokasyon/Tesis: ${branch.facility_name || 'Şube adresinde tutuluyor'}`} /></div>
}
function BranchDocumentsPanel({ documents }: { documents: Record<string, any>[] }) {
  const activeDocuments = documents.filter(document => String(document.status || 'active') !== 'deleted')
  if (!activeDocuments.length) return <ReadOnlyNotice text="Bu şube kaydına bağlı belge bulunmuyor." />
  return <div className="grid gap-2 md:grid-cols-2">{activeDocuments.map((document, index) => <div key={`${document.slotId || document.name}-${index}`} className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800"><div className="font-semibold text-gray-900 dark:text-white">{document.name || document.slotId || 'Belge'}</div><div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{document.slotId || '-'} {document.closing_document ? 'Kapanış belgesi' : 'Açılış belgesi'}</div></div>)}</div>
}
function BranchHistoryPanel({ branch }: { branch: BranchRow }) {
  return <div className="space-y-3"><div className="grid gap-3 md:grid-cols-3"><MetricCard label="Şube Açılış İşlemi" value={branch.opening_registration_date || branch.opening_decision_date || '-'} /><MetricCard label="Şube Kapanış İşlemi" value={branch.closing_registration_date || branch.closing_decision_date || '-'} /><MetricCard label="Son İşlem" value={operationLabel(branch.last_operation)} /></div><pre className="max-h-72 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">{JSON.stringify(branch.metadata_json || {}, null, 2)}</pre></div>
}
function ReadOnlyNotice({ text }: { text: string }) { return <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">{text}</div> }
function MetricCard({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800"><div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div><div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{value || '-'}</div></div> }
function StatusBadge({ status }: { status?: string }) {
  const normalized = String(status || '').toLocaleLowerCase('tr-TR')
  const label = normalized === 'closed' ? 'Kapalı' : normalized === 'passive' ? 'Pasif' : normalized === 'draft' ? 'Taslak' : 'Aktif'
  const className = normalized === 'closed' ? 'border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200' : normalized === 'passive' ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${className}`}>{label}</span>
}
function branchTypeOptions() { return [{ value: 'official_branch', label: 'Resmi şube' }, { value: 'liaison_office', label: 'İrtibat ofisi' }, { value: 'operation_point', label: 'Operasyon noktası' }, { value: 'warehouse_facility', label: 'Depo / tesis' }] }
function branchTypeLabel(value: unknown) { if (value === 'liaison_office') return 'İrtibat ofisi'; if (value === 'operation_point') return 'Operasyon noktası'; if (value === 'warehouse_facility') return 'Depo / tesis'; return 'Resmi şube' }
function operationLabel(value: unknown) { if (value === 'branch_opening') return 'Şube Açılışı'; if (value === 'branch_closing') return 'Şube Kapanışı'; return value ? String(value) : '-' }
function isActiveBranch(branch: BranchRow) { const values = [branch.record_status, branch.status].map(value => String(value || '').toLocaleLowerCase('tr-TR')); return !branch.is_deleted && values.some(value => value === 'active' || value === 'aktif') }
