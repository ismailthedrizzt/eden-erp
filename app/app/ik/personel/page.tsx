'use client'

/**
 * ERP PAGE TEMPLATE: Çalışan Yönetimi
 * 
 * This page follows the standard ERP data management pattern:
 * - PageBanner: Header with "Create New" action
 * - SmartDataTable: List view with row selection
 * - EntityForm: Create/View/Edit in drawer (no separate pages)
 * 
 * @see docs/templates/ERPPageTemplate.md
 * @see components/ui/EntityForm.md
 * @see components/ui/PageBanner.md
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { LogIn, LogOut, Users } from 'lucide-react'
import { usePersonel } from '@/hooks/usePersonel'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, SortConfig, WidgetDef } from '@/components/ui/SmartDataTable'
import type { DashboardFilterEvent } from '@/components/dashboard/dashboard.types'
import { EntityForm, FormMode } from '@/components/ui/EntityForm'
import { Toast } from '@/components/ui/Toast'
import { EmployeeLifecycleWizard } from '@/components/ui/EmployeeLifecycleWizard'
import { personelModuleConfig, PersonelTableRow } from '@/lib/modules/employees.config'
import { buildEmployeesDashboard } from '@/lib/modules/employees/dashboard/employeesDashboard.mock'
import { getEducationSummary } from '@/lib/modules/employees/education'
import { toEntityFormFields, toEntityFormTabs } from '@/types/module-config'
import { createRealPersonMasterTabs } from '@/lib/identity/realPersonFormSections'
import { formatPhoneInput, normalizeEmailInput } from '@/lib/utils'
import { isTurkishNationality, normalizeCountryId } from '@/lib/reference/country-nationalities'
import { isSoftDeletedRecord } from '@/lib/forms/entityState'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'
import { invalidateEntityDetailCache, readEntityDetailCache, writeEntityDetailCache } from '@/lib/forms/entityDetailCache'
import { employeeService } from '@/lib/services/employeeService'
import { projectGlossary } from '@/lib/projectGlossary'
import type { Personel } from '@/types'

// Page state type following ERP pattern
type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning', title?: string, message: string }
type SaveError = Error & { toast?: ToastState; fieldErrors?: Record<string, string> }
type DetailSectionState = {
  heroLoading: boolean
  heroReady: boolean
  heroError: boolean
  mediaLoading: boolean
  mediaReady: boolean
  mediaError: boolean
  detailsLoading: boolean
  detailsReady: boolean
  detailsError: boolean
}

const emptyDetailSectionState: DetailSectionState = {
  heroLoading: false,
  heroReady: false,
  heroError: false,
  mediaLoading: false,
  mediaReady: false,
  mediaError: false,
  detailsLoading: false,
  detailsReady: false,
  detailsError: false,
}
const EMPLOYEE_DETAIL_CACHE_NAMESPACE = 'employees:phased-v1'

function waitForStagePaint() {
  return new Promise<void>(resolve => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
      return
    }
    setTimeout(resolve, 0)
  })
}

const employeeFieldLabels = projectGlossary.employee.fields

const PERSONEL_FIELD_LABELS: Record<string, string> = {
  first_name: employeeFieldLabels.firstName.label,
  last_name: employeeFieldLabels.lastName.label,
  nationality: employeeFieldLabels.nationality.label,
  national_id: employeeFieldLabels.nationalId.label,
  passport_no: employeeFieldLabels.passportNo.label,
  birth_date: employeeFieldLabels.birthDate.label,
  gender: employeeFieldLabels.gender.label,
  blood_type: employeeFieldLabels.bloodType.label,
  military_status: employeeFieldLabels.militaryStatus.label,
  deferment_date: employeeFieldLabels.defermentDate.label,
  work_phone: employeeFieldLabels.workPhone.label,
  emergency_contact_first_name: employeeFieldLabels.emergencyFirstName.label,
  emergency_contact_last_name: employeeFieldLabels.emergencyLastName.label,
  emergency_contact_relationship: employeeFieldLabels.emergencyRelationship.label,
  emergency_contact_phone: employeeFieldLabels.emergencyPhone.label,
  sgk_entry_date: employeeFieldLabels.socialSecurityEntryDate.label,
  job_title: employeeFieldLabels.jobTitle.label,
  top_size: employeeFieldLabels.topSize.label,
  bottom_size: employeeFieldLabels.bottomSize.label,
  shoe_size: employeeFieldLabels.shoeSize.label,
  kep: employeeFieldLabels.kepAddress.label,
  iban: employeeFieldLabels.iban.label,
  notes: employeeFieldLabels.notes.label,
  photo_url: employeeFieldLabels.photo.label,
}

const OPTIONAL_EMPLOYEE_FIELDS = new Set([
  'military_status',
  'deferment_date',
  'work_phone',
  'emergency_contact_first_name',
  'emergency_contact_last_name',
  'emergency_contact_relationship',
  'emergency_contact_phone',
  'sgk_entry_date',
  'job_title',
  'top_size',
  'bottom_size',
  'shoe_size',
  'kep',
  'iban',
  'notes',
  'photo_url',
])

const LANGUAGE_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])

const getFieldLabel = (field: string) => PERSONEL_FIELD_LABELS[field] || field

const formatFieldList = (fields: string[]) => fields.map(getFieldLabel).join(', ')

export default function PersonelYonetimPage() {
  const [includePassive, setIncludePassive] = useState(false)
  const [listQuery, setListQuery] = useState({ page: 1, pageSize: 50, search: '', sort: 'last_name', direction: 'asc' as 'asc' | 'desc' })
  const { data: employees, meta: listMeta, loading: listLoading, error: listError, yenile } = usePersonel({ includePassive, ...listQuery })
  const moduleConfig = personelModuleConfig
  const apiBasePath = moduleConfig.entity.apiBasePath || '/api/employees'
  const lifecycleMessages = moduleConfig.form.lifecycle?.messages
  
  // Page state
  const [pageState, setPageState] = useState<PageState>('list')
  const [selectedPersonel, setSelectedPersonel] = useState<Personel | null>(null)
  
  // Form state
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailSections, setDetailSections] = useState<DetailSectionState>(emptyDetailSectionState)
  const [formError, setFormError] = useState<string | null>(null)
  const [saveFieldErrors, setSaveFieldErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<ToastState | null>(null)
  const [lifecycleWizard, setLifecycleWizard] = useState<'entry' | 'exit' | null>(null)
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilterEvent | null>(null)
  const detailRequestRef = useRef(0)

  // Transform data for table
  const tableData: PersonelTableRow[] = useMemo(() => (employees || []).map(p => ({
    ...p,
    employee_no: (p as any).employee_no || '-',
    fullname: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    identity_display: p.national_id || p.passport_no || '-',
    company_name: (p as any).company?.short_name || (p as any).company?.trade_name || '-',
    unit_name: p.unit?.name || '-',
    position_title: p.position?.title || p.job_title || '-',
    work_type: (p as any).work_type || '-',
    employment_status: isSoftDeletedRecord(p as Record<string, any>) ? 'pasif' : (p as any).employment_status || p.work_status || '-',
    egitim_durumu: getEducationSummary(p),
    sgk_status: p.sgk_entry_date ? 'SGK girişi var' : 'SGK bekliyor',
    __actions: ''
  })), [employees])

  const dashboardWidgets = useMemo(() => buildEmployeesDashboard(tableData), [tableData])
  const visibleTableData = useMemo(() => applyDashboardFilter(tableData, dashboardFilter), [tableData, dashboardFilter])

  const handleDashboardFilter = (event: DashboardFilterEvent) => {
    setDashboardFilter(event.filters ? event : null)
    if (event.filters) {
      const label = event.itemId || Object.values(event.filters)[0]
      setToast({ type: 'success', title: 'Liste Filtrelendi', message: `${label} filtresi uygulandı.` })
    }
  }

  // Event Handlers
  const handleAddClick = () => {
    detailRequestRef.current += 1
    setSelectedPersonel(null)
    setFormError(null)
    setSaveFieldErrors({})
    setDetailLoading(false)
    setDetailSections(emptyDetailSectionState)
    setPageState('create')
  }

  const handleListSortChange = (sorts: SortConfig[]) => {
    const sort = sorts[0]
    const sortMap: Record<string, string> = {
      fullname: 'last_name',
      full_name: 'last_name',
      company_name: 'company_id',
      unit_name: 'unit_id',
      position_title: 'position_id',
      employment_status: 'work_status',
    }
    setListQuery(prev => ({
      ...prev,
      page: 1,
      sort: sort ? sortMap[sort.key] || sort.key : 'last_name',
      direction: sort?.direction || 'asc',
    }))
  }

  const handleRowClick = async (row: PersonelTableRow) => {
    const requestId = detailRequestRef.current + 1
    detailRequestRef.current = requestId
    const cached = readEntityDetailCache<Personel, DetailSectionState>(EMPLOYEE_DETAIL_CACHE_NAMESPACE, row.id)
    setFormError(null)
    setSaveFieldErrors({})
    setSelectedPersonel(cached?.data || row as Personel)
    setPageState('view')
    if (cached) {
      setDetailLoading(false)
      setDetailSections(cached.meta || {
        ...emptyDetailSectionState,
        heroReady: true,
        mediaReady: true,
        detailsReady: true,
      })
      return
    }
    let mergedData = row as Personel
    const applySection = (sectionData: Partial<Personel>) => {
      if (detailRequestRef.current !== requestId) return
      mergedData = { ...mergedData, ...sectionData } as Personel
      setSelectedPersonel(mergedData)
    }

    setDetailLoading(true)
    setDetailSections({ ...emptyDetailSectionState, heroLoading: true })

    try {
      const heroResult = await employeeService.detailSection(row.id, 'hero')
      if (!heroResult.data) throw new Error('Çalışan ana bilgileri yüklenemedi')
      applySection(heroResult.data)
      if (detailRequestRef.current !== requestId) return

      const heroSections = {
        ...emptyDetailSectionState,
        heroLoading: false,
        heroReady: true,
        mediaLoading: true,
      }
      setDetailSections(heroSections)
      writeEntityDetailCache(EMPLOYEE_DETAIL_CACHE_NAMESPACE, row.id, mergedData, {
        meta: { ...heroSections, mediaLoading: false },
      })
      await waitForStagePaint()

      try {
        const mediaResult = await employeeService.detailSection(row.id, 'media')
        if (!mediaResult.data) throw new Error('Calisan fotograf ve belgeleri yuklenemedi')
        applySection(mediaResult.data)
        if (detailRequestRef.current !== requestId) return

        setDetailSections(previous => {
          const next = {
            ...previous,
            mediaLoading: false,
            mediaReady: true,
            detailsLoading: true,
          }
          writeEntityDetailCache(EMPLOYEE_DETAIL_CACHE_NAMESPACE, row.id, mergedData, {
            meta: { ...next, detailsLoading: false },
          })
          return next
        })
        await waitForStagePaint()
      } catch {
        if (detailRequestRef.current !== requestId) return
        setDetailSections(previous => ({
          ...previous,
          mediaLoading: false,
          mediaError: true,
          detailsLoading: true,
        }))
        await waitForStagePaint()
      }

      const detailsResult = await employeeService.detailSection(row.id, 'details')
      if (!detailsResult.data) throw new Error('Calisan detay alanlari yuklenemedi')
      applySection(detailsResult.data)
      if (detailRequestRef.current !== requestId) return

      setDetailSections(previous => {
        const next = {
          ...previous,
          detailsLoading: false,
          detailsReady: true,
        }
        writeEntityDetailCache(EMPLOYEE_DETAIL_CACHE_NAMESPACE, row.id, mergedData, { meta: next })
        return next
      })
    } catch (err: any) {
      if (detailRequestRef.current !== requestId) return
      setDetailSections(previous => ({
        ...previous,
        heroLoading: false,
        mediaLoading: false,
        detailsLoading: false,
        heroError: previous.heroReady ? previous.heroError : true,
        detailsError: previous.heroReady ? true : previous.detailsError,
      }))
      setFormError(err.message || 'Çalışan detayı yüklenemedi')
      setToast(err.toast || { type: 'error', title: 'Detay Yüklenemedi', message: err.message || 'Çalışan detayı yüklenemedi' })
    } finally {
      if (detailRequestRef.current === requestId) setDetailLoading(false)
    }
  }

  const handleSave = async (data: Record<string, any>, mode: FormMode) => {
    setSaving(true)
    setFormError(null)
    setSaveFieldErrors({})
    const payload = normalizeEmployeePayload(data)
    
    try {
      if (mode === 'create') {
        // Create new employee
        const response = await fetch(apiBasePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          throw await createSaveError(response, 'Kayıt oluşturulamadı')
        }
        
        setToast({ type: 'success', title: 'Kayıt Başarılı', message: lifecycleMessages?.createSuccess || 'Çalışan kaydı oluşturuldu' })
      } else {
        // Update existing employee
        const response = await fetch(`${apiBasePath}/${selectedPersonel?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          throw await createSaveError(response, 'Güncelleme başarısız')
        }
        
        const result = await response.json()
        setSelectedPersonel(result.data)
        setToast({ type: 'success', title: 'Kayıt Başarılı', message: lifecycleMessages?.updateSuccess || 'Çalışan bilgileri güncellendi' })
      }
      
      if (mode === 'create') {
        invalidateEntityDetailCache(EMPLOYEE_DETAIL_CACHE_NAMESPACE)
      } else {
        invalidateEntityDetailCache(EMPLOYEE_DETAIL_CACHE_NAMESPACE, selectedPersonel?.id)
      }
      // Refresh list and return to list view
      await yenile()
      invalidateEntityDetailCache(EMPLOYEE_DETAIL_CACHE_NAMESPACE, selectedPersonel?.id)
      setPageState('list')
    } catch (err: any) {
      setFormError(err.message)
      setSaveFieldErrors(err.fieldErrors || {})
      setToast(err.toast || { type: 'error', title: 'Kayıt Başarısız', message: err.message })
      throw err
    } finally {
      setSaving(false)
    }
  }

  const normalizeEmployeePayload = (raw: Record<string, any>) => {
    let payload: Record<string, any> = {}

    Object.entries(raw).forEach(([key, value]) => {
      if (key === 'cv_document' && value === null) {
        payload[key] = value
        return
      }
      if (value === '' || value === null || value === undefined) return
      payload[key] = value
    })

    if (Array.isArray(payload.phones)) {
      payload.phones = payload.phones.map((phone: Record<string, any>) => ({
        ...phone,
        phone: formatPhoneInput(String(phone.phone || ''))
      }))
    }

    if (Array.isArray(payload.emails)) {
      payload.emails = payload.emails.map((email: Record<string, any>) => ({
        ...email,
        address: normalizeEmailInput(String(email.address || ''))
      }))
    }

    if (Array.isArray(payload.foreign_languages)) {
      payload.foreign_languages = payload.foreign_languages.map((language: Record<string, any>) => ({
        ...language,
        seviye: LANGUAGE_LEVELS.has(String(language.seviye || '').toUpperCase())
          ? String(language.seviye).toUpperCase()
          : ''
      }))
    }

    if (payload.phones?.length && !payload.mobile_phone) {
      payload.mobile_phone = payload.phones[0]?.phone
    }

    if (payload.emails?.length && !payload.email) {
      payload.email = payload.emails[0]?.address
    }

    if (payload.mobile_phone) payload.mobile_phone = formatPhoneInput(String(payload.mobile_phone))
    if (payload.work_phone) payload.work_phone = formatPhoneInput(String(payload.work_phone))
    if (payload.emergency_contact_phone) payload.emergency_contact_phone = formatPhoneInput(String(payload.emergency_contact_phone))
    if (payload.email) payload.email = normalizeEmailInput(String(payload.email))

    if (payload.nationality) payload.nationality = normalizeCountryId(payload.nationality)

    if (isTurkishNationality(payload.nationality)) {
      delete payload.passport_no
    } else if (payload.nationality) {
      delete payload.national_id
    }

    if (!payload.sgk_entry_date) {
      delete payload.exit_date
      delete payload.exit_documents
    }

    const selectedStatus = selectedPersonel as Record<string, any> | null
    payload.record_status = payload.record_status || (pageState === 'create' ? 'draft' : selectedStatus?.record_status || 'draft')
    payload.employment_status = payload.employment_status || (payload.record_status === 'draft' ? 'pending_entry' : selectedStatus?.employment_status)
    payload.work_status = payload.exit_date ? 'terminated' : payload.record_status === 'active' ? 'active' : payload.record_status === 'passive' ? 'terminated' : 'suspended'
    return payload
  }

  const handleDelete = async () => {
    if (!selectedPersonel) return
    
    setDeleting(true)
    try {
      const response = await fetch(`${apiBasePath}/${selectedPersonel.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw await createSaveError(response, 'Silme işlemi başarısız')
      }
      
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: lifecycleMessages?.deleteSuccess || 'Çalışan kaydı pasife çekildi' })
      await yenile()
      invalidateEntityDetailCache(EMPLOYEE_DETAIL_CACHE_NAMESPACE, selectedPersonel?.id)
      setPageState('list')
    } catch (err: any) {
      setFormError(err.message)
      setToast(err.toast || { type: 'error', title: 'Kayıt Başarısız', message: err.message })
      throw err
    } finally {
      setDeleting(false)
    }
  }

  const handleActivate = async () => {
    if (!selectedPersonel) return

    setDeleting(true)
    try {
      const response = await fetch(`${apiBasePath}/${selectedPersonel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_status: 'active',
          employment_status: 'active',
          work_status: 'active',
        }),
      })

      if (!response.ok) {
        throw await createSaveError(response, 'Aktivasyon islemi basarisiz')
      }

      const result = await response.json()
      invalidateEntityDetailCache(EMPLOYEE_DETAIL_CACHE_NAMESPACE, selectedPersonel.id)
      setSelectedPersonel(result.data)
      setToast({ type: 'success', title: 'Kayit Basarili', message: 'Calisan kaydi aktive edildi' })
      await yenile()
      setPageState('view')
    } catch (err: any) {
      setFormError(err.message)
      setToast(err.toast || { type: 'error', title: 'Aktivasyon Basarisiz', message: err.message })
      throw err
    } finally {
      setDeleting(false)
    }
  }

  const handleLifecycleComplete = async (employee: Record<string, any>) => {
    setLifecycleWizard(null)
    if (selectedPersonel?.id) invalidateEntityDetailCache(EMPLOYEE_DETAIL_CACHE_NAMESPACE, selectedPersonel.id)
    setSelectedPersonel(employee as Personel)
    setPageState('view')
    await yenile()
    setToast({
      type: 'success',
      title: 'İşlem Tamamlandı',
      message: employee.record_status === 'passive' ? 'İşten çıkış tamamlandı.' : 'İşe giriş tamamlandı.',
    })
  }

  const openLifecycleWizardFromRow = (employee: PersonelTableRow, type: 'entry' | 'exit') => {
    detailRequestRef.current += 1
    setFormError(null)
    setSaveFieldErrors({})
    setDetailLoading(false)
    setDetailSections(emptyDetailSectionState)
    setSelectedPersonel(employee as Personel)
    setLifecycleWizard(type)
  }

  const listColumns = moduleConfig.list.columns.map(column => {
    if (column.key !== '__actions') return column

    return {
      ...column,
      label: 'İşlem',
      type: 'text' as const,
      width: 150,
      minWidth: 132,
      maxWidth: 170,
      fixedWidth: true,
      render: (_value: unknown, row: PersonelTableRow) => (
        <EmployeeRowActions
          row={row}
          onEntry={() => openLifecycleWizardFromRow(row, 'entry')}
          onExit={() => openLifecycleWizardFromRow(row, 'exit')}
        />
      ),
    }
  })

  const renderLifecycleActions = () => {
    if (!selectedPersonel || pageState === 'create') return null
    const status = getEmployeeRecordStatus(selectedPersonel)
    if (status === 'draft' || status === 'passive') {
      return (
        <button type="button" onClick={() => setLifecycleWizard('entry')} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          {status === 'passive' ? 'Yeniden İşe Al' : 'İşe Giriş Yap'}
        </button>
      )
    }
    if (status === 'active') {
      return (
        <button type="button" onClick={() => setLifecycleWizard('exit')} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30">
          İşten Çıkış Yap
        </button>
      )
    }
    return null
  }

  const createSaveError = async (response: Response, fallback: string): Promise<SaveError> => {
    const body = await response.json().catch(() => ({}))
    const code = body.code || `HTTP_${response.status}`
    const fieldErrors = body.details?.fieldErrors || {}
    const missingFields = Object.keys(fieldErrors)

    if (code === 'VALIDATION_FAILED' && missingFields.length > 0) {
      const message = formatFieldList(missingFields)
      const hasFormatError = Object.values(fieldErrors).some(value =>
        Array.isArray(value) && value.some(item => typeof item === 'string' && !item.toLowerCase().includes('required'))
      )
      const error = new Error(`${hasFormatError ? 'Geçersiz Alan' : 'Eksik Zorunlu Alan'} [${message}]`) as SaveError
      error.fieldErrors = Object.fromEntries(
        missingFields.map(field => {
          const firstMessage = Array.isArray(fieldErrors[field]) ? fieldErrors[field][0] : null
          return [field, typeof firstMessage === 'string' && !firstMessage.toLowerCase().includes('required')
            ? firstMessage
            : `${getFieldLabel(field)} zorunludur`
          ]
        })
      )
      error.toast = { type: 'warning', title: hasFormatError ? 'Geçersiz Alan' : 'Eksik Zorunlu Alan', message }
      return error
    }

    const notNullColumn = typeof body.error === 'string'
      ? body.error.match(/column "([^"]+)"/)?.[1]
      : null

    if ((code === '23502' || code === 'DB_ERROR') && notNullColumn && OPTIONAL_EMPLOYEE_FIELDS.has(notNullColumn)) {
      const label = getFieldLabel(notNullColumn)
      const message = `${label} alanı veritabanında zorunlu görünüyor; migration uygulanınca opsiyonel olacak. [${code}]`
      const error = new Error(message) as SaveError
      error.fieldErrors = { [notNullColumn]: `${label} opsiyonel olmalıdır` }
      error.toast = { type: 'error', title: 'Kayıt Başarısız', message }
      return error
    }

    const message = `${body.error || fallback} [${code}]`
    const error = new Error(message) as SaveError
    error.toast = { type: 'error', title: 'Kayıt Başarısız', message }
    return error
  }

  const withFieldHistory = (field: any) => {
    const history = (selectedPersonel as any)?.field_history?.[field.name || field.key]
    return history ? { ...field, history } : field
  }

  // Widgets
  const widgets: WidgetDef<PersonelTableRow>[] = [
    {
      key: 'total',
      label: 'Toplam Çalışan',
      render: () => tableData.length
    },
    {
      key: 'active',
      label: 'Görevde',
      render: () => tableData.filter(p => p.work_status === 'active').length
    },
    {
      key: 'onLeave',
      label: 'İzinde',
      render: () => tableData.filter(p => p.work_status === 'on_leave').length
    },
    {
      key: 'left',
      label: 'Ayrılmış',
      render: () => tableData.filter(p => p.work_status === 'terminated').length
    }
  ]

  // Determine form mode for display
  const selectedIsPassive = isSoftDeletedRecord(selectedPersonel as Record<string, any> | null) || (selectedPersonel ? getEmployeeRecordStatus(selectedPersonel) === 'passive' : false)
  const formMode: FormMode = pageState === 'create' ? 'create' :
                            pageState === 'edit' ? 'edit' :
                            selectedIsPassive ? 'passive' : 'view'
  const hiddenEmployeeTabIds = new Set(['person_ozel', 'ozel', 'iletisim', 'egitim', 'aile', 'banka'])
  const formTabs = [
    ...createRealPersonMasterTabs({
      addressField: 'address',
      cityField: 'city',
      districtField: 'district',
      maritalStatusField: 'marital_status',
      includeEmergencyContact: true,
    }),
    ...toEntityFormTabs(moduleConfig.form.tabs),
  ].filter(tab => !hiddenEmployeeTabIds.has(tab.id))
  const formLoadStages = createProgressiveFormLoadStages({
    mode: formMode,
    hasSnapshot: pageState !== 'create' && !!selectedPersonel,
    ...detailSections,
    detailLoading,
    detailError: !!formError,
    detailReady: pageState !== 'create' && !!selectedPersonel && !detailLoading,
    hasMaster: !!((selectedPersonel as any)?.person_id || (selectedPersonel as any)?.master_record_id || (selectedPersonel as any)?.master),
    referencesReady: true,
  })

  // Banner configuration based on page state
  const getBannerConfig = () => {
    if (pageState === 'list') {
      return {
        mode: 'list' as const,
        title: 'Çalışanlarımız',
        subtitle: 'Çalışan kayıtlarını yönetin',
        onAddClick: handleAddClick,
        addButtonText: 'Ekle'
      }
    }
    
    const getPersonelName = () => {
      if (!selectedPersonel) return ''
      return `${selectedPersonel.first_name || ''} ${selectedPersonel.last_name || ''}`.trim()
    }
    
    const personelName = getPersonelName()
    
    const modeTitles = {
      create: 'Yeni Çalışan',
      view: personelName || 'Çalışan Detayı',
      edit: personelName || 'Çalışan Düzenle'
    } as const
    
    const modeSubtitles = {
      create: 'Yeni çalışan kaydı oluştur',
      view: 'Çalışan bilgilerini görüntüle',
      edit: 'Çalışan bilgilerini güncelle'
    } as const
    
    return {
      mode: 'form' as const,
      formMode: formMode,
      title: formMode === 'passive' ? personelName || 'Pasif Calisan' : modeTitles[pageState as keyof typeof modeTitles],
      subtitle: formMode === 'passive' ? 'Pasif kaydi goruntule' : modeSubtitles[pageState as keyof typeof modeSubtitles],
      onBackClick: () => {
        detailRequestRef.current += 1
        setDetailLoading(false)
        setDetailSections(emptyDetailSectionState)
        setPageState('list')
      }
    }
  }

  const bannerConfig = getBannerConfig()

  return (
    <div className="relative">
      <PageBanner
        mode={bannerConfig.mode}
        {...(bannerConfig.mode === 'form' && { formMode: (bannerConfig as any).formMode })}
        title={bannerConfig.title}
        subtitle={bannerConfig.subtitle}
        icon={<Users size={24} />}
        {...(bannerConfig.mode === 'list' 
          ? { onAddClick: (bannerConfig as any).onAddClick, addButtonText: (bannerConfig as any).addButtonText }
          : { onBackClick: (bannerConfig as any).onBackClick }
        )}
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          title={toast.title}
          onClose={() => setToast(null)}
        />
      )}

      {/* List View */}
      {pageState === 'list' && (
        <div className="mt-6">
          {listError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400">Hata: {listError}</p>
            </div>
          )}

          <SmartDataTable<PersonelTableRow>
            data={visibleTableData}
            columns={listColumns}
            storageKey={moduleConfig.list.storageKey}
            widgets={widgets}
            dashboardWidgets={dashboardWidgets}
            onDashboardFilter={handleDashboardFilter}
            defaultView={moduleConfig.list.defaultView}
            defaultPageSize={moduleConfig.list.defaultPageSize}
            pageSizeOptions={moduleConfig.list.pageSizeOptions}
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
            loading={listLoading}
            emptyText={moduleConfig.list.emptyText}
            realtime={moduleConfig.list.realtime}
            pollingInterval={moduleConfig.list.pollingInterval}
            onRowClick={handleRowClick}
            onRefresh={yenile}
            showPassiveToggle
            includePassive={includePassive}
            onIncludePassiveChange={(next) => {
              setIncludePassive(next)
              setListQuery(prev => ({ ...prev, page: 1 }))
            }}
          />
          {dashboardFilter && (
            <button
              type="button"
              onClick={() => setDashboardFilter(null)}
              className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            >
              Dashboard filtresini temizle
            </button>
          )}
        </div>
      )}

      {/* Form View (Create/View/Edit) */}
      {pageState !== 'list' && (
        <div className="mt-6">
          <EntityForm
            mode={formMode}
            entityName={moduleConfig.form.entityName}
            entityNameSingular={moduleConfig.form.entityNameSingular}
            heroFields={toEntityFormFields(moduleConfig.form.hero.fields).map(withFieldHistory)}
            tabs={formTabs.map(tab => ({
              ...tab,
              fields: tab.fields.map(withFieldHistory)
            }))}
            data={selectedPersonel || undefined}
            identityGate={moduleConfig.form.identityGate}
            showHeroHeader={false}
            showMasterSummaryBadge={false}
            masterSummaryTitleAsField
            masterSummaryMode="personIdentity"
            hideRoleHeroFields
            showEmptyRoleHeroState={false}
            saving={saving}
            deleting={deleting}
            error={formError}
            loadStages={formLoadStages}
            externalFieldErrors={saveFieldErrors}
            onSave={handleSave}
            onCancel={() => {
              detailRequestRef.current += 1
              setDetailLoading(false)
              setDetailSections(emptyDetailSectionState)
              setPageState('list')
            }}
            onDelete={undefined}
            onActivate={handleActivate}
            onModeChange={(mode) => setPageState(mode)}
            additionalActions={renderLifecycleActions()}
            onIdentityGateOpenExistingRole={async (roleRecord) => {
              await handleRowClick(roleRecord as PersonelTableRow)
              setPageState('view')
            }}
            onIdentityGateCancelDuplicate={() => setPageState('list')}
            enableHistory
            documentSlot={{
              title: 'Belgeler',
              slots: [
                { id: 'cv', title: 'CV', required: false, storageField: 'cv_document' },
                { id: 'diploma', title: 'Diploma', required: false, storageField: 'diploma_document' },
              ],
            }}
            onValidationError={(fields) => {
              const hasFormatError = fields.some(field => field.includes('olmalıdır') || field.includes('geçersiz'))
              setToast({
                type: 'warning',
                title: hasFormatError ? 'Geçersiz Alan' : 'Eksik Zorunlu Alan',
                message: fields.join(', ')
              })
            }}
          />
        </div>
      )}
      {lifecycleWizard && selectedPersonel && (
        <EmployeeLifecycleWizard
          type={lifecycleWizard}
          employee={selectedPersonel as Record<string, any>}
          onClose={() => setLifecycleWizard(null)}
          onComplete={handleLifecycleComplete}
        />
      )}
    </div>
  )
}

