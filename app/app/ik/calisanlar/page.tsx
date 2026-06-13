'use client'


import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  AlertCircle,
  BriefcaseBusiness,
  FilePlus2,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, type ColumnDef, type SortConfig, type WidgetDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import {
  EdenFormActionBar,
  EdenFormHeader,
  EdenFormHero,
  EdenFormShell,
  EdenFormTabs,
  EdenListPageShell,
  EdenPageShell,
  EdenSmartList,
  EdenWizardShell,
} from '@/components/ui/eden-standard'
import { useRegisterActionGuideContext } from '@/components/ai/ActionGuideContext'
import { usePermissions } from '@/lib/security/permissionStore'
import { HR_PERMISSIONS } from '@/lib/modules/hr/shared/hr.permissions'
import { companyService } from '@/lib/services/companyService'
import { organizationService } from '@/lib/services/organizationService'
import {
  employeesService,
  employmentService,
  type HREmployee,
  type HREmployeeDocument,
  type HREmployeeSummary,
} from '@/lib/services/hr'
import type { ListMeta } from '@/lib/api/listEndpoint'
import {
  employeeDocumentStatusLabels as DOCUMENT_STATUS_LABELS,
  employeeDocumentTypeLabels as DOCUMENT_TYPE_LABELS,
  employeeEmploymentStatusLabels as EMPLOYMENT_STATUS_LABELS,
  employeeEmploymentTypeLabels as EMPLOYMENT_TYPE_LABELS,
  employeeGenderLabels as GENDER_LABELS,
  employeeRecordStatusLabels as RECORD_STATUS_LABELS,
  employeeSgkStatusLabels as SGK_STATUS_LABELS,
} from '@/contracts/entities/employee.contract'
import { employeePageContract } from '@/contracts/pages/hr/employee.page.contract'
import { employeeListContract } from '@/contracts/lists/hr/employee.list.contract'
import { employeeFormContract, employeeModalContracts } from '@/contracts/forms/hr/employee.form.contract'
import { employmentStartWizardContract } from '@/contracts/wizards/hr/employment-start.wizard.contract'
import { employmentTerminationWizardContract } from '@/contracts/wizards/hr/employment-termination.wizard.contract'
import { assignmentChangeWizardContract } from '@/contracts/wizards/hr/assignment-change.wizard.contract'
import { sgkEntryWizardContract } from '@/contracts/wizards/hr/sgk-entry.wizard.contract'
import { sgkExitWizardContract } from '@/contracts/wizards/hr/sgk-exit.wizard.contract'
import { employeeLifecycleContract } from '@/contracts/lifecycle/hr/employee.lifecycle.contract'
import { employeeApiServiceFunctions } from '@/contracts/api/hr/employee.api.contract'

type Option = { value: string; label: string; companyId?: string | null; unitId?: string | null }
type ToastState = { type: 'success' | 'error' | 'warning'; message: string; title?: string } | null
type ModalKind = 'create' | 'start' | 'terminate' | 'assignment' | 'sgkEntry' | 'sgkExit' | 'document' | null

const employeeRenderersByKey: Record<string, ColumnDef['render']> = {
  employment_badge: (_value, row) => <StatusBadge value={row.employment_status} labels={EMPLOYMENT_STATUS_LABELS} />,
  sgk_badge: (_value, row) => <SgkBadge value={row.sgk_status} />,
}

function buildEmployeeTableDefinition(): ColumnDef[] {
  return employeeListContract.columns.map(column => ({
    ...column,
    render: employeeRenderersByKey[column.key],
  }))
}

