'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
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
  { key: 'source_type_label', label: 'Kaynak Türü', type: 'enum', width: 140, category: 'Kimlik' },
  { key: 'company_name', label: 'Şirket', type: 'text', width: 220, category: 'Şirket' },
  { key: 'share_ratio', label: 'Hisse %', type: 'number', width: 100, sortable: true, category: 'Sermaye' },
  { key: 'voting_ratio', label: 'Oy %', type: 'number', width: 100, category: 'Sermaye' },
  { key: 'profit_ratio', label: 'Kar Payı %', type: 'number', width: 120, category: 'Sermaye' },
  { key: 'control_label', label: 'Kontrol', type: 'text', width: 160, category: 'Yönetim' },
  { key: 'beneficial_label', label: 'Nihai Faydalanıcı', type: 'text', width: 150, category: 'Yönetim' },
  { key: 'start_date', label: 'Başlangıç', type: 'date', width: 120, category: 'Dönem' },
  { key: 'end_date', label: 'Bitiş', type: 'date', width: 120, category: 'Dönem' },
  { key: 'status', label: 'Durum', type: 'enum', width: 120, sortable: true, category: 'Durum' },
]

const heroFields: FormField[] = [
  { name: 'company_id', label: 'Şirket', type: 'select', required: true },
  {
    name: 'partner_type',
    label: 'Kişi/Kurum Tipi',
    type: 'select',
    required: true,
    options: [
      { value: 'gercek_kisi', label: 'Gerçek Kişi' },
      { value: 'tuzel_kisi', label: 'Tüzel Kişi' },
    ],
  },
  {
    name: 'source_type',
    label: 'Mevcut Kayıt Eşleştirme',
    type: 'select',
    required: false,
    options: [
      { value: 'calisan', label: 'Çalışan' },
      { value: 'mevcut_temsilci', label: 'Mevcut Temsilci' },
      { value: 'harici_kisi', label: 'Harici Kişi' },
      { value: 'yeni_kisi', label: 'Yeni Kişi' },
      { value: 'cari', label: 'Cari' },
      { value: 'paydas', label: 'Paydaş' },
      { value: 'grup_sirketi', label: 'Grup Şirketi' },
      { value: 'harici_sirket', label: 'Harici Şirket' },
      { value: 'yeni_sirket', label: 'Yeni Şirket' },
    ],
  },
  { name: 'source_id', label: 'Mevcut Kayıt Eşleştirme', type: 'select' },
  { name: 'first_name', label: 'Adı / Ticari Ünvan', type: 'text', required: true },
  { name: 'last_name', label: 'Kısa Ad / Soyad', type: 'text' },
  { name: 'identity_number', label: 'TCKN / VKN', type: 'text', required: true, inputMode: 'numeric', pattern: '[0-9]{10,11}', maxLength: 11 },
  { name: 'nationality_country', label: 'Uyruğu / Ülke', type: 'text', defaultValue: 'Türkiye' },
  { name: 'share_ratio', label: 'Pay Oranı (%)', type: 'number', required: true },
  { name: 'voting_ratio', label: 'Oy Hakkı (%)', type: 'number' },
  { name: 'profit_ratio', label: 'Kar Payı (%)', type: 'number' },
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
  { name: 'has_control_right', label: 'Kontrol Hakkı Var mı?', type: 'checkbox' },
  {
    name: 'control_type',
    label: 'Kontrol Türü',
    type: 'select',
    visibleWhen: { field: 'has_control_right', operator: 'equals', value: true },
    options: [
      { value: 'Hisse Çoğunluğu', label: 'Hisse Çoğunluğu' },
      { value: 'Oy Çoğunluğu', label: 'Oy Çoğunluğu' },
      { value: 'Sözleşmesel Kontrol', label: 'Sözleşmesel Kontrol' },
      { value: 'Yönetim Kontrolü', label: 'Yönetim Kontrolü' },
      { value: 'Altın Hisse', label: 'Altın Hisse' },
      { value: 'Diğer', label: 'Diğer' },
    ],
  },
  { name: 'has_board_nomination_right', label: 'Yönetim Kurulu Aday Hakkı', type: 'checkbox' },
  { name: 'has_veto_right', label: 'Veto Hakkı Var mı?', type: 'checkbox' },
  { name: 'has_privileged_share', label: 'İmtiyazlı Pay Var mı?', type: 'checkbox' },
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
      { name: 'country', label: 'Ülke', type: 'text', defaultValue: 'Türkiye' },
      { name: 'city', label: 'Şehir', type: 'text' },
      { name: 'district', label: 'İlçe', type: 'text' },
      { name: 'address', label: 'Adres', type: 'textarea', colSpan: 3 },
    ],
  },
  {
    id: 'sermaye',
    label: 'Sermaye',
    fields: [
      { name: 'share_units', label: 'Pay Adedi', type: 'number' },
      { name: 'nominal_value', label: 'Nominal Değer', type: 'number' },
      { name: 'capital_amount', label: 'Toplam Sermaye Tutarı', type: 'number' },
      {
        name: 'share_class',
        label: 'Hisse Sınıfı',
        type: 'select',
        options: [
          { value: 'Adi Pay', label: 'Adi Pay' },
          { value: 'İmtiyazlı Pay', label: 'İmtiyazlı Pay' },
          { value: 'Nama Yazılı', label: 'Nama Yazılı' },
          { value: 'Hamiline', label: 'Hamiline' },
          { value: 'Kurucu Payı', label: 'Kurucu Payı' },
          { value: 'Yatırımcı Payı', label: 'Yatırımcı Payı' },
          { value: 'Diğer', label: 'Diğer' },
        ],
      },
      { name: 'has_privileged_share', label: 'İmtiyazlı Pay Var mı', type: 'checkbox' },
      { name: 'capital_increase_history', label: 'Sermaye Artış Geçmişi', type: 'textarea', colSpan: 3 },
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
      { name: 'beneficial_owner', label: 'Nihai Faydalanıcı mı?', type: 'checkbox' },
      { name: 'beneficial_ratio', label: 'Nihai Faydalanma Oranı (%)', type: 'number', visibleWhen: { field: 'beneficial_owner', operator: 'equals', value: true } },
      { name: 'is_ultimate_controller', label: 'Nihai Hakim Ortak mı?', type: 'checkbox', visibleWhen: { field: 'beneficial_owner', operator: 'equals', value: true } },
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
      { name: 'tax_number', label: 'Vergi No', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'tuzel_kisi' } },
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
    source_type_label: getSourceTypeLabel(partner.source_type),
    company_name: companyNameById[partner.sirket_id] || '-',
    share_ratio: partner.share_ratio ?? partner.hisse_orani,
    control_label: partner.has_control_right ? partner.control_type || 'Kontrol Hakkı' : ratioValue(partner.voting_ratio ?? partner.share_ratio ?? partner.hisse_orani) > 50 ? 'Çoğunluk' : '-',
    beneficial_label: partner.beneficial_owner || partner.is_beneficial_owner ? `${partner.beneficial_ratio ?? partner.share_ratio ?? '-'}%` : '-',
  }))

  const activePartners = tableData.filter(partner => !partner.is_deleted && partner.status === 'Aktif')
  const widgets: WidgetDef<any>[] = [
    { key: 'total', label: 'Toplam Ortak', render: () => tableData.length },
    { key: 'active', label: 'Aktif Ortak', render: () => activePartners.length },
    { key: 'real', label: 'Gerçek Kişi', render: () => activePartners.filter(partner => partner.partner_type_label === 'Gerçek Kişi').length },
    { key: 'legal', label: 'Tüzel Kişi', render: () => activePartners.filter(partner => partner.partner_type_label === 'Tüzel Kişi').length },
  ]

  const groupCompanyOptions = companies.filter(company => company.value !== selectedPartner?.company_id && company.value !== selectedPartner?.sirket_id)
  const configuredHeroFields = heroFields.map(field => {
    if (field.name === 'company_id') return { ...field, options: companies }
    if (field.name === 'source_id') return { ...field, options: groupCompanyOptions, visibleWhen: { field: 'source_type', operator: 'equals', value: 'grup_sirketi' } }
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
        title: 'Ortaklar',
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
            entityName="Ortaklar"
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
                { id: 'pay_defteri', title: 'Pay Defteri Kaydı', required: false },
                { id: 'hisse_devir', title: 'Hisse Devir Belgesi', required: false },
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
      {(row.has_control_right || ratioValue(row.voting_ratio ?? row.share_ratio) > 50) && <InlineBadge tone="blue">Kontrol Sahibi</InlineBadge>}
      {row.source_type === 'grup_sirketi' && <InlineBadge>Grup İçi</InlineBadge>}
      {(row.beneficial_owner || row.is_beneficial_owner) && <InlineBadge>Nihai Faydalanıcı</InlineBadge>}
      {row.has_privileged_share && <InlineBadge>İmtiyazlı</InlineBadge>}
      {row.status === 'Tarihsel' && <InlineBadge>Tarihsel</InlineBadge>}
    </div>
  )
}