function applyDashboardFilter(rows: PersonelTableRow[], event: DashboardFilterEvent | null) {
  if (!event?.filters) return rows
  const entries = Object.entries(event.filters)
  if (entries.length === 0) return rows

  return rows.filter(row => entries.every(([field, value]) => {
    if (field === 'ageGroup') return getAgeGroup((row as any).birth_date) === value
    if (value === null) return !((row as any)[field])
    return String((row as any)[field] || '').toLocaleLowerCase('tr-TR') === String(value || '').toLocaleLowerCase('tr-TR')
  }))
}

function EmployeeRowActions({ row, onEntry, onExit }: { row: PersonelTableRow; onEntry: () => void; onExit: () => void }) {
  const status = getEmployeeRecordStatus(row)

  if (status === 'draft') {
    return (
      <button
        type="button"
        title="İşe Giriş"
        onClick={(event) => {
          event.stopPropagation()
          onEntry()
        }}
        className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70"
      >
        <LogIn size={14} />
        <span>İşe Giriş</span>
      </button>
    )
  }

  if (status === 'active') {
    return (
      <button
        type="button"
        title="İşten Çıkış"
        onClick={(event) => {
          event.stopPropagation()
          onExit()
        }}
        className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-red-50 px-2.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
      >
        <LogOut size={14} />
        <span>İşten Çıkış</span>
      </button>
    )
  }

  return <span className="text-xs text-gray-400">-</span>
}

function getEmployeeRecordStatus(employee: Record<string, any>) {
  return employee.record_status || (employee.sgk_entry_date || employee.work_status === 'active' ? 'active' : 'draft')
}

function getAgeGroup(value?: string | null) {
  if (!value) return 'Belirsiz'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Belirsiz'
  const now = new Date()
  let age = now.getFullYear() - date.getFullYear()
  const monthDiff = now.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) age -= 1
  return age <= 25 ? '18-25' : age <= 35 ? '26-35' : age <= 45 ? '36-45' : '46+'
}
