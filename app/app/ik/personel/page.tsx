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
import { Users } from 'lucide-react'
import { usePersonel } from '@/hooks/usePersonel'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, SortConfig, WidgetDef } from '@/components/ui/SmartDataTable'
import type { DashboardFilterEvent } from '@/components/dashboard/dashboard.types'
import { EntityForm, FormMode } from '@/components/ui/EntityForm'
import { Toast } from '@/components/ui/Toast'
import { EmployeeLifecycleWizard } from '@/components/ui/EmployeeLifecycleWizard'
import { personelModuleConfig, PersonelTableRow } from '@/lib/modules/personel.config'
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
import { normalizeEmployeeAliasPayload } from '@/lib/modules/employees/employeePayload'
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

const PERSONEL_FIELD_LABELS: Record<string, string> = {
  ad: 'Ad',
  soyad: 'Soyad',
  uyruk: 'Uyruk',
  tc_kimlik: 'TC Kimlik No',
  pasaport_no: 'Pasaport No',
  dogum_tarihi: 'Doğum Tarihi',
  cinsiyet: 'Cinsiyet',
  kan_grubu: 'Kan Grubu',
  askerlik_durumu: 'Askerlik Durumu',
  tecil_tarihi: 'Tecil Tarihi',
  is_telefonu: 'İş Telefonu',
  acil_kisi_ad: 'Acil Kişi Adı',
  acil_kisi_soyad: 'Acil Kişi Soyadı',
  acil_kisi_yakinlik: 'Acil Kişi Yakınlık Derecesi',
  acil_kisi_telefon: 'Acil Kişi Telefonu',
  sgk_giris: 'SGK Giriş Tarihi',
  gorev: 'Görev',
  ust_beden: 'Üst Beden',
  alt_beden: 'Alt Beden',
  ayakkabi: 'Ayakkabı',
  kep: 'Kep',
  iban: 'IBAN',
  notlar: 'Notlar',
  fotograf_url: 'Fotoğraf',
}

const OPTIONAL_EMPLOYEE_FIELDS = new Set([
  'askerlik_durumu',
  'tecil_tarihi',
  'is_telefonu',
  'acil_kisi_ad',
  'acil_kisi_soyad',
  'acil_kisi_yakinlik',
  'acil_kisi_telefon',
  'sgk_giris',
  'gorev',
  'ust_beden',
  'alt_beden',
  'ayakkabi',
  'kep',
  'iban',
  'notlar',
  'fotograf_url',
])

const LANGUAGE_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])

const getFieldLabel = (field: string) => PERSONEL_FIELD_LABELS[field] || field

const formatFieldList = (fields: string[]) => fields.map(getFieldLabel).join(', ')

