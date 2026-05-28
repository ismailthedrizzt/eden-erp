'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  Handshake,
  Link2,
  Loader2,
  MessageSquarePlus,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react'
import {
  crmInteractions,
  crmMasterData,
  crmStakeholders,
  type CRMInteractionRecord,
  type CRMRelatedRecords,
  type CRMStakeholderRecord,
  type CRMStakeholderSummary,
  type MasterEntityType,
  type MasterOrganizationRecord,
  type MasterPersonRecord,
} from '@/lib/services/crm'

type LookupSelection =
  | { type: 'person'; record: MasterPersonRecord }
  | { type: 'organization'; record: MasterOrganizationRecord }

type StakeholderFormState = {
  company_id: string
  master_entity_type: MasterEntityType
  stakeholder_type: string
  relationship_status: string
  display_name: string
  first_name: string
  last_name: string
  identity_number: string
  passport_no: string
  trade_name: string
  tax_number: string
  tax_office: string
  phone: string
  email: string
  city: string
  district: string
  address: string
  sector: string
  customer_status: string
  supplier_status: string
  lead_status: string
  lead_source: string
  next_followup_date: string
  assigned_owner_user_id: string
  tags: string
  notes: string
}

const stakeholderTypeLabels: Record<string, string> = {
  customer: 'Müşteri',
  supplier: 'Tedarikçi',
  customer_supplier: 'Müşteri + Tedarikçi',
  dealer: 'Bayi',
  distributor: 'Distribütör',
  accounting_firm: 'Muhasebeci',
  external_consultant: 'Dış danışman',
  public_institution: 'Kamu kurumu',
  logistics_partner: 'Lojistik partneri',
  service_partner: 'Servis partneri',
  investor: 'Yatırımcı',
  lead: 'Lead',
  other: 'Diğer',
}

const relationshipLabels: Record<string, string> = {
  draft: 'Taslak',
  active: 'Aktif',
  passive: 'Pasif',
  blocked: 'Blokeli',
  archived: 'Arşiv',
}

const initialForm: StakeholderFormState = {
  company_id: '',
  master_entity_type: 'organization',
  stakeholder_type: 'customer',
  relationship_status: 'draft',
  display_name: '',
  first_name: '',
  last_name: '',
  identity_number: '',
  passport_no: '',
  trade_name: '',
  tax_number: '',
  tax_office: '',
  phone: '',
  email: '',
  city: '',
  district: '',
  address: '',
  sector: '',
  customer_status: 'lead',
  supplier_status: 'candidate',
  lead_status: 'new',
  lead_source: '',
  next_followup_date: '',
  assigned_owner_user_id: '',
  tags: '',
  notes: '',
}

