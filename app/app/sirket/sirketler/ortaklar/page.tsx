'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { EntityForm, FormField, FormMode, FormTab } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef, SortConfig, WidgetDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { normalizeCountryId } from '@/lib/reference/country-nationalities'
import { createRealPersonMasterTabs } from '@/lib/identity/realPersonFormSections'
import { createLegalEntityMasterTabs } from '@/lib/identity/legalEntityFormSections'
import { isSoftDeletedRecord } from '@/lib/forms/entityState'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'
import { invalidateEntityDetailCache, readEntityDetailCache, writeEntityDetailCache } from '@/lib/forms/entityDetailCache'
import { companyService } from '@/lib/services/companyService'
import { ownershipTransactionsService } from '@/lib/modules/ownership-transactions/ownershipTransactions.service'
import type { ListMeta } from '@/lib/api/listEndpoint'

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
  current_ownership?: CurrentOwnershipRow | null
  ownership_transaction_history?: OwnershipTransactionHistoryRow[]
}

interface CurrentOwnershipRow {
  company_id: string
  partner_id: string
  current_share_ratio?: number
  current_voting_ratio?: number
  current_profit_ratio?: number
  current_capital_amount?: number
  current_share_units?: number
  has_control_right?: boolean
  control_type?: string
  has_veto_right?: boolean
  has_board_nomination_right?: boolean
  has_privileged_share?: boolean
  is_beneficial_owner?: boolean
  beneficial_ratio?: number
  warnings?: string[]
}

interface OwnershipTransactionHistoryRow {
  id: string
  transaction_no?: string
  transaction_type?: string
  transaction_date?: string
  effective_date?: string
  approval_status?: string
  from_partner_id?: string | null
  to_partner_id?: string | null
  affected_partner_id?: string | null
  share_ratio?: number | null
  voting_ratio?: number | null
  profit_ratio?: number | null
  capital_amount?: number | null
  share_units?: number | null
  has_control_right?: boolean
  control_type?: string | null
  has_veto_right?: boolean
  has_board_nomination_right?: boolean
  has_privileged_share?: boolean
  created_at?: string
}

interface RepresentativeAuthorityRow {
  id: string
  sirket_id?: string
  is_deleted?: boolean
  person_id?: string | null
  organization_id?: string | null
  source_id?: string | null
  display_name?: string
  ad_soyad?: string
  status?: string
  authority_types?: string[]
  gorev?: string
  signature_type?: string | null
  transaction_limit?: number | null
  currency?: string | null
  requires_joint_signature?: boolean
  can_approve_alone?: boolean
  start_date?: string
  end_date?: string | null
}

type PartnerHistorySectionsValue = {
  ownershipTransactions?: OwnershipTransactionHistoryRow[]
  technicalChanges?: any[]
}

const AUTHORITY_LABEL_BY_VALUE: Record<string, string> = {
  imza_yetkilisi: 'İmza Yetkilisi',
  banka_yetkilisi: 'Banka Yetkilisi',
  gib_yetkilisi: 'GİB Yetkilisi',
  sgk_yetkilisi: 'SGK Yetkilisi',
  sozlesme_yetkilisi: 'Sözleşme Yetkilisi',
  satinalma_onay_yetkilisi: 'Satınalma Onay Yetkilisi',
  odeme_onay_yetkilisi: 'Ödeme Onay Yetkilisi',
  mesul_mudur: 'Mesul Müdür',
  kanuni_temsilci: 'Kanuni Temsilci',
}

function toAuthorityLabel(value?: string | null) {
  if (!value) return ''
  return AUTHORITY_LABEL_BY_VALUE[value] || value
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
  { key: 'current_share_ratio', label: 'Hisse %', type: 'number', width: 110, category: 'Hesaplanan' },
  { key: 'current_voting_ratio', label: 'Oy %', type: 'number', width: 100, category: 'Hesaplanan' },
  { key: 'current_profit_ratio', label: 'Kar Payı %', type: 'number', width: 120, category: 'Hesaplanan' },
  { key: 'current_capital_amount', label: 'Sermaye', type: 'number', width: 130, category: 'Hesaplanan' },
  { key: 'start_date', label: 'Başlangıç', type: 'date', width: 120, category: 'Dönem' },
  { key: 'end_date', label: 'Bitiş', type: 'date', width: 120, category: 'Dönem' },
  { key: 'status', label: 'Durum', type: 'enum', width: 120, sortable: true, category: 'Durum' },
]