export default function PersonelYonetimPage() {
  const [includePassive, setIncludePassive] = useState(false)
  const [listQuery, setListQuery] = useState({ page: 1, pageSize: 50, search: '', sort: 'soyad', direction: 'asc' as 'asc' | 'desc' })
  const { data: personel, meta: listMeta, loading: listLoading, error: listError, yenile } = usePersonel({ includePassive, ...listQuery })
  const moduleConfig = personelModuleConfig
  const apiBasePath = moduleConfig.entity.apiBasePath || '/api/ik/personel'
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
  const tableData: PersonelTableRow[] = useMemo(() => (personel || []).map(p => ({
    ...p,
    employee_no: (p as any).employee_no || '-',
    fullname: `${p.ad || ''} ${p.soyad || ''}`.trim(),
    identity_display: p.tc_kimlik || p.pasaport_no || '-',
    sirket_adi: (p as any).sirket?.kisa_unvan || (p as any).sirket?.ticari_unvan || '-',
    birim_adi: p.birim?.ad || '-',
    kadro_unvani: p.kadro?.unvan || p.gorev || '-',
    calisma_tipi: (p as any).calisma_tipi || '-',
    employment_status: isSoftDeletedRecord(p as Record<string, any>) ? 'pasif' : (p as any).employment_status || p.calisma_durumu || '-',
    egitim_durumu: getEducationSummary(p),
    sgk_status: p.sgk_giris ? 'SGK girişi var' : 'SGK bekliyor',
    __actions: ''
  })), [personel])

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
      fullname: 'soyad',
      full_name: 'soyad',
      sirket_adi: 'sirket_id',
      birim_adi: 'birim_id',
      kadro_unvani: 'kadro_id',
      employment_status: 'calisma_durumu',
    }
    setListQuery(prev => ({
      ...prev,
      page: 1,
      sort: sort ? sortMap[sort.key] || sort.key : 'soyad',
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
      if (key === 'cv_belgesi' && value === null) {
        payload[key] = value
        return
      }
      if (value === '' || value === null || value === undefined) return
      payload[key] = value
    })

    payload = normalizeEmployeeAliasPayload(payload)

    if (Array.isArray(payload.telefonlar)) {
      payload.telefonlar = payload.telefonlar.map((phone: Record<string, any>) => ({
        ...phone,
        numara: formatPhoneInput(String(phone.numara || ''))
      }))
    }

    if (Array.isArray(payload.epostalar)) {
      payload.epostalar = payload.epostalar.map((email: Record<string, any>) => ({
        ...email,
        adres: normalizeEmailInput(String(email.adres || ''))
      }))
    }

    if (Array.isArray(payload.yabanci_diller)) {
      payload.yabanci_diller = payload.yabanci_diller.map((language: Record<string, any>) => ({
        ...language,
        seviye: LANGUAGE_LEVELS.has(String(language.seviye || '').toUpperCase())
          ? String(language.seviye).toUpperCase()
          : ''
      }))
    }

    if (payload.telefonlar?.length && !payload.cep_telefonu) {
      payload.cep_telefonu = payload.telefonlar[0]?.numara
    }

    if (payload.epostalar?.length && !payload.email) {
      payload.email = payload.epostalar[0]?.adres
    }

    if (payload.cep_telefonu) payload.cep_telefonu = formatPhoneInput(String(payload.cep_telefonu))
    if (payload.is_telefonu) payload.is_telefonu = formatPhoneInput(String(payload.is_telefonu))
    if (payload.acil_kisi_telefon) payload.acil_kisi_telefon = formatPhoneInput(String(payload.acil_kisi_telefon))
    if (payload.email) payload.email = normalizeEmailInput(String(payload.email))

    if (payload.uyruk) payload.uyruk = normalizeCountryId(payload.uyruk)

    if (isTurkishNationality(payload.uyruk)) {
      delete payload.pasaport_no
    } else if (payload.uyruk) {
      delete payload.tc_kimlik
    }

    if (!payload.sgk_giris) {
      delete payload.isten_ayrilis
      delete payload.isten_cikis_belgeleri
    }

    const selectedStatus = selectedPersonel as Record<string, any> | null
    payload.record_status = payload.record_status || (pageState === 'create' ? 'draft' : selectedStatus?.record_status || 'draft')
    payload.employment_status = payload.employment_status || (payload.record_status === 'draft' ? 'pending_entry' : selectedStatus?.employment_status)
    payload.calisma_durumu = payload.isten_ayrilis ? 'ayrilmis' : payload.record_status === 'active' ? 'gorevde' : payload.record_status === 'passive' ? 'ayrilmis' : 'askida'
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
          calisma_durumu: 'gorevde',
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
      render: () => tableData.filter(p => p.calisma_durumu === 'gorevde').length
    },
    {
      key: 'onLeave',
      label: 'İzinde',
      render: () => tableData.filter(p => p.calisma_durumu === 'izinde').length
    },
    {
      key: 'left',
      label: 'Ayrılmış',
      render: () => tableData.filter(p => p.calisma_durumu === 'ayrilmis').length
    }
  ]

  // Determine form mode for display
  const selectedIsPassive = isSoftDeletedRecord(selectedPersonel as Record<string, any> | null) || (selectedPersonel ? getEmployeeRecordStatus(selectedPersonel) === 'passive' : false)
  const formMode: FormMode = pageState === 'create' ? 'create' :
                            pageState === 'edit' ? 'edit' :
                            selectedIsPassive ? 'passive' : 'view'
  const hiddenEmployeeTabIds = new Set(['gercek_kisi_ozel', 'ozel', 'iletisim', 'egitim', 'aile', 'banka'])
  const formTabs = [
    ...createRealPersonMasterTabs({
      addressField: 'adres',
      cityField: 'il',
      districtField: 'ilce',
      maritalStatusField: 'medeni_durum',
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
      return `${selectedPersonel.ad || ''} ${selectedPersonel.soyad || ''}`.trim()
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
            columns={moduleConfig.list.columns}
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
                { id: 'cv', title: 'CV', required: false, storageField: 'cv_belgesi' },
                { id: 'diploma', title: 'Diploma', required: false, storageField: 'diploma_belgesi' },
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
    if (field === 'ageGroup') return getAgeGroup((row as any).dogum_tarihi) === value
    if (value === null) return !((row as any)[field])
    return String((row as any)[field] || '').toLocaleLowerCase('tr-TR') === String(value || '').toLocaleLowerCase('tr-TR')
  }))
}

function getEmployeeRecordStatus(employee: Record<string, any>) {
  return employee.record_status || (employee.sgk_giris || employee.calisma_durumu === 'gorevde' ? 'active' : 'draft')
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