export function CrmStakeholdersMvpPage() {
  const [rows, setRows] = useState<CRMStakeholderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [filters, setFilters] = useState({ search: '', stakeholder_type: '', relationship_status: '', has_cari_account: '' })
  const [form, setForm] = useState<StakeholderFormState>(initialForm)
  const [lookupText, setLookupText] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupResults, setLookupResults] = useState<LookupSelection[]>([])
  const [selectedMaster, setSelectedMaster] = useState<LookupSelection | null>(null)
  const [selectedStakeholder, setSelectedStakeholder] = useState<CRMStakeholderRecord | null>(null)
  const [relatedRecords, setRelatedRecords] = useState<CRMRelatedRecords | null>(null)
  const [summary, setSummary] = useState<CRMStakeholderSummary | null>(null)
  const [interactions, setInteractions] = useState<CRMInteractionRecord[]>([])
  const [interactionSubject, setInteractionSubject] = useState('')
  const [interactionBody, setInteractionBody] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const type = new URLSearchParams(window.location.search).get('type')
    if (type) {
      setFilters(prev => ({ ...prev, stakeholder_type: type }))
      setForm(prev => ({ ...prev, stakeholder_type: type, customer_status: type === 'lead' ? 'lead' : prev.customer_status }))
    }
  }, [])

  useEffect(() => {
    loadStakeholders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.stakeholder_type, filters.relationship_status, filters.has_cari_account])

  useEffect(() => {
    if (!selectedStakeholder?.id) return
    loadStakeholderContext(selectedStakeholder.id)
  }, [selectedStakeholder?.id])

  const stats = useMemo(() => {
    const last30Cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    return {
      total: rows.length,
      activeCustomers: rows.filter(row => ['customer', 'customer_supplier'].includes(row.stakeholder_type) && row.relationship_status === 'active').length,
      activeSuppliers: rows.filter(row => ['supplier', 'customer_supplier'].includes(row.stakeholder_type) && row.relationship_status === 'active').length,
      leads: rows.filter(row => row.stakeholder_type === 'lead' || ['lead', 'prospect'].includes(row.customer_status || '')).length,
      unlinkedCari: rows.filter(row => !row.related_cari_account_id).length,
      addedLast30: rows.filter(row => row.created_at && new Date(row.created_at).getTime() >= last30Cutoff).length,
      blocked: rows.filter(row => row.relationship_status === 'blocked').length,
    }
  }, [rows])

  async function loadStakeholders() {
    setLoading(true)
    setError(null)
    try {
      const result = await crmStakeholders.list({
        pageSize: 100,
        search: filters.search,
        stakeholder_type: filters.stakeholder_type,
        relationship_status: filters.relationship_status,
        has_cari_account: filters.has_cari_account === '' ? undefined : filters.has_cari_account === 'true',
      })
      setRows(result.data)
      if (!selectedStakeholder && result.data.length) setSelectedStakeholder(result.data[0])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Paydaşlar yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  async function searchMasterRecords() {
    setLookupLoading(true)
    setError(null)
    setNotice(null)
    try {
      if (form.master_entity_type === 'person') {
        const result = await crmMasterData.searchPersons({
          search: lookupText,
          identity_number: form.identity_number,
          passport_no: form.passport_no,
          full_name: lookupText,
        })
        setLookupResults(result.data.map(record => ({ type: 'person', record })))
      } else {
        const result = await crmMasterData.searchOrganizations({
          search: lookupText,
          tax_number: form.tax_number,
          trade_name: lookupText,
          city: form.city,
        })
        setLookupResults(result.data.map(record => ({ type: 'organization', record })))
      }
      setNotice('Bu kişi/kurum sistemde zaten varsa yeni kayıt açmak yerine mevcut kayıtla ilişki oluşturulur.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Master kayıt araması tamamlanamadı.')
    } finally {
      setLookupLoading(false)
    }
  }

  async function createStakeholder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const payload = buildCreatePayload()
      const created = await crmStakeholders.create(payload)
      setSelectedStakeholder(created)
      setSelectedMaster(null)
      setLookupResults([])
      setForm(prev => ({ ...initialForm, company_id: prev.company_id, stakeholder_type: prev.stakeholder_type }))
      setNotice('Paydaş kaydı oluşturuldu. Cari kart veya takip görevi gerekiyorsa ilgili aksiyonları kullanabilirsiniz.')
      await loadStakeholders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Paydaş kaydı oluşturulamadı.')
    } finally {
      setSaving(false)
    }
  }

  function buildCreatePayload() {
    const tags = form.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    const base = {
      company_id: form.company_id,
      master_entity_type: form.master_entity_type,
      master_entity_id: selectedMaster?.record.id,
      display_name: form.display_name || selectedMasterLabel(selectedMaster) || form.trade_name || `${form.first_name} ${form.last_name}`.trim(),
      stakeholder_type: form.stakeholder_type,
      relationship_status: form.relationship_status,
      customer_status: form.stakeholder_type === 'supplier' ? null : form.customer_status || null,
      supplier_status: ['supplier', 'customer_supplier'].includes(form.stakeholder_type) ? form.supplier_status || null : null,
      assigned_owner_user_id: form.assigned_owner_user_id || null,
      source: 'manual',
      sector: form.sector || null,
      tags,
      lead_status: form.stakeholder_type === 'lead' ? form.lead_status || 'new' : null,
      lead_source: form.stakeholder_type === 'lead' ? form.lead_source || null : null,
      next_followup_date: form.next_followup_date || null,
      notes: form.notes || null,
    }
    if (selectedMaster) return base
    if (form.master_entity_type === 'person') {
      return {
        ...base,
        master_person: {
          nationality: 'TR',
          identity_number: form.identity_number || null,
          passport_no: form.passport_no || null,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone || null,
          email: form.email || null,
          city: form.city || null,
          district: form.district || null,
          address: form.address || null,
          country: 'TR',
        },
      }
    }
    return {
      ...base,
      master_organization: {
        country: 'TR',
        tax_number: form.tax_number || null,
        trade_name: form.trade_name,
        tax_office: form.tax_office || null,
        phone: form.phone || null,
        email: form.email || null,
        city: form.city || null,
        district: form.district || null,
        address: form.address || null,
      },
    }
  }

  async function loadStakeholderContext(stakeholderId: string) {
    setRelatedRecords(null)
    setSummary(null)
    setInteractions([])
    try {
      const [related, currentSummary, currentInteractions] = await Promise.all([
        crmStakeholders.relatedRecords(stakeholderId),
        crmStakeholders.summary(stakeholderId),
        crmInteractions.list(stakeholderId),
      ])
      setRelatedRecords(related)
      setSummary(currentSummary)
      setInteractions(currentInteractions)
    } catch {
      // Detail context is supportive; list usability should survive integration gaps.
    }
  }

  async function createCariAccount(row: CRMStakeholderRecord) {
    setActionLoadingId(row.id)
    setError(null)
    try {
      const result = await crmStakeholders.createCariAccount(row.id, { currency: 'TRY' })
      setSelectedStakeholder(result.stakeholder)
      setNotice('Cari kart oluşturuldu ve paydaş kaydına bağlandı.')
      await loadStakeholders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cari kart oluşturulamadı.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function createFollowupTask(row: CRMStakeholderRecord) {
    setActionLoadingId(row.id)
    setError(null)
    try {
      await crmStakeholders.createFollowupTask(row.id, {
        title: `${row.display_name} takip görevi`,
        priority: row.stakeholder_type === 'lead' ? 'high' : 'medium',
        due_date: row.next_followup_date || undefined,
      })
      setNotice('Takip görevi oluşturuldu. Görev Project/Task domaininde, paydaş ilişkisi CRM domaininde tutulur.')
      await loadStakeholderContext(row.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Takip görevi oluşturulamadı.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function addInteraction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedStakeholder) return
    setActionLoadingId(selectedStakeholder.id)
    setError(null)
    try {
      await crmInteractions.create(selectedStakeholder.id, {
        interaction_type: 'note',
        subject: interactionSubject,
        body: interactionBody || null,
      })
      setInteractionSubject('')
      setInteractionBody('')
      setNotice('Etkileşim kaydı eklendi.')
      await loadStakeholderContext(selectedStakeholder.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etkileşim eklenemedi.')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200">
              <ShieldCheck size={14} />
              Master data tekilleştirme
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">CRM / Paydaşlar</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Master kayıt kimliği, paydaş rolü ilişkiyi, cari kart ise finansal bağı temsil eder. Aynı kişi veya kurum yeniden üretilmeden doğru role bağlanır.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[560px]">
            <SummaryTile label="Toplam" value={stats.total} />
            <SummaryTile label="Aktif müşteri" value={stats.activeCustomers} tone="emerald" />
            <SummaryTile label="Aktif tedarikçi" value={stats.activeSuppliers} tone="sky" />
            <SummaryTile label="Lead / prospect" value={stats.leads} tone="amber" />
          </div>
        </header>

        {(error || notice) && (
          <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-300/20 dark:bg-red-500/10 dark:text-red-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-500/10 dark:text-emerald-200'}`}>
            {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{error || notice}</span>
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-[minmax(360px,0.72fr)_minmax(520px,1fr)]">
          <form onSubmit={createStakeholder} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Yeni paydaş</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Önce master kişi/kurum bulunur, sonra müşteri/tedarikçi/lead rolü açılır.</p>
              </div>
              <Plus size={18} className="text-slate-400" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Şirket ID">
                <input value={form.company_id} onChange={event => setFormValue('company_id', event.target.value)} required className={inputClass} placeholder="company uuid" />
              </Field>
              <Field label="Master tipi">
                <select value={form.master_entity_type} onChange={event => { setFormValue('master_entity_type', event.target.value as MasterEntityType); setSelectedMaster(null); setLookupResults([]) }} className={inputClass}>
                  <option value="organization">Tüzel kişi / kurum</option>
                  <option value="person">Gerçek kişi</option>
                </select>
              </Field>
              <Field label="Paydaş türü">
                <select value={form.stakeholder_type} onChange={event => setFormValue('stakeholder_type', event.target.value)} className={inputClass}>
                  {Object.entries(stakeholderTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="İlişki durumu">
                <select value={form.relationship_status} onChange={event => setFormValue('relationship_status', event.target.value)} className={inputClass}>
                  {Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Master lookup</label>
              <div className="mt-2 flex gap-2">
                <input value={lookupText} onChange={event => setLookupText(event.target.value)} className={inputClass} placeholder={form.master_entity_type === 'person' ? 'Ad soyad, TCKN veya telefon' : 'Unvan, VKN veya şehir'} />
                <button type="button" onClick={searchMasterRecords} disabled={lookupLoading} className={buttonClass}>
                  {lookupLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  Ara
                </button>
              </div>
              {lookupResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {lookupResults.slice(0, 4).map(item => (
                    <button
                      type="button"
                      key={`${item.type}-${item.record.id}`}
                      onClick={() => {
                        setSelectedMaster(item)
                        setFormValue('display_name', selectedMasterLabel(item))
                      }}
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs ${selectedMaster?.record.id === item.record.id ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-300/30 dark:bg-emerald-400/10 dark:text-emerald-100' : 'border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200'}`}
                    >
                      <span>
                        <strong>{selectedMasterLabel(item)}</strong>
                        <span className="ml-2 text-slate-400">{item.type === 'person' ? (item.record.masked_identity_number || item.record.passport_no || item.record.phone) : (item.record.tax_number || item.record.city)}</span>
                      </span>
                      <Link2 size={14} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {form.master_entity_type === 'person' ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Ad"><input value={form.first_name} onChange={event => setFormValue('first_name', event.target.value)} className={inputClass} required={!selectedMaster} /></Field>
                <Field label="Soyad"><input value={form.last_name} onChange={event => setFormValue('last_name', event.target.value)} className={inputClass} required={!selectedMaster} /></Field>
                <Field label="TCKN"><input value={form.identity_number} onChange={event => setFormValue('identity_number', event.target.value)} className={inputClass} /></Field>
                <Field label="Pasaport"><input value={form.passport_no} onChange={event => setFormValue('passport_no', event.target.value)} className={inputClass} /></Field>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Ticari unvan"><input value={form.trade_name} onChange={event => setFormValue('trade_name', event.target.value)} className={inputClass} required={!selectedMaster} /></Field>
                <Field label="VKN"><input value={form.tax_number} onChange={event => setFormValue('tax_number', event.target.value)} className={inputClass} /></Field>
                <Field label="Vergi dairesi"><input value={form.tax_office} onChange={event => setFormValue('tax_office', event.target.value)} className={inputClass} /></Field>
                <Field label="Sektör"><input value={form.sector} onChange={event => setFormValue('sector', event.target.value)} className={inputClass} /></Field>
              </div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Telefon"><input value={form.phone} onChange={event => setFormValue('phone', event.target.value)} className={inputClass} /></Field>
              <Field label="E-posta"><input value={form.email} onChange={event => setFormValue('email', event.target.value)} className={inputClass} /></Field>
              <Field label="Şehir"><input value={form.city} onChange={event => setFormValue('city', event.target.value)} className={inputClass} /></Field>
              <Field label="Etiketler"><input value={form.tags} onChange={event => setFormValue('tags', event.target.value)} className={inputClass} placeholder="bayi, servis" /></Field>
              {form.stakeholder_type === 'lead' && (
                <>
                  <Field label="Lead durumu"><select value={form.lead_status} onChange={event => setFormValue('lead_status', event.target.value)} className={inputClass}><option value="new">Yeni</option><option value="contacted">İletişildi</option><option value="qualified">Nitelikli</option><option value="proposal">Teklif</option><option value="won">Kazanıldı</option><option value="lost">Kaybedildi</option></select></Field>
                  <Field label="Sonraki takip"><input type="date" value={form.next_followup_date} onChange={event => setFormValue('next_followup_date', event.target.value)} className={inputClass} /></Field>
                </>
              )}
            </div>

            <Field label="Notlar" className="mt-3">
              <textarea value={form.notes} onChange={event => setFormValue('notes', event.target.value)} className={`${inputClass} min-h-20`} />
            </Field>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Cari kart finansal ilişki içindir; paydaş kaydı finansal olmayan ilişkiyi de temsil eder.</p>
              <button type="submit" disabled={saving} className={primaryButtonClass}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Handshake size={16} />}
                Paydaş oluştur
              </button>
            </div>
          </form>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold">Paydaş listesi</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Müşteri, tedarikçi, lead ve dış ilişkili kurumlar tek master kayıt üstünden izlenir.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                <input value={filters.search} onChange={event => setFilters(prev => ({ ...prev, search: event.target.value }))} onKeyDown={event => event.key === 'Enter' && loadStakeholders()} className={inputClass} placeholder="Ara" />
                <select value={filters.stakeholder_type} onChange={event => setFilters(prev => ({ ...prev, stakeholder_type: event.target.value }))} className={inputClass}>
                  <option value="">Tüm türler</option>
                  {Object.entries(stakeholderTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select value={filters.relationship_status} onChange={event => setFilters(prev => ({ ...prev, relationship_status: event.target.value }))} className={inputClass}>
                  <option value="">Tüm durumlar</option>
                  {Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button type="button" onClick={loadStakeholders} className={buttonClass}><Search size={16} /> Filtrele</button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 p-4 text-xs dark:border-white/10">
              <SmallMetric label="Cari bağlı değil" value={stats.unlinkedCari} />
              <SmallMetric label="Son 30 gün" value={stats.addedLast30} />
              <SmallMetric label="Blokeli" value={stats.blocked} />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">Ad / Unvan</th>
                    <th className="px-4 py-3">Tür</th>
                    <th className="px-4 py-3">VKN/TCKN</th>
                    <th className="px-4 py-3">İletişim</th>
                    <th className="px-4 py-3">Cari</th>
                    <th className="px-4 py-3">Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500"><Loader2 size={18} className="mx-auto mb-2 animate-spin" />Paydaşlar yükleniyor</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Henüz paydaş kaydı yok. Master lookup ile ilk müşteri, tedarikçi veya lead kaydını oluşturun.</td></tr>
                  ) : rows.map(row => (
                    <tr key={row.id} className={`border-t border-slate-100 align-top hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.03] ${selectedStakeholder?.id === row.id ? 'bg-emerald-50/70 dark:bg-emerald-400/10' : ''}`}>
                      <td className="px-4 py-3"><Badge tone={statusTone(row.relationship_status)}>{relationshipLabels[row.relationship_status] || row.relationship_status}</Badge></td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => setSelectedStakeholder(row)} className="font-semibold text-slate-950 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-200">{row.display_name}</button>
                        <div className="mt-1 text-xs text-slate-500">{row.master_entity_type === 'person' ? 'Gerçek kişi' : 'Tüzel kişi'} · {row.master_city || 'Şehir yok'}</div>
                        {!!row.tags?.length && <div className="mt-1 flex flex-wrap gap-1">{row.tags.slice(0, 3).map(tag => <Badge key={tag} tone="slate">{tag}</Badge>)}</div>}
                      </td>
                      <td className="px-4 py-3"><Badge tone="blue">{stakeholderTypeLabels[row.stakeholder_type] || row.stakeholder_type}</Badge></td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{row.tax_number || row.masked_identity_number || row.passport_no || 'Yok'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{row.phone || 'Telefon yok'}<br />{row.email || 'E-posta yok'}</td>
                      <td className="px-4 py-3">{row.related_cari_account_id ? <Badge tone="emerald">Bağlı</Badge> : <Badge tone="amber">Bağlı değil</Badge>}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {!row.related_cari_account_id && <button type="button" onClick={() => createCariAccount(row)} disabled={actionLoadingId === row.id} className={miniButtonClass}><CircleDollarSign size={14} /> Cari</button>}
                          <button type="button" onClick={() => createFollowupTask(row)} disabled={actionLoadingId === row.id} className={miniButtonClass}><BriefcaseBusiness size={14} /> Görev</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(420px,0.8fr)_minmax(420px,1fr)]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <h2 className="flex items-center gap-2 text-base font-semibold"><Link2 size={18} /> İlişkili kayıtlar</h2>
            {selectedStakeholder ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold">{selectedStakeholder.display_name}</p>
                  <p className="text-xs text-slate-500">Bu panel aynı master kaydın ortak, temsilci, çalışan, cari ve servis bağlantılarını görünür kılar.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <SmallMetric label="Cari kart" value={summary?.cari_account_linked ? 'Var' : 'Yok'} />
                  <SmallMetric label="Ortak rolü" value={Number(summary?.related_partner_count ?? relatedRecords?.roles.partner_count ?? 0)} />
                  <SmallMetric label="Temsilci rolü" value={Number(summary?.related_representative_count ?? relatedRecords?.roles.representative_count ?? 0)} />
                  <SmallMetric label="Çalışan rolü" value={Number(summary?.related_employee_count ?? relatedRecords?.roles.employee_count ?? 0)} />
                  <SmallMetric label="Kurulu ürün" value={summary?.installed_asset_count ?? relatedRecords?.counts.installed_assets ?? 0} />
                  <SmallMetric label="Açık servis" value={summary?.open_service_request_count ?? relatedRecords?.counts.open_service_requests ?? 0} />
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">
                  Çalışan olmak, temsilci olmak veya ortak olmak aynı şey değildir. Aynı kişi bu rollerin birkaçına sahip olabilir; her rol ayrı domain ilişkisiyle yönetilir.
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">İlişkili rolleri görmek için listeden bir paydaş seçin.</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <h2 className="flex items-center gap-2 text-base font-semibold"><MessageSquarePlus size={18} /> Notlar / etkileşimler</h2>
            {selectedStakeholder ? (
              <>
                <form onSubmit={addInteraction} className="mt-4 grid gap-2">
                  <input value={interactionSubject} onChange={event => setInteractionSubject(event.target.value)} required className={inputClass} placeholder="Konu" />
                  <textarea value={interactionBody} onChange={event => setInteractionBody(event.target.value)} className={`${inputClass} min-h-20`} placeholder="Görüşme notu, şikayet, teklif veya takip detayı" />
                  <button type="submit" disabled={actionLoadingId === selectedStakeholder.id} className={primaryButtonClass}>
                    {actionLoadingId === selectedStakeholder.id ? <Loader2 size={16} className="animate-spin" /> : <MessageSquarePlus size={16} />}
                    Etkileşim ekle
                  </button>
                </form>
                <div className="mt-4 space-y-3">
                  {interactions.length === 0 ? (
                    <p className="text-sm text-slate-500">Henüz etkileşim yok.</p>
                  ) : interactions.map(item => (
                    <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-white/10">
                      <div className="flex items-center justify-between gap-3">
                        <strong>{item.subject}</strong>
                        <span className="text-xs text-slate-500">{formatDate(item.interaction_date)}</span>
                      </div>
                      {item.body && <p className="mt-2 text-slate-600 dark:text-slate-300">{item.body}</p>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Not eklemek için listeden bir paydaş seçin.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  )

  function setFormValue<K extends keyof StakeholderFormState>(key: K, value: StakeholderFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }
}

function SummaryTile({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'emerald' | 'sky' | 'amber' }) {
  const toneClasses = {
    slate: 'border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100',
    sky: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-300/20 dark:bg-sky-400/10 dark:text-sky-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100',
  }
  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClasses[tone]}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  )
}

function SmallMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  )
}

function Field({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    slate: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-200',
    blue: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-300/20 dark:bg-sky-400/10 dark:text-sky-100',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100',
    red: 'border-red-200 bg-red-50 text-red-700 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-100',
  }
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tones[tone] || tones.slate}`}>{children}</span>
}

function selectedMasterLabel(selection: LookupSelection | null) {
  if (!selection) return ''
  return selection.type === 'person' ? selection.record.full_name : selection.record.trade_name
}

function statusTone(status?: string) {
  if (status === 'active') return 'emerald'
  if (status === 'blocked') return 'red'
  if (status === 'draft') return 'amber'
  return 'slate'
}

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
}

const inputClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-300/20'
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]'
const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50'
const miniButtonClass = 'inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100'