const heroFields: FormField[] = [
  { name: 'company_id', label: 'Şirket', type: 'select', required: true },
  { name: 'first_name', label: 'Adı', type: 'text', required: true, visibleWhen: { field: 'partner_type', operator: 'equals', value: 'gercek_kisi' } },
  { name: 'last_name', label: 'Soyadı', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'gercek_kisi' } },
  {
    name: 'uyruk',
    label: 'Uyruğu',
    type: 'select',
    required: true,
    visibleWhen: { field: 'partner_type', operator: 'equals', value: 'gercek_kisi' },
    options: [
      { value: 'TR', label: 'Türkiye Cumhuriyeti' },
      { value: 'US', label: 'Amerika Birleşik Devletleri' },
      { value: 'DE', label: 'Almanya' },
      { value: 'GB', label: 'Birleşik Krallık' },
      { value: 'FR', label: 'Fransa' },
      { value: 'OTHER', label: 'Diğer' },
    ],
  },
  { name: 'tc_kimlik', label: 'TC Kimlik No', type: 'text', maxLength: 11, visibleWhen: { field: 'partner_type', operator: 'equals', value: 'gercek_kisi' } },
  { name: 'pasaport_no', label: 'Pasaport No', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'gercek_kisi' } },
  { name: 'first_name', label: 'Ticari Unvan', type: 'text', required: true, visibleWhen: { field: 'partner_type', operator: 'equals', value: 'tuzel_kisi' } },
  { name: 'last_name', label: 'Kısa Unvan', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'tuzel_kisi' } },
  { name: 'identity_number', label: 'VKN', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'tuzel_kisi' } },
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
      { name: 'address', label: 'Ev Adresi', type: 'textarea', colSpan: 2 },
      { name: 'city', label: 'İl', type: 'text', compact: true },
      { name: 'district', label: 'İlçe', type: 'text', compact: true },
      { name: 'acil_baslik', label: 'Acil Durumda Ulaşılacak Kişi', type: 'section', colSpan: 3 },
      { name: 'acil_kisi_ad', label: 'Adı', type: 'text', requiredGroup: 'acil_kisi' },
      { name: 'acil_kisi_soyad', label: 'Soyadı', type: 'text', requiredGroup: 'acil_kisi' },
      { name: 'acil_kisi_yakinlik', label: 'Yakınlık Derecesi', type: 'text', requiredGroup: 'acil_kisi' },
      { name: 'acil_kisi_telefon', label: 'Telefon Numarası', type: 'tel', requiredGroup: 'acil_kisi' },
    ],
  },
  {
    id: 'sermaye',
    label: 'Sermaye',
    fields: [
      {
        name: 'current_ownership',
        label: 'Onaylı İşlemlerden Hesaplanan Sermaye',
        type: 'custom',
        colSpan: 3,
        render: ({ value }) => <CurrentOwnershipPanel value={value} section="capital" />,
      },
    ],
  },
  {
    id: 'yetkiler',
    label: 'Yetkiler',
    fields: [
      {
        name: 'current_ownership',
        label: 'Onaylı İşlemlerden Hesaplanan Yönetim Hakları',
        type: 'custom',
        colSpan: 3,
        render: ({ value }) => <CurrentOwnershipPanel value={value} section="rights" />,
      },
      {
        name: 'representative_authorities',
        label: 'Temsilci / Kurul Kaynaklı Yetkiler',
        type: 'custom',
        colSpan: 3,
        render: ({ value }) => <RepresentativeAuthoritiesPanel value={Array.isArray(value) ? value : []} />,
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
        name: 'history_sections',
        label: 'Geçmiş',
        type: 'custom',
        colSpan: 3,
        render: ({ value }) => <PartnerHistorySections value={value as PartnerHistorySectionsValue} />,
      },
    ],
  },
]