export default function HREmployeesPage() {
  const { can } = usePermissions()
  const [employees, setEmployees] = useState<HREmployee[]>([])
  const [selected, setSelected] = useState<HREmployee | null>(null)
  const [documents, setDocuments] = useState<HREmployeeDocument[]>([])
  const [summary, setSummary] = useState<HREmployeeSummary | null>(null)
  const [companyOptions, setCompanyOptions] = useState<Option[]>([])
  const [branchOptions, setBranchOptions] = useState<Option[]>([])
  const [unitOptions, setUnitOptions] = useState<Option[]>([])
  const [positionOptions, setPositionOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalKind>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 50,
    search: '',
    sort: 'updated_at',
    direction: 'desc' as 'asc' | 'desc',
    company_id: '',
    branch_id: '',
    organization_unit_id: '',
    position_id: '',
    employment_status: '',
    employment_type: '',
    sgk_status: '',
    gender: '',
    education_level: '',
    record_status: '',
    startDateFrom: '',
    startDateTo: '',
  })
  const [meta, setMeta] = useState<ListMeta>({ page: 1, pageSize: 50, total: 0, totalPages: 1 })

  useRegisterActionGuideContext({
    currentPage: 'hr.employees',
    selectedRecordType: selected ? 'hr_employee' : null,
    selectedRecordId: selected?.id || null,
    selectedRecordStatus: selected?.employment_status || selected?.record_status || null,
    companyId: selected?.company_id || filters.company_id || null,
    route: employeePageContract.route,
    context: {
      branchId: selected?.branch_id || filters.branch_id || null,
      organizationUnitId: selected?.organization_unit_id || filters.organization_unit_id || null,
      positionId: selected?.position_id || filters.position_id || null,
      contractEntity: employeePageContract.owningEntity,
      contractLifecycleTable: employeeLifecycleContract.transactionTable,
      contractFormFields: employeeFormContract.fieldOrder,
      contractServiceFunctions: employeeApiServiceFunctions,
    },
    availableModules: ['hr', 'companies', 'branches', 'organization'],
  })

  const loadReferences = useCallback(async () => {
    const [companiesResult, branchesResult, organizationResult] = await Promise.allSettled([
      companyService.list({ pageSize: 200, statuses: ['active'], skipAuth: true }),
      companyService.branchesList({ pageSize: 300, includePassive: true, skipAuth: true }),
      organizationService.list({ skipAuth: true }),
    ])
    if (companiesResult.status === 'fulfilled') {
      const rows = Array.isArray((companiesResult.value as any).data) ? (companiesResult.value as any).data : []
      setCompanyOptions(rows.map((row: any) => ({
        value: String(row.id),
        label: row.short_name || row.trade_name || row.company_name || String(row.id),
      })))
    }
    if (branchesResult.status === 'fulfilled') {
      const rows = Array.isArray((branchesResult.value as any).data) ? (branchesResult.value as any).data : []
      setBranchOptions(rows.map((row: any) => ({
        value: String(row.id),
        label: row.branch_short_name || row.branch_name || String(row.id),
        companyId: row.company_id,
      })))
    }
    if (organizationResult.status === 'fulfilled') {
      const org = organizationResult.value
      const units = Array.isArray(org.organization_units) ? org.organization_units : []
      const positions = Array.isArray(org.positions) ? org.positions : []
      setUnitOptions(units.map((unit: any) => ({
        value: String(unit.id),
        label: unit.short_name || unit.name || String(unit.id),
        companyId: unit.company_id,
      })))
      setPositionOptions(positions.map((position: any) => ({
        value: String(position.id),
        label: position.title || position.position_title || String(position.id),
        companyId: position.company_id,
        unitId: position.unit_id,
      })))
    }
  }, [])

  const loadEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const result = await employeesService.list(filters)
      setEmployees(result.data)
      setMeta(result.meta)
    } catch (error) {
      setEmployees([])
      setToast({ type: 'error', title: 'Calisanlar yuklenemedi', message: error instanceof Error ? error.message : 'Lutfen tekrar deneyin.' })
    } finally {
      setLoading(false)
    }
  }, [filters])

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await employeesService.summary())
    } catch {
      setSummary(null)
    }
  }, [])

  const loadDocuments = useCallback(async (employee: HREmployee | null) => {
    if (!employee) {
      setDocuments([])
      return
    }
    try {
      setDocuments(await employeesService.documents(employee.id))
    } catch {
      setDocuments([])
    }
  }, [])

  useEffect(() => {
    loadReferences()
  }, [loadReferences])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    loadDocuments(selected)
  }, [loadDocuments, selected])

  const labels = useMemo(() => ({
    companies: new Map(companyOptions.map(item => [item.value, item.label])),
    branches: new Map(branchOptions.map(item => [item.value, item.label])),
    units: new Map(unitOptions.map(item => [item.value, item.label])),
    positions: new Map(positionOptions.map(item => [item.value, item.label])),
  }), [branchOptions, companyOptions, positionOptions, unitOptions])

  const tableData = useMemo(() => employees.map(employee => ({
    ...employee,
    company_label: labels.companies.get(employee.company_id) || 'Bagli sirket',
    branch_label: employee.branch_id ? labels.branches.get(employee.branch_id) || 'Sube' : '-',
    unit_label: employee.organization_unit_id ? labels.units.get(employee.organization_unit_id) || 'Birim' : '-',
    position_label: employee.position_id ? labels.positions.get(employee.position_id) || employee.job_title || 'Pozisyon' : employee.job_title || '-',
    employment_type_label: employee.employment_type ? EMPLOYMENT_TYPE_LABELS[employee.employment_type] || employee.employment_type : '-',
    gender_label: employee.gender ? GENDER_LABELS[employee.gender] || employee.gender : '-',
  })), [employees, labels])

  const widgets: WidgetDef<any>[] = useMemo(() => [
    { key: 'total', label: employeeListContract.widgets[0].label, render: () => summary?.total_employees ?? meta.total ?? tableData.length },
    { key: 'active', label: employeeListContract.widgets[1].label, render: () => summary?.active_employees ?? tableData.filter(row => row.employment_status === 'active').length },
    { key: 'draft', label: employeeListContract.widgets[2].label, render: () => summary?.draft_employees ?? tableData.filter(row => row.record_status === 'draft').length },
    { key: 'terminated', label: employeeListContract.widgets[3].label, render: () => summary?.terminated_employees ?? tableData.filter(row => row.employment_status === 'terminated').length },
    { key: 'sgk', label: employeeListContract.widgets[4].label, render: () => summary?.pending_sgk ?? tableData.filter(row => row.sgk_status === 'pending').length },
  ], [meta.total, summary, tableData])

  const tableColumns = useMemo(() => buildEmployeeTableDefinition(), [])

  const handleSortChange = (sorts: SortConfig[]) => {
    const sort = sorts[0]
    setFilters(prev => ({ ...prev, page: 1, sort: sort?.key || 'updated_at', direction: sort?.direction || 'desc' }))
  }

  const refreshAfterMutation = async (employee: HREmployee, message: string, title = 'IK kaydi guncellendi') => {
    setSelected(employee)
    setToast({ type: 'success', title, message })
    setModal(null)
    await Promise.all([loadEmployees(), loadSummary(), loadDocuments(employee)])
  }

  return (
    <EdenPageShell className="relative">
      <PageBanner
        mode={selected ? 'form' : 'list'}
        title={selected ? selected.full_name : 'Calisanlar'}
        subtitle={selected ? 'Calisan karti, istihdam durumu, SGK takibi ve ozluk dosyasi' : 'Calisan kartlari ile ise giris, pozisyon, SGK ve isten cikis lifecycle kayitlarini ayri yonetin.'}
        icon={<Users size={24} />}
        onBackClick={selected ? () => setSelected(null) : undefined}
        onAddClick={!selected && can(HR_PERMISSIONS.employeeCreate) ? () => setModal('create') : undefined}
        addButtonText={employeeListContract.primaryActionLabel}
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {!selected ? (
        <EdenListPageShell>
          <SummaryBand summary={summary} />
          <FilterBar
            filters={filters}
            companyOptions={companyOptions}
            branchOptions={branchOptions}
            unitOptions={unitOptions}
            positionOptions={positionOptions}
            onChange={patch => setFilters(prev => ({ ...prev, ...patch, page: 1 }))}
          />
          <div className="mt-5">
            <EdenSmartList>
              <SmartDataTable
                columns={tableColumns}
                data={tableData}
                loading={loading}
                widgets={widgets}
                defaultView="list"
                storageKey="hr-employees"
                emptyText={<EmptyEmployees canCreate={can(HR_PERMISSIONS.employeeCreate)} onCreate={() => setModal('create')} />}
                onRowClick={row => setSelected(row)}
                onRefresh={() => { loadEmployees(); loadSummary() }}
                defaultPageSize={filters.pageSize}
                pagination={{
                  mode: 'server',
                  page: meta.page,
                  pageSize: meta.pageSize,
                  total: meta.total,
                  onPageChange: page => setFilters(prev => ({ ...prev, page })),
                  onPageSizeChange: pageSize => setFilters(prev => ({ ...prev, page: 1, pageSize })),
                  onSearchChange: search => setFilters(prev => ({ ...prev, page: 1, search })),
                  onSortChange: handleSortChange,
                }}
              />
            </EdenSmartList>
          </div>
        </EdenListPageShell>
      ) : (
        <EmployeeDetail
          employee={selected}
          documents={documents}
          labels={labels}
          canStart={can(HR_PERMISSIONS.employmentStart)}
          canTerminate={can(HR_PERMISSIONS.employmentTerminate)}
          canAssignment={can(HR_PERMISSIONS.assignmentChange)}
          canDocuments={can(HR_PERMISSIONS.documentsManage)}
          onOpen={setModal}
          onRefresh={async () => {
            const fresh = await employeesService.detail(selected.id)
            setSelected(fresh)
            await loadDocuments(fresh)
          }}
        />
      )}

      {modal === 'create' && (
        <CreateEmployeeModal
          companyOptions={companyOptions}
          onClose={() => setModal(null)}
          onCreated={employee => refreshAfterMutation(employee, employeeModalContracts.create.successMessage, 'Taslak olusturuldu')}
        />
      )}
      {selected && modal === 'start' && (
        <StartEmploymentModal
          employee={selected}
          companyOptions={companyOptions}
          branchOptions={branchOptions}
          unitOptions={unitOptions}
          positionOptions={positionOptions}
          onClose={() => setModal(null)}
          onSaved={employee => refreshAfterMutation(employee, employmentStartWizardContract.successMessage, 'Ise giris tamamlandi')}
        />
      )}
      {selected && modal === 'terminate' && (
        <TerminateEmploymentModal
          employee={selected}
          onClose={() => setModal(null)}
          onSaved={employee => refreshAfterMutation(employee, employmentTerminationWizardContract.successMessage, 'Isten cikis tamamlandi')}
        />
      )}
      {selected && modal === 'assignment' && (
        <AssignmentModal
          employee={selected}
          branchOptions={branchOptions}
          unitOptions={unitOptions}
          positionOptions={positionOptions}
          onClose={() => setModal(null)}
          onSaved={employee => refreshAfterMutation(employee, assignmentChangeWizardContract.successMessage, 'Atama guncellendi')}
        />
      )}
      {selected && modal === 'sgkEntry' && (
        <SgkCompletedModal
          title="SGK Girisi Yapildi"
          onClose={() => setModal(null)}
          onSave={payload => employmentService.sgkEntryCompleted(selected.id, payload)}
          onSaved={employee => refreshAfterMutation(employee, sgkEntryWizardContract.successMessage, 'SGK tamamlandi')}
        />
      )}
      {selected && modal === 'sgkExit' && (
        <SgkCompletedModal
          title="SGK Cikisi Yapildi"
          onClose={() => setModal(null)}
          onSave={payload => employmentService.sgkExitCompleted(selected.id, payload)}
          onSaved={employee => refreshAfterMutation(employee, sgkExitWizardContract.successMessage, 'SGK tamamlandi')}
        />
      )}
      {selected && modal === 'document' && (
        <DocumentModal
          employee={selected}
          onClose={() => setModal(null)}
          onSaved={async document => {
            setToast({ type: 'success', title: 'Belge eklendi', message: DOCUMENT_TYPE_LABELS[document.document_type] || 'Belge kaydedildi.' })
            setModal(null)
            await loadDocuments(selected)
          }}
        />
      )}
    </EdenPageShell>
  )
}

