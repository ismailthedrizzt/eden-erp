'use client'

import { useEffect, useState } from 'react'
import { Building2, FileText, Landmark, MapPin, Phone, Settings, Users } from 'lucide-react'
import { useSirketler } from '@/hooks/useSirketler'
import { EntityForm, FormField, FormMode, FormTab } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef, WidgetDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { formatPhoneInput, normalizeEmailInput } from '@/lib/utils'
import type { Sirket } from '@/types/sirket'

type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }
type SaveError = Error & { toast?: ToastState; fieldErrors?: Record<string, string> }
type SirketTableRow = Sirket & { adres_ozet: string }
type TaxOfficeOption = { value: string; label: string }

const FIELD_LABELS: Record<string, string> = {
  ticari_unvan: 'Ticari Unvan',
  kisa_unvan: 'Şirket Adı',
  vkn_tckn: 'VKN',
  vergi_dairesi: 'Vergi Dairesi',
  mersis_no: 'MERSİS No',
  ticaret_sicil_no: 'Ticaret Sicil No',
  kurulus_tarihi: 'Kuruluş Tarihi',
  sirket_turu: 'Şirket Türü',
  ulke: 'Ülke',
  il: 'İl',
  ilce: 'İlçe',
  adres: 'Adres',
  telefon: 'Telefon',
  email: 'E-posta',
  web_sitesi: 'Web Sitesi',
  legal_entity: 'Tüzel Kişilik',
  sirket_kodu: 'Şirket Kodu',
  e_fatura_mukellefi: 'E-Fatura Mükellefi',
  e_arsiv_mukellefi: 'E-Arşiv Mükellefi',
  e_irsaliye_mukellefi: 'E-İrsaliye Mükellefi',
  sgk_is_yeri_sicil_no: 'SGK İşyeri Sicil No',
  sgk_il: 'SGK İl',
  sgk_sube: 'SGK Şube',
  tehlike_sinifi: 'Tehlike Sınıfı',
  varsayilan_para_birimi: 'Varsayılan Para Birimi',
  varsayilan_dil: 'Varsayılan Dil',
  zaman_dilimi: 'Zaman Dilimi',
  mali_yil_baslangici: 'Mali Yıl Başlangıcı',
  is_active: 'Durum',
}

const columns: ColumnDef[] = [
  { key: 'kisa_unvan', label: 'Şirket Adı', type: 'text', width: 200, sortable: true, category: 'Kimlik' },
  { key: 'ticari_unvan', label: 'Ticari Unvan', type: 'text', width: 280, sortable: true, category: 'Kimlik' },
  { key: 'vkn_tckn', label: 'VKN', type: 'text', width: 120, sortable: true, category: 'Kimlik' },
  { key: 'vergi_dairesi', label: 'Vergi Dairesi', type: 'text', width: 140, sortable: true, category: 'Vergi' },
  { key: 'sirket_turu', label: 'Şirket Türü', type: 'enum', width: 150, sortable: true, category: 'Tescil' },
  { key: 'adres_ozet', label: 'Adres', type: 'text', width: 250, category: 'Adres' },
  { key: 'telefon', label: 'Telefon', type: 'text', width: 150, category: 'İletişim' },
  { key: 'email', label: 'E-posta', type: 'text', width: 200, category: 'İletişim' },
  { key: 'is_active', label: 'Durum', type: 'boolean', width: 100, sortable: true, category: 'Durum' },
]

const heroFields: FormField[] = [
  { name: 'kisa_unvan', label: 'Kısa Ünvan', type: 'text', required: true },
  { name: 'ticari_unvan', label: 'Ticari Unvan', type: 'text', required: true, colSpan: 2 },
  { name: 'vkn_tckn', label: 'VKN', type: 'text', required: true, maxLength: 10, inputMode: 'numeric', pattern: '[0-9]{10}' },
  { name: 'vergi_dairesi', label: 'Vergi Dairesi', type: 'select', required: true },
  {
    name: 'sirket_turu',
    label: 'Şirket Türü',
    type: 'select',
    options: [
      { value: 'anonim', label: 'Sermaye Şirketi - Anonim' },
      { value: 'limited', label: 'Sermaye Şirketi - Limited' },
      { value: 'komandit', label: 'Sermaye Şirketi - Komandit' },
      { value: 'kolektif', label: 'Şahıs Şirketi - Kolektif' },
      { value: 'adi_komandit', label: 'Şahıs Şirketi - Adi Komandit' },
      { value: 'adi_sirket', label: 'Şahıs Şirketi - Adi Şirket' },
    ],
  },
]

