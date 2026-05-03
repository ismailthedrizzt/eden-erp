'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  Archive,
  Clock,
  FileClock,
  History,
  Landmark,
  Pencil,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type PublicSection =
  | 'public_tax'
  | 'public_sgk'
  | 'public_incentives'
  | 'public_registry'
  | 'public_channels'

export interface CompanyPublicLicense {
  id?: string
  license_type?: string
  document_no?: string
  issuing_authority?: string
  start_date?: string
  end_date?: string
  status?: string
  document_file?: string
  reminder_days?: number | string
  history?: PublicHistoryItem[]
  is_deleted?: boolean
  deleted_at?: string
  deleted_by?: string
}

export interface PublicHistoryItem {
  field?: string
  old_value?: unknown
  new_value?: unknown
  changed_at?: string
  changed_by?: string
  value?: unknown
  date?: string
  user?: string
}

interface CompanyPublicTabProps {
  data: Record<string, any>
  onChange: (name: string, value: any) => void
  readOnly?: boolean
}

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-900'

const subTabs = [
  { id: 'vergi', label: 'Vergi', icon: Landmark },
  { id: 'sgk', label: 'SGK', icon: ShieldCheck },
  { id: 'tesvikler', label: 'Teşvikler', icon: FileClock },
  { id: 'sicil', label: 'Sicil', icon: Archive },
  { id: 'ruhsatlar', label: 'Ruhsatlar', icon: AlertTriangle },
  { id: 'dijital', label: 'Dijital Kanallar', icon: Clock },
  { id: 'gecmis', label: 'Geçmiş', icon: History },
] as const

const taxTypes = ['Kurumlar Vergisi', 'Gelir Vergisi', 'Şahıs', 'Muaf', 'Diğer']
const riskClasses = ['Az Tehlikeli', 'Tehlikeli', 'Çok Tehlikeli']
const incentiveResults = ['Beklemede', 'Onaylandı', 'Reddedildi', 'Tamamlandı', 'İptal']
const licenseTypes = ['İşyeri Açma Ruhsatı', 'Faaliyet Belgesi', 'Sanayi Sicil Belgesi', 'ISO Belgesi', 'Çevre İzni', 'Yangın Raporu', 'Hijyen Belgesi', 'Diğer']
const licenseStatuses = ['Aktif', 'Süresi Yaklaşıyor', 'Süresi Doldu', 'Pasif', 'İptal']