function SummaryBand({ summary }: { summary: HREmployeeSummary | null }) {
  const total = summary?.total_employees || 0
  return (
    <section className="mt-5 grid gap-3 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Toplam Calisan</p>
        <div className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{total}</div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{summary?.active_employees || 0} aktif, {summary?.draft_employees || 0} taslak kart</p>
      </div>
      <StackedSummary title="Cinsiyet" data={summary?.gender_distribution} labels={GENDER_LABELS} total={total} />
      <StackedSummary title="Istihdam Turu" data={summary?.employment_type_distribution} labels={EMPLOYMENT_TYPE_LABELS} total={total} />
    </section>
  )
}

function StackedSummary({ title, data, labels, total }: { title: string; data?: Record<string, number>; labels: Record<string, string>; total: number }) {
  const entries = Object.entries(data || {}).filter(([, value]) => value > 0).slice(0, 4)
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {entries.length ? (
          <div className="flex h-full">
            {entries.map(([key, value], index) => (
              <span key={key} className={barColor(index)} style={{ width: `${Math.max(4, (value / Math.max(1, total)) * 100)}%` }} />
            ))}
          </div>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
        {entries.length ? entries.map(([key, value]) => (
          <span key={key} className="flex items-center justify-between gap-2">
            <span className="truncate">{labels[key] || key}</span>
            <strong>{value}</strong>
          </span>
        )) : <span className="col-span-2 text-slate-400">Veri bekleniyor</span>}
      </div>
    </div>
  )
}

function FilterBar({ filters, companyOptions, branchOptions, unitOptions, positionOptions, onChange }: {
  filters: Record<string, string | number>
  companyOptions: Option[]
  branchOptions: Option[]
  unitOptions: Option[]
  positionOptions: Option[]
  onChange: (patch: Record<string, string>) => void
}) {
  const scopedBranches = filters.company_id ? branchOptions.filter(item => item.companyId === filters.company_id) : branchOptions
  const scopedUnits = filters.company_id ? unitOptions.filter(item => item.companyId === filters.company_id) : unitOptions
  const scopedPositions = filters.organization_unit_id ? positionOptions.filter(item => item.unitId === filters.organization_unit_id) : positionOptions
  return (
    <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-2 xl:grid-cols-5">
      <Select label="Sirket" value={String(filters.company_id || '')} options={companyOptions} onChange={company_id => onChange({ company_id, branch_id: '', organization_unit_id: '', position_id: '' })} />
      <Select label="Sube" value={String(filters.branch_id || '')} options={scopedBranches} onChange={branch_id => onChange({ branch_id })} />
      <Select label="Birim" value={String(filters.organization_unit_id || '')} options={scopedUnits} onChange={organization_unit_id => onChange({ organization_unit_id, position_id: '' })} />
      <Select label="Pozisyon" value={String(filters.position_id || '')} options={scopedPositions} onChange={position_id => onChange({ position_id })} />
      <Select label="Istihdam Durumu" value={String(filters.employment_status || '')} options={optionsFromLabels(EMPLOYMENT_STATUS_LABELS)} onChange={employment_status => onChange({ employment_status })} />
      <Select label="Istihdam Turu" value={String(filters.employment_type || '')} options={optionsFromLabels(EMPLOYMENT_TYPE_LABELS)} onChange={employment_type => onChange({ employment_type })} />
      <Select label="SGK" value={String(filters.sgk_status || '')} options={optionsFromLabels(SGK_STATUS_LABELS)} onChange={sgk_status => onChange({ sgk_status })} />
      <Select label="Cinsiyet" value={String(filters.gender || '')} options={optionsFromLabels(GENDER_LABELS)} onChange={gender => onChange({ gender })} />
      <Field label="Ise Giris Baslangic">
        <input type="date" value={String(filters.startDateFrom || '')} onChange={event => onChange({ startDateFrom: event.target.value })} className={inputClass()} />
      </Field>
      <Field label="Ise Giris Bitis">
        <input type="date" value={String(filters.startDateTo || '')} onChange={event => onChange({ startDateTo: event.target.value })} className={inputClass()} />
      </Field>
    </div>
  )
}

function EmployeeDetail({ employee, documents, labels, canStart, canTerminate, canAssignment, canDocuments, onOpen, onRefresh }: {
  employee: HREmployee
  documents: HREmployeeDocument[]
  labels: {
    companies: Map<string, string>
    branches: Map<string, string>
    units: Map<string, string>
    positions: Map<string, string>
  }
  canStart: boolean
  canTerminate: boolean
  canAssignment: boolean
  canDocuments: boolean
  onOpen: (kind: ModalKind) => void
  onRefresh: () => void
}) {
  const [tab, setTab] = useState('general')
  const company = labels.companies.get(employee.company_id) || 'Bagli sirket'
  const branch = employee.branch_id ? labels.branches.get(employee.branch_id) || 'Sube' : '-'
  const unit = employee.organization_unit_id ? labels.units.get(employee.organization_unit_id) || 'Birim' : '-'
  const position = employee.position_id ? labels.positions.get(employee.position_id) || employee.job_title || 'Pozisyon' : employee.job_title || '-'
  const missingDocuments = documents.filter(document => document.required && ['missing', 'expired', 'rejected'].includes(document.status))
  const detailTabs = [
    { id: 'general', label: 'Genel Bilgiler' },
    { id: 'contact', label: 'Iletisim' },
    { id: 'employment', label: 'Istihdam Durumu' },
    { id: 'organization', label: 'Organizasyon / Pozisyon' },
    { id: 'sgk', label: 'SGK / Kamu' },
    { id: 'documents', label: 'Belgeler / Ozluk Dosyasi' },
    { id: 'history', label: 'Gecmis / Denetim' },
  ]
  return (
    <EdenFormShell className="mt-5">
      <EdenFormHeader
        title={employee.full_name}
        breadcrumb={(
          <>
            <span>Calisanlarimiz</span>
            <span>/</span>
            <span>{employee.full_name}</span>
          </>
        )}
        chips={(
          <>
            <StatusBadge value={employee.employment_status} labels={EMPLOYMENT_STATUS_LABELS} />
            <SgkBadge value={employee.sgk_status} />
          </>
        )}
        actions={(
          <>
            <ActionButton icon={<UserCheck size={15} />} disabled={!canStart || employee.record_status !== 'draft'} onClick={() => onOpen('start')}>Ise Giris Baslat</ActionButton>
            <ActionButton icon={<BriefcaseBusiness size={15} />} disabled={!canAssignment || employee.employment_status !== 'active'} onClick={() => onOpen('assignment')}>Pozisyon Degisikligi</ActionButton>
            <ActionButton icon={<ShieldCheck size={15} />} disabled={!canStart || employee.employment_status !== 'active'} onClick={() => onOpen('sgkEntry')}>SGK Girisi Yapildi</ActionButton>
            <ActionButton icon={<X size={15} />} disabled={!canTerminate || employee.employment_status !== 'active'} onClick={() => onOpen('terminate')}>Isten Cikis</ActionButton>
            <ActionButton icon={<FilePlus2 size={15} />} disabled={!canDocuments} onClick={() => onOpen('document')}>Belge Ekle</ActionButton>
            <button type="button" onClick={onRefresh} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900" title="Yenile">
              <RefreshCw size={15} />
            </button>
          </>
        )}
      />
      <EdenFormHero>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-xl font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {employee.photo_url ? <img src={employee.photo_url} alt="" className="h-full w-full object-cover" /> : initials(employee.full_name)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{employee.full_name}</h2>
                <StatusBadge value={employee.employment_status} labels={EMPLOYMENT_STATUS_LABELS} />
                <SgkBadge value={employee.sgk_status} />
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{employee.employee_no} · {company}</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-3">
                <span>{position}</span>
                <span>{unit}</span>
                <span>{branch}</span>
              </div>
              {missingDocuments.length > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                  <AlertCircle size={16} /> {missingDocuments.length} zorunlu belge bekliyor.
                </div>
              )}
            </div>
          </div>
        </div>
      </EdenFormHero>

      <EdenFormTabs tabs={detailTabs} activeTab={tab} onChange={setTab}>
        {tab === 'general' && <InfoGrid items={[
          ['Calisan No', employee.employee_no],
          ['Ad Soyad', employee.full_name],
          ['TCKN', employee.masked_identity_number || maskIdentity(employee.identity_number)],
          ['Pasaport', employee.passport_no],
          ['Uyruk', employee.nationality],
          ['Dogum Tarihi', employee.birth_date],
          ['Cinsiyet', employee.gender ? GENDER_LABELS[employee.gender] || employee.gender : null],
          ['Egitim', employee.education_level],
        ]} />}
        {tab === 'contact' && <InfoGrid items={[
          ['Telefon', employee.phone],
          ['E-posta', employee.email],
          ['Adres', employee.address],
          ['Il', employee.city],
          ['Ilce', employee.district],
          ['Ulke', employee.country],
        ]} />}
        {tab === 'employment' && <InfoGrid items={[
          ['Istihdam Durumu', EMPLOYMENT_STATUS_LABELS[employee.employment_status] || employee.employment_status],
          ['Istihdam Turu', employee.employment_type ? EMPLOYMENT_TYPE_LABELS[employee.employment_type] || employee.employment_type : null],
          ['Ise Giris', employee.start_date],
          ['Deneme Suresi Bitis', employee.trial_period_end_date],
          ['Isten Cikis', employee.end_date],
          ['Ayrilis Nedeni', employee.termination_reason],
        ]} />}
        {tab === 'organization' && <InfoGrid items={[
          ['Sirket', company],
          ['Sube', branch],
          ['Organizasyon Birimi', unit],
          ['Pozisyon', position],
          ['Calisma Yeri', employee.work_location_type],
          ['Yonetici Calisan ID', employee.manager_employee_id],
        ]} />}
        {tab === 'sgk' && <InfoGrid items={[
          ['SGK Durumu', employee.sgk_status ? SGK_STATUS_LABELS[employee.sgk_status] || employee.sgk_status : null],
          ['SGK Isyeri Sicil No', employee.sgk_workplace_registry_no],
          ['Maas Tipi', employee.salary_type],
          ['Para Birimi', employee.currency],
        ]} />}
        {tab === 'documents' && <DocumentsPanel documents={documents} onAdd={() => onOpen('document')} canAdd={canDocuments} />}
        {tab === 'history' && (
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Istihdam transaction gecmisi ve denetim izi FastAPI HR lifecycle kayitlari uzerinden okunacak. Bu ekranda eski calisan detaylari goruntulenebilir kalir.
          </div>
        )}
      </EdenFormTabs>
    </EdenFormShell>
  )
}

function DocumentsPanel({ documents, onAdd, canAdd }: { documents: HREmployeeDocument[]; onAdd: () => void; canAdd: boolean }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">Kimlik, diploma, sozlesme ve SGK belgeleri ozluk dosyasi olarak izlenir.</p>
        {canAdd && <ActionButton icon={<FilePlus2 size={15} />} onClick={onAdd}>Belge Ekle</ActionButton>}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {documents.map(document => (
          <div key={document.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm text-slate-900 dark:text-white">{DOCUMENT_TYPE_LABELS[document.document_type] || document.document_type}</strong>
              <StatusBadge value={document.status} labels={{ missing: 'Eksik', uploaded: 'Yuklendi', expired: 'Suresi Doldu', rejected: 'Reddedildi', verified: 'Dogrulandi' }} />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{document.required ? 'Zorunlu belge' : 'Opsiyonel belge'}</p>
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{String((document.file_ref || {}).name || (document.file_ref || {}).fileName || 'Dosya referansi')}</p>
          </div>
        ))}
        {!documents.length && <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Belge kaydi bekleniyor.</div>}
      </div>
    </div>
  )
}

function CreateEmployeeModal({ companyOptions, onClose, onCreated }: { companyOptions: Option[]; onClose: () => void; onCreated: (employee: HREmployee) => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    company_id: companyOptions[0]?.value || '',
    employee_no: '',
    first_name: '',
    last_name: '',
    identity_number: '',
    passport_no: '',
    nationality: 'TR',
    phone: '',
    email: '',
    education_level: '',
    gender: '',
    notes: '',
  })
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const employee = await employeesService.create(cleanPayload(form))
      onCreated(employee)
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal title="Calisan Karti Taslagi" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Hint>Bu islem calisan karti taslagi olusturur. Istihdam, pozisyon, SGK ve ise giris bilgileri Ise Giris sihirbazi ile tamamlanir.</Hint>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Sirket" required value={form.company_id} options={companyOptions} onChange={company_id => setForm(prev => ({ ...prev, company_id }))} />
          <Input label="Calisan No" value={form.employee_no} onChange={employee_no => setForm(prev => ({ ...prev, employee_no }))} placeholder="Otomatik uretilebilir" />
          <Input label="Ad" required value={form.first_name} onChange={first_name => setForm(prev => ({ ...prev, first_name }))} />
          <Input label="Soyad" required value={form.last_name} onChange={last_name => setForm(prev => ({ ...prev, last_name }))} />
          <Input label="TCKN" value={form.identity_number} onChange={identity_number => setForm(prev => ({ ...prev, identity_number }))} />
          <Input label="Pasaport" value={form.passport_no} onChange={passport_no => setForm(prev => ({ ...prev, passport_no }))} />
          <Input label="Telefon" value={form.phone} onChange={phone => setForm(prev => ({ ...prev, phone }))} />
          <Input label="E-posta" value={form.email} onChange={email => setForm(prev => ({ ...prev, email }))} />
          <Select label="Cinsiyet" value={form.gender} options={optionsFromLabels(GENDER_LABELS)} onChange={gender => setForm(prev => ({ ...prev, gender }))} />
          <Input label="Egitim" value={form.education_level} onChange={education_level => setForm(prev => ({ ...prev, education_level }))} />
        </div>
        <ModalActions saving={saving} onClose={onClose} saveLabel="Taslak Olustur" />
      </form>
    </Modal>
  )
}

