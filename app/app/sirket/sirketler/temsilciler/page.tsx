'use client'

import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import { EntityForm, FormField, FormMode, FormTab } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef, WidgetDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'

type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }
type SaveError = Error & { toast?: ToastState; fieldErrors?: Record<string, string> }
type Option = { value: string; label: string }

interface RepresentativeRow {
  id: string
  sirket_id: string
  person_kind?: 'gercek_kisi' | 'tuzel_kisi'
  source_type?: string
  source_id?: string
  display_name?: string
  ad_soyad?: string
  phone?: string
  email?: string
  telefonlar?: Array<Record<string, any>>
  epostalar?: Array<Record<string, any>>
  address?: string
  city?: string
  district?: string
  authority_types?: string[]
  status?: string
  start_date?: string
  end_date?: string
  signature_type?: string
  transaction_limit?: number
  currency?: string
  is_deleted?: boolean
  history?: Array<Record<string, any>>
  photo_logo?: Array<Record<string, any>>
  authority_documents?: Array<Record<string, any>>
  representative_profile?: Record<string, any>
}

const FIELD_LABELS: Record<string, string> = {
  person_or_entity_type: 'Kişi / Kurum Tipi',
  primary_authority_type: 'Ana Yetki Tipi',
  start_date: 'Başlangıç Tarihi',
  status: 'Yetki Durumu',
  signature_type: 'İmza Türü',
  authority_limit: 'Yetki Limiti',
  currency: 'Para Birimi',
}

const AUTHORITY_OPTIONS = [
  'İmza Yetkilisi',
  'Banka Yetkilisi',
  'GİB Yetkilisi',
  'SGK Yetkilisi',
  'Sözleşme Yetkilisi',
  'Satınalma Onay Yetkilisi',
  'Ödeme Onay Yetkilisi',
  'Mesul Müdür',
  'Kanuni Temsilci',
]

const AUTHORITY_VALUE_BY_LABEL: Record<string, string> = {
  'İmza Yetkilisi': 'imza_yetkilisi',
  'Banka Yetkilisi': 'banka_yetkilisi',
  'GİB Yetkilisi': 'gib_yetkilisi',
  'SGK Yetkilisi': 'sgk_yetkilisi',
  'Sözleşme Yetkilisi': 'sozlesme_yetkilisi',
  'Satınalma Onay Yetkilisi': 'satinalma_onay_yetkilisi',
  'Ödeme Onay Yetkilisi': 'odeme_onay_yetkilisi',
  'Mesul Müdür': 'mesul_mudur',
  'Kanuni Temsilci': 'kanuni_temsilci',
}

const AUTHORITY_LABEL_BY_VALUE = Object.fromEntries(
  Object.entries(AUTHORITY_VALUE_BY_LABEL).map(([label, value]) => [value, label])
)

function toAuthorityValue(value: string) {
  return AUTHORITY_VALUE_BY_LABEL[value] || value
}

function toAuthorityLabel(value: string) {
  return AUTHORITY_LABEL_BY_VALUE[value] || value
}

const columns: ColumnDef[] = [
  { key: 'display_name', label: 'Ad Soyad / Ünvan', type: 'text', width: 260, sortable: true, category: 'Kimlik' },
  { key: 'company_name', label: 'Şirket', type: 'text', width: 220, category: 'Şirket' },
  { key: 'person_kind_label', label: 'Kişi / Kurum Tipi', type: 'enum', width: 150, category: 'Kimlik' },
  { key: 'primary_authority_type', label: 'Ana Yetki Tipi', type: 'enum', width: 180, category: 'Yetki' },
  { key: 'status', label: 'Yetki Durumu', type: 'enum', width: 130, sortable: true, category: 'Durum' },
  { key: 'start_date', label: 'Başlangıç', type: 'date', width: 120, category: 'Tarih' },
  { key: 'authority_limit', label: 'Yetki Limiti', type: 'number', width: 130, category: 'Limit' },
]