export default function OrtaklarPage() {
  const [pageState, setPageState] = useState<PageState>('list')
  const [partners, setPartners] = useState<PartnerRow[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [currentOwnershipRows, setCurrentOwnershipRows] = useState<CurrentOwnershipRow[]>([])
  const [representatives, setRepresentatives] = useState<RepresentativeAuthorityRow[]>([])
  const [selectedPartner, setSelectedPartner] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [relationContextLoading, setRelationContextLoading] = useState(false)
  const [relationContextError, setRelationContextError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [includePassive, setIncludePassive] = useState(false)
  const [listQuery, setListQuery] = useState({ page: 1, pageSize: 50, search: '', sort: 'created_at', direction: 'desc' as 'asc' | 'desc' })
  const [listMeta, setListMeta] = useState<ListMeta>({ page: 1, pageSize: 50, total: 0, totalPages: 1 })
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<ToastState | null>(null)

  const isSelectedPassive = isSoftDeletedRecord(selectedPartner)
  const formMode: FormMode = pageState === 'create' ? 'create' : isSelectedPassive ? 'passive' : pageState === 'edit' ? 'edit' : 'view'
  const formLoadStages = createProgressiveFormLoadStages({
    mode: formMode,
    hasSnapshot: pageState !== 'create' && !!selectedPartner,
    detailLoading,
    detailError: !!formError,
    detailReady: pageState !== 'create' && !!selectedPartner && !detailLoading,
    hasMaster: !!(selectedPartner?.person_id || selectedPartner?.organization_id || selectedPartner?.master_record_id || selectedPartner?.master),
    referencesLoading: relationContextLoading,
    referencesReady: companies.length > 0 || representatives.length > 0 || currentOwnershipRows.length > 0,
    referencesError: relationContextError,
  })

  const loadRelationContext = useCallback(async (force = false) => {
    setRelationContextLoading(true)
    setRelationContextError(false)
    try {
    const [companyPayload, representativePayload] = await Promise.all([
      companyService.list({ useCache: !force }),
      companyService.representativesList({ useCache: !force }),
    ])

    setRepresentatives(Array.isArray(representativePayload.data) ? representativePayload.data : [])
    const companyOptions: CompanyOption[] = Array.isArray(companyPayload.data) ? companyPayload.data.map((company: any) => ({
      value: company.id,
      label: company.ticari_unvan || company.kisa_unvan,
      ticari_unvan: company.ticari_unvan,
      kisa_unvan: company.kisa_unvan,
    })) : []
    setCompanies(companyOptions)
    if (companyOptions.length > 0) {
      const ownershipPayload = await companyService.currentOwnership(companyOptions.map(company => company.value), { useCache: !force })
      setCurrentOwnershipRows(Array.isArray(ownershipPayload.data) ? ownershipPayload.data : [])
    } else {
      setCurrentOwnershipRows([])
    }
    } catch (error) {
      setRelationContextError(true)
      throw error
    } finally {
      setRelationContextLoading(false)
    }
  }, [])

  const loadData = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      if (force) companyService.invalidateRelations()
      const partnerPayload = await companyService.partnersList({ includePassive, useCache: !force, ...listQuery })

      setPartners(Array.isArray(partnerPayload.data) ? partnerPayload.data : [])
      setListMeta(partnerPayload.meta ?? { page: listQuery.page, pageSize: listQuery.pageSize, total: partnerPayload.data?.length ?? 0, totalPages: 1 })
      loadRelationContext(force).catch(() => {
        setRepresentatives([])
        setCurrentOwnershipRows([])
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [includePassive, listQuery, loadRelationContext])
  useEffect(() => {
    loadData()
  }, [loadData])

  const companyNameById = useMemo(() => Object.fromEntries(companies.map(company => [company.value, company.label])), [companies])
  const currentOwnershipByPartnerId = useMemo(() => Object.fromEntries(currentOwnershipRows.map(row => [row.partner_id, row])), [currentOwnershipRows])
  const representativeAuthoritiesForPartner = useCallback((partner: Record<string, any> | null | undefined) => {
    if (!partner) return []
    const companyId = partner.company_id || partner.sirket_id
    const personId = partner.person_id
    const organizationId = partner.organization_id
    const sourceId = partner.source_id || personId || organizationId
    const displayName = partner.display_name || partner.ortak_adi

    return representatives.filter(representative =>
      (!companyId || representative.sirket_id === companyId) &&
      !isSoftDeletedRecord(representative) &&
      (
        (personId && representative.person_id === personId) ||
        (organizationId && representative.organization_id === organizationId) ||
        (sourceId && representative.source_id === sourceId) ||
        (!!displayName && (representative.display_name === displayName || representative.ad_soyad === displayName))
      )
    )
  }, [representatives])

  const tableData = useMemo(() => partners.map(partner => {
    const currentOwnership = currentOwnershipByPartnerId[partner.id]
    const representativeAuthorities = representativeAuthoritiesForPartner(partner)
    return ({
    ...partner,
    display_name: partner.display_name || partner.ortak_adi || '',
    identity_number: partner.identity_number || partner.tckn_vkn || '',
    partner_type_label: (partner.owner_kind || partner.ortak_tipi) === 'tuzel_kisi' || partner.ortak_tipi === 'sirket' ? 'Tüzel Kişi' : 'Gerçek Kişi',
    company_name: companyNameById[partner.sirket_id] || '-',
    current_ownership: currentOwnership || null,
    current_share_ratio: currentOwnership?.current_share_ratio ?? 0,
    current_voting_ratio: currentOwnership?.current_voting_ratio ?? 0,
    current_profit_ratio: currentOwnership?.current_profit_ratio ?? 0,
    current_capital_amount: currentOwnership?.current_capital_amount ?? 0,
    representative_authorities: representativeAuthorities,
  })
  }), [companyNameById, currentOwnershipByPartnerId, partners, representativeAuthoritiesForPartner])

  const activePartners = useMemo(() => tableData.filter(partner => !isSoftDeletedRecord(partner)), [tableData])
  const widgets: WidgetDef<any>[] = useMemo(() => [
    { key: 'total', label: 'Toplam Ortak', render: () => tableData.length },
    { key: 'active', label: 'Aktif Ortak', render: () => activePartners.length },
    { key: 'real', label: 'Gerçek Kişi', render: () => activePartners.filter(partner => partner.partner_type_label === 'Gerçek Kişi').length },
    { key: 'legal', label: 'Tüzel Kişi', render: () => activePartners.filter(partner => partner.partner_type_label === 'Tüzel Kişi').length },
  ], [activePartners, tableData])

  const handleListSortChange = (sorts: SortConfig[]) => {
    const sort = sorts[0]
    setListQuery(prev => ({ ...prev, page: 1, sort: sort?.key || 'created_at', direction: sort?.direction || 'desc' }))
  }

  const configuredHeroFields = heroFields.map(field => {
    if (field.name === 'company_id') return { ...field, options: companies, defaultValue: companies.length === 1 ? companies[0].value : field.defaultValue }
    return field
  })
  const configuredTabs = [
    ...createRealPersonMasterTabs({
      visibleWhen: { field: 'partner_type', operator: 'equals', value: 'gercek_kisi' },
      includeEmergencyContact: true,
    }),
    ...createLegalEntityMasterTabs({
      visibleWhen: { field: 'partner_type', operator: 'equals', value: 'tuzel_kisi' },
      websiteField: 'web_sitesi',
    }),
    ...tabs.filter(tab => !['genel', 'iletisim'].includes(tab.id)),
  ]
  const withFieldHistory = (field: FormField) => {
    const history = selectedPartner?.field_history?.[field.name]
    return history ? { ...field, history } : field
  }

  const handleRowClick = async (row: any) => {
    const cached = readEntityDetailCache<Record<string, any>>('company-partners', row.id)
    setSelectedPartner(cached?.data || normalizePartnerForForm(row))
    setPageState('view')
    setFormError(null)
    setFieldErrors({})
    if (cached) {
      setDetailLoading(false)
      return
    }
    setDetailLoading(true)

    try {
      const [response, transactionHistory] = await Promise.all([
        companyService.partnerDetail(row.id),
        fetchApprovedOwnershipTransactionsForPartner(row),
      ])
      const result = response
      if (!result.data) throw new Error('Ortak detayı yüklenemedi')
      const normalized = normalizePartnerForForm({
        ...result.data,
        current_ownership: row.current_ownership,
        representative_authorities: row.representative_authorities,
        ownership_transaction_history: transactionHistory,
      })
      setSelectedPartner(normalized)
      writeEntityDetailCache('company-partners', row.id, normalized)
    } catch (err: any) {
      setFormError(err.message || 'Ortak detayı yüklenemedi')
      setToast(err.toast || { type: 'error', title: 'Detay Yüklenemedi', message: err.message || 'Ortak detayı yüklenemedi' })
    } finally {
      setDetailLoading(false)
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
      await loadData(true)
      if (mode === 'create') invalidateEntityDetailCache('company-partners')
      else invalidateEntityDetailCache('company-partners', selectedPartner?.id)
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
      invalidateEntityDetailCache('company-partners', selectedPartner.id)
      if (!response.ok) throw await createSaveError(response, 'Pasifleştirme başarısız')
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: 'Ortak kaydı pasife çekildi' })
      await loadData(true)
      setPageState('list')
    } catch (err: any) {
      setToast(err.toast || { type: 'error', title: 'Kayıt Başarısız', message: err.message })
      throw err
    } finally {
      setDeleting(false)
    }
  }

  const handleActivate = async () => {
    if (!selectedPartner?.id) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/sirketler/ortaklar/${selectedPartner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedPartner,
          status: 'Aktif',
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
        }),
      })
      invalidateEntityDetailCache('company-partners', selectedPartner.id)
      if (!response.ok) throw await createSaveError(response, 'Aktiflestirme basarisiz')
      const result = await response.json()
      if (result.data) setSelectedPartner(normalizePartnerForForm(result.data))
      setToast({ type: 'success', title: 'Kayit Basarili', message: 'Ortak kaydi aktive edildi' })
      await loadData(true)
      setPageState('view')
    } catch (err: any) {
      setToast(err.toast || { type: 'error', title: 'Kayit Basarisiz', message: err.message })
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
            onRefresh={() => loadData(true)}
            defaultPageSize={listQuery.pageSize}
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
            showPassiveToggle
            includePassive={includePassive}
            onIncludePassiveChange={(next) => {
              setIncludePassive(next)
              setListQuery(prev => ({ ...prev, page: 1 }))
            }}
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
            tabs={configuredTabs.map(tab => ({ ...tab, fields: tab.fields.map(withFieldHistory) }))}
            roleHeroCardTitle="Forma Özel"
            masterSummaryMode="entityIdentity"
            data={selectedPartner || undefined}
            saving={saving}
            deleting={deleting}
            error={formError}
            loadStages={formLoadStages}
            externalFieldErrors={fieldErrors}
            onSave={handleSave}
            onCancel={() => setPageState('list')}
            onDelete={handleDelete}
            onActivate={handleActivate}
            onModeChange={(mode) => setPageState(mode)}
            additionalActions={selectedPartner?.id ? (
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams({
                    mode: 'create',
                    company_id: selectedPartner.company_id || selectedPartner.sirket_id || '',
                    partner_id: selectedPartner.id,
                  })
                  window.location.href = `/app/sirket/ortaklik-islemleri?${params.toString()}`
                }}
                className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30"
              >
                Yeni Ortaklık İşlemi Oluştur
              </button>
            ) : null}
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
                { id: 'cv', title: 'CV', required: false },
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