function StartEmploymentModal({ employee, companyOptions, branchOptions, unitOptions, positionOptions, onClose, onSaved }: {
  employee: HREmployee
  companyOptions: Option[]
  branchOptions: Option[]
  unitOptions: Option[]
  positionOptions: Option[]
  onClose: () => void
  onSaved: (employee: HREmployee) => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    company_id: employee.company_id,
    branch_id: '',
    organization_unit_id: '',
    position_id: '',
    job_title: '',
    employment_type: 'full_time',
    start_date: today(),
    trial_period_end_date: '',
    sgk_status: 'pending',
    sgk_workplace_registry_no: '',
    work_location_type: 'office',
    manager_employee_id: '',
    salary_type: '',
    currency: 'TRY',
    notes: '',
  })
  const scopedBranches = branchOptions.filter(item => !item.companyId || item.companyId === form.company_id)
  const scopedUnits = unitOptions.filter(item => !item.companyId || item.companyId === form.company_id)
  const scopedPositions = form.organization_unit_id ? positionOptions.filter(item => item.unitId === form.organization_unit_id) : positionOptions
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      onSaved(await employmentService.start(employee.id, cleanPayload(form)))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal title={employmentStartWizardContract.wizardName} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Hint>Calisan karti taslagi aktif istihdam anlamina gelmez. Bu islem sirket, sube, organizasyon, pozisyon ve SGK baslangic bilgilerini lifecycle kaydi olarak tamamlar.</Hint>
        <EdenWizardShell>
          <WizardSteps items={employmentStartWizardContract.steps.map(step => step.label)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Sirket" required value={form.company_id} options={companyOptions} onChange={company_id => setForm(prev => ({ ...prev, company_id }))} />
            <Select label="Sube" value={form.branch_id} options={scopedBranches} onChange={branch_id => setForm(prev => ({ ...prev, branch_id }))} />
            <Select label="Organizasyon Birimi" value={form.organization_unit_id} options={scopedUnits} onChange={organization_unit_id => setForm(prev => ({ ...prev, organization_unit_id, position_id: '' }))} />
            <Select label="Pozisyon" value={form.position_id} options={scopedPositions} onChange={position_id => setForm(prev => ({ ...prev, position_id }))} />
            <Input label="Unvan" value={form.job_title} onChange={job_title => setForm(prev => ({ ...prev, job_title }))} />
            <Select label="Istihdam Turu" required value={form.employment_type} options={optionsFromLabels(EMPLOYMENT_TYPE_LABELS)} onChange={employment_type => setForm(prev => ({ ...prev, employment_type }))} />
            <Input label="Ise Giris Tarihi" required type="date" value={form.start_date} onChange={start_date => setForm(prev => ({ ...prev, start_date }))} />
            <Input label="Deneme Suresi Bitis" type="date" value={form.trial_period_end_date} onChange={trial_period_end_date => setForm(prev => ({ ...prev, trial_period_end_date }))} />
            <Select label="SGK Durumu" value={form.sgk_status} options={optionsFromLabels(SGK_STATUS_LABELS)} onChange={sgk_status => setForm(prev => ({ ...prev, sgk_status }))} />
            <Input label="SGK Isyeri Sicil No" required={form.sgk_status !== 'not_required'} value={form.sgk_workplace_registry_no} onChange={sgk_workplace_registry_no => setForm(prev => ({ ...prev, sgk_workplace_registry_no }))} />
          </div>
        </EdenWizardShell>
        <ModalActions saving={saving} onClose={onClose} saveLabel="Ise Girisi Tamamla" />
      </form>
    </Modal>
  )
}