export function CompanyPublicTab({ data, onChange, readOnly = false }: CompanyPublicTabProps) {
  const [activeTab, setActiveTab] = useState<(typeof subTabs)[number]['id']>('vergi')
  const publicTax = normalizeObject(data.public_tax)
  const publicSgk = normalizeObject(data.public_sgk)
  const publicIncentives = normalizeObject(data.public_incentives)
  const publicRegistry = normalizeObject(data.public_registry)
  const publicChannels = normalizeObject(data.public_channels)
  const licenses = normalizeArray<CompanyPublicLicense>(data.public_licenses)
  const isForeignCompany = data.ulke && data.ulke !== 'Türkiye'

  const mergedHistory = useMemo(
    () => buildTimeline(data.field_history, publicTax, publicSgk, publicIncentives, publicRegistry, publicChannels, licenses),
    [data.field_history, publicTax, publicSgk, publicIncentives, publicRegistry, publicChannels, licenses]
  )

  const updateSection = (section: PublicSection, field: string, value: any) => {
    onChange(section, { ...normalizeObject(data[section]), [field]: value })
  }

  const updateLicense = (index: number, patch: Partial<CompanyPublicLicense>) => {
    const next = [...licenses]
    next[index] = { ...next[index], ...patch }
    onChange('public_licenses', next)
  }

  const addLicense = () => {
    onChange('public_licenses', [
      ...licenses,
      { license_type: 'İşyeri Açma Ruhsatı', status: 'Aktif', reminder_days: 30, history: [] },
    ])
  }

  const deactivateLicense = (index: number) => {
    const now = new Date().toISOString()
    updateLicense(index, {
      status: 'Pasif',
      is_deleted: true,
      deleted_at: now,
      deleted_by: 'Sistem Kullanıcısı',
      history: [
        ...(licenses[index]?.history || []),
        {
          field: 'status',
          old_value: licenses[index]?.status || '',
          new_value: 'Pasif',
          changed_at: now,
          changed_by: 'Sistem Kullanıcısı',
        },
      ],
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {subTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-blue-900/30'
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'vergi' && (
        <PublicCard title="Vergi" description="Gelir İdaresi ve mükellefiyet bilgileri">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Vergi Numarası *">
              <input className={inputClass} value={publicTax.tax_number ?? data.vkn_tckn ?? ''} onChange={(e) => updateSection('public_tax', 'tax_number', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Vergi Dairesi *" history={historyText(data.field_history?.vergi_dairesi)}>
              <input className={inputClass} value={publicTax.tax_office ?? data.vergi_dairesi ?? ''} onChange={(e) => updateSection('public_tax', 'tax_office', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Vergi Türü">
              <Select value={publicTax.tax_type || ''} onChange={(value) => updateSection('public_tax', 'tax_type', value)} options={taxTypes} disabled={readOnly} />
            </Field>
            <Field label="Mükellefiyet Başlangıç Tarihi">
              <input type="date" className={inputClass} value={publicTax.liability_start_date || ''} onChange={(e) => updateSection('public_tax', 'liability_start_date', e.target.value)} disabled={readOnly} />
            </Field>
            <ToggleField label="E-Fatura Mükellefi mi" checked={!!publicTax.e_invoice_taxpayer || !!data.e_fatura_mukellefi} onChange={(value) => updateSection('public_tax', 'e_invoice_taxpayer', value)} disabled={readOnly} />
            <ToggleField label="E-Arşiv Mükellefi mi" checked={!!publicTax.e_archive_taxpayer || !!data.e_arsiv_mukellefi} onChange={(value) => updateSection('public_tax', 'e_archive_taxpayer', value)} disabled={readOnly} />
            <ToggleField label="E-İrsaliye Kullanıyor mu" checked={!!publicTax.e_waybill_enabled || !!data.e_irsaliye_mukellefi} onChange={(value) => updateSection('public_tax', 'e_waybill_enabled', value)} disabled={readOnly} />
            {(publicTax.e_invoice_taxpayer || data.e_fatura_mukellefi) && (
              <>
                <Field label="GİB Kullanıcı Kodu">
                  <input className={inputClass} value={publicTax.gib_user_code || ''} onChange={(e) => updateSection('public_tax', 'gib_user_code', e.target.value)} disabled={readOnly} />
                </Field>
                <ToggleField label="Mali Mühür Var mı" checked={!!publicTax.has_financial_seal} onChange={(value) => updateSection('public_tax', 'has_financial_seal', value)} disabled={readOnly} />
                <Field label="Mali Mühür Bitiş Tarihi">
                  <input type="date" className={inputClass} value={publicTax.financial_seal_expiry_date || ''} onChange={(e) => updateSection('public_tax', 'financial_seal_expiry_date', e.target.value)} disabled={readOnly} />
                </Field>
              </>
            )}
            <ToggleField label="Vergi Borcu Takibi Aktif mi" checked={!!publicTax.tax_debt_tracking_active} onChange={(value) => updateSection('public_tax', 'tax_debt_tracking_active', value)} disabled={readOnly} />
            <Field label="Son Kontrol Tarihi">
              <input type="date" className={inputClass} value={publicTax.last_check_date || ''} onChange={(e) => updateSection('public_tax', 'last_check_date', e.target.value)} disabled={readOnly} />
            </Field>
          </div>
        </PublicCard>
      )}

      {activeTab === 'sgk' && (
        <PublicCard title="SGK" description="İşyeri sicil, risk sınıfı, teşvik ve borç takip alanları">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="SGK İşyeri Sicil No">
              <input className={inputClass} value={publicSgk.workplace_registry_no ?? data.sgk_is_yeri_sicil_no ?? ''} onChange={(e) => updateSection('public_sgk', 'workplace_registry_no', e.target.value)} disabled={readOnly} />
            </Field>
            {!isForeignCompany && (
              <>
                <Field label="SGK İl">
                  <input className={inputClass} value={publicSgk.province ?? data.sgk_il ?? ''} onChange={(e) => updateSection('public_sgk', 'province', e.target.value)} disabled={readOnly} />
                </Field>
                <Field label="SGK Şube">
                  <input className={inputClass} value={publicSgk.branch ?? data.sgk_sube ?? ''} onChange={(e) => updateSection('public_sgk', 'branch', e.target.value)} disabled={readOnly} />
                </Field>
              </>
            )}
            <Field label="İşyeri Tescil Tarihi">
              <input type="date" className={inputClass} value={publicSgk.registration_date || ''} onChange={(e) => updateSection('public_sgk', 'registration_date', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="NACE Kodu" history={historyText(data.field_history?.nace_kodlari)}>
              <input className={inputClass} value={publicSgk.nace_code ?? (data.nace_kodlari || []).join(', ')} onChange={(e) => updateSection('public_sgk', 'nace_code', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Tehlike Sınıfı" history={historyText(data.field_history?.tehlike_sinifi)}>
              <Select value={publicSgk.risk_class || ''} onChange={(value) => updateSection('public_sgk', 'risk_class', value)} options={riskClasses} disabled={readOnly} />
            </Field>
            <ToggleField label="Teşvik Kullanıyor mu" checked={!!publicSgk.uses_incentive} onChange={(value) => updateSection('public_sgk', 'uses_incentive', value)} disabled={readOnly} />
            {publicSgk.uses_incentive && (
              <>
                <Field label="Aktif Teşvik Türü">
                  <input className={inputClass} value={publicSgk.active_incentive_type || ''} onChange={(e) => updateSection('public_sgk', 'active_incentive_type', e.target.value)} disabled={readOnly} />
                </Field>
                <Field label="Teşvik Bitiş Tarihi">
                  <input type="date" className={inputClass} value={publicSgk.incentive_end_date || ''} onChange={(e) => updateSection('public_sgk', 'incentive_end_date', e.target.value)} disabled={readOnly} />
                </Field>
              </>
            )}
            <Field label="Çalışan Sayısı (manuel/otomatik)">
              <input type="number" min={0} className={inputClass} value={publicSgk.employee_count || ''} onChange={(e) => updateSection('public_sgk', 'employee_count', e.target.value)} disabled={readOnly} />
            </Field>
            <ToggleField label="Borç Takibi Aktif mi" checked={!!publicSgk.debt_tracking_active} onChange={(value) => updateSection('public_sgk', 'debt_tracking_active', value)} disabled={readOnly} />
            <Field label="Son Kontrol Tarihi">
              <input type="date" className={inputClass} value={publicSgk.last_check_date || ''} onChange={(e) => updateSection('public_sgk', 'last_check_date', e.target.value)} disabled={readOnly} />
            </Field>
          </div>
        </PublicCard>
      )}

      {activeTab === 'tesvikler' && (
        <PublicCard title="Teşvikler" description="KOSGEB ve kamu destek programı takip alanları">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ToggleField label="KOSGEB Kaydı Var mı" checked={!!publicIncentives.has_kosgeb_registration} onChange={(value) => updateSection('public_incentives', 'has_kosgeb_registration', value)} disabled={readOnly} />
            <Field label="KOSGEB No">
              <input className={inputClass} value={publicIncentives.kosgeb_no || ''} onChange={(e) => updateSection('public_incentives', 'kosgeb_no', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Aktif Destek Programı">
              <input className={inputClass} value={publicIncentives.active_support_program || ''} onChange={(e) => updateSection('public_incentives', 'active_support_program', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Başvuru Tarihi">
              <input type="date" className={inputClass} value={publicIncentives.application_date || ''} onChange={(e) => updateSection('public_incentives', 'application_date', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Sonuç Durumu">
              <Select value={publicIncentives.result_status || ''} onChange={(value) => updateSection('public_incentives', 'result_status', value)} options={incentiveResults} disabled={readOnly} />
            </Field>
            <Field label="Teşvik Türü">
              <input className={inputClass} value={publicIncentives.incentive_type || ''} onChange={(e) => updateSection('public_incentives', 'incentive_type', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Teşvik Bitiş Tarihi">
              <input type="date" className={inputClass} value={publicIncentives.incentive_end_date || ''} onChange={(e) => updateSection('public_incentives', 'incentive_end_date', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Takip Eden Sorumlu">
              <input className={inputClass} value={publicIncentives.responsible_person || ''} onChange={(e) => updateSection('public_incentives', 'responsible_person', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Notlar" wide>
              <textarea rows={3} className={inputClass} value={publicIncentives.notes || ''} onChange={(e) => updateSection('public_incentives', 'notes', e.target.value)} disabled={readOnly} />
            </Field>
          </div>
        </PublicCard>
      )}

      {activeTab === 'sicil' && (
        <PublicCard title="Sicil" description="MERSİS, ticaret sicil ve oda kayıtları">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="MERSİS No" history={historyText(data.field_history?.mersis_no)}>
              <input className={inputClass} value={publicRegistry.mersis_no ?? data.mersis_no ?? ''} onChange={(e) => updateSection('public_registry', 'mersis_no', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Ticaret Sicil No">
              <input className={inputClass} value={publicRegistry.trade_registry_no ?? data.ticaret_sicil_no ?? ''} onChange={(e) => updateSection('public_registry', 'trade_registry_no', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Tescil Müdürlüğü">
              <input className={inputClass} value={publicRegistry.registry_office || ''} onChange={(e) => updateSection('public_registry', 'registry_office', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Oda Sicil No">
              <input className={inputClass} value={publicRegistry.chamber_registry_no || ''} onChange={(e) => updateSection('public_registry', 'chamber_registry_no', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Bağlı Oda">
              <input className={inputClass} value={publicRegistry.chamber_name || ''} onChange={(e) => updateSection('public_registry', 'chamber_name', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Kuruluş Tescil Tarihi">
              <input type="date" className={inputClass} value={publicRegistry.establishment_registration_date || ''} onChange={(e) => updateSection('public_registry', 'establishment_registration_date', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Son Değişiklik Tarihi">
              <input type="date" className={inputClass} value={publicRegistry.last_change_date || ''} onChange={(e) => updateSection('public_registry', 'last_change_date', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Tasfiye Durumu">
              <input className={inputClass} value={publicRegistry.liquidation_status || ''} onChange={(e) => updateSection('public_registry', 'liquidation_status', e.target.value)} disabled={readOnly} />
            </Field>
          </div>
        </PublicCard>
      )}

      {activeTab === 'ruhsatlar' && (
        <PublicCard
          title="Ruhsatlar"
          description="Çoklu belge, durum ve hatırlatma takibi"
          action={!readOnly && (
            <button type="button" onClick={addLicense} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Plus size={16} />
              Ruhsat Ekle
            </button>
          )}
        >
          <div className="space-y-3">
            {licenses.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">Ruhsat kaydı bulunmuyor.</div>
            )}
            {licenses.map((license, index) => {
              const warning = isExpiringSoon(license.end_date)
              return (
                <div key={license.id || index} className={cn('rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50', license.is_deleted && 'opacity-70')}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Ruhsat #{index + 1}</span>
                      {warning && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Yakında Süresi Doluyor</span>}
                      {license.is_deleted && <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">Pasifleştirildi</span>}
                      <HistoryButton text={historyText(license.history)} />
                    </div>
                    {!readOnly && !license.is_deleted && (
                      <button type="button" onClick={() => deactivateLicense(index)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Pencil size={14} />
                        Pasifleştir
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Ruhsat Türü">
                      <Select value={license.license_type || ''} onChange={(value) => updateLicense(index, { license_type: value })} options={licenseTypes} disabled={readOnly || license.is_deleted} />
                    </Field>
                    <Field label="Belge No">
                      <input className={inputClass} value={license.document_no || ''} onChange={(e) => updateLicense(index, { document_no: e.target.value })} disabled={readOnly || license.is_deleted} />
                    </Field>
                    <Field label="Veren Kurum">
                      <input className={inputClass} value={license.issuing_authority || ''} onChange={(e) => updateLicense(index, { issuing_authority: e.target.value })} disabled={readOnly || license.is_deleted} />
                    </Field>
                    <Field label="Durum" history={historyText(license.history)}>
                      <Select value={license.status || 'Aktif'} onChange={(value) => updateLicense(index, { status: value })} options={licenseStatuses} disabled={readOnly || license.is_deleted} />
                    </Field>
                    <Field label="Başlangıç Tarihi">
                      <input type="date" className={inputClass} value={license.start_date || ''} onChange={(e) => updateLicense(index, { start_date: e.target.value })} disabled={readOnly || license.is_deleted} />
                    </Field>
                    <Field label="Bitiş Tarihi">
                      <input type="date" className={inputClass} value={license.end_date || ''} onChange={(e) => updateLicense(index, { end_date: e.target.value })} disabled={readOnly || license.is_deleted} />
                    </Field>
                    <Field label="Belge Dosyası">
                      <input className={inputClass} value={license.document_file || ''} onChange={(e) => updateLicense(index, { document_file: e.target.value })} disabled={readOnly || license.is_deleted} placeholder="Dosya referansı / URL" />
                    </Field>
                    <Field label="Hatırlatma Süresi">
                      <input type="number" min={0} className={inputClass} value={license.reminder_days || ''} onChange={(e) => updateLicense(index, { reminder_days: e.target.value })} disabled={readOnly || license.is_deleted} />
                    </Field>
                  </div>
                </div>
              )
            })}
          </div>
        </PublicCard>
      )}

      {activeTab === 'dijital' && (
        <PublicCard title="Dijital Kanallar" description="KEP, e-tebligat ve entegrasyon hazırlık bilgileri">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="KEP Adresi" history={historyText(publicChannels.history, 'kep_address')}>
              <input className={inputClass} value={publicChannels.kep_address || ''} onChange={(e) => updateSection('public_channels', 'kep_address', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="KEP Sağlayıcı">
              <input className={inputClass} value={publicChannels.kep_provider || ''} onChange={(e) => updateSection('public_channels', 'kep_provider', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="E-Tebligat Adresi">
              <input className={inputClass} value={publicChannels.e_notification_address || ''} onChange={(e) => updateSection('public_channels', 'e_notification_address', e.target.value)} disabled={readOnly} />
            </Field>
            <ToggleField label="E-Tebligat Aktif mi" checked={!!publicChannels.e_notification_active} onChange={(value) => updateSection('public_channels', 'e_notification_active', value)} disabled={readOnly} />
            <Field label="E-Devlet Yetki Durumu">
              <input className={inputClass} value={publicChannels.e_government_authority_status || ''} onChange={(e) => updateSection('public_channels', 'e_government_authority_status', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Resmi Bildirim Email">
              <input type="email" className={inputClass} value={publicChannels.official_notification_email || ''} onChange={(e) => updateSection('public_channels', 'official_notification_email', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Resmi Bildirim Telefonu">
              <input className={inputClass} value={publicChannels.official_notification_phone || ''} onChange={(e) => updateSection('public_channels', 'official_notification_phone', e.target.value)} disabled={readOnly} />
            </Field>
            <ToggleField label="Web Servis Entegrasyonu Var mı" checked={!!publicChannels.has_web_service_integration} onChange={(value) => updateSection('public_channels', 'has_web_service_integration', value)} disabled={readOnly} />
            <Field label="API Notları" wide>
              <textarea rows={3} className={inputClass} value={publicChannels.api_notes || ''} onChange={(e) => updateSection('public_channels', 'api_notes', e.target.value)} disabled={readOnly} />
            </Field>
          </div>
        </PublicCard>
      )}

      {activeTab === 'gecmis' && (
        <PublicCard title="Geçmiş" description="Kamu kurumlarıyla ilgili değişiklik zaman çizelgesi">
          <div className="space-y-3">
            {mergedHistory.length === 0 && <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">Henüz kamu geçmiş kaydı yok.</div>}
            {mergedHistory.map((item, index) => (
              <div key={`${item.date}-${index}`} className="flex gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(item.date)} → {item.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </PublicCard>
      )}
    </div>
  )
}

function PublicCard({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function Field({ label, history, wide = false, children }: { label: string; history?: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1.5', wide && 'md:col-span-2 xl:col-span-3')}>
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
        <HistoryButton text={history} />
      </div>
      {children}
    </div>
  )
}

function ToggleField({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex min-h-[64px] items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/50">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
    </label>
  )
}

function Select({ value, onChange, options, disabled }: { value: string; onChange: (value: string) => void; options: string[]; disabled?: boolean }) {
  return (
    <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
      <option value="">Seçiniz...</option>
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  )
}

function HistoryButton({ text }: { text?: string }) {
  if (!text) return null
  return (
    <span title={text} className="inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700">
      <History size={14} />
    </span>
  )
}

function normalizeObject(value: any): Record<string, any> {
  if (Array.isArray(value)) return value[0] || {}
  return value && typeof value === 'object' ? value : {}
}

function normalizeArray<T>(value: any): T[] {
  return Array.isArray(value) ? value : []
}

function isExpiringSoon(date?: string) {
  if (!date) return false
  const expiry = new Date(date)
  if (Number.isNaN(expiry.getTime())) return false
  const today = new Date()
  const days = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return days >= 0 && days <= 30
}

function historyText(history?: PublicHistoryItem[], field?: string) {
  if (!Array.isArray(history) || history.length === 0) return undefined
  const rows = field ? history.filter((item) => item.field === field) : history
  const latest = rows[rows.length - 1]
  if (!latest) return undefined
  const oldValue = latest.old_value ?? latest.value ?? '-'
  const newValue = latest.new_value ?? '-'
  const date = latest.changed_at ?? latest.date ?? '-'
  const user = latest.changed_by ?? latest.user ?? 'Sistem Kullanıcısı'
  return `Eski: ${String(oldValue)} | Yeni: ${String(newValue)} | Tarih: ${formatDate(date)} | Kullanıcı: ${user}`
}

function buildTimeline(
  fieldHistory: Record<string, PublicHistoryItem[]> | undefined,
  tax: Record<string, any>,
  sgk: Record<string, any>,
  incentives: Record<string, any>,
  registry: Record<string, any>,
  channels: Record<string, any>,
  licenses: CompanyPublicLicense[]
) {
  const items: Array<{ date: string; title: string; detail: string }> = []
  const add = (date: string | undefined, title: string, detail: string) => {
    if (date) items.push({ date, title, detail })
  }

  if (tax.e_invoice_taxpayer) add(tax.updated_at || tax.liability_start_date, 'E-Fatura mükellefi oldu', tax.gib_user_code ? `GİB kodu: ${tax.gib_user_code}` : 'Vergi kaydı güncellendi')
  if (sgk.workplace_registry_no) add(sgk.updated_at || sgk.registration_date, 'SGK sicil no girildi', sgk.workplace_registry_no)
  if (registry.mersis_no) add(registry.updated_at || registry.establishment_registration_date, 'MERSİS kaydı güncellendi', registry.mersis_no)
  if (channels.kep_address) add(channels.updated_at, 'KEP adresi değişti', channels.kep_address)
  if (incentives.result_status) add(incentives.updated_at || incentives.application_date, `Teşvik sonucu: ${incentives.result_status}`, incentives.active_support_program || incentives.incentive_type || 'Destek programı')

  licenses.forEach((license) => {
    add(license.end_date || license.start_date, 'Ruhsat yenilendi', [license.license_type, license.document_no, license.status].filter(Boolean).join(' / '))
    ;(license.history || []).forEach((entry) => add(entry.changed_at || entry.date, `Ruhsat ${entry.field || 'durumu'} değişti`, `${String(entry.old_value ?? entry.value ?? '-')} → ${String(entry.new_value ?? '-')}`))
  })

  Object.entries(fieldHistory || {}).forEach(([field, rows]) => {
    if (!['vergi_dairesi', 'nace_kodlari', 'tehlike_sinifi', 'mersis_no'].includes(field)) return
    rows.forEach((row) => add(row.changed_at || row.date, `${fieldLabel(field)} değişti`, `Önceki değer: ${String(row.value ?? row.old_value ?? '-')}`))
  })

  return items
    .filter((item) => item.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    vergi_dairesi: 'Vergi dairesi',
    nace_kodlari: 'NACE',
    tehlike_sinifi: 'Tehlike sınıfı',
    mersis_no: 'MERSİS',
  }
  return labels[field] || field
}

function formatDate(date?: string) {
  if (!date) return '-'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('tr-TR')
}
