'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { EntityForm, FormField, FormMode, FormTab } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef, WidgetDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'

type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }
type SaveError = Error & { toast?: ToastState; fieldErrors?: Record<string, string> }
type Option = { value: string; label: string }
type CompanyOption = Option & { ticari_unvan?: string; kisa_unvan?: string }

interface PartnerRow {
  id: string
  sirket_id: string
  owner_kind?: 'gercek_kisi' | 'tuzel_kisi'
  ortak_tipi?: 'kisi' | 'sirket'
  display_name?: string
  ortak_adi?: string
  identity_number?: string
  tckn_vkn?: string
  hisse_orani?: number
  share_ratio?: number
  voting_ratio?: number
  profit_ratio?: number
  source_type?: string
  source_id?: string
  share_units?: number
  nominal_value?: number
  capital_amount?: number
  has_control_right?: boolean
  control_type?: string
  has_board_nomination_right?: boolean
  has_veto_right?: boolean
  has_privileged_share?: boolean
  beneficial_owner?: boolean
  is_beneficial_owner?: boolean
  beneficial_ratio?: number
  is_ultimate_controller?: boolean
  start_date?: string
  end_date?: string
  status?: string
  is_deleted?: boolean
  history?: Array<{ value: unknown; date: string; user?: string }>
  partner_profile?: Record<string, any>
  photo_logo?: Array<Record<string, any>>
  partner_documents?: Array<Record<string, any>>
}

const FIELD_LABELS: Record<string, string> = {
  partner_type: 'Ortak Türü',
  first_name: 'Ad / Ünvan',
  last_name: 'Kısa Ad / Soyad',
  identity_number: 'TCKN / VKN',
  share_ratio: 'Pay Oranı',
  voting_ratio: 'Oy Hakkı',
  profit_ratio: 'Kar Payı',
  source_type: 'Kaynak Türü',
  source_id: 'Kayıt Seçimi',
  control_type: 'Kontrol Türü',
  start_date: 'Başlangıç Tarihi',
  status: 'Durum',
}

const columns: ColumnDef[] = [
  { key: 'display_name', label: 'Ortak Adı / Ünvanı', type: 'text', width: 280, sortable: true, category: 'Kimlik', render: (value, row) => <PartnerNameCell value={value} row={row} /> },
  { key: 'partner_type_label', label: 'Ortak Türü', type: 'enum', width: 130, category: 'Kimlik' },
  { key: 'company_name', label: 'Şirket', type: 'text', width: 220, category: 'Şirket' },
  { key: 'start_date', label: 'Başlangıç', type: 'date', width: 120, category: 'Dönem' },
  { key: 'end_date', label: 'Bitiş', type: 'date', width: 120, category: 'Dönem' },
  { key: 'status', label: 'Durum', type: 'enum', width: 120, sortable: true, category: 'Durum' },
]

const heroFields: FormField[] = [
  { name: 'company_id', label: 'Şirket', type: 'select', required: true },
  { name: 'first_name', label: 'Adı', type: 'text', required: true, visibleWhen: { field: 'partner_type', operator: 'equals', value: 'gercek_kisi' } },
  { name: 'last_name', label: 'Soyadı', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'gercek_kisi' } },
  { name: 'first_name', label: 'Ticari Unvan', type: 'text', required: true, visibleWhen: { field: 'partner_type', operator: 'equals', value: 'tuzel_kisi' } },
  { name: 'last_name', label: 'Kısa Unvan', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'tuzel_kisi' } },
  { name: 'start_date', label: 'Başlangıç Tarihi', type: 'date', required: true },
  {
    name: 'status',
    label: 'Durum',
    type: 'select',
    required: true,
    options: [
      { value: 'Aktif', label: 'Aktif' },
      { value: 'Pasif', label: 'Pasif' },
      { value: 'Devredildi', label: 'Devredildi' },
      { value: 'Askıda', label: 'Askıda' },
      { value: 'Tarihsel', label: 'Tarihsel' },
    ],
  },
]