function TerminateEmploymentModal({ employee, onClose, onSaved }: { employee: HREmployee; onClose: () => void; onSaved: (employee: HREmployee) => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ end_date: today(), termination_reason: '', sgk_status: 'pending', sgk_exit_reference_no: '', notes: '' })
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      onSaved(await employmentService.terminate(employee.id, cleanPayload(form)))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal title={employmentTerminationWizardContract.wizardName} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Hint>Temsilci yetkisi, zimmet veya acik gorev etkileri ayrica kontrol edilmelidir. HR isten cikis kaydi temsil yetkisini kendiliginden sonlandirmaz.</Hint>
        <EdenWizardShell>
          <WizardSteps items={employmentTerminationWizardContract.steps.map(step => step.label)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Cikis Tarihi" required type="date" value={form.end_date} onChange={end_date => setForm(prev => ({ ...prev, end_date }))} />
            <Input label="Ayrilis Nedeni" required value={form.termination_reason} onChange={termination_reason => setForm(prev => ({ ...prev, termination_reason }))} />
            <Select label="SGK Cikis Durumu" value={form.sgk_status} options={optionsFromLabels(SGK_STATUS_LABELS)} onChange={sgk_status => setForm(prev => ({ ...prev, sgk_status }))} />
            <Input label="SGK Referans No" value={form.sgk_exit_reference_no} onChange={sgk_exit_reference_no => setForm(prev => ({ ...prev, sgk_exit_reference_no }))} />
          </div>
        </EdenWizardShell>
        <ModalActions saving={saving} onClose={onClose} saveLabel="Isten Cikisi Tamamla" />
      </form>
    </Modal>
  )
}