async function fetchApprovedOwnershipTransactionsForPartner(partner: Record<string, any>): Promise<OwnershipTransactionHistoryRow[]> {
  const companyId = partner.company_id || partner.sirket_id
  const partnerId = partner.id
  if (!companyId || !partnerId) return []

  const rows = await ownershipTransactionsService.approvedForCompany(companyId)

  return rows
    .filter((transaction: OwnershipTransactionHistoryRow) =>
      transaction.from_partner_id === partnerId ||
      transaction.to_partner_id === partnerId ||
      transaction.affected_partner_id === partnerId
    )
    .sort((a: OwnershipTransactionHistoryRow, b: OwnershipTransactionHistoryRow) =>
      String(b.effective_date || b.transaction_date || b.created_at || '').localeCompare(String(a.effective_date || a.transaction_date || a.created_at || ''))
    )
}

function CurrentOwnershipPanel({ value, section }: { value?: CurrentOwnershipRow | null; section: 'capital' | 'rights' }) {
  const createOwnershipTransaction = () => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams()
    if (value?.company_id) params.set('company_id', value.company_id)
    if (value?.partner_id) params.set('partner_id', value.partner_id)
    params.set('mode', 'create')
    window.location.href = `/app/sirket/ortaklik-islemleri?${params.toString()}`
  }

  if (!value) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700">
        <p>Onaylı ortaklık işlemi kaynaklı hesaplanan değer yok.</p>
        <button type="button" onClick={createOwnershipTransaction} className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30">
          Ortaklık İşlemi Oluştur
        </button>
      </div>
    )
  }

  const items = section === 'capital'
    ? [
        ['Hisse Oranı', `%${Number(value.current_share_ratio || 0).toFixed(2)}`],
        ['Oy Hakkı', `%${Number(value.current_voting_ratio || 0).toFixed(2)}`],
        ['Kar Payı', `%${Number(value.current_profit_ratio || 0).toFixed(2)}`],
        ['Sermaye', Number(value.current_capital_amount || 0).toLocaleString('tr-TR')],
        ['Pay Adedi', Number(value.current_share_units || 0).toLocaleString('tr-TR')],
      ]
    : [
        ['Kontrol Hakkı', value.has_control_right ? 'Var' : 'Yok'],
        ['Kontrol Türü', value.control_type || '-'],
        ['Veto Hakkı', value.has_veto_right ? 'Var' : 'Yok'],
        ['YK Aday Hakkı', value.has_board_nomination_right ? 'Var' : 'Yok'],
        ['İmtiyazlı Pay', value.has_privileged_share ? 'Var' : 'Yok'],
        ['Nihai Faydalanıcı', value.is_beneficial_owner ? 'Evet' : 'Hayır'],
        ['Faydalanma Oranı', value.beneficial_ratio ? `%${Number(value.beneficial_ratio).toFixed(2)}` : '-'],
      ]

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
        Bu değerler yalnızca onaylı Ortaklık İşlemleri üzerinden hesaplanır. Pay, oy, kar payı, sermaye, imtiyaz, veto, yönetim kurulu aday gösterme veya kontrol hakkı değişikliği için yeni işlem oluşturun.
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([label, itemValue]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
            <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
            <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{itemValue}</div>
          </div>
        ))}
      </div>
      {Array.isArray(value.warnings) && value.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {value.warnings.map(warning => <div key={warning}>{warning}</div>)}
        </div>
      )}
      <button type="button" onClick={createOwnershipTransaction} className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30">
        Ortaklık İşlemi Oluştur
      </button>
    </div>
  )
}