const heroFields: FormField[] = [
  { name: 'display_name', label: 'Ad Soyad / Ticari Ünvan', type: 'text', required: true },
  {
    name: 'status',
    label: 'Yetki Durumu',
    type: 'select',
    required: true,
    options: [
      { value: 'Aktif', label: 'Aktif' },
      { value: 'Pasif', label: 'Pasif' },
      { value: 'Askıda', label: 'Askıda' },
      { value: 'Süresi Dolmuş', label: 'Süresi Dolmuş' },
    ],
  },
  { name: 'start_date', label: 'Başlangıç Tarihi', type: 'date', required: true },
  { name: 'end_date', label: 'Bitiş Tarihi', type: 'date' },
  {
    name: 'primary_authority_type',
    label: 'Ana Yetki Tipi',
    type: 'select',
    required: true,
    options: AUTHORITY_OPTIONS.map(item => ({ value: toAuthorityValue(item), label: item })),
  },
  {
    name: 'signature_type',
    label: 'İmza Türü',
    type: 'select',
    requiredWhen: { field: 'primary_authority_type', operator: 'equals', value: 'imza_yetkilisi' },
    options: [
      { value: 'Münferit', label: 'Münferit' },
      { value: 'Müşterek', label: 'Müşterek' },
      { value: 'Sınırlı', label: 'Sınırlı' },
      { value: 'Süresiz', label: 'Süresiz' },
      { value: 'Yok', label: 'Yok' },
    ],
  },
  {
    name: 'authority_limit',
    label: 'Yetki Limiti',
    type: 'number',
    requiredWhen: { field: 'primary_authority_type', includes: ['banka_yetkilisi', 'odeme_onay_yetkilisi', 'satinalma_onay_yetkilisi'] },
  },
  {
    name: 'currency',
    label: 'Para Birimi',
    type: 'select',
    defaultValue: 'TRY',
    requiredWhen: { field: 'primary_authority_type', includes: ['banka_yetkilisi', 'odeme_onay_yetkilisi', 'satinalma_onay_yetkilisi'] },
    options: [
      { value: 'TRY', label: 'TRY' },
      { value: 'USD', label: 'USD' },
      { value: 'EUR', label: 'EUR' },
      { value: 'GBP', label: 'GBP' },
    ],
  },
]