function AssignmentModal({ employee, branchOptions, unitOptions, positionOptions, onClose, onSaved }: {
  employee: HREmployee
  branchOptions: Option[]
  unitOptions: Option[]
  positionOptions: Option[]
  onClose: () => void
  onSaved: (employee: HREmployee) => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    effective_date: today(),
    branch_id: employee.branch_id || '',
    organization_unit_id: employee.organization_unit_id || '',
    position_id: employee.position_id || '',
    job_title: employee.job_title || '',
    reason: '',
  })
  const scopedBranches = branchOptions.filter(item => !item.companyId || item.companyId === employee.company_id)
  const scopedUnits = unitOptions.filter(item => !item.companyId || item.companyId === employee.company_id)
  const scopedPositions = form.organization_unit_id ? positionOptions.filter(item => item.unitId === form.organization_unit_id) : positionOptions
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      onSaved(await employmentService.assignmentChange(employee.id, cleanPayload(form)))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal title={assignmentChangeWizardContract.wizardName} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Hint>Pozisyon degisikligi calisan karti duzenlemesi degil, istihdam islemi olarak kaydedilir.</Hint>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Gecerlilik Tarihi" required type="date" value={form.effective_date} onChange={effective_date => setForm(prev => ({ ...prev, effective_date }))} />
          <Select label="Sube" value={form.branch_id} options={scopedBranches} onChange={branch_id => setForm(prev => ({ ...prev, branch_id }))} />
          <Select label="Organizasyon Birimi" value={form.organization_unit_id} options={scopedUnits} onChange={organization_unit_id => setForm(prev => ({ ...prev, organization_unit_id, position_id: '' }))} />
          <Select label="Pozisyon" value={form.position_id} options={scopedPositions} onChange={position_id => setForm(prev => ({ ...prev, position_id }))} />
          <Input label="Unvan" value={form.job_title} onChange={job_title => setForm(prev => ({ ...prev, job_title }))} />
          <Input label="Gerekce" value={form.reason} onChange={reason => setForm(prev => ({ ...prev, reason }))} />
        </div>
        <ModalActions saving={saving} onClose={onClose} saveLabel="Degisikligi Kaydet" />
      </form>
    </Modal>
  )
}