const tabs: FormTab[] = [
  {
    id: 'genel',
    label: 'Genel',
    fields: [
      { name: 'birth_date', label: 'Doğum Tarihi', type: 'date', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'gercek_kisi' } },
      { name: 'birth_place', label: 'Doğum Yeri', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'gercek_kisi' } },
      {
        name: 'gender',
        label: 'Cinsiyet',
        type: 'select',
        visibleWhen: { field: 'partner_type', operator: 'equals', value: 'gercek_kisi' },
        options: [
          { value: 'erkek', label: 'Erkek' },
          { value: 'kadin', label: 'Kadın' },
        ],
      },
      { name: 'occupation', label: 'Meslek', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'gercek_kisi' } },
      { name: 'marital_status', label: 'Medeni Durum', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'gercek_kisi' } },
      { name: 'foundation_date', label: 'Kuruluş Tarihi', type: 'date', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'tuzel_kisi' } },
      { name: 'company_type', label: 'Şirket Türü', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'tuzel_kisi' } },
      { name: 'mersis_no', label: 'MERSİS', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'tuzel_kisi' } },
      { name: 'trade_registry_no', label: 'Ticaret Sicil No', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'tuzel_kisi' } },
    ],
  },
  {
    id: 'iletisim',
    label: 'İletişim',
    fields: [
      { name: 'phone', label: 'Telefon', type: 'tel' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'city', label: 'Şehir', type: 'text' },
      { name: 'district', label: 'İlçe', type: 'text' },
      { name: 'address', label: 'Adres', type: 'textarea', colSpan: 3 },
    ],
  },
  {
    id: 'yetkiler',
    label: 'Yetkiler',
    fields: [
      { name: 'is_representative', label: 'Temsilci mi?', type: 'checkbox' },
      { name: 'is_signature_authorized', label: 'İmza Yetkilisi mi?', type: 'checkbox' },
      { name: 'is_board_member', label: 'Yönetim Kurulu Üyesi mi?', type: 'checkbox' },
      { name: 'has_purchase_authority', label: 'Satınalma Yetkisi', type: 'checkbox' },
      { name: 'has_payment_approval_authority', label: 'Ödeme Onay Yetkisi', type: 'checkbox' },
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
        render: ({ value }) => <SummaryList items={Array.isArray(value) ? value : []} emptyText="Yüklü belge bulunamadı." />,
      },
    ],
  },
  {
    id: 'vergi',
    label: 'Vergi',
    fields: [
      { name: 'tax_office', label: 'Vergi Dairesi', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'tuzel_kisi' } },
      { name: 'e_invoice_status', label: 'E-Fatura Durumu', type: 'checkbox', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'tuzel_kisi' } },
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