const tabs: FormTab[] = [
  {
    id: 'genel',
    label: 'Genel',
    fields: [
      { name: 'first_name', label: 'Ad', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'gercek_kisi' } },
      { name: 'last_name', label: 'Soyad', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'gercek_kisi' } },
      { name: 'birth_date', label: 'Doğum Tarihi', type: 'date', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'gercek_kisi' } },
      { name: 'trade_name', label: 'Ticari Ünvan', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'tuzel_kisi' } },
      { name: 'short_name', label: 'Kısa Ünvan', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'tuzel_kisi' } },
      { name: 'tax_office', label: 'Vergi Dairesi', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'tuzel_kisi' } },
      { name: 'mersis_no', label: 'MERSİS', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'tuzel_kisi' } },
    ],
  },
  {
    id: 'iletisim',
    label: 'İletişim',
    fields: [
      {
        name: 'telefonlar',
        label: 'Telefon',
        type: 'list',
        colSpan: 3,
        listConfig: {
          addLabel: 'Telefon Ekle',
          emptyText: 'Telefon eklenmedi.',
          fields: [
            { name: 'etiket', key: 'etiket', label: 'Etiket', type: 'text', placeholder: 'Cep, iş, ev' },
            { name: 'numara', key: 'numara', label: 'Telefon Numarası', type: 'tel', required: true, placeholder: '+90 5XX XXX XX XX' },
          ],
        },
      },
      {
        name: 'epostalar',
        label: 'E-posta',
        type: 'list',
        colSpan: 3,
        listConfig: {
          addLabel: 'E-posta Ekle',
          emptyText: 'E-posta eklenmedi.',
          fields: [
            { name: 'etiket', key: 'etiket', label: 'Etiket', type: 'text', placeholder: 'Kişisel, iş' },
            { name: 'adres', key: 'adres', label: 'E-posta Adresi', type: 'email', required: true },
          ],
        },
      },
      { name: 'address', label: 'Adres', type: 'textarea', colSpan: 2 },
      { name: 'city', label: 'İl', type: 'text', compact: true },
      { name: 'district', label: 'İlçe', type: 'text', compact: true },
    ],
  },
  {
    id: 'yetkiler',
    label: 'Yetkiler',
    fields: [
      {
        name: 'authority_types',
        label: 'Yetki Tipleri',
        type: 'custom',
        colSpan: 3,
        render: ({ value, onChange, readOnly }) => <AuthoritySelector value={Array.isArray(value) ? value : []} onChange={onChange} readOnly={readOnly} />,
      },
      { name: 'authority_notes', label: 'Açıklama', type: 'textarea', colSpan: 3 },
      { name: 'document_reference_id', label: 'Belge Referansı', type: 'text' },
    ],
  },
  {
    id: 'banka',
    label: 'Banka',
    fields: [
      { name: 'bank_name', label: 'Banka', type: 'text' },
      { name: 'account_card', label: 'Hesap / Kart', type: 'text' },
      { name: 'bank_authority_level', label: 'Banka Yetki Seviyesi', type: 'text' },
      { name: 'transaction_limit', label: 'İşlem Limiti', type: 'number' },
      { name: 'bank_currency', label: 'Para Birimi', type: 'text', defaultValue: 'TRY' },
      { name: 'requires_joint_signature', label: 'Müşterek İmza Gerekli mi?', type: 'checkbox' },
      { name: 'can_approve_alone', label: 'Tek Başına Onaylayabilir mi?', type: 'checkbox' },
    ],
  },
  {
    id: 'kurumlar',
    label: 'Kurumlar',
    fields: [
      { name: 'gib_permissions', label: 'GİB Yetkileri', type: 'textarea', colSpan: 2 },
      { name: 'can_submit_declaration', label: 'Beyanname Gönderme Yetkisi', type: 'checkbox' },
      { name: 'can_process_e_invoice', label: 'E-Fatura İşlem Yetkisi', type: 'checkbox' },
      { name: 'sgk_permissions', label: 'SGK Yetkileri', type: 'textarea', colSpan: 2 },
      { name: 'can_submit_hiring_notice', label: 'İşe Giriş Bildirgesi Yetkisi', type: 'checkbox' },
      { name: 'can_submit_termination_notice', label: 'İşten Çıkış Bildirgesi Yetkisi', type: 'checkbox' },
      { name: 'official_correspondence_authority', label: 'Resmi Yazışma Yetkisi', type: 'checkbox' },
    ],
  },
  {
    id: 'belgeler',
    label: 'Belgeler',
    fields: [
      {
        name: 'document_summary',
        label: 'Belgeler',
        type: 'custom',
        colSpan: 3,
        render: ({ value }) => <SummaryList items={Array.isArray(value) ? value : []} emptyText="Yüklü yetki belgesi bulunamadı." />,
      },
    ],
  },
  {
    id: 'limitler',
    label: 'Limitler',
    fields: [
      { name: 'purchase_approval_limit', label: 'Satınalma Onay Limiti', type: 'number' },
      { name: 'payment_approval_limit', label: 'Ödeme Onay Limiti', type: 'number' },
      { name: 'bank_transaction_limit', label: 'Banka İşlem Limiti', type: 'number' },
      { name: 'contract_signature_limit', label: 'Sözleşme İmza Limiti', type: 'number' },
      { name: 'limit_currency', label: 'Para Birimi', type: 'text', defaultValue: 'TRY' },
      { name: 'limit_start_date', label: 'Limit Başlangıç Tarihi', type: 'date' },
      { name: 'limit_end_date', label: 'Limit Bitiş Tarihi', type: 'date' },
    ],
  },
  {
    id: 'notlar',
    label: 'Notlar',
    fields: [
      { name: 'notes', label: 'Notlar', type: 'textarea', colSpan: 3 },
    ],
  },
  {
    id: 'gecmis',
    label: 'Geçmiş',
    fields: [
      {
        name: 'timeline',
        label: 'Geçmiş',
        type: 'custom',
        colSpan: 3,
        render: ({ value }) => <Timeline value={Array.isArray(value) ? value : []} />,
      },
    ],
  },
]

