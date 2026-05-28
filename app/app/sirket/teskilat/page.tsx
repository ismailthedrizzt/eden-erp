'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  GitBranch,
  History,
  Layers,
  MapPin,
  Network,
  Plus,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { EntityForm, FormField, FormMode, FormTab } from '@/components/ui/EntityForm'
import { SmartDataTable, ColumnDef, WidgetDef } from '@/components/ui/SmartDataTable'
import { PageContextTour } from '@/components/onboarding/PageContextTour'
import { OperationHint } from '@/components/onboarding/OperationHint'
import { pageTourSteps } from '@/components/onboarding/tourSteps'
import { useRegisterActionGuideContext } from '@/components/ai/ActionGuideContext'
import { cn } from '@/lib/utils'
import { companyService } from '@/lib/services/companyService'
import { organizationService } from '@/lib/services/organizationService'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'
import { formControlClass } from '@/components/ui/formControlStyles'

type PageState = 'list' | 'create-unit' | 'view-unit' | 'edit-unit' | 'create-position'
type UnitStatus = 'Aktif' | 'Pasif' | 'Kapatıldı' | 'Birleştirildi' | 'Taşındı'
type PositionStatus = 'Aktif' | 'Pasif' | 'Kapatıldı' | 'Donduruldu'

interface UnitType {
  id: string
  name: string
  slug: string
  color?: string
  icon?: string
  parent_type_id?: string
}

interface OrganizationUnit {
  id: string
  company_id?: string
  parent_unit_id?: string | null
  unit_type_id?: string | null
  unit_type?: UnitType
  name?: string
  type?: string
  short_name?: string
  code?: string
  location_name?: string
  status?: UnitStatus | string
  start_date?: string
  end_date?: string
  sort_order?: number
  notes?: string
  history?: HistoryEntry[]
  is_deleted?: boolean
  depth?: number
  parent_name?: string
  position_count?: number
  filled_count?: number
  open_count?: number
  child_count?: number
  type_label?: string
  type_color?: string
  company_name?: string
  branch_id?: string
  branch_name?: string
  related_branch?: Record<string, any>
  active?: boolean
  metadata_json?: Record<string, any>
  authority_scope_usage?: number
}

interface Position {
  id: string
  unit_id: string
  title?: string
  grade?: string
  reports_to_position_id?: string
  is_manager?: boolean
  norm_count?: number
  active_count?: number
  budget_code?: string
  work_type?: string
  status?: PositionStatus | string
  employees?: { id: string; first_name?: string; last_name?: string; gender?: string; birth_date?: string }
  history?: HistoryEntry[]
  is_deleted?: boolean
}

interface HistoryEntry {
  field?: string
  old_value?: unknown
  new_value?: unknown
  changed_at?: string
  changed_by?: string
  value?: unknown
  date?: string
  user?: string
}

const defaultUnitTypes = ['Şirket', 'Genel Müdürlük', 'Direktörlük', 'Müdürlük', 'Departman', 'Bölüm', 'Takım', 'Şube', 'Ofis', 'Operasyon', 'Proje Ofisi', 'Komite', 'Kurul', 'Diğer']
const unitStatuses: UnitStatus[] = ['Aktif', 'Pasif', 'Kapatıldı', 'Birleştirildi', 'Taşındı']
const positionStatuses: PositionStatus[] = ['Aktif', 'Pasif', 'Kapatıldı', 'Donduruldu']
const locationOptions = ['Merkez', 'Fabrika', 'Şube', 'Ofis', 'Depo', 'Saha', 'Mağaza', 'Diğer'].map((value) => ({ value, label: value }))