function SgkCompletedModal({ title, onClose, onSave, onSaved }: {
  title: string
  onClose: () => void
  onSave: (payload: Record<string, unknown>) => Promise<HREmployee>
  onSaved: (employee: HREmployee) => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ completed_date: today(), reference_no: '', notes: '' })
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      onSaved(await onSave(cleanPayload(form)))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Hint>MVP asamasinda SGK entegrasyonu manuel takip edilir. Belge, tarih ve referans bilgisi kaydedildiginde SGK durumu tamamlandi olur.</Hint>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Tamamlanma Tarihi" required type="date" value={form.completed_date} onChange={completed_date => setForm(prev => ({ ...prev, completed_date }))} />
          <Input label="Referans No" value={form.reference_no} onChange={reference_no => setForm(prev => ({ ...prev, reference_no }))} />
        </div>
        <ModalActions saving={saving} onClose={onClose} saveLabel="SGK Durumunu Tamamla" />
      </form>
    </Modal>
  )
}

function DocumentModal({ employee, onClose, onSaved }: { employee: HREmployee; onClose: () => void; onSaved: (document: HREmployeeDocument) => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ document_type: 'contract', file_name: '', status: 'uploaded', required: false, issue_date: '', expiry_date: '', notes: '' })
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = cleanPayload({
        document_type: form.document_type,
        file_ref: { name: form.file_name || `${form.document_type}.pdf`, source: 'manual_reference' },
        status: form.status,
        required: form.required,
        issue_date: form.issue_date,
        expiry_date: form.expiry_date,
        notes: form.notes,
      })
      onSaved(await employeesService.createDocument(employee.id, payload))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal title="Ozluk Belgesi Ekle" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Hint>Belge yukleme altyapisi dosya referansini saklar; eksik veya suresi dolan belgeler calisan detayinda uyarilir.</Hint>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Belge Turu" required value={form.document_type} options={optionsFromLabels(DOCUMENT_TYPE_LABELS)} onChange={document_type => setForm(prev => ({ ...prev, document_type }))} />
          <Input label="Dosya Adi / Referans" value={form.file_name} onChange={file_name => setForm(prev => ({ ...prev, file_name }))} />
          <Select label="Durum" value={form.status} options={optionsFromLabels(DOCUMENT_STATUS_LABELS)} onChange={status => setForm(prev => ({ ...prev, status }))} />
          <Field label="Zorunlu">
            <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={form.required} onChange={event => setForm(prev => ({ ...prev, required: event.target.checked }))} />
              Ozluk dosyasi icin zorunlu
            </label>
          </Field>
          <Input label="Duzenleme Tarihi" type="date" value={form.issue_date} onChange={issue_date => setForm(prev => ({ ...prev, issue_date }))} />
          <Input label="Gecerlilik Tarihi" type="date" value={form.expiry_date} onChange={expiry_date => setForm(prev => ({ ...prev, expiry_date }))} />
        </div>
        <ModalActions saving={saving} onClose={onClose} saveLabel="Belgeyi Ekle" />
      </form>
    </Modal>
  )
}