export default function TemsilcilerPage() {
  const [pageState, setPageState] = useState<PageState>('list')
  const [representatives, setRepresentatives] = useState<RepresentativeRow[]>([])
  const [companies, setCompanies] = useState<Option[]>([])
  const [selectedRepresentative, setSelectedRepresentative] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const formMode: FormMode = pageState === 'create' ? 'create' : pageState === 'edit' ? 'edit' : 'view'

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [representativeResponse, companyResponse] = await Promise.all([
        fetch('/api/sirketler/temsilciler'),
        fetch('/api/sirketler?is_active=true'),
      ])
      const representativePayload = await representativeResponse.json()
      const companyPayload = await companyResponse.json()
      if (!representativeResponse.ok) throw new Error(representativePayload.error || 'Temsilciler yüklenemedi')

      setRepresentatives(Array.isArray(representativePayload.data) ? representativePayload.data : [])
      setCompanies(Array.isArray(companyPayload.data) ? companyPayload.data.map((company: any) => ({
        value: company.id,
        label: company.ticari_unvan || company.kisa_unvan,
      })) : [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const companyNameById = useMemo(() => Object.fromEntries(companies.map(company => [company.value, company.label])), [companies])
  const tableData = representatives.map(representative => ({
    ...representative,
    display_name: representative.display_name || representative.ad_soyad || '',
    person_kind_label: representative.person_kind === 'tuzel_kisi' ? 'Tüzel Kişi' : 'Gerçek Kişi',
    company_name: companyNameById[representative.sirket_id] || '-',
    primary_authority_type: toAuthorityLabel(representative.authority_types?.[0] || '-'),
    authority_limit: representative.transaction_limit,
  }))

  const widgets: WidgetDef<any>[] = [
    { key: 'total', label: 'Toplam Temsilci', render: () => tableData.length },
    { key: 'active', label: 'Aktif', render: () => tableData.filter(row => row.status === 'Aktif' && !row.is_deleted).length },
    { key: 'signature', label: 'İmza Yetkilisi', render: () => tableData.filter(row => row.authority_types?.some(type => toAuthorityValue(type) === 'imza_yetkilisi')).length },
    { key: 'bank', label: 'Banka Yetkilisi', render: () => tableData.filter(row => row.authority_types?.some(type => toAuthorityValue(type) === 'banka_yetkilisi')).length },
  ]

  const withFieldHistory = (field: FormField) => {
    const history = selectedRepresentative?.field_history?.[field.name]
    return history ? { ...field, history } : field
  }

  const handleRowClick = async (row: any) => {
    setSelectedRepresentative(normalizeRepresentativeForForm(row))
    setPageState('view')
    setFormError(null)
    setFieldErrors({})

    try {
      const response = await fetch(`/api/sirketler/temsilciler/${row.id}`)
      if (!response.ok) return
      const result = await response.json()
      if (result.data) setSelectedRepresentative(normalizeRepresentativeForForm(result.data))
    } catch {
      // List row is enough for initial view.
    }
  }

  const handleSave = async (data: Record<string, any>, mode: FormMode) => {
    setSaving(true)
    setFormError(null)
    setFieldErrors({})
    try {
      const payload = normalizePayload(data, companies)
      const response = await fetch(mode === 'create' ? '/api/sirketler/temsilciler' : `/api/sirketler/temsilciler/${selectedRepresentative?.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw await createSaveError(response, mode === 'create' ? 'Temsilci oluşturulamadı' : 'Güncelleme başarısız')
      const result = await response.json()
      if (result.data) setSelectedRepresentative(normalizeRepresentativeForForm(result.data))
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: mode === 'create' ? 'Temsilci kaydı oluşturuldu' : 'Temsilci bilgileri güncellendi' })
      await loadData()
      setPageState('list')
    } catch (err: any) {
      setFormError(err.message)
      setFieldErrors(err.fieldErrors || {})
      setToast(err.toast || { type: 'error', title: 'Kayıt Başarısız', message: err.message })
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedRepresentative?.id) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/sirketler/temsilciler/${selectedRepresentative.id}`, { method: 'DELETE' })
      if (!response.ok) throw await createSaveError(response, 'Pasifleştirme başarısız')
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: 'Temsilci kaydı pasife çekildi' })
      await loadData()
      setPageState('list')
    } catch (err: any) {
      setToast(err.toast || { type: 'error', title: 'Kayıt Başarısız', message: err.message })
      throw err
    } finally {
      setDeleting(false)
    }
  }

  const bannerConfig = pageState === 'list'
    ? {
        mode: 'list' as const,
        title: 'Temsilcilerimiz',
        subtitle: 'Şirket temsilci ve yetki kayıtlarını yönetin',
        onAddClick: () => {
          setSelectedRepresentative(null)
          setPageState('create')
        },
        addButtonText: 'Ekle',
      }
    : {
        mode: 'form' as const,
        formMode,
        title: pageState === 'create' ? 'Yeni Temsilci' : selectedRepresentative?.display_name || 'Temsilci Detayı',
        subtitle: pageState === 'create' ? 'Yeni temsilci kaydı oluştur' : pageState === 'edit' ? 'Temsilci bilgilerini güncelle' : 'Temsilci kayıt detayları',
        onBackClick: () => setPageState('list'),
      }

  return (
    <div className="relative">
      <PageBanner
        mode={bannerConfig.mode}
        {...(bannerConfig.mode === 'form' && { formMode: (bannerConfig as any).formMode })}
        title={bannerConfig.title}
        subtitle={bannerConfig.subtitle}
        icon={<BadgeCheck size={24} />}
        {...(bannerConfig.mode === 'list'
          ? { onAddClick: (bannerConfig as any).onAddClick, addButtonText: (bannerConfig as any).addButtonText }
          : { onBackClick: (bannerConfig as any).onBackClick }
        )}
      />

      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {pageState === 'list' && (
        <div className="mt-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <SmartDataTable
            columns={columns}
            data={tableData}
            loading={loading}
            widgets={widgets}
            defaultView="list"
            storageKey="sirket-temsilciler-table"
            emptyText="Temsilci kaydı bulunamadı"
            onRowClick={handleRowClick}
            onRefresh={loadData}
          />
        </div>
      )}

      {pageState !== 'list' && (
        <div className="mt-6">
          <EntityForm
            mode={formMode}
            entityName="Temsilcilerimiz"
            entityNameSingular="Temsilci"
            identityGate={{
              enabled: true,
              allowedEntityKinds: ['person', 'organization'],
              masterTable: 'both',
              uniqueFields: {
                person: ['nationality', 'national_id', 'passport_no'],
                organization: ['country', 'tax_number', 'registration_number'],
              },
              roleTable: 'sirket_temsilciler',
              roleDuplicateCheck: 'company_id + person_id/organization_id + authority_type + active',
              roleScopeFields: ['company_id', 'sirket_id'],
            }}
            heroFields={heroFields.map(withFieldHistory)}
            tabs={tabs.map(tab => ({ ...tab, fields: tab.fields.map(withFieldHistory) }))}
            data={selectedRepresentative || undefined}
            saving={saving}
            deleting={deleting}
            error={formError}
            externalFieldErrors={fieldErrors}
            onSave={handleSave}
            onCancel={() => setPageState('list')}
            onDelete={handleDelete}
            onModeChange={(mode) => setPageState(mode)}
            onIdentityGateOpenExistingRole={async (roleRecord) => {
              await handleRowClick(roleRecord as any)
              setPageState('edit')
            }}
            onIdentityGateCancelDuplicate={() => setPageState('list')}

            enableHistory
            imageSlot={{
              title: selectedRepresentative?.person_or_entity_type === 'tuzel_kisi' ? 'Logo' : 'Fotoğraf',
              dataField: 'photo_logo',
              slots: [
                { id: 'photo_logo', title: selectedRepresentative?.person_or_entity_type === 'tuzel_kisi' ? 'Logo' : 'Fotoğraf', required: false },
              ],
            }}
            documentSlot={{
              title: 'Yetki Belgeleri',
              dataField: 'authority_documents',
              slots: [
                { id: 'imza_sirkuleri', title: 'İmza Sirküleri', required: false },
                { id: 'vekaletname', title: 'Vekaletname', required: false },
                { id: 'yonetim_kurulu_karari', title: 'Yönetim Kurulu Kararı', required: false },
                { id: 'ticaret_sicil', title: 'Ticaret Sicil Gazetesi', required: false },
                { id: 'banka_yetki_formu', title: 'Banka Yetki Formu', required: false },
                { id: 'gib_yetki_belgesi', title: 'GİB Yetki Belgesi', required: false },
                { id: 'sgk_yetki_belgesi', title: 'SGK Yetki Belgesi', required: false },
                { id: 'diger', title: 'Diğer Belgeler', required: false },
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

function AuthoritySelector({ value, onChange, readOnly }: { value: string[]; onChange: (value: string[]) => void; readOnly: boolean }) {
  const toggle = (authority: string) => {
    if (readOnly) return
    const normalizedValue = value.map(toAuthorityValue)
    const authorityValue = toAuthorityValue(authority)
    onChange(normalizedValue.includes(authorityValue)
      ? normalizedValue.filter(item => item !== authorityValue)
      : [...normalizedValue, authorityValue])
  }
  const normalizedValue = value.map(toAuthorityValue)

  return (
    <div className="flex flex-wrap gap-2">
      {AUTHORITY_OPTIONS.map(authority => (
        <button
          key={authority}
          type="button"
          onClick={() => toggle(authority)}
          disabled={readOnly}
          className={[
            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            normalizedValue.includes(toAuthorityValue(authority))
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
              : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
            readOnly ? 'cursor-not-allowed opacity-70' : '',
          ].join(' ')}
        >
          {authority}
        </button>
      ))}
    </div>
  )
}

function SummaryList({ items, emptyText }: { items: any[]; emptyText: string }) {
  if (!items.length) return <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700">{emptyText}</div>
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
      {items.map((item, index) => (
        <div key={`${item.slotId || item.name || index}`} className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 dark:border-gray-800">
          <span className="font-medium text-gray-800 dark:text-gray-100">{item.slotTitle || item.title || item.name || 'Belge'}</span>
          <span className="text-xs text-gray-500">{item.name || item.fileName || '-'}</span>
        </div>
      ))}
    </div>
  )
}

function Timeline({ value }: { value: any[] }) {
  const items = value.length ? value : [
    { text: '01.01.2025 → İmza Yetkilisi olarak eklendi' },
    { text: '15.03.2025 → Banka işlem limiti 500.000 TL oldu' },
    { text: '20.06.2025 → GİB yetkisi pasifleştirildi' },
  ]

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          {item.text || `${item.changed_at || ''} → ${item.field || 'Değişiklik'}: ${item.old_value ?? '-'} → ${item.new_value ?? '-'}`}
        </div>
      ))}
    </div>
  )
}

function normalizeRepresentativeForForm(representative: RepresentativeRow) {
  const profile = representative.representative_profile || {}
  const authorityTypes = (profile.authority_types || representative.authority_types || []).map(toAuthorityValue)
  return {
    ...profile,
    ...representative,
    company_id: representative.sirket_id,
    person_or_entity_type: profile.person_or_entity_type || representative.person_kind || 'gercek_kisi',
    display_name: profile.display_name || representative.display_name || representative.ad_soyad || '',
    primary_authority_type: toAuthorityValue(profile.primary_authority_type || authorityTypes[0] || ''),
    authority_types: authorityTypes,
    status: profile.status || representative.status || 'Aktif',
    authority_limit: profile.authority_limit ?? representative.transaction_limit ?? '',
    currency: profile.currency || representative.currency || 'TRY',
    photo_logo: representative.photo_logo || [],
    authority_documents: representative.authority_documents || [],
    telefonlar: profile.telefonlar || representative.telefonlar || (representative.phone ? [{ etiket: 'Birincil', numara: representative.phone }] : []),
    epostalar: profile.epostalar || representative.epostalar || (representative.email ? [{ etiket: 'Birincil', adres: representative.email }] : []),
    document_summary: representative.authority_documents || [],
    timeline: representative.history || [],
    field_history: buildEntityFieldHistory(representative.history || []),
  }
}

function normalizePayload(raw: Record<string, any>, companies: Option[]) {
  const payload = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  )

  payload.company_id = payload.company_id || payload.sirket_id || companies[0]?.value
  if (payload.master_entity_kind === 'person') payload.person_or_entity_type = 'gercek_kisi'
  if (payload.master_entity_kind === 'organization') payload.person_or_entity_type = 'tuzel_kisi'
  payload.nationality = payload.nationality || payload.nationality_country || payload.country || 'TR'
  payload.country = payload.country || payload.nationality_country || payload.nationality || 'TR'
  payload.identity_number = payload.identity_number || payload.national_id || payload.tc_kimlik || payload.tax_number || payload.vkn_tckn || payload.passport_no || payload.pasaport_no
  if (Array.isArray(payload.telefonlar) && payload.telefonlar.length && !payload.phone) payload.phone = payload.telefonlar[0]?.numara
  if (Array.isArray(payload.epostalar) && payload.epostalar.length && !payload.email) payload.email = payload.epostalar[0]?.adres
  payload.primary_authority_type = toAuthorityValue(payload.primary_authority_type || '')
  payload.authority_types = Array.isArray(payload.authority_types) && payload.authority_types.length
    ? payload.authority_types.map(toAuthorityValue)
    : [payload.primary_authority_type].filter(Boolean)
  payload.person_kind = payload.person_or_entity_type
  delete payload.source_link
  payload.document_summary = undefined
  payload.field_history = undefined
  return payload
}

function buildEntityFieldHistory(history: any[]) {
  const trackedMap: Record<string, string> = {
    status: 'status',
    authority_types: 'primary_authority_type',
    signature_type: 'signature_type',
    transaction_limit: 'authority_limit',
    start_date: 'start_date',
    end_date: 'end_date',
  }
  return history.reduce((acc: Record<string, any[]>, entry: any) => {
    const field = trackedMap[entry.field]
    if (!field) return acc
    acc[field] = [
      ...(acc[field] || []),
      {
        value: `${entry.old_value ?? '-'} → ${entry.new_value ?? '-'}`,
        date: entry.changed_at || entry.date || new Date().toISOString(),
        user: entry.changed_by || entry.user || 'Sistem Kullanıcısı',
      },
    ]
    return acc
  }, {})
}

async function createSaveError(response: Response, fallback: string): Promise<SaveError> {
  const body = await response.json().catch(() => ({}))
  const code = body.code || `HTTP_${response.status}`
  const zodFieldErrors = body.details?.fieldErrors || {}
  const fields = Object.keys(zodFieldErrors)

  if (code === 'VALIDATION_FAILED' && fields.length > 0) {
    const message = fields.map(field => FIELD_LABELS[field] || field).join(', ')
    const error = new Error(`Eksik Zorunlu Alan [${message}]`) as SaveError
    error.fieldErrors = Object.fromEntries(fields.map(field => [field, `${FIELD_LABELS[field] || field} zorunludur`]))
    error.toast = { type: 'warning', title: 'Eksik Zorunlu Alan', message }
    return error
  }

  const message = `${body.error || fallback} [${code}]`
  const error = new Error(message) as SaveError
  error.toast = { type: 'error', title: 'Kayıt Başarısız', message }
  return error
}