export default function TeskilatPage() {
  const [units, setUnits] = useState<OrganizationUnit[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([])
  const [companies, setCompanies] = useState<Array<{ value: string; label: string }>>([])
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [selectedUnit, setSelectedUnit] = useState<OrganizationUnit | null>(null)
  const [positionOverlayUnit, setPositionOverlayUnit] = useState<OrganizationUnit | null>(null)
  const [pageState, setPageState] = useState<PageState>('list')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companiesLoaded, setCompaniesLoaded] = useState(false)
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [companiesError, setCompaniesError] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [companyFilterId, setCompanyFilterId] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [typeFilter, setTypeFilter] = useState('')
  const [branchLinkFilter, setBranchLinkFilter] = useState('')

  const formMode: FormMode = pageState === 'create-unit' || pageState === 'create-position' ? 'create' : pageState === 'edit-unit' ? 'edit' : 'view'
  const formLoadStages = createProgressiveFormLoadStages({
    mode: formMode,
    hasSnapshot: pageState !== 'create-unit' && pageState !== 'create-position' && !!selectedUnit,
    detailReady: pageState !== 'create-unit' && pageState !== 'create-position' && !!selectedUnit,
    referencesLoading: companiesLoading,
    referencesReady: companiesLoaded,
    referencesError: companiesError,
  })

  useRegisterActionGuideContext({
    currentPage: 'organization',
    selectedRecordId: selectedUnit?.id || null,
    selectedRecordType: selectedUnit?.id ? 'organization_unit' : null,
    selectedRecordStatus: selectedUnit ? String(selectedUnit.status || '') : null,
    activeCompanyId: selectedUnit?.company_id || companyFilterId || null,
  })

  const loadData = async (force = false) => {
    setLoading(true)
    try {
      if (force) organizationService.invalidateList()
      const teskilatPayload = await organizationService.list({ useCache: !force })

      setUnits(Array.isArray(teskilatPayload.organization_units) ? teskilatPayload.organization_units : [])
      setPositions(Array.isArray(teskilatPayload.positions) ? teskilatPayload.positions : [])
      setUnitTypes(Array.isArray(teskilatPayload.unitTypes) ? teskilatPayload.unitTypes as UnitType[] : [])
    } catch (error: any) {
      setToast(error.message || 'Teskilat verisi yuklenemedi')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    loadData()
  }, [])

  const loadCompanyOptions = async (force = false) => {
    if (companiesLoaded && !force) return
    setCompaniesLoading(true)
    setCompaniesError(false)
    try {
    const companyPayload = await companyService.list({ useCache: !force })
    setCompanies(Array.isArray(companyPayload.data) ? companyPayload.data.map((company: any) => ({ value: company.id, label: company.trade_name || company.short_name })) : [])
    setCompaniesLoaded(true)
    } catch (error) {
      setCompaniesError(true)
      throw error
    } finally {
      setCompaniesLoading(false)
    }
  }

  useEffect(() => {
    loadCompanyOptions().catch(error => setToast(error instanceof Error ? error.message : 'Sirket secenekleri yuklenemedi'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (pageState !== 'list') {
      loadCompanyOptions().catch(error => setToast(error instanceof Error ? error.message : 'Şirket seçenekleri yüklenemedi'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageState])

  const unitTypeOptions = useMemo(() => {
    const existing = unitTypes.map((type) => ({ value: type.id, label: type.name }))
    const fallback = defaultUnitTypes.map((name) => ({ value: name, label: name }))
    return existing.length ? existing : fallback
  }, [unitTypes])

  const unitOptions = useMemo(() => units.filter((unit) => !unit.is_deleted).map((unit) => ({ value: unit.id, label: unitName(unit) })), [units])
  const positionOptions = useMemo(() => positions.filter((position) => !position.is_deleted).map((position) => ({ value: position.id, label: positionTitle(position) })), [positions])
  const companyRootUnits = useMemo(() => units.filter((unit) => !unit.is_deleted && !unit.parent_unit_id && isCompanyUnit(unit)), [units])
  const defaultCompanyId = companies[0]?.value || companyRootUnits[0]?.company_id || ''
  const defaultParentUnitId = companyRootUnits.find((unit) => unit.company_id === defaultCompanyId)?.id || ''
  const treeRows = useMemo(() => flattenTree(units, positions, openIds, ''), [units, positions, openIds])
  const filteredTreeRows = useMemo(() => treeRows.filter((unit) => {
    if (companyFilterId && unit.company_id !== companyFilterId) return false
    if (statusFilter === 'active' && !isActiveUnit(unit)) return false
    if (statusFilter === 'passive' && isActiveUnit(unit)) return false
    if (typeFilter && String(unit.type_label || unit.type || unit.unit_type?.name || '') !== typeFilter) return false
    if (branchLinkFilter === 'linked' && !isBranchLinkedUnit(unit)) return false
    if (branchLinkFilter === 'missing' && isBranchLinkedUnit(unit)) return false
    return true
  }), [branchLinkFilter, companyFilterId, statusFilter, treeRows, typeFilter])
  const selectedPositions = useMemo(() => selectedUnit ? positions.filter((position) => position.unit_id === selectedUnit.id && !position.is_deleted) : [], [positions, selectedUnit])
  const overlayPositions = useMemo(() => positionOverlayUnit ? positions.filter((position) => position.unit_id === positionOverlayUnit.id && !position.is_deleted) : [], [positions, positionOverlayUnit])
  const availableTypeFilters = useMemo(() => Array.from(new Set(treeRows.map(row => String(row.type_label || row.type || '')).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr-TR')), [treeRows])

  const columns: ColumnDef[] = [
    { key: 'company_name', label: 'Sirket', type: 'text', width: 190, render: (_, row) => getCompanyLabel(row, companies) },
    { key: 'branch_name', label: 'Iliskili Sube', type: 'text', width: 170, render: (_, row) => <RelationBadge active={isBranchLinkedUnit(row)} label={getBranchLabel(row)} /> },
    { key: 'authority_scope_usage', label: 'Yetki Kapsami', type: 'number', width: 130, render: (_, row) => <RelationBadge active={getAuthorityScopeUsage(row) > 0} label={getAuthorityScopeUsage(row) ? `${getAuthorityScopeUsage(row)} yetki` : 'Yok'} /> },
    { key: 'name', label: 'Birim Adı', type: 'text', width: 300, render: (_, row) => <TreeNameCell row={row} openIds={openIds} setOpenIds={setOpenIds} /> },
    { key: 'type_label', label: 'Tip', type: 'text', width: 150, render: (_, row) => <TypeBadge label={row.type_label} color={row.type_color} /> },
    { key: 'parent_name', label: 'Üst Birim', type: 'text', width: 180 },
    { key: 'position_count', label: 'Kadro', type: 'number', width: 90 },
    { key: 'filled_count', label: 'Çalışan', type: 'number', width: 90 },
    { key: 'open_count', label: 'Boş', type: 'number', width: 80 },
    { key: 'location_name', label: 'Yerleşke', type: 'text', width: 130 },
    { key: 'status', label: 'Durum', type: 'enum', width: 120 },
    { key: 'actions', label: 'İşlemler', type: 'text', width: 230, render: (_, row) => <UnitActions unit={row} onView={openView} onEdit={openEdit} onPositions={setPositionOverlayUnit} onAddChild={openChildCreate} onRollback={rollbackUnit} /> },
  ]

  const widgets: WidgetDef<any>[] = useMemo(() => [
    { key: 'branch-linked', label: 'Sube Baglantili', render: () => units.filter(unit => !unit.is_deleted && isBranchLinkedUnit(unit)).length },
    { key: 'authority-scoped', label: 'Yetki Kapsaminda', render: () => units.filter(unit => !unit.is_deleted && getAuthorityScopeUsage(unit) > 0).length },
    { key: 'unit-count', label: 'Aktif Birim', render: () => units.filter((unit) => !unit.is_deleted).length },
    { key: 'positions', label: 'Toplam Kadro', render: () => positions.filter((position) => !position.is_deleted).reduce((sum, position) => sum + numberValue(position.norm_count, 1), 0) },
    { key: 'filled', label: 'Dolu', render: () => positions.filter((position) => !position.is_deleted).reduce((sum, position) => sum + numberValue(position.active_count), 0) },
    { key: 'open', label: 'Boş', render: () => positions.filter((position) => !position.is_deleted).reduce((sum, position) => sum + Math.max(numberValue(position.norm_count, 1) - numberValue(position.active_count), 0), 0) },
  ], [positions, units])

  const heroFields: FormField[] = [
    { name: 'name', label: 'Birim Adı', type: 'text', required: true },
    { name: 'short_name', label: 'Birim Kısa Adı', type: 'text' },
    { name: 'unit_type_id', label: 'Birim Tipi', type: 'select', required: true, options: unitTypeOptions },
    { name: 'parent_unit_id', label: 'Üst Birim', type: 'select', options: unitOptions.filter((option) => option.value !== selectedUnit?.id) },
    { name: 'company_id', label: 'Bağlı Şirket', type: 'select', required: true, options: companies },
    { name: 'status', label: 'Durum', type: 'select', required: true, options: unitStatuses.map((status) => ({ value: status, label: status })) },
    { name: 'start_date', label: 'Kuruluş Tarihi', type: 'date' },
    { name: 'code', label: 'Kod', type: 'text' },
    { name: 'location_name', label: 'Yerleşke', type: 'select', options: locationOptions },
  ]

  const tabs: FormTab[] = [
    { id: 'hiyerarsi', label: 'Hiyerarsi', fields: [
      { name: 'hierarchy_summary', label: 'Hiyerarsi', type: 'custom', colSpan: 3, render: () => <OrganizationHierarchyPanel unit={selectedUnit} units={units} /> },
    ] },
    { id: 'branch_relation', label: 'Iliskili Sube', fields: [
      { name: 'branch_relation', label: 'Sube Baglantisi', type: 'custom', colSpan: 3, render: () => <OrganizationBranchRelationPanel unit={selectedUnit} /> },
    ] },
    { id: 'authorities', label: 'Temsilci Yetkileri', fields: [
      { name: 'authority_scope', label: 'Yetki Kapsami', type: 'custom', colSpan: 3, render: () => <OrganizationAuthorityPanel unit={selectedUnit} /> },
    ] },
    { id: 'kadro', label: 'Kadro', fields: [
      { name: 'positions', label: 'Kadrolar', type: 'custom', colSpan: 3, render: ({ readOnly }) => <PositionsTab unit={selectedUnit} positions={selectedPositions} readOnly={readOnly} openOverlay={() => selectedUnit && setPositionOverlayUnit(selectedUnit)} openCreate={() => openPositionCreate(selectedUnit)} /> },
    ] },
    { id: 'butce', label: 'Bütçe', fields: [
      { name: 'budget_code', label: 'Bütçe Kodu', type: 'text' },
      { name: 'budget_note', label: 'Bütçe Notu', type: 'textarea', colSpan: 3 },
    ] },
  ]

  const positionHeroFields: FormField[] = [
    { name: 'unit_id', label: 'Birim', type: 'select', required: true, options: unitOptions },
    { name: 'title', label: 'Pozisyon Adı / Ünvan', type: 'text', required: true },
    { name: 'grade', label: 'Kademe', type: 'text' },
    { name: 'reports_to_position_id', label: 'Bağlı Üst Pozisyon', type: 'select', options: positionOptions },
    { name: 'is_manager', label: 'Amir mi', type: 'checkbox' },
    { name: 'norm_count', label: 'Norm Adet', type: 'number', required: true },
    { name: 'active_count', label: 'Aktif Dolu', type: 'number' },
    { name: 'budget_code', label: 'Bütçe Kodu', type: 'text' },
    { name: 'work_type', label: 'Çalışma Tipi', type: 'select', options: ['Tam Zamanlı', 'Yarı Zamanlı', 'Proje Bazlı', 'Dönemsel', 'Uzaktan'].map((value) => ({ value, label: value })) },
    { name: 'status', label: 'Durum', type: 'select', options: positionStatuses.map((status) => ({ value: status, label: status })) },
  ]

  const positionTabs: FormTab[] = [
    { id: 'genel', label: 'Genel', fields: [{ name: 'notes', label: 'Notlar', type: 'textarea', colSpan: 3 }] },
    { id: 'gecmis', label: 'Geçmiş', fields: [{ name: 'history', label: 'Geçmiş', type: 'custom', colSpan: 3, render: () => <Timeline history={[]} /> }] },
  ]

  async function saveUnit(data: Record<string, any>, mode: FormMode) {
    setSaving(true)
    try {
      const response = await fetch('/api/organization', {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id: selectedUnit?.id, entity: 'unit' }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Birim kaydedilemedi')
      await loadData(true)
      setPageState('list')
      setSelectedUnit(null)
    } finally {
      setSaving(false)
    }
  }

  async function savePosition(data: Record<string, any>) {
    setSaving(true)
    try {
      const response = await fetch('/api/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, entity: 'position' }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Kadro kaydedilemedi')
      if (payload.warning) setToast(payload.warning)
      await loadData(true)
      setPageState('list')
    } finally {
      setSaving(false)
    }
  }

  async function saveUnitType(data: Record<string, any>) {
    const response = await fetch('/api/organization', {
      method: data.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, entity: 'unit_type' }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Tip kaydedilemedi')
    await loadData(true)
  }

  async function rollbackUnit(unit: OrganizationUnit) {
    const response = await fetch(`/api/organization?entity=unit&id=${unit.id}`, { method: 'DELETE' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setToast(payload.error || 'Birim geri alınamadı')
      return
    }
    setToast(`${unitName(unit)} geri alındı. ${payload.clearedEmployeeCount || 0} çalışanın birim ve görev alanı boşaltıldı.`)
    await loadData(true)
  }

  async function softDeletePosition(position: Position) {
    await fetch(`/api/organization?entity=position&id=${position.id}`, { method: 'DELETE' })
    await loadData(true)
  }

  function openCreate() {
    setSelectedUnit(null)
    setPageState('create-unit')
  }

  function openChildCreate(unit: OrganizationUnit) {
    setSelectedUnit({ parent_unit_id: unit.id, company_id: unit.company_id, status: 'Aktif' } as OrganizationUnit)
    setPageState('create-unit')
  }

  function openView(unit: OrganizationUnit) {
    setSelectedUnit(unit)
    setPageState('view-unit')
  }

  function openEdit(unit: OrganizationUnit) {
    setSelectedUnit(unit)
    setPageState('edit-unit')
  }

  function openPositionCreate(unit?: OrganizationUnit | null) {
    setSelectedUnit(unit || selectedUnit)
    setPageState('create-position')
  }

  const formData = selectedUnit ? normalizeUnitForForm(selectedUnit) : { status: 'Aktif', company_id: defaultCompanyId, parent_unit_id: defaultParentUnitId }
  const pageIsPositionForm = pageState === 'create-position'

  return (
    <div className="relative">
      <PageBanner
        mode={pageState === 'list' ? 'list' : 'form'}
        formMode={formMode}
        title={pageState === 'list' ? 'Teşkilat ve Kadro' : pageIsPositionForm ? 'Yeni Kadro' : pageState === 'create-unit' ? 'Yeni Birim' : unitName(selectedUnit)}
        subtitle={pageState === 'list' ? 'İç organizasyon, birim hiyerarşisi ve norm kadro yönetimi' : pageIsPositionForm ? 'Seçili birime pozisyon tanımlayın' : 'Birim detaylarını yönetin'}
        icon={<Network size={24} />}
        onAddClick={openCreate}
        addButtonText="Yeni Birim"
        addButtonTourId="quick-actions"
        onBackClick={() => setPageState('list')}
      />
      <PageContextTour tourKey="organization" steps={pageTourSteps.organization || []} enabled={pageState === 'list' || pageState === 'view-unit'} />

      {toast && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <span className="flex items-center gap-2"><AlertTriangle size={16} />{toast}</span>
          <button onClick={() => setToast(null)}><X size={16} /></button>
        </div>
      )}

      {pageState === 'list' && (
        <div className="space-y-5">
          <OperationHint
            id="organization-concept-boundary"
            variant="info"
            title="Organizasyon birimi sube degildir"
            message="Sube resmi/operasyonel birimdir. Organizasyon birimi kadro ve hiyerarsiyi, tesis/lokasyon fiziksel yeri temsil eder."
            actionLabel="Subelerimiz'e Git"
            actionKey="branch_view"
            onAction={() => { window.location.href = '/app/sirket/companies/branches' }}
          />
          <OrganizationProductContextPanel />
          <div data-tour-id="organization-product-filters" className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-950 md:grid-cols-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Sirket<select value={companyFilterId} onChange={event => setCompanyFilterId(event.target.value)} className={formControlClass({ className: 'mt-1' })}><option value="">Tum sirketler</option>{companies.map(company => <option key={company.value} value={company.value}>{company.label}</option>)}</select></label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Durum<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className={formControlClass({ className: 'mt-1' })}><option value="all">Tum durumlar</option><option value="active">Aktif</option><option value="passive">Pasif / kapali</option></select></label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Birim tipi<select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className={formControlClass({ className: 'mt-1' })}><option value="">Tum tipler</option>{availableTypeFilters.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Sube baglantisi<select value={branchLinkFilter} onChange={event => setBranchLinkFilter(event.target.value)} className={formControlClass({ className: 'mt-1' })}><option value="">Tum birimler</option><option value="linked">Sube baglantili</option><option value="missing">Sube baglantisi yok</option></select></label>
          </div>
          <SmartDataTable
            columns={columns}
            data={filteredTreeRows}
            widgets={widgets}
            loading={loading}
            defaultView="list"
            storageKey="teskilat-kadro-tree"
            emptyText="Birim kaydı bulunamadı"
            onRowClick={openView}
            onRefresh={() => loadData(true)}
          />
        </div>
      )}

      {pageState !== 'list' && !pageIsPositionForm && (
        <div className="space-y-4">
        <OrganizationReadinessPanel unit={selectedUnit} positions={selectedPositions} />
        <EntityForm
          mode={formMode}
          entityName="Teşkilat"
          entityNameSingular="Birim"
          heroFields={heroFields.map((field) => withHistory(field, selectedUnit?.history))}
          tabs={tabs}
          data={formData}
          saving={saving}
          loadStages={formLoadStages}
          onSave={saveUnit}
          onCancel={() => setPageState('list')}
          onModeChange={(mode) => setPageState(mode === 'edit' ? 'edit-unit' : 'view-unit')}
          enableHistory
        />
        </div>
      )}

      {pageIsPositionForm && (
        <EntityForm
          mode="create"
          entityName="Kadro"
          entityNameSingular="Kadro"
          heroFields={positionHeroFields}
          tabs={positionTabs}
          data={{ unit_id: selectedUnit?.id || '', norm_count: 1, active_count: 0, status: 'Aktif', work_type: 'Tam Zamanlı' }}
          saving={saving}
          loadStages={formLoadStages}
          onSave={savePosition}
          onCancel={() => setPageState('list')}
        />
      )}

      {positionOverlayUnit && (
        <PositionOverlay unit={positionOverlayUnit} positions={overlayPositions} onClose={() => setPositionOverlayUnit(null)} onCreate={() => openPositionCreate(positionOverlayUnit)} onDelete={softDeletePosition} />
      )}
    </div>
  )
}

function OrganizationProductContextPanel() {
  return (
    <section data-tour-id="organization-product-context" className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/20 md:grid-cols-3">
      <ConceptCard icon={<Network size={18} />} title="Organizasyon Birimi" text="Kadro, pozisyon ve hiyerarsi burada yonetilir. Sube acilisi birim olusturabilir ama birim sube degildir." />
      <ConceptCard icon={<GitBranch size={18} />} title="Sube Baglantisi" text="Resmi sube acilisi ve kapanisi Subelerimiz/Sirketlerimiz operasyonlarindan gelir; burada sadece hiyerarsi etkisi izlenir." />
      <ConceptCard icon={<MapPin size={18} />} title="Tesis / Lokasyon" text="Fiziksel yer Tesisler/Lokasyonlar moduluyle yonetilir; kadro baglantisi organizasyon birimi uzerinden kalir." />
    </section>
  )
}

function ConceptCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/80 p-3 shadow-sm dark:border-blue-900/50 dark:bg-gray-950/70">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">{icon}{title}</div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{text}</p>
    </div>
  )
}

function OrganizationReadinessPanel({ unit, positions }: { unit: OrganizationUnit | null; positions: Position[] }) {
  if (!unit) return null
  const norm = positions.reduce((sum, position) => sum + numberValue(position.norm_count, 1), 0)
  const filled = positions.reduce((sum, position) => sum + numberValue(position.active_count), 0)
  const authorityUsage = getAuthorityScopeUsage(unit)
  const branchLinked = isBranchLinkedUnit(unit)
  const warnings = [
    !isActiveUnit(unit) ? 'Pasif veya kapali birimde yeni kadro/pozisyon acmadan once etki analizi yapin.' : '',
    branchLinked && isClosedBranchRelation(unit) ? 'Iliskili sube kapali gorunuyor; birim acik kalacaksa HR/kadro etkisini kontrol edin.' : '',
    authorityUsage > 0 ? 'Bu birim temsil yetkisi kapsami olarak kullaniliyor; pasife alma yetki etkisi dogurabilir.' : '',
  ].filter(Boolean)
  return (
    <section data-tour-id="organization-product-readiness" className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Organizasyon/kadro entegrasyon ozeti</h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-300">Bu panel birimin sirket, sube, kadro ve temsil yetkisi etkilerini tek bakista gosterir. Temsil yetkisi burada verilmez; Temsilcilerimiz modulunden yonetilir.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/sirket/companies/branches" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">Subelerimiz <ExternalLink size={15} /></Link>
          <Link href={`/app/sirket/companies/representatives?organization_unit_id=${unit.id}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">Yetkileri Gor <ExternalLink size={15} /></Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <ReadinessMetric icon={<Network size={17} />} label="Durum" value={unit.status || (unit.active === false ? 'Pasif' : 'Aktif')} tone={isActiveUnit(unit) ? 'success' : 'warning'} />
        <ReadinessMetric icon={<GitBranch size={17} />} label="Sube baglantisi" value={branchLinked ? getBranchLabel(unit) : 'Yok'} tone={branchLinked ? 'success' : 'neutral'} />
        <ReadinessMetric icon={<Users size={17} />} label="Kadro doluluk" value={`${filled}/${norm}`} tone={norm > filled ? 'warning' : 'success'} />
        <ReadinessMetric icon={<ShieldCheck size={17} />} label="Yetki kapsami" value={authorityUsage ? `${authorityUsage} yetki` : 'Yok'} tone={authorityUsage ? 'warning' : 'neutral'} />
      </div>
      {warnings.length ? <ul className="mt-4 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100">{warnings.map(item => <li key={item}>- {item}</li>)}</ul> : null}
    </section>
  )
}

function OrganizationHierarchyPanel({ unit, units }: { unit: OrganizationUnit | null; units: OrganizationUnit[] }) {
  if (!unit) return <EmptyPanel message="Once birim secin." />
  const children = units.filter(item => item.parent_unit_id === unit.id && !item.is_deleted)
  const parent = units.find(item => item.id === unit.parent_unit_id)
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <MiniStat label="Ust birim" value={parent ? unitName(parent) : 'Kok birim'} />
      <MiniStat label="Alt birim" value={children.length} />
      <MiniStat label="Cycle guard" value="Aktif" tone="green" />
      <div className="md:col-span-3 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
        {children.length ? children.map(child => <div key={child.id} className="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0 dark:border-gray-800"><span>{unitName(child)}</span><StatusPill value={child.status} /></div>) : <span className="text-gray-500">Alt birim yok.</span>}
      </div>
    </div>
  )
}

function OrganizationBranchRelationPanel({ unit }: { unit: OrganizationUnit | null }) {
  if (!unit) return <EmptyPanel message="Once birim secin." />
  const branchLabel = getBranchLabel(unit)
  if (!isBranchLinkedUnit(unit)) {
    return <EmptyPanel message="Bu organizasyon birimi herhangi bir sube kaydina bagli degil. Bu normal bir departman/ekip olabilir." />
  }
  return (
    <div className="rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="font-semibold text-gray-900 dark:text-white">{branchLabel}</div><p className="mt-1 text-gray-500">Bu birim sube acilisi veya sube-organizasyon baglantisi ile iliskilendirildi.</p></div>
        <Link href="/app/sirket/companies/branches" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900">Subeyi Ac <ExternalLink size={15} /></Link>
      </div>
    </div>
  )
}

function OrganizationAuthorityPanel({ unit }: { unit: OrganizationUnit | null }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!unit?.id || !unit.company_id) {
      setRows([])
      return
    }
    setLoading(true)
    companyService.representativesList({ companyId: unit.company_id, organizationUnitId: unit.id, scopeType: 'organization_unit', useCache: false })
      .then(result => setRows(result.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [unit?.company_id, unit?.id])
  if (!unit) return <EmptyPanel message="Once birim secin." />
  if (loading) return <EmptyPanel message="Temsil yetkileri yukleniyor..." />
  if (!rows.length) return <EmptyPanel message="Bu birim kapsaminda aktif temsil yetkisi bulunmuyor." />
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
        <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400"><tr><th className="px-3 py-2">Temsilci</th><th className="px-3 py-2">Yetki</th><th className="px-3 py-2">Limit</th><th className="px-3 py-2">Durum</th></tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{rows.map(row => <tr key={row.id || row.representative_id}><td className="px-3 py-2 font-medium">{row.display_name || row.full_name || row.representative_name || '-'}</td><td className="px-3 py-2">{Array.isArray(row.authority_types) ? row.authority_types.join(', ') : row.primary_authority_type || '-'}</td><td className="px-3 py-2">{row.transaction_limit || row.authority_limit || 'Limitsiz'} {row.currency || ''}</td><td className="px-3 py-2"><StatusPill value={row.authority_status || row.status} /></td></tr>)}</tbody>
      </table>
    </div>
  )
}

function EmptyPanel({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700">{message}</div>
}

function ReadinessMetric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: ReactNode; tone: 'success' | 'warning' | 'neutral' }) {
  const color = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100'
    : tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100'
      : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200'
  return <div className={`rounded-lg border px-3 py-3 ${color}`}><div className="flex items-center gap-2 text-xs font-medium opacity-80">{icon}{label}</div><div className="mt-2 text-sm font-semibold">{value || '-'}</div></div>
}

function RelationBadge({ active, label }: { active: boolean; label: string }) {
  return <span className={cn('inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300')}>{label || '-'}</span>
}

function TreeNameCell({ row, openIds, setOpenIds }: { row: OrganizationUnit; openIds: Set<string>; setOpenIds: (value: Set<string>) => void }) {
  const hasChildren = row.child_count ? row.child_count > 0 : false
  const isOpen = openIds.has(row.id)
  return (
    <div className="flex items-center gap-2" style={{ paddingLeft: `${(row.depth || 0) * 18}px` }}>
      {hasChildren ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            const next = new Set(openIds)
            next.has(row.id) ? next.delete(row.id) : next.add(row.id)
            setOpenIds(next)
          }}
          className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      ) : <span className="w-6" />}
      <span className="font-medium text-gray-900 dark:text-white">{row.name}</span>
      {row.code && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800">{row.code}</span>}
    </div>
  )
}

function UnitActions({ unit, onView, onEdit, onPositions, onAddChild, onRollback }: {
  unit: OrganizationUnit
  onView: (unit: OrganizationUnit) => void
  onEdit: (unit: OrganizationUnit) => void
  onPositions: (unit: OrganizationUnit) => void
  onAddChild: (unit: OrganizationUnit) => void
  onRollback: (unit: OrganizationUnit) => void
}) {
  const canRollback = !!unit.parent_unit_id || !isCompanyUnit(unit)
  const action = (event: React.MouseEvent, callback: () => void) => {
    event.stopPropagation()
    callback()
  }
  return (
    <div className="flex items-center gap-1">
      <button title="Görüntüle" onClick={(event) => action(event, () => onView(unit))} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><Eye size={15} /></button>
      <button title="Düzenle" onClick={(event) => action(event, () => onEdit(unit))} className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"><Edit3 size={15} /></button>
      <button title="Kadro" onClick={(event) => action(event, () => onPositions(unit))} className="rounded-md px-2 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40">Kadro</button>
      <button title="Alt Birim Ekle" onClick={(event) => action(event, () => onAddChild(unit))} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"><Plus size={15} /></button>
      {canRollback && <button title="Geri Al" onClick={(event) => action(event, () => onRollback(unit))} className="rounded-md p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"><Clock size={15} /></button>}
      <button title="Geçmiş" onClick={(event) => event.stopPropagation()} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><History size={15} /></button>
    </div>
  )
}

function PositionsTab({ unit, positions, readOnly, openOverlay, openCreate }: { unit: OrganizationUnit | null; positions: Position[]; readOnly: boolean; openOverlay: () => void; openCreate: () => void }) {
  if (!unit) return <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700">Önce birim seçin.</div>
  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        {!readOnly && <button type="button" onClick={openCreate} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">Kadro Ekle</button>}
        {!readOnly && <button type="button" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium dark:border-gray-700">Pozisyon Aç</button>}
        <button type="button" onClick={openOverlay} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium dark:border-gray-700">Overlayde Gör</button>
      </div>
      <PositionTable positions={positions} />
    </div>
  )
}

function PositionOverlay({ unit, positions, onClose, onCreate, onDelete }: { unit: OrganizationUnit; positions: Position[]; onClose: () => void; onCreate: () => void; onDelete: (position: Position) => void }) {
  const filled = positions.reduce((sum, position) => sum + numberValue(position.active_count), 0)
  const norm = positions.reduce((sum, position) => sum + numberValue(position.norm_count, 1), 0)
  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{unitName(unit)}</h3>
          <p className="text-sm text-gray-500">Kadro hızlı operasyon paneli</p>
        </div>
        <button onClick={onClose} className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
      </div>
      <div className="space-y-4 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Open Positions" value={Math.max(norm - filled, 0)} tone="amber" />
          <MiniStat label="Filled Positions" value={filled} tone="green" />
          <MiniStat label="Norm" value={norm} />
        </div>
        <button onClick={onCreate} className="w-full rounded-lg border-2 border-dashed border-blue-300 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30">
          Quick Add Position
        </button>
        <PositionTable positions={positions} onDelete={onDelete} />
        <StatsPanel positions={positions} />
      </div>
    </div>
  )
}

function PositionTable({ positions, onDelete }: { positions: Position[]; onDelete?: (position: Position) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
        <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          <tr><th className="px-3 py-2">Unvan</th><th className="px-3 py-2">Kademe</th><th className="px-3 py-2">Amir mi</th><th className="px-3 py-2">Norm Adet</th><th className="px-3 py-2">Dolu Adet</th><th className="px-3 py-2">Boş Adet</th><th className="px-3 py-2">Durum</th><th className="px-3 py-2">İşlemler</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {positions.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500">Bu birimde kadro tanımlı değil.</td></tr>}
          {positions.map((position) => {
            const open = Math.max(numberValue(position.norm_count, 1) - numberValue(position.active_count), 0)
            return (
              <tr key={position.id}>
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{positionTitle(position)}<div className="text-xs font-normal text-gray-500">{position.employees ? `${position.employees.first_name} ${position.employees.last_name}` : 'Boş Kadro'}</div></td>
                <td className="px-3 py-2">{position.grade || '-'}</td>
                <td className="px-3 py-2">{position.is_manager ? 'Evet' : 'Hayır'}</td>
                <td className="px-3 py-2">{numberValue(position.norm_count, 1)}</td>
                <td className="px-3 py-2">{numberValue(position.active_count)}</td>
                <td className="px-3 py-2">{open}</td>
                <td className="px-3 py-2"><StatusPill value={position.status || (position.status === 'open' ? 'Aktif' : 'Aktif')} /></td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {open > 0 && <button className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">İşe Alım Talebi Aç</button>}
                    {open > 0 && <button className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">İlan Aç</button>}
                    {open > 0 && <button className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">Transfer Talebi Aç</button>}
                    {onDelete && <button onClick={() => onDelete(position)} className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Pasifleştir</button>}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function StatsPanel({ positions }: { positions: Position[] }) {
  const filled = positions.reduce((sum, position) => sum + numberValue(position.active_count), 0)
  const norm = positions.reduce((sum, position) => sum + numberValue(position.norm_count, 1), 0)
  const pct = norm ? Math.round((filled / norm) * 100) : 0
  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><BarChart3 size={16} />İstatistikler</h4>
      <div className="grid grid-cols-2 gap-3">
        <MiniStat label="Açık / Dolu Kadro" value={`${Math.max(norm - filled, 0)} / ${filled}`} />
        <MiniStat label="Bütçe Doluluk" value={`%${pct}`} tone={pct > 80 ? 'green' : 'amber'} />
        <MiniStat label="Cinsiyet Dağılımı" value="Modül bağlantılı" />
        <MiniStat label="Turnover" value="Hazır" />
      </div>
    </div>
  )
}

function UnitTypeManager({ unitTypes, saveType }: { unitTypes: UnitType[]; saveType: (data: Record<string, any>) => Promise<void> }) {
  const [draft, setDraft] = useState({ name: '', color: '#2563eb', icon: 'Layers', parent_type_id: '' })
  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Yeni Tip Ekle / Rename Et" className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" />
        <input value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} type="color" className="h-10 rounded-lg border border-gray-300 px-2 dark:border-gray-700 dark:bg-gray-900" />
        <input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} placeholder="İkon" className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" />
        <select value={draft.parent_type_id} onChange={(e) => setDraft({ ...draft, parent_type_id: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"><option value="">Parent Type</option>{unitTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select>
      </div>
      <button type="button" onClick={() => draft.name && saveType(draft).then(() => setDraft({ name: '', color: '#2563eb', icon: 'Layers', parent_type_id: '' }))} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">Tipi Kaydet</button>
      <div className="flex flex-wrap gap-2">{unitTypes.map((type) => <TypeBadge key={type.id} label={type.name} color={type.color} />)}</div>
    </div>
  )
}

function Timeline({ history }: { history: HistoryEntry[] }) {
  if (!history.length) return <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700">Geçmiş kaydı yok.</div>
  return <div className="space-y-2">{history.map((item, index) => <div key={index} className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">{item.field}: {String(item.old_value ?? item.value ?? '-')} → {String(item.new_value ?? '-')} <span className="text-xs text-gray-500">{formatDateTime(item.changed_at || item.date)}</span></div>)}</div>
}

function MiniStat({ label, value, tone = 'default' }: { label: string; value: ReactNode; tone?: 'default' | 'green' | 'amber' }) {
  return <div className={cn('rounded-lg border p-3', tone === 'green' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30' : tone === 'amber' ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800')}><div className="text-xs text-gray-500">{label}</div><div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{value}</div></div>
}

function TypeBadge({ label, color }: { label?: string; color?: string }) {
  return <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium" style={{ borderColor: color || '#d1d5db', color: color || undefined }}><Layers size={12} />{label || '-'}</span>
}

function StatusPill({ value }: { value?: string }) {
  return <span className={cn('rounded-full px-2 py-1 text-xs font-medium', value === 'Aktif' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300')}>{value || '-'}</span>
}

function flattenTree(units: OrganizationUnit[], positions: Position[], openIds: Set<string>, search: string) {
  const childrenByParent = new Map<string, OrganizationUnit[]>()
  units.filter((unit) => !unit.is_deleted).forEach((unit) => {
    const parent = unit.parent_unit_id || 'root'
    childrenByParent.set(parent, [...(childrenByParent.get(parent) || []), unit])
  })
  const query = search.trim().toLocaleLowerCase('tr-TR')
  const rows: OrganizationUnit[] = []
  const walk = (parentId: string, depth: number) => {
    ;(childrenByParent.get(parentId) || []).forEach((unit) => {
      const unitPositions = positions.filter((position) => position.unit_id === unit.id && !position.is_deleted)
      const row = normalizeUnitRow(unit, units, unitPositions, childrenByParent.get(unit.id)?.length || 0, depth)
      const matches = !query || [row.name, row.code, row.location_name, row.type_label, row.parent_name].filter(Boolean).some((value) => String(value).toLocaleLowerCase('tr-TR').includes(query))
      if (matches || searchIncludesChild(unit.id, childrenByParent, query)) rows.push(row)
      if (openIds.has(unit.id) || query) walk(unit.id, depth + 1)
    })
  }
  walk('root', 0)
  return rows
}

function searchIncludesChild(parentId: string, childrenByParent: Map<string, OrganizationUnit[]>, query: string): boolean {
  if (!query) return false
  return (childrenByParent.get(parentId) || []).some((child) =>
    [unitName(child), child.code, child.location_name].filter(Boolean).some((value) => String(value).toLocaleLowerCase('tr-TR').includes(query)) ||
    searchIncludesChild(child.id, childrenByParent, query)
  )
}

function normalizeUnitRow(unit: OrganizationUnit, allUnits: OrganizationUnit[], unitPositions: Position[], childCount: number, depth: number) {
  const norm = unitPositions.reduce((sum, position) => sum + numberValue(position.norm_count, 1), 0)
  const filled = unitPositions.reduce((sum, position) => sum + numberValue(position.active_count), 0)
  return {
    ...unit,
    name: unitName(unit),
    parent_name: unit.parent_unit_id ? unitName(allUnits.find((item) => item.id === unit.parent_unit_id)) : '-',
    type_label: unit.unit_type?.name || unit.type || '-',
    type_color: unit.unit_type?.color,
    position_count: norm,
    filled_count: filled,
    open_count: Math.max(norm - filled, 0),
    child_count: childCount,
    depth,
  }
}

function normalizeUnitForForm(unit: OrganizationUnit) {
  return {
    ...unit,
    name: unitName(unit),
    parent_unit_id: unit.parent_unit_id || '',
    company_id: unit.company_id || '',
    unit_type_id: unit.unit_type_id || unit.type || '',
    status: unit.status || 'Aktif',
  }
}

function withHistory(field: FormField, history?: HistoryEntry[]) {
  const rows = (history || []).filter((item) => item.field === field.name)
  return rows.length ? { ...field, history: rows.map((item) => ({ value: `${item.old_value ?? '-'} → ${item.new_value ?? '-'}`, date: item.changed_at || item.date || '', user: item.changed_by || item.user })) } : field
}

function unitName(unit?: OrganizationUnit | null) {
  return unit?.name || ''
}

function isCompanyUnit(unit: OrganizationUnit) {
  return unit.unit_type?.slug === 'company' || unit.unit_type?.name === 'Şirket' || unit.type === 'company'
}

function isActiveUnit(unit: OrganizationUnit) {
  const value = String(unit.status || '').toLocaleLowerCase('tr-TR')
  return unit.active !== false && !['pasif', 'passive', 'kapali', 'kapalı', 'closed', 'kapatildi', 'kapatıldı'].includes(value)
}

function isBranchLinkedUnit(unit: OrganizationUnit) {
  return Boolean(unit.branch_id || unit.branch_name || unit.related_branch || unit.metadata_json?.branch_id || unit.type === 'branch' || unit.unit_type?.slug === 'branch')
}

function getBranchLabel(unit: OrganizationUnit) {
  return unit.branch_name || unit.related_branch?.branch_name || unit.metadata_json?.branch_name || (isBranchLinkedUnit(unit) ? 'Bagli sube' : 'Yok')
}

function isClosedBranchRelation(unit: OrganizationUnit) {
  const branch = unit.related_branch || {}
  return ['closed', 'kapali', 'kapalı'].includes(String(branch.record_status || branch.status || '').toLocaleLowerCase('tr-TR'))
}

function getCompanyLabel(unit: OrganizationUnit, companies: Array<{ value: string; label: string }>) {
  return unit.company_name || companies.find(company => company.value === unit.company_id)?.label || '-'
}

function getAuthorityScopeUsage(unit: OrganizationUnit) {
  const raw = unit.authority_scope_usage ?? unit.metadata_json?.authority_scope_usage ?? unit.metadata_json?.active_authority_count ?? 0
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : 0
}

function positionTitle(position: Position) {
  return position.title || 'Kadro'
}

function numberValue(value: unknown, fallback = 0) {
  const numeric = Number(value ?? fallback)
  return Number.isFinite(numeric) ? numeric : fallback
}

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString('tr-TR') : ''
}