function RepresentativeAuthoritiesPanel({ value }: { value: RepresentativeAuthorityRow[] }) {
  if (!value.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700">
        Bu ortak için Temsilciler sayfasından gelen aktif yetki kaydı bulunamadı.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
      {value.map(authority => (
        <div key={authority.id} className="border-b border-gray-100 p-3 last:border-b-0 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {authority.authority_types?.length ? (
                  <span className="flex flex-wrap gap-1.5">
                    {authority.authority_types.map(type => (
                      <span key={type} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        {toAuthorityLabel(type)}
                      </span>
                    ))}
                  </span>
                ) : (
                  toAuthorityLabel(authority.gorev) || 'Yetki Kaydı'
                )}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {authority.start_date || '-'} - {authority.end_date || 'Süresiz'} · {authority.status || 'Aktif'}
              </div>
            </div>
            <div className="text-right text-xs text-gray-600 dark:text-gray-300">
              {authority.signature_type || 'İmza tipi yok'}
              {authority.transaction_limit ? ` · ${Number(authority.transaction_limit).toLocaleString('tr-TR')} ${authority.currency || 'TRY'}` : ''}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {authority.requires_joint_signature && <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">Müşterek imza</span>}
            {authority.can_approve_alone && <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">Tek başına onay</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function PartnerHistorySections({ value }: { value?: PartnerHistorySectionsValue }) {
  const ownershipTransactions = Array.isArray(value?.ownershipTransactions) ? value.ownershipTransactions : []
  const technicalChanges = Array.isArray(value?.technicalChanges) ? value.technicalChanges : []

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Ortaklık İşlem Geçmişi</h4>
        {ownershipTransactions.length ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700">
            {ownershipTransactions.map(transaction => (
              <div key={transaction.id} className="border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 dark:border-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {transaction.transaction_no || transaction.transaction_type || 'Ortaklık işlemi'}
                  </span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-300">Onaylı</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {transaction.effective_date || transaction.transaction_date || '-'} · {transaction.transaction_type || 'İşlem'}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
                  {transaction.share_ratio != null && <span>Pay %{Number(transaction.share_ratio).toFixed(2)}</span>}
                  {transaction.voting_ratio != null && <span>Oy %{Number(transaction.voting_ratio).toFixed(2)}</span>}
                  {transaction.profit_ratio != null && <span>Kar %{Number(transaction.profit_ratio).toFixed(2)}</span>}
                  {transaction.capital_amount != null && <span>Sermaye {Number(transaction.capital_amount).toLocaleString('tr-TR')}</span>}
                  {transaction.has_control_right && <span>Kontrol hakkı</span>}
                  {transaction.has_veto_right && <span>Veto hakkı</span>}
                  {transaction.has_board_nomination_right && <span>YK aday hakkı</span>}
                  {transaction.has_privileged_share && <span>İmtiyazlı pay</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700">
            Onaylı ortaklık işlemi bulunamadı.
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Teknik Değişiklik Geçmişi</h4>
        {technicalChanges.length ? (
          <div className="space-y-2">
            {technicalChanges.map((item, index) => (
              <div key={index} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                {item.text || `${item.changed_at || item.date || ''} → ${item.field || item.action || 'Değişiklik'}: ${item.old_value ?? item.oldValue ?? '-'} → ${item.new_value ?? item.newValue ?? item.value ?? '-'}`}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700">
            Teknik değişiklik geçmişi bulunamadı.
          </div>
        )}
      </section>
    </div>
  )
}

function normalizePartnerForForm(partner: PartnerRow) {
  const profile = partner.partner_profile || {}
  const masterFields = partner as PartnerRow & {
    first_name?: string
    last_name?: string
    trade_name?: string
    legal_name?: string
    short_name?: string
    nationality?: string
    nationality_country?: string
    uyruk?: string
    national_id?: string
    tc_kimlik?: string
    passport_no?: string
    pasaport_no?: string
    telefonlar?: Array<Record<string, any>>
    epostalar?: Array<Record<string, any>>
  }
  const partnerType = normalizePartnerType(profile.partner_type || partner.owner_kind || partner.ortak_tipi)
  const identityNumber = partner.identity_number || partner.tckn_vkn || ''
  const telefonlar = Array.isArray(masterFields.telefonlar) ? masterFields.telefonlar : []
  const epostalar = Array.isArray(masterFields.epostalar) ? masterFields.epostalar : []
  const status = isSoftDeletedRecord(partner) ? 'Pasif' : partner.status || profile.status || 'Aktif'
  return {
    ...profile,
    ...partner,
    company_id: partner.sirket_id,
    partner_type: partnerType,
    first_name: masterFields.first_name || masterFields.trade_name || masterFields.legal_name || '',
    last_name: masterFields.last_name || masterFields.short_name || '',
    identity_number: identityNumber,
    uyruk: masterFields.uyruk || masterFields.nationality || masterFields.nationality_country || 'TR',
    tc_kimlik: masterFields.tc_kimlik || masterFields.national_id || (partnerType === 'gercek_kisi' && String(identityNumber).length === 11 ? identityNumber : ''),
    pasaport_no: masterFields.pasaport_no || masterFields.passport_no || (partnerType === 'gercek_kisi' && String(identityNumber).length !== 11 ? identityNumber : ''),
    telefonlar,
    epostalar,
    end_date: profile.end_date ?? partner.end_date ?? '',
    status,
    photo_logo: partner.photo_logo || [],
    partner_documents: partner.partner_documents || [],
    current_ownership: partner.current_ownership || { company_id: partner.sirket_id, partner_id: partner.id },
    representative_authorities: (partner as any).representative_authorities || [],
    history_sections: {
      ownershipTransactions: partner.ownership_transaction_history || [],
      technicalChanges: partner.history || [],
    },
    field_history: buildEntityFieldHistory(partner.history || []),
  }
}

function normalizePartnerType(value: unknown): 'gercek_kisi' | 'tuzel_kisi' {
  const text = String(value || '').toLocaleLowerCase('tr-TR')
  if (['tuzel_kisi', 'tüzel_kisi', 'sirket', 'şirket', 'organization'].includes(text)) return 'tuzel_kisi'
  return 'gercek_kisi'
}

function normalizePayload(raw: Record<string, any>, companies: Option[]) {
  const payload = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  )

  payload.company_id = payload.company_id || payload.sirket_id || companies[0]?.value
  if (payload.master_entity_kind === 'person') payload.partner_type = 'gercek_kisi'
  if (payload.master_entity_kind === 'organization') payload.partner_type = 'tuzel_kisi'
  payload.nationality_country = normalizeCountryId(payload.nationality_country || payload.country || payload.nationality || payload.uyruk || 'TR')
  payload.nationality = normalizeCountryId(payload.nationality || payload.uyruk || payload.nationality_country)
  payload.uyruk = normalizeCountryId(payload.uyruk || payload.nationality || payload.nationality_country)
  payload.country = normalizeCountryId(payload.country || payload.nationality_country || payload.nationality || 'TR')
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
  delete payload.current_ownership
  delete payload.representative_authorities
  delete payload.history_sections
  delete payload.ownership_transaction_history
  delete payload.timeline
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