const tabs: FormTab[] = [
  {
    id: 'ortaklar',
    label: 'Ortaklar',
    icon: <Users size={16} />,
    fields: [
      {
        name: 'ortaklar',
        label: 'Ortaklar',
        type: 'list',
        colSpan: 3,
        listConfig: {
          addLabel: 'Ortak Ekle',
          emptyText: 'Ortak bilgisi eklenmedi.',
          fields: [
            { name: 'ad', label: 'Adı', type: 'text', required: true },
            { name: 'soyad', label: 'Soyadı', type: 'text' },
            {
              name: 'ortak_tipi',
              label: 'Tipi',
              type: 'select',
              required: true,
              options: [
                { value: 'kisi', label: 'Kişi' },
                { value: 'sirket', label: 'Şirket' },
              ],
            },
            { name: 'tckn_vkn', label: 'TCKN / VKN', type: 'text', required: true, inputMode: 'numeric', pattern: '[0-9]{10,11}' },
            { name: 'hisse_orani', label: 'Hisse Oranı', type: 'number', required: true },
            { name: 'imza_yetkisi', label: 'Yetki Durumu', type: 'checkbox' },
          ],
        },
      },
    ],
  },
  {
    id: 'adres',
    label: 'Adres',
    icon: <MapPin size={16} />,
    fields: [
      { name: 'ulke', label: 'Ülke', type: 'text', required: true, defaultValue: 'Türkiye' },
      { name: 'il', label: 'İl', type: 'text', required: true },
      { name: 'ilce', label: 'İlçe', type: 'text', required: true },
      { name: 'adres', label: 'Adres', type: 'textarea', required: true, colSpan: 3 },
    ],
  },
  {
    id: 'iletisim',
    label: 'İletişim',
    icon: <Phone size={16} />,
    fields: [
      { name: 'telefon', label: 'Telefon', type: 'tel' },
      { name: 'email', label: 'E-posta', type: 'email' },
      { name: 'web_sitesi', label: 'Web Sitesi', type: 'text', colSpan: 2 },
    ],
  },
  {
    id: 'tescil',
    label: 'Tescil',
    icon: <FileText size={16} />,
    fields: [
      { name: 'mersis_no', label: 'MERSİS No', type: 'text' },
      { name: 'ticaret_sicil_no', label: 'Ticaret Sicil No', type: 'text' },
      { name: 'kurulus_tarihi', label: 'Kuruluş Tarihi', type: 'date' },
      { name: 'legal_entity', label: 'Tüzel Kişilik', type: 'text' },
      { name: 'sirket_kodu', label: 'Şirket Kodu', type: 'text' },
    ],
  },
  {
    id: 'vergi',
    label: 'Vergi ve SGK',
    icon: <Landmark size={16} />,
    fields: [
      { name: 'e_fatura_mukellefi', label: 'E-Fatura Mükellefi', type: 'checkbox' },
      { name: 'e_arsiv_mukellefi', label: 'E-Arşiv Mükellefi', type: 'checkbox' },
      { name: 'e_irsaliye_mukellefi', label: 'E-İrsaliye Mükellefi', type: 'checkbox' },
      { name: 'sgk_is_yeri_sicil_no', label: 'SGK İşyeri Sicil No', type: 'text' },
      { name: 'sgk_il', label: 'SGK İl', type: 'text' },
      { name: 'sgk_sube', label: 'SGK Şube', type: 'text' },
      {
        name: 'tehlike_sinifi',
        label: 'Tehlike Sınıfı',
        type: 'select',
        options: [
          { value: 'az_tehlikeli', label: 'Az Tehlikeli' },
          { value: 'tehlikeli', label: 'Tehlikeli' },
          { value: 'cok_tehlikeli', label: 'Çok Tehlikeli' },
        ],
      },
    ],
  },
  {
    id: 'ayarlar',
    label: 'Ayarlar',
    icon: <Settings size={16} />,
    fields: [
      {
        name: 'varsayilan_para_birimi',
        label: 'Varsayılan Para Birimi',
        type: 'select',
        defaultValue: 'TRY',
        options: [
          { value: 'TRY', label: 'TRY - Türk Lirası' },
          { value: 'USD', label: 'USD - US Dollar' },
          { value: 'EUR', label: 'EUR - Euro' },
          { value: 'GBP', label: 'GBP - British Pound' },
        ],
      },
      {
        name: 'varsayilan_dil',
        label: 'Varsayılan Dil',
        type: 'select',
        defaultValue: 'tr',
        options: [
          { value: 'tr', label: 'Türkçe' },
          { value: 'en', label: 'English' },
          { value: 'de', label: 'Deutsch' },
        ],
      },
      { name: 'zaman_dilimi', label: 'Zaman Dilimi', type: 'text', defaultValue: 'Europe/Istanbul' },
      { name: 'mali_yil_baslangici', label: 'Mali Yıl Başlangıcı', type: 'number', defaultValue: 1 },
      { name: 'is_active', label: 'Şirket Aktif', type: 'checkbox', defaultValue: true },
    ],
  },
]