export default function OrtaklarPage() {
  const [pageState, setPageState] = useState<PageState>('list')
  const [partners, setPartners] = useState<PartnerRow[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [selectedPartner, setSelectedPartner] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<ToastState | null>(null)

  const formMode: FormMode = pageState === 'create' ? 'create' : pageState === 'edit' ? 'edit' : 'view'

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [partnerResponse, companyResponse] = await Promise.all([
        fetch('/api/sirketler/ortaklar'),
        fetch('/api/sirketler?is_active=true'),
      ])
      const partnerPayload = await partnerResponse.json()
      const companyPayload = await companyResponse.json()
      if (!partnerResponse.ok) throw new Error(partnerPayload.error || 'Ortaklar yüklenemedi')

      setPartners(Array.isArray(partnerPayload.data) ? partnerPayload.data : [])
      const companyOptions = Array.isArray(companyPayload.data) ? companyPayload.data.map((company: any) => ({
        value: company.id,
        label: company.ticari_unvan || company.kisa_unvan,
        ticari_unvan: company.ticari_unvan,
        kisa_unvan: company.kisa_unvan,
      })) : []
      setCompanies(companyOptions)
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
  const tableData = partners.map(partner => ({
    ...partner,
    display_name: partner.display_name || partner.ortak_adi || '',
    identity_number: partner.identity_number || partner.tckn_vkn || '',
    partner_type_label: (partner.owner_kind || partner.ortak_tipi) === 'tuzel_kisi' || partner.ortak_tipi === 'sirket' ? 'Tüzel Kişi' : 'Gerçek Kişi',
    company_name: companyNameById[partner.sirket_id] || '-',
  }))

  const activePartners = tableData.filter(partner => !partner.is_deleted && partner.status === 'Aktif')
  const widgets: WidgetDef<any>[] = [
    { key: 'total', label: 'Toplam Ortak', render: () => tableData.length },
    { key: 'active', label: 'Aktif Ortak', render: () => activePartners.length },
    { key: 'real', label: 'Gerçek Kişi', render: () => activePartners.filter(partner => partner.partner_type_label === 'Gerçek Kişi').length },
    { key: 'legal', label: 'Tüzel Kişi', render: () => activePartners.filter(partner => partner.partner_type_label === 'Tüzel Kişi').length },
  ]

  const configuredHeroFields = heroFields.map(field => {
    if (field.name === 'company_id') return { ...field, options: companies, defaultValue: companies.length === 1 ? companies[0].value : field.defaultValue }
    return field
  })
  const withFieldHistory = (field: FormField) => {
    const history = selectedPartner?.field_history?.[field.name]
    return history ? { ...field, history } : field
  }

  const handleRowClick = async (row: any) => {
    setSelectedPartner(normalizePartnerForForm(row))
    setPageState('view')
    setFormError(null)
    setFieldErrors({})

    try {
      const response = await fetch(`/api/sirketler/ortaklar/${row.id}`)
      if (!response.ok) return
      const result = await response.json()
      if (result.data) setSelectedPartner(normalizePartnerForForm(result.data))
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
      const response = await fetch(mode === 'create' ? '/api/sirketler/ortaklar' : `/api/sirketler/ortaklar/${selectedPartner?.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw await createSaveError(response, mode === 'create' ? 'Ortak oluşturulamadı' : 'Güncelleme başarısız')
      const result = await response.json()
      if (result.data) setSelectedPartner(normalizePartnerForForm(result.data))
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: mode === 'create' ? 'Ortak kaydı oluşturuldu' : 'Ortak bilgileri güncellendi' })
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
    if (!selectedPartner?.id) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/sirketler/ortaklar/${selectedPartner.id}`, { method: 'DELETE' })
      if (!response.ok) throw await createSaveError(response, 'Pasifleştirme başarısız')
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: 'Ortak kaydı pasife çekildi' })
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
        title: 'Ortaklarımız',
        subtitle: 'Şirket ortaklık ve pay kayıtlarını yönetin',
        onAddClick: () => {
          setSelectedPartner(null)
          setPageState('create')
        },
        addButtonText: 'Ekle',
      }
    : {
        mode: 'form' as const,
        formMode,
        title: pageState === 'create' ? 'Yeni Ortak' : selectedPartner?.display_name || 'Ortak Detayı',
        subtitle: pageState === 'create' ? 'Yeni ortak kaydı oluştur' : pageState === 'edit' ? 'Ortak bilgilerini güncelle' : 'Ortak kayıt detayları',
        onBackClick: () => setPageState('list'),
      }

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

      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {pageState === 'list' && (
        <div className="mt-6 space-y-5">
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
            storageKey="sirket-ortaklar-table"
            emptyText="Ortak kaydı bulunamadı"
            onRowClick={handleRowClick}
            onRefresh={loadData}
          />
        </div>
      )}

      {pageState !== 'list' && (
        <div className="mt-6">
          <EntityForm
            mode={formMode}
            entityName="Ortaklarımız"
            entityNameSingular="Ortak"
            identityGate={{
              enabled: true,
              allowedEntityKinds: ['person', 'organization'],
              masterTable: 'both',
              uniqueFields: {
                person: ['nationality', 'national_id', 'passport_no'],
                organization: ['country', 'tax_number', 'registration_number'],
              },
              roleTable: 'sirket_ortaklar',
              roleDuplicateCheck: 'company_id + entity_kind + person_id/organization_id + active',
              roleScopeFields: ['company_id', 'sirket_id'],
            }}
            heroFields={configuredHeroFields.map(withFieldHistory)}
            tabs={tabs.map(tab => ({ ...tab, fields: tab.fields.map(withFieldHistory) }))}
            data={selectedPartner || undefined}
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
              title: selectedPartner?.partner_type === 'tuzel_kisi' ? 'Logo' : 'Fotoğraf',
              dataField: 'photo_logo',
              slots: [
                { id: 'photo_logo', title: selectedPartner?.partner_type === 'tuzel_kisi' ? 'Logo' : 'Fotoğraf', required: false },
              ],
            }}
            documentSlot={{
              title: 'Belgeler',
              dataField: 'partner_documents',
              slots: [
                { id: 'kimlik_pasaport', title: 'Kimlik / Pasaport', required: false },
                { id: 'imza_beyani', title: 'İmza Beyanı', required: false },
                { id: 'vergi_levhasi', title: 'Vergi Levhası', required: false },
                { id: 'ticaret_sicil', title: 'Ticaret Sicil Gazetesi', required: false },
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

function PartnerNameCell({ value, row }: { value: any; row: any }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-medium">{value || '-'}</span>
      {row.status === 'Tarihsel' && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Tarihsel</span>}
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
    { text: '01.01.2025 → %20 Pay ile eklendi' },
    { text: '01.06.2025 → %35 oldu' },
    { text: '10.02.2026 → Yönetim Kurulu Üyesi oldu' },
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

function normalizePartnerForForm(partner: PartnerRow) {
  const profile = partner.partner_profile || {}
  const partnerType = profile.partner_type || partner.owner_kind || (partner.ortak_tipi === 'sirket' ? 'tuzel_kisi' : 'gercek_kisi')
  const nameParts = String(partner.display_name || partner.ortak_adi || '').trim().split(/\s+/)
  return {
    ...profile,
    ...partner,
    company_id: partner.sirket_id,
    partner_type: partnerType,
    first_name: profile.first_name || (partnerType === 'tuzel_kisi' ? partner.display_name || partner.ortak_adi || '' : nameParts.slice(0, -1).join(' ') || partner.display_name || partner.ortak_adi || ''),
    last_name: profile.last_name || (partnerType === 'tuzel_kisi' ? profile.short_name || '' : nameParts.length > 1 ? nameParts.at(-1) : ''),
    identity_number: profile.identity_number || partner.identity_number || partner.tckn_vkn || '',
    end_date: profile.end_date ?? partner.end_date ?? '',
    status: profile.status || partner.status || 'Aktif',
    photo_logo: partner.photo_logo || [],
    partner_documents: partner.partner_documents || [],
    document_summary: partner.partner_documents || [],
    timeline: partner.history || [],
    field_history: buildEntityFieldHistory(partner.history || []),
  }
}

function normalizePayload(raw: Record<string, any>, companies: Option[]) {
  const payload = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  )

  payload.company_id = payload.company_id || payload.sirket_id || companies[0]?.value
  if (payload.master_entity_kind === 'person') payload.partner_type = 'gercek_kisi'
  if (payload.master_entity_kind === 'organization') payload.partner_type = 'tuzel_kisi'
  payload.nationality_country = payload.nationality_country || payload.country || payload.nationality || 'TR'
  payload.identity_number = payload.identity_number || payload.national_id || payload.tc_kimlik || payload.tax_number || payload.vkn_tckn || payload.passport_no || payload.pasaport_no
  payload.owner_kind = payload.partner_type
  payload.trade_name = payload.partner_type === 'tuzel_kisi' ? payload.first_name : undefined
  payload.short_name = payload.partner_type === 'tuzel_kisi' ? payload.last_name : undefined
  delete payload.share_ratio
  delete payload.voting_ratio
  delete payload.profit_ratio
  delete payload.share_units
  delete payload.nominal_value
  delete payload.capital_amount
  delete payload.share_class
  delete payload.has_privileged_share
  delete payload.has_privilege
  delete payload.has_control_right
  delete payload.control_type
  delete payload.has_board_nomination_right
  delete payload.has_veto_right
  delete payload.beneficial_owner
  delete payload.beneficial_ratio
  delete payload.is_beneficial_owner
  delete payload.is_ultimate_controller
  delete payload.source_type
  delete payload.source_id
  payload.document_summary = undefined
  payload.field_history = undefined
  return payload
}

function buildEntityFieldHistory(history: any[]) {
  const trackedMap: Record<string, string> = {
    share_ratio: 'share_ratio',
    voting_ratio: 'voting_ratio',
    profit_ratio: 'profit_ratio',
    control_type: 'control_type',
    status: 'status',
    start_date: 'start_date',
    end_date: 'end_date',
    source_id: 'source_id',
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