function InlineBadge({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'blue' }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone === 'blue' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>{children}</span>
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
    source_type: profile.source_type || partner.source_type || (partnerType === 'tuzel_kisi' ? 'harici_sirket' : 'harici_kisi'),
    source_id: profile.source_id || partner.source_id || '',
    share_ratio: profile.share_ratio ?? partner.share_ratio ?? partner.hisse_orani ?? '',
    voting_ratio: profile.voting_ratio ?? partner.voting_ratio ?? '',
    profit_ratio: profile.profit_ratio ?? partner.profit_ratio ?? '',
    share_units: profile.share_units ?? partner.share_units ?? '',
    nominal_value: profile.nominal_value ?? partner.nominal_value ?? '',
    capital_amount: profile.capital_amount ?? partner.capital_amount ?? '',
    has_control_right: profile.has_control_right ?? partner.has_control_right ?? false,
    control_type: profile.control_type ?? partner.control_type ?? '',
    has_board_nomination_right: profile.has_board_nomination_right ?? partner.has_board_nomination_right ?? false,
    has_veto_right: profile.has_veto_right ?? partner.has_veto_right ?? false,
    has_privileged_share: profile.has_privileged_share ?? partner.has_privileged_share ?? false,
    beneficial_owner: profile.beneficial_owner ?? partner.beneficial_owner ?? partner.is_beneficial_owner ?? false,
    beneficial_ratio: profile.beneficial_ratio ?? partner.beneficial_ratio ?? '',
    is_ultimate_controller: profile.is_ultimate_controller ?? partner.is_ultimate_controller ?? false,
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
  payload.owner_kind = payload.partner_type
  payload.trade_name = payload.partner_type === 'tuzel_kisi' ? payload.first_name : undefined
  payload.short_name = payload.partner_type === 'tuzel_kisi' ? payload.last_name : undefined
  payload.source_type = payload.source_type || (payload.partner_type === 'tuzel_kisi' ? 'harici_sirket' : 'harici_kisi')
  payload.source_id = payload.source_id || undefined
  payload.is_beneficial_owner = !!payload.beneficial_owner
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

function getSourceTypeLabel(value?: string) {
  const labels: Record<string, string> = {
    calisan: 'Çalışan',
    mevcut_temsilci: 'Mevcut Temsilci',
    harici_kisi: 'Harici Kişi',
    yeni_kisi: 'Yeni Kişi',
    cari: 'Cari',
    paydas: 'Paydaş',
    grup_sirketi: 'Grup Şirketi',
    harici_sirket: 'Harici Şirket',
    yeni_sirket: 'Yeni Şirket',
    ortaklar_sayfasi: 'Ortaklar Sayfası',
  }
  return value ? labels[value] || value : '-'
}

function ratioValue(value: unknown) {
  const numeric = Number(value || 0)
  return Number.isFinite(numeric) ? numeric : 0
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