const getFieldLabel = (field: string) => FIELD_LABELS[field] || field
const formatFieldList = (fields: string[]) => fields.map(getFieldLabel).join(', ')

export default function SirketlerPage() {
  const { data: sirketler, loading, error: listError, yenile } = useSirketler()
  const [pageState, setPageState] = useState<PageState>('list')
  const [selectedSirket, setSelectedSirket] = useState<Sirket | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<ToastState | null>(null)
  const [taxOfficeOptions, setTaxOfficeOptions] = useState<TaxOfficeOption[]>([])

  useEffect(() => {
    let cancelled = false

    fetch('/api/reference/tax-offices')
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        if (cancelled || !Array.isArray(payload?.offices)) return
        setTaxOfficeOptions(payload.offices.map((office: any) => ({
          value: office.code ? `${office.code} - ${office.name}` : office.name,
          label: `${office.code ? `${office.code} - ` : ''}${office.name} (${office.province}/${office.district})`,
        })))
      })
      .catch(() => {
        if (!cancelled) setTaxOfficeOptions([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  const configuredHeroFields = heroFields.map(field =>
    field.name === 'vergi_dairesi' && taxOfficeOptions.length > 0
      ? { ...field, options: taxOfficeOptions }
      : field
  )

  const tableData: SirketTableRow[] = (sirketler || []).map(sirket => ({
    ...sirket,
    adres_ozet: [sirket.ilce, sirket.il].filter(Boolean).join(', '),
  }))

  const widgets: WidgetDef<SirketTableRow>[] = [
    { key: 'total', label: 'Toplam Şirket', render: () => tableData.length },
    { key: 'active', label: 'Aktif', render: () => tableData.filter(row => row.is_active).length },
    { key: 'inactive', label: 'Pasif', render: () => tableData.filter(row => !row.is_active).length },
  ]

  const formMode: FormMode = pageState === 'create' ? 'create' : pageState === 'edit' ? 'edit' : 'view'

  const handleAddClick = () => {
    setSelectedSirket(null)
    setFormError(null)
    setFieldErrors({})
    setPageState('create')
  }

  const handleRowClick = async (row: SirketTableRow) => {
    setSelectedSirket(row)
    setFormError(null)
    setFieldErrors({})
    setPageState('view')

    try {
      const response = await fetch(`/api/sirketler/${row.id}`)
      if (!response.ok) return
      const result = await response.json()
      if (result.data) setSelectedSirket(normalizeCompanyForForm(result.data))
    } catch {
      // The list row is enough to open the page; detail fetch enriches related/history data.
    }
  }

  const handleBackToList = () => {
    setPageState('list')
    setSelectedSirket(null)
    setFormError(null)
    setFieldErrors({})
    yenile()
  }

  const normalizePayload = (raw: Record<string, any>) => {
    const payload: Record<string, any> = {}

    Object.entries(raw).forEach(([key, value]) => {
      if (['temsilciler', 'dokumanlar', 'logolar'].includes(key)) return
      if (value === '' || value === null || value === undefined) return
      payload[key] = value
    })

    if (payload.telefon) payload.telefon = formatPhoneInput(String(payload.telefon))
    if (payload.email) payload.email = normalizeEmailInput(String(payload.email))
    if (payload.vkn_tckn) payload.vkn_tckn = String(payload.vkn_tckn).replace(/\D/g, '').slice(0, 10)
    if (payload.mali_yil_baslangici) payload.mali_yil_baslangici = Number(payload.mali_yil_baslangici)

    if (pageState === 'create') {
      payload.ulke = payload.ulke || 'Türkiye'
      payload.varsayilan_para_birimi = payload.varsayilan_para_birimi || 'TRY'
      payload.varsayilan_dil = payload.varsayilan_dil || 'tr'
      payload.zaman_dilimi = payload.zaman_dilimi || 'Europe/Istanbul'
      payload.mali_yil_baslangici = payload.mali_yil_baslangici || 1
      payload.is_active = payload.is_active ?? true
    }

    return payload
  }

  const handleSave = async (data: Record<string, any>, mode: FormMode) => {
    setSaving(true)
    setFormError(null)
    setFieldErrors({})

    try {
      const payload = normalizePayload(data)
      const response = await fetch(mode === 'create' ? '/api/sirketler' : `/api/sirketler/${selectedSirket?.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw await createSaveError(response, mode === 'create' ? 'Şirket oluşturulamadı' : 'Güncelleme başarısız')
      }

      const result = await response.json()
      if (result.data) setSelectedSirket(result.data)
      setToast({
        type: 'success',
        title: 'Kayıt Başarılı',
        message: mode === 'create' ? 'Şirket kaydı oluşturuldu' : 'Şirket bilgileri güncellendi',
      })
      await yenile()
      setPageState('list')
    } catch (error: any) {
      setFormError(error.message)
      setFieldErrors(error.fieldErrors || {})
      setToast(error.toast || { type: 'error', title: 'Kayıt Başarısız', message: error.message })
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSirket) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/sirketler/${selectedSirket.id}`, { method: 'DELETE' })

      if (!response.ok) {
        throw await createSaveError(response, 'Silme işlemi başarısız')
      }

      setToast({ type: 'success', title: 'Kayıt Başarılı', message: 'Şirket kaydı pasife çekildi' })
      await yenile()
      setPageState('list')
    } catch (error: any) {
      setFormError(error.message)
      setToast(error.toast || { type: 'error', title: 'Kayıt Başarısız', message: error.message })
      throw error
    } finally {
      setDeleting(false)
    }
  }

  const createSaveError = async (response: Response, fallback: string): Promise<SaveError> => {
    const body = await response.json().catch(() => ({}))
    const code = body.code || `HTTP_${response.status}`
    const zodFieldErrors = body.details?.fieldErrors || {}
    const fields = Object.keys(zodFieldErrors)

    if (code === 'VALIDATION_FAILED' && fields.length > 0) {
      const message = formatFieldList(fields)
      const error = new Error(`Eksik Zorunlu Alan [${message}]`) as SaveError
      error.fieldErrors = Object.fromEntries(
        fields.map(field => {
          const firstMessage = Array.isArray(zodFieldErrors[field]) ? zodFieldErrors[field][0] : null
          return [field, typeof firstMessage === 'string' ? firstMessage : `${getFieldLabel(field)} zorunludur`]
        })
      )
      error.toast = { type: 'warning', title: 'Eksik Zorunlu Alan', message }
      return error
    }

    const message = `${body.error || fallback} [${code}]`
    const error = new Error(message) as SaveError
    error.toast = { type: 'error', title: 'Kayıt Başarısız', message }
    return error
  }

  const withFieldHistory = (field: FormField) => {
    const history = (selectedSirket as any)?.field_history?.[field.name]
    return history ? { ...field, history } : field
  }

  const bannerConfig = pageState === 'list'
    ? {
        mode: 'list' as const,
        title: 'Şirketlerimiz',
        subtitle: 'Yönetilen şirket kayıtlarını görüntüleyin',
        onAddClick: handleAddClick,
        addButtonText: 'Ekle',
      }
    : {
        mode: 'form' as const,
        formMode,
        title: pageState === 'create' ? 'Yeni Şirket' : selectedSirket?.kisa_unvan || 'Şirket Detayı',
        subtitle: pageState === 'create'
          ? 'Yeni şirket kaydı oluştur'
          : pageState === 'edit'
            ? 'Şirket bilgilerini güncelle'
            : 'Şirket bilgilerini görüntüle',
        onBackClick: handleBackToList,
      }

  return (
    <div className="relative">
      <PageBanner
        mode={bannerConfig.mode}
        {...(bannerConfig.mode === 'form' && { formMode: (bannerConfig as any).formMode })}
        title={bannerConfig.title}
        subtitle={bannerConfig.subtitle}
        icon={<Building2 size={24} />}
        {...(bannerConfig.mode === 'list'
          ? { onAddClick: (bannerConfig as any).onAddClick, addButtonText: (bannerConfig as any).addButtonText }
          : { onBackClick: (bannerConfig as any).onBackClick }
        )}
      />

      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {pageState === 'list' && (
        <div className="mt-6">
          {listError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
            </div>
          )}

          <SmartDataTable<SirketTableRow>
            columns={columns}
            data={tableData}
            loading={loading}
            onRowClick={handleRowClick}
            onRefresh={yenile}
            widgets={widgets}
            defaultView="list"
            storageKey="sirketler-table"
            emptyText="Şirket kaydı bulunamadı"
          />
        </div>
      )}

      {pageState !== 'list' && (
        <div className="mt-6">
          <EntityForm
            mode={formMode}
            entityName="Şirketler"
            entityNameSingular="Şirket"
            heroFields={configuredHeroFields.map(withFieldHistory)}
            tabs={tabs.map(tab => ({ ...tab, fields: tab.fields.map(withFieldHistory) }))}
            data={selectedSirket || undefined}
            saving={saving}
            deleting={deleting}
            error={formError}
            externalFieldErrors={fieldErrors}
            onSave={handleSave}
            onCancel={handleBackToList}
            onDelete={handleDelete}
            onModeChange={(mode) => setPageState(mode)}
            enableHistory
            imageSlot={{
              dataField: 'hero_images',
              slots: [
                { id: 'original_logo', title: 'Orijinal Logo', required: true },
                { id: 'dark_logo', title: 'Dark Mode Logo', required: true },
              ],
            }}
            documentSlot={{
              dataField: 'hero_documents',
              slots: [
                { id: 'vergi_levhasi', title: 'Vergi Levhası', required: true },
                { id: 'ticaret_sicil', title: 'Ticaret Sicil Gazetesi', required: true },
                { id: 'imza_sirkuleri', title: 'İmza Sirküleri', required: true },
                { id: 'faaliyet_belgesi', title: 'Faaliyet Belgesi', required: false },
              ],
              acceptedTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
              maxSizeMB: 20,
            }}
            onValidationError={(fields) => setToast({
              type: 'warning',
              title: 'Eksik Zorunlu Alan',
              message: fields.join(', '),
            })}
          />
        </div>
      )}
    </div>
  )
}

function normalizeCompanyForForm(company: Sirket) {
  return {
    ...company,
    ortaklar: (company.ortaklar || []).map((partner: any) => {
      const parts = String(partner.ortak_adi || '').trim().split(/\s+/)
      return {
        ...partner,
        ad: partner.ad || parts.slice(0, -1).join(' ') || partner.ortak_adi || '',
        soyad: partner.soyad || (parts.length > 1 ? parts.at(-1) : ''),
        ortak_tipi: partner.ortak_tipi || 'kisi',
        tckn_vkn: partner.tckn_vkn || '',
        hisse_orani: partner.hisse_orani || '',
        imza_yetkisi: !!partner.imza_yetkisi,
      }
    }),
  }
}