function EmptyEmployees({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Users size={32} className="text-slate-400" />
      <div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Calisan karti bekleniyor</h3>
        <p className="mt-1 max-w-lg text-sm text-slate-500 dark:text-slate-400">+ Ekle calisan karti taslagi olusturur. Ise giris, pozisyon ve SGK bilgileri lifecycle islemiyle tamamlanir.</p>
      </div>
      {canCreate && <ActionButton icon={<Plus size={15} />} onClick={onCreate}>Calisan Ekle</ActionButton>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </label>
  )
}

function Input({ label, value, onChange, type = 'text', required = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <Field label={label}>
      <input required={required} type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={inputClass()} />
    </Field>
  )
}

function Select({ label, value, options, onChange, required = false }: { label: string; value: string; options: Option[]; onChange: (value: string) => void; required?: boolean }) {
  return (
    <Field label={label}>
      <select required={required} value={value} onChange={event => onChange(event.target.value)} className={inputClass()}>
        <option value="">Seciniz</option>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </Field>
  )
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900" aria-label="Kapat">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function ModalActions({ saving, onClose, saveLabel }: { saving: boolean; onClose: () => void; saveLabel: string }) {
  return (
    <EdenFormActionBar>
      <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">Vazgec</button>
      <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Kaydediliyor...' : saveLabel}</button>
    </EdenFormActionBar>
  )
}

function InfoGrid({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 min-h-5 text-sm font-semibold text-slate-900 dark:text-white">{value || '-'}</p>
        </div>
      ))}
    </div>
  )
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

function WizardSteps({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span key={item} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
          {index + 1}. {item}
        </span>
      ))}
    </div>
  )
}

function ActionButton({ children, icon, disabled, onClick }: { children: ReactNode; icon: ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
      {icon}
      <span>{children}</span>
    </button>
  )
}

function StatusBadge({ value, labels }: { value?: string | null; labels: Record<string, string> }) {
  const raw = value || 'draft'
  const tone = raw === 'active' || raw === 'completed' || raw === 'verified' ? 'green' : raw === 'terminated' || raw === 'failed' || raw === 'expired' || raw === 'rejected' ? 'red' : raw === 'pending' || raw === 'missing' ? 'amber' : 'slate'
  return <span className={badgeClass(tone)}>{labels[raw] || raw}</span>
}

function SgkBadge({ value }: { value?: string | null }) {
  return <StatusBadge value={value || 'pending'} labels={SGK_STATUS_LABELS} />
}

function optionsFromLabels(labels: Record<string, string>): Option[] {
  return Object.entries(labels).map(([value, label]) => ({ value, label }))
}

function cleanPayload<T extends Record<string, any>>(payload: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== '' && value !== undefined && value !== null))
}

function inputClass() {
  return 'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white'
}

function badgeClass(tone: string) {
  const tones: Record<string, string> = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200',
    red: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200',
    amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200',
    slate: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  }
  return `inline-flex h-6 items-center rounded-full border px-2 text-xs font-semibold ${tones[tone] || tones.slate}`
}

function barColor(index: number) {
  return ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'][index] || 'bg-slate-400'
}

function initials(name?: string | null) {
  return (name || 'IK').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

function maskIdentity(value?: string | null) {
  if (!value) return '-'
  if (value.length <= 4) return '*'.repeat(value.length)
  return `${value.slice(0, 2)}${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-2)}`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
