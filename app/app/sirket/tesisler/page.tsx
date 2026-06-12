'use client'


import { appSirketTesislerPageContract } from '@/contracts/pages/generated/app-sirket-tesisler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'
import { appSirketTesislerListContract } from '@/contracts/pages/generated/app-sirket-tesisler.list.contract'
import { appSirketTesislerFormContract } from '@/contracts/pages/generated/app-sirket-tesisler.form.contract'
import { appSirketTesislerWizardContract } from '@/contracts/pages/generated/app-sirket-tesisler.wizard.contract'
import { appSirketTesislerLifecycleContract } from '@/contracts/pages/generated/app-sirket-tesisler.lifecycle.contract'

const appSirketTesislerContractReady = requirePageContract(appSirketTesislerPageContract)

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Building2, ExternalLink, GitBranch, MapPin, Plus, RefreshCcw, ShieldCheck, Warehouse } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { EntityForm, type FormField, type FormMode, type FormTab } from '@/components/ui/EntityForm'
import { SmartDataTable, type ColumnDef, type WidgetDef } from '@/components/ui/SmartDataTable'
import { SmartEmptyState } from '@/components/ui/SmartEmptyState'
import { Toast } from '@/components/ui/Toast'
import { OperationHint } from '@/components/onboarding/OperationHint'
import { useRegisterActionGuideContext } from '@/components/ai/ActionGuideContext'
import { formControlClass } from '@/components/ui/formControlStyles'
import { cn } from '@/lib/utils'
import { companyService } from '@/lib/services/companyService'
import { facilityService, type FacilityRow } from '@/lib/services/facilityService'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'

type PageState = 'list' | 'create' | 'view' | 'edit'
type CompanyOption = { value: string; label: string }
type BranchOption = { value: string; label: string; company_id?: string; status?: string }
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }

const facilityTypes = [
  { value: 'office', label: 'Ofis' },
  { value: 'warehouse', label: 'Depo' },
  { value: 'factory', label: 'Fabrika' },
  { value: 'workshop', label: 'Atolye' },
  { value: 'field_site', label: 'Saha noktasi' },
  { value: 'branch_location', label: 'Sube lokasyonu' },
  { value: 'other', label: 'Diger' },
]

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<FacilityRow[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [selectedFacility, setSelectedFacility] = useState<FacilityRow | null>(null)
  const [pageState, setPageState] = useState<PageState>('list')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [companyFilterId, setCompanyFilterId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const formMode: FormMode = pageState === 'create' ? 'create' : pageState === 'edit' ? 'edit' : 'view'
  const loadStages = createProgressiveFormLoadStages({
    mode: formMode,
    hasSnapshot: pageState === 'create' || !!selectedFacility,
    detailReady: pageState === 'create' || !!selectedFacility,
    referencesReady: companies.length > 0,
  })

  useRegisterActionGuideContext({
    currentPage: 'facilities',
    selectedRecordId: selectedFacility?.id || null,
    selectedRecordType: selectedFacility?.id ? 'facility' : null,
    selectedRecordStatus: selectedFacility ? String(selectedFacility.record_status || selectedFacility.status || '') : null,
    activeCompanyId: selectedFacility?.company_id || companyFilterId || null,
    activeBranchId: selectedFacility?.branch_id || branchFilter || null,
  })

  const loadCompanies = useCallback(async (force = false) => {
    try {
      const result = await companyService.list({ useCache: !force, statuses: ['active'], pageSize: 100 })
      setCompanies((result.data || []).map((company: any) => ({ value: company.id, label: company.trade_name || company.short_name || company.id })))
    } catch {
      setCompanies([])
    }
  }, [])

  const loadBranches = useCallback(async (force = false) => {
    try {
      const result = await companyService.branchesList({ useCache: !force, pageSize: 200, statuses: ['active', 'closed'] })
      setBranches((result.data || []).map((branch: any) => ({ value: branch.id, label: branch.branch_name || branch.branch_short_name || branch.id, company_id: branch.company_id, status: branch.record_status || branch.status })))
    } catch {
      setBranches([])
    }
  }, [])

  const loadFacilities = useCallback(async (force = false) => {
    setLoading(true)
    try {
      if (force) facilityService.invalidateList()
      const result = await facilityService.list({
        useCache: !force,
        companyId: companyFilterId || undefined,
        branchId: branchFilter || undefined,
        pageSize: 200,
      })
      setFacilities(result.data || [])
    } catch (error: any) {
      setToast({ type: 'warning', title: 'Tesis listesi sinirli modda', message: error?.message || 'FastAPI facility listesi alinamadi; sube baglantilarindan ozet gosteriliyor.' })
      const branchResult = await companyService.branchesList({ useCache: !force, pageSize: 200, statuses: ['active', 'closed'] }).catch(() => ({ data: [] }))
      setFacilities((branchResult.data || []).filter((branch: any) => branch.facility_id || branch.facility_name).map((branch: any) => ({
        id: branch.facility_id || `branch:${branch.id}`,
        company_id: branch.company_id,
        branch_id: branch.id,
        facility_name: branch.facility_name || `${branch.branch_name || 'Sube'} lokasyonu`,
        name: branch.facility_name || `${branch.branch_name || 'Sube'} lokasyonu`,
        facility_type: 'branch_location',
        company_name: branch.company_name,
        branch_name: branch.branch_name,
        city: branch.city,
        district: branch.district,
        address: branch.address,
        status: branch.record_status === 'closed' ? 'closed' : 'active',
        record_status: branch.record_status === 'closed' ? 'closed' : 'active',
      })))
    } finally {
      setLoading(false)
    }
  }, [branchFilter, companyFilterId])

  useEffect(() => {
    loadCompanies()
    loadBranches()
  }, [loadBranches, loadCompanies])

  useEffect(() => {
    loadFacilities()
  }, [loadFacilities])

  const filteredFacilities = useMemo(() => facilities.filter(facility => {
    if (statusFilter !== 'all' && normalizeStatus(facility) !== statusFilter) return false
    if (typeFilter && facility.facility_type !== typeFilter) return false
    return true
  }), [facilities, statusFilter, typeFilter])

  const branchOptions = useMemo(() => branches.filter(branch => !companyFilterId || branch.company_id === companyFilterId), [branches, companyFilterId])

  const columns: ColumnDef[] = [
    { key: 'status', label: 'Durum', type: 'text', width: 120, render: (_, row) => <StatusBadge value={normalizeStatus(row)} /> },
    { key: 'facility_name', label: 'Tesis/Lokasyon', type: 'text', width: 230, render: (_, row) => <div className="font-medium text-gray-900 dark:text-white">{facilityName(row)}</div> },
    { key: 'facility_type', label: 'Tur', type: 'text', width: 150, render: value => facilityTypeLabel(String(value || '')) },
    { key: 'company_name', label: 'Bagli Sirket', type: 'text', width: 220, render: (_, row) => row.company_name || companies.find(company => company.value === row.company_id)?.label || '-' },
    { key: 'branch_name', label: 'Iliskili Sube', type: 'text', width: 180, render: (_, row) => <RelationBadge active={Boolean(row.branch_id || row.branch_name)} label={row.branch_name || 'Yok'} /> },
    { key: 'city', label: 'Il / Ilce', type: 'text', width: 150, render: (_, row) => [row.city, row.district].filter(Boolean).join(' / ') || '-' },
    { key: 'address', label: 'Adres Ozeti', type: 'text', width: 260 },
    { key: 'reusable', label: 'Yeniden Kullanilabilir', type: 'text', width: 170, render: (_, row) => <RelationBadge active={Boolean(row.reusable)} label={row.reusable ? 'Evet' : 'Hayir'} /> },
  ]

  const widgets: WidgetDef<FacilityRow>[] = [
    { key: 'total', label: 'Toplam Lokasyon', render: () => facilities.length },
    { key: 'active', label: 'Aktif', render: () => facilities.filter(item => normalizeStatus(item) === 'active').length },
    { key: 'branch-linked', label: 'Sube Baglantili', render: () => facilities.filter(item => item.branch_id || item.branch_name).length },
    { key: 'reusable', label: 'Reusable', render: () => facilities.filter(item => item.reusable).length },
  ]

  const heroFields = useMemo<FormField[]>(() => [
    { name: 'facility_name', label: 'Tesis/Lokasyon Adi', type: 'text', required: true, readOnly: pageState === 'view' },
    { name: 'facility_type', label: 'Tur', type: 'select', required: true, options: facilityTypes, readOnly: pageState === 'view' },
    { name: 'company_id', label: 'Bagli Sirket', type: 'select', required: true, options: companies, readOnly: pageState !== 'create' },
    { name: 'branch_id', label: 'Iliskili Sube', type: 'select', options: branchOptions, readOnly: pageState !== 'create' },
    { name: 'status', label: 'Durum', type: 'text', readOnly: true },
    { name: 'city', label: 'Il', type: 'text', readOnly: pageState !== 'create' },
    { name: 'district', label: 'Ilce', type: 'text', readOnly: pageState !== 'create' },
    { name: 'address', label: 'Adres', type: 'textarea', colSpan: 2, readOnly: pageState !== 'create' },
    { name: 'phone', label: 'Telefon', type: 'text', readOnly: pageState === 'view' },
    { name: 'email', label: 'E-posta', type: 'email', readOnly: pageState === 'view' },
  ], [branchOptions, companies, pageState])

  const tabs: FormTab[] = [
    { id: 'branch', label: 'Iliskili Sube', fields: [{ name: 'branch_summary', label: 'Sube', type: 'custom', colSpan: 3, render: () => <FacilityBranchPanel facility={selectedFacility} /> }] },
    { id: 'authorities', label: 'Temsilci Yetkileri', fields: [{ name: 'authority_scope', label: 'Yetki', type: 'custom', colSpan: 3, render: () => <FacilityAuthorityPanel facility={selectedFacility} /> }] },
    { id: 'usage', label: 'Kullanim / Etki', fields: [{ name: 'impact', label: 'Etki', type: 'custom', colSpan: 3, render: () => <FacilityImpactPanel facility={selectedFacility} /> }] },
    { id: 'notes', label: 'Notlar', fields: [{ name: 'notes', label: 'Notlar', type: 'textarea', colSpan: 3, readOnly: pageState === 'view' }] },
  ]

  function buildFacilitySavePayload(data: Record<string, any>) {
    return { ...data, name: data.facility_name, related_branch_id: data.branch_id || null }
  }

  async function handleFacilitySaveSuccess(result: Record<string, any>, _payload: Record<string, any>, mode: FormMode) {
    if (result?.data) setSelectedFacility(result.data)
    setToast({ type: 'success', message: mode === 'create' ? 'Tesis/lokasyon olusturuldu.' : 'Tesis/lokasyon guncellendi.' })
    await loadFacilities(true)
    setPageState(result?.data ? 'view' : 'list')
  }

  async function handleFacilitySaveError(error: any) {
    setToast({ type: 'error', title: 'Islem tamamlanamadi', message: error?.message || 'Tesis/lokasyon kaydedilemedi.' })
    throw error
  }

  function openCreate() {
    setSelectedFacility({ id: '', facility_type: 'office', status: 'active', record_status: 'active' } as FacilityRow)
    setPageState('create')
  }

  function openFacility(row: FacilityRow) {
    setSelectedFacility(row)
    setPageState('view')
  }

  return (
    <div className="relative">
      <PageBanner
        mode={pageState === 'list' ? 'list' : 'form'}
        formMode={formMode}
        title={pageState === 'list' ? 'Tesisler / Lokasyonlar' : facilityName(selectedFacility)}
        subtitle={pageState === 'list' ? 'Fiziksel yerleri, sube baglantilarini ve facility scoped yetkileri izleyin.' : selectedFacility?.company_name || 'Fiziksel lokasyon karti'}
        icon={<Warehouse size={24} />}
        {...(pageState === 'list' ? { onAddClick: openCreate, addButtonText: 'Yeni Tesis/Lokasyon', addButtonTourId: 'quick-actions' } : { onBackClick: () => setPageState('list') })}
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {pageState === 'list' && (
        <div className="mt-6 space-y-4">
          <OperationHint
            id="facility-concept-boundary"
            variant="info"
            title="Tesis/lokasyon sube degildir"
            message="Tesis fiziksel yeri temsil eder. Sube ile iliskilendirilebilir, ancak resmi sube acilisi veya kapanisi bu ekrandan yapilmaz."
            actionLabel="Subelerimiz'e Git"
            actionKey="branch_view"
            onAction={() => { window.location.href = '/app/sirket/companies/branches' }}
          />
          <FacilityProductContextPanel />
          <div data-tour-id="facilities-product-filters" className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-950 md:grid-cols-5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Sirket<select value={companyFilterId} onChange={event => setCompanyFilterId(event.target.value)} className={formControlClass({ className: 'mt-1' })}><option value="">Tum sirketler</option>{companies.map(company => <option key={company.value} value={company.value}>{company.label}</option>)}</select></label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Sube<select value={branchFilter} onChange={event => setBranchFilter(event.target.value)} className={formControlClass({ className: 'mt-1' })}><option value="">Tum subeler</option>{branchOptions.map(branch => <option key={branch.value} value={branch.value}>{branch.label}</option>)}</select></label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Durum<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className={formControlClass({ className: 'mt-1' })}><option value="all">Tum durumlar</option><option value="active">Aktif</option><option value="closed">Kapali</option><option value="reusable">Reusable</option></select></label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Tur<select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className={formControlClass({ className: 'mt-1' })}><option value="">Tum turler</option>{facilityTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
            <button type="button" onClick={() => loadFacilities(true)} className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"><RefreshCcw size={15} /> Yenile</button>
          </div>
          <SmartDataTable columns={columns} data={filteredFacilities} widgets={widgets} loading={loading} defaultView="list" storageKey="facilities-table" emptyText={<SmartEmptyState title="Tesis/lokasyon kaydi yok" message="Sube acilisi lokasyon olusturabilir veya bu ekrandan resmi sube olmayan fiziksel lokasyon tanimlayabilirsiniz." actionLabel="Yeni Tesis/Lokasyon" onAction={openCreate} />} onRowClick={openFacility} onRefresh={() => loadFacilities(true)} />
        </div>
      )}

      {pageState !== 'list' && selectedFacility && (
        <div className="mt-6 space-y-4">
          <FacilityReadinessPanel facility={selectedFacility} />
          <EntityForm mode={formMode} entityName="Tesisler/Lokasyonlar" entityNameSingular="Tesis/Lokasyon" heroFields={heroFields} tabs={tabs} data={selectedFacility} saving={saving} loading={loading} loadStages={loadStages} showHeroHeader={false} saveBinding={{ endpoint: (_payload, mode, currentData) => mode === 'create' ? '/api/facilities' : `/api/facilities/${currentData?.id || selectedFacility?.id || ''}`, method: (_payload, mode) => mode === 'create' ? 'POST' : 'PATCH', buildPayload: buildFacilitySavePayload, onSuccess: handleFacilitySaveSuccess, onError: handleFacilitySaveError }} onCancel={() => setPageState('list')} onModeChange={(mode) => setPageState(mode === 'edit' ? 'edit' : 'view')} />
        </div>
      )}
    </div>
  )
}

function FacilityProductContextPanel() {
  return (
    <section data-tour-id="facilities-product-context" className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/20 md:grid-cols-3">
      <ConceptCard icon={<MapPin size={18} />} title="Fiziksel yer" text="Ofis, depo, fabrika, atelye veya saha noktasi gibi fiziksel lokasyonlar burada izlenir." />
      <ConceptCard icon={<GitBranch size={18} />} title="Sube iliskisi" text="Bir tesis sube ile iliskili olabilir; sube kapaninca lokasyon kapatilabilir, acik kalabilir veya reusable olabilir." />
      <ConceptCard icon={<ShieldCheck size={18} />} title="Yetki kapsami" text="Facility scoped temsil yetkileri read-only gorunur; yetki islemleri Temsilcilerimiz modulunden yapilir." />
    </section>
  )
}

function FacilityReadinessPanel({ facility }: { facility: FacilityRow }) {
  const branchLinked = Boolean(facility.branch_id || facility.branch_name)
  const reusable = Boolean(facility.reusable)
  return (
    <section data-tour-id="facilities-product-readiness" className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Lokasyon entegrasyon ozeti</h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-300">Bu kart fiziksel yeri gosterir. Resmi sube lifecycle islemleri Subelerimiz/Sirketlerimiz operationlariyla, temsil yetkisi Temsilcilerimiz ile yonetilir.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {branchLinked ? <Link href="/app/sirket/companies/branches" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">Subeyi Ac <ExternalLink size={15} /></Link> : null}
          <Link href={`/app/sirket/companies/representatives?facility_id=${facility.id}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">Yetkileri Gor <ExternalLink size={15} /></Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <ReadinessMetric icon={<Building2 size={17} />} label="Bagli sirket" value={facility.company_name || facility.company_id || '-'} tone="neutral" />
        <ReadinessMetric icon={<GitBranch size={17} />} label="Sube baglantisi" value={facility.branch_name || (branchLinked ? 'Bagli' : 'Yok')} tone={branchLinked ? 'success' : 'neutral'} />
        <ReadinessMetric icon={<MapPin size={17} />} label="Konum" value={[facility.city, facility.district].filter(Boolean).join(' / ') || '-'} tone={facility.city ? 'success' : 'warning'} />
        <ReadinessMetric icon={<Warehouse size={17} />} label="Reusable" value={reusable ? 'Evet' : 'Hayir'} tone={reusable ? 'success' : 'neutral'} />
      </div>
    </section>
  )
}

function FacilityBranchPanel({ facility }: { facility: FacilityRow | null }) {
  if (!facility) return <EmptyPanel message="Once tesis/lokasyon secin." />
  if (!facility.branch_id && !facility.branch_name) return <EmptyPanel message="Bu tesis/lokasyon resmi bir subeye bagli degil. Bu durum depo, saha noktasi veya gecici ofis icin normal olabilir." />
  return <div className="rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-700"><div className="font-semibold text-gray-900 dark:text-white">{facility.branch_name || 'Bagli sube'}</div><p className="mt-1 text-gray-500">Sube kapanisi facility_action sonucuna gore bu lokasyon acik, pasif veya reusable kalabilir.</p></div>
}

function FacilityAuthorityPanel({ facility }: { facility: FacilityRow | null }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!facility?.id || !facility.company_id || String(facility.id).startsWith('branch:')) {
      setRows([])
      return
    }
    setLoading(true)
    companyService.representativesList({ companyId: facility.company_id, facilityId: facility.id, scopeType: 'facility', useCache: false })
      .then(result => setRows(result.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [facility?.company_id, facility?.id])
  if (!facility) return <EmptyPanel message="Once tesis/lokasyon secin." />
  if (loading) return <EmptyPanel message="Temsil yetkileri yukleniyor..." />
  if (!rows.length) return <EmptyPanel message="Bu tesis/lokasyon kapsaminda aktif temsil yetkisi bulunmuyor." />
  return <AuthorityTable rows={rows} />
}

function FacilityImpactPanel({ facility }: { facility: FacilityRow | null }) {
  if (!facility) return <EmptyPanel message="Once tesis/lokasyon secin." />
  const blockers = [
    facility.branch_id || facility.branch_name ? 'Aktif veya gecmis sube baglantisi var.' : '',
    facility.reusable ? 'Lokasyon yeniden kullanilabilir olarak isaretli.' : '',
  ].filter(Boolean)
  return <div className="rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-700">{blockers.length ? blockers.map(item => <div key={item} className="py-1">- {item}</div>) : 'Bilinen aktif etki yok.'}</div>
}

function AuthorityTable({ rows }: { rows: any[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
        <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400"><tr><th className="px-3 py-2">Temsilci</th><th className="px-3 py-2">Yetki</th><th className="px-3 py-2">Limit</th><th className="px-3 py-2">Durum</th></tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{rows.map(row => <tr key={row.id || row.representative_id}><td className="px-3 py-2 font-medium">{row.display_name || row.full_name || row.representative_name || '-'}</td><td className="px-3 py-2">{Array.isArray(row.authority_types) ? row.authority_types.join(', ') : row.primary_authority_type || '-'}</td><td className="px-3 py-2">{row.transaction_limit || row.authority_limit || 'Limitsiz'} {row.currency || ''}</td><td className="px-3 py-2"><StatusBadge value={row.authority_status || row.status || 'active'} /></td></tr>)}</tbody>
      </table>
    </div>
  )
}

function ConceptCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rounded-lg border border-white/70 bg-white/80 p-3 shadow-sm dark:border-blue-900/50 dark:bg-gray-950/70"><div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">{icon}{title}</div><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{text}</p></div>
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
  return <span className={cn('inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300')}>{label}</span>
}

function StatusBadge({ value }: { value?: string }) {
  const normalized = normalizeStatus({ status: value } as FacilityRow)
  const label = normalized === 'closed' ? 'Kapali' : normalized === 'reusable' ? 'Reusable' : normalized === 'passive' ? 'Pasif' : 'Aktif'
  return <span className={cn('inline-flex rounded-full px-2 py-1 text-xs font-medium', normalized === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : normalized === 'reusable' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300')}>{label}</span>
}

function normalizeStatus(row: FacilityRow) {
  const value = String(row.status || row.record_status || '').toLowerCase()
  if (value.includes('reusable')) return 'reusable'
  if (['closed', 'kapali', 'kapalı'].includes(value)) return 'closed'
  if (['passive', 'pasif'].includes(value)) return 'passive'
  return 'active'
}

function facilityName(row?: FacilityRow | null) {
  return row?.facility_name || row?.name || 'Tesis/Lokasyon'
}

function facilityTypeLabel(value: string) {
  return facilityTypes.find(item => item.value === value)?.label || value || '-'
}
