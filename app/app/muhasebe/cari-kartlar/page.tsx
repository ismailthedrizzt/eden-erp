'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Download, Filter, Settings, WalletCards } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef, WidgetDef } from '@/components/ui/SmartDataTable'
import { EntityForm, FormField, FormMode, FormTab } from '@/components/ui/EntityForm'
import { Toast } from '@/components/ui/Toast'
import { usePermissions } from '@/lib/security/permissionStore'
import { accountCardsService } from '@/lib/modules/accounting/account-cards/accountCards.service'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { getAccountingLauncherTargets } from '@/lib/modules/accounting/shared/formRegistry'
import type { AccountCardRow, AccountingEntityKind } from '@/lib/modules/accounting/shared/accounting.types'

const columns: ColumnDef[] = [
  { key: 'account_code', label: 'Cari Kodu', type: 'text', width: 120, category: 'Kimlik' },
  { key: 'display_name', label: 'Ad / Ãœnvan', type: 'text', width: 260, sortable: true, category: 'Kimlik' },
  { key: 'entity_label', label: 'KiÅŸi / Kurum', type: 'text', width: 130, category: 'Kimlik' },
  { key: 'roles_label', label: 'Roller', type: 'text', width: 180, category: 'Ä°liÅŸki' },
  { key: 'identity_display', label: 'TCKN / VKN', type: 'text', width: 140, category: 'Kimlik' },
  { key: 'official_balance', label: 'Resmi Bakiye', type: 'number', width: 130, category: 'Bakiye' },
  { key: 'pending_balance', label: 'Bekleyen Bakiye', type: 'number', width: 140, category: 'Bakiye' },
  { key: 'currency', label: 'Para Birimi', type: 'text', width: 110, category: 'Bakiye' },
  { key: 'last_movement_date', label: 'Son Hareket', type: 'date', width: 130, category: 'Hareket' },
  { key: 'risk_label', label: 'Risk Durumu', type: 'text', width: 130, category: 'Risk' },
  { key: 'status_label', label: 'Durum', type: 'text', width: 110, category: 'Durum' },
]

const financeFields: FormField[] = [
  { name: 'account_code', label: 'Cari Kodu', type: 'text' },
  { name: 'default_currency', label: 'VarsayÄ±lan Para Birimi', type: 'select', options: [{ value: 'TRY', label: 'TRY' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }] },
  { name: 'risk_limit', label: 'Risk Limiti', type: 'number' },
  { name: 'credit_limit', label: 'Kredi Limiti', type: 'number' },
  { name: 'payment_term_days', label: 'Ã–deme Vadesi (GÃ¼n)', type: 'number' },
  { name: 'collection_term_days', label: 'Tahsilat Vadesi (GÃ¼n)', type: 'number' },
  { name: 'notes', label: 'Notlar', type: 'textarea', colSpan: 3 },
]

const detailTabs: FormTab[] = [
  { id: 'hareketler', label: 'Hareketler', fields: [{ name: 'movement_summary', label: 'Hareket Ã–zeti', type: 'custom', colSpan: 3, render: ({ value }) => <ReadOnlyBox text={value || 'Hareketler Ã–n Muhasebe Hareketleri ekranÄ±nda yÃ¶netilir.'} /> }] },
  { id: 'finans', label: 'Finans AyarlarÄ±', fields: financeFields },
  { id: 'mutabakat', label: 'Mutabakat', fields: [{ name: 'reconciliation_summary', label: 'Mutabakat', type: 'custom', colSpan: 3, render: () => <ReadOnlyBox text="Mutabakat akÄ±ÅŸÄ± iÃ§in hazÄ±r alan." /> }] },
  { id: 'baglantilar', label: 'BaÄŸlantÄ±lar', fields: [{ name: 'links', label: 'BaÄŸlÄ± KayÄ±t', type: 'custom', colSpan: 3, render: () => <ReadOnlyBox text="Kimlik deÄŸiÅŸiklikleri baÄŸlÄ± kaynak modÃ¼lden yapÄ±lmalÄ±dÄ±r." /> }] },
  { id: 'belgeler', label: 'Belgeler', fields: [{ name: 'documents', label: 'Belgeler', type: 'custom', colSpan: 3, render: () => <ReadOnlyBox text="Belge baÄŸlantÄ±larÄ± hareketler Ã¼zerinden eklenecek." /> }] },
  { id: 'gecmis', label: 'GeÃ§miÅŸ', fields: [{ name: 'history', label: 'GeÃ§miÅŸ', type: 'custom', colSpan: 3, render: () => <ReadOnlyBox text="Finans ayarÄ± ve hareket geÃ§miÅŸi audit log Ã¼zerinden izlenecek." /> }] },
]

export default function AccountCardsPage() {
  const { can } = usePermissions()
  const [cards, setCards] = useState<AccountCardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<AccountCardRow | null>(null)
  const [mode, setMode] = useState<FormMode>('view')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string; title?: string } | null>(null)

  const loadCards = async () => {
    setLoading(true)
    try {
      const payload = await accountCardsService.getList()
      setCards(Array.isArray(payload.data) ? payload.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCards()
  }, [])

  const tableData = cards.map(card => ({
    ...card,
    id: `${card.entity_kind}-${card.person_id || card.organization_id}-${card.company_id || 'global'}`,
    entity_label: card.entity_kind === 'person' ? 'GerÃ§ek KiÅŸi' : 'TÃ¼zel KiÅŸi',
    roles_label: card.roles?.length ? card.roles.join(', ') : '-',
    identity_display: card.identity_no || card.tax_no || '-',
    risk_label: card.risk_status === 'limit_exceeded' ? 'Limit AÅŸÄ±ldÄ±' : 'Normal',
    status_label: card.status === 'active' ? 'Aktif' : 'Pasif',
  }))

  const widgets: WidgetDef<any>[] = useMemo(() => [
    { key: 'total', label: 'Cari Kart', render: () => tableData.length },
    { key: 'person', label: 'GerÃ§ek KiÅŸi', render: () => tableData.filter(row => row.entity_kind === 'person').length },
    { key: 'organization', label: 'TÃ¼zel KiÅŸi', render: () => tableData.filter(row => row.entity_kind === 'organization').length },
    { key: 'risk', label: 'Riskli', render: () => tableData.filter(row => row.risk_status === 'limit_exceeded').length },
  ], [tableData])

  const heroFields: FormField[] = [
    { name: 'display_name', label: 'Ad / Ünvan', type: 'custom', render: ({ value }) => <ReadOnlyField value={value} /> },
    { name: 'entity_label', label: 'Kişi / Kurum Tipi', type: 'custom', render: ({ value }) => <ReadOnlyField value={value} /> },
    { name: 'roles_label', label: 'Roller', type: 'custom', render: ({ value }) => <ReadOnlyField value={value} /> },
    { name: 'identity_display', label: 'TCKN / VKN', type: 'custom', render: ({ value }) => <ReadOnlyField value={value} /> },
    { name: 'official_balance', label: 'Resmi Bakiye', type: 'custom', render: ({ value }) => <ReadOnlyField value={value ?? 0} /> },
    { name: 'pending_balance', label: 'Bekleyen Bakiye', type: 'custom', render: ({ value }) => <ReadOnlyField value={value ?? 0} /> },
    { name: 'currency', label: 'Para Birimi', type: 'custom', render: ({ value }) => <ReadOnlyField value={value} /> },
    { name: 'status_label', label: 'Durum', type: 'custom', render: ({ value }) => <ReadOnlyField value={value} /> },
  ]
  const saveSettings = async (data: Record<string, any>) => {
    if (!selectedCard) return
    setSaving(true)
    try {
      await accountCardsService.saveFinancialSettings({
        ...data,
        company_id: selectedCard.company_id,
        entity_kind: selectedCard.entity_kind,
        person_id: selectedCard.person_id,
        organization_id: selectedCard.organization_id,
      })
      accountCardsService.invalidate()
      setToast({ type: 'success', title: 'Kaydedildi', message: 'Cari finans ayarlarÄ± gÃ¼ncellendi.' })
      setMode('view')
      await loadCards()
    } catch (error) {
      setToast({ type: 'error', title: 'Hata', message: error instanceof Error ? error.message : 'Kaydedilemedi' })
      throw error
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <PageBanner
        mode={selectedCard ? 'form' : 'list'}
        formMode={selectedCard ? mode : undefined}
        title={selectedCard ? selectedCard.display_name : 'Cari Kartlar'}
        subtitle={selectedCard ? 'Cari kart gÃ¶rÃ¼nÃ¼mÃ¼ ve finans ayarlarÄ±' : 'KiÅŸi ve kurumlarÄ±n finansal iliÅŸkilerini, bakiyelerini ve hareketlerini gÃ¶rÃ¼ntÃ¼leyin.'}
        icon={<WalletCards size={24} />}
        onAddClick={!selectedCard && can(ACCOUNTING_PERMISSIONS.accountCardsEditFinancialSettings) ? () => setLauncherOpen(true) : undefined}
        addButtonText="Yeni Cari Ä°liÅŸkisi Ekle"
        onBackClick={selectedCard ? () => { setSelectedCard(null); setMode('view') } : undefined}
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {!selectedCard ? (
        <div className="mt-6">
          <div className="mb-3 flex justify-end gap-2">
            <button className="btn"><Filter size={16} />Filtreler</button>
            <button className="btn"><Download size={16} />DÄ±ÅŸa Aktar</button>
          </div>
          <SmartDataTable columns={columns} data={tableData} loading={loading} widgets={widgets} defaultView="list" storageKey="account-cards" emptyText="Cari kart bulunamadÄ±" onRowClick={(row) => { setSelectedCard(row); setMode('view') }} onRefresh={loadCards} />
        </div>
      ) : (
        <div className="mt-6">
          <EntityForm mode={mode} entityName="Cari Kartlar" entityNameSingular="Cari Kart" heroFields={heroFields} tabs={detailTabs} data={selectedCard as any} saving={saving} onSave={saveSettings} onCancel={() => mode === 'edit' ? setMode('view') : setSelectedCard(null)} onModeChange={setMode} canEdit={can(ACCOUNTING_PERMISSIONS.accountCardsEditFinancialSettings)} enableHistory additionalActions={<Link className="btn" href={`/app/muhasebe/on-muhasebe-hareketleri?counterparty=${selectedCard.person_id || selectedCard.organization_id}`}><Settings size={16} />Hareketleri GÃ¶r</Link>} />
        </div>
      )}

      {launcherOpen && <AccountCardLauncher onClose={() => setLauncherOpen(false)} />}
    </div>
  )
}

function AccountCardLauncher({ onClose }: { onClose: () => void }) {
  const { can } = usePermissions()
  const [entityKind, setEntityKind] = useState<AccountingEntityKind>('person')
  const [identity, setIdentity] = useState<Record<string, string>>({ nationality: 'TR', country: 'TR' })
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const targets = getAccountingLauncherTargets(entityKind).filter(target => can(target.permission))

  const search = async () => {
    setLoading(true)
    try {
      setResult(await accountCardsService.resolveIdentity({ entityKind, identity }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Yeni Cari Ä°liÅŸkisi Ekle</h3>
            <p className="mt-1 text-sm text-gray-500">Cari kart kimlik oluÅŸturmaz; doÄŸru kaynak formu aÃ§ar.</p>
          </div>
          <button onClick={onClose} className="btn">Kapat</button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span>KiÅŸi / Kurum Tipi</span>
            <select value={entityKind} onChange={(e) => { setEntityKind(e.target.value as AccountingEntityKind); setResult(null) }} className="w-full rounded-lg border px-3 py-2 dark:bg-gray-800">
              <option value="person">GerÃ§ek KiÅŸi</option>
              <option value="organization">TÃ¼zel KiÅŸi</option>
            </select>
          </label>
          {entityKind === 'person' ? (
            <>
              <Input label="UyruÄŸu" value={identity.nationality || ''} onChange={v => setIdentity(p => ({ ...p, nationality: v }))} />
              <div className="grid grid-cols-2 gap-2"><Input label="TCKN" value={identity.national_id || ''} onChange={v => setIdentity(p => ({ ...p, national_id: v }))} /><Input label="Pasaport" value={identity.passport_no || ''} onChange={v => setIdentity(p => ({ ...p, passport_no: v }))} /></div>
            </>
          ) : (
            <>
              <Input label="Ãœlke" value={identity.country || ''} onChange={v => setIdentity(p => ({ ...p, country: v }))} />
              <div className="grid grid-cols-2 gap-2"><Input label="VKN" value={identity.tax_number || ''} onChange={v => setIdentity(p => ({ ...p, tax_number: v }))} /><Input label="Sicil No" value={identity.registration_number || ''} onChange={v => setIdentity(p => ({ ...p, registration_number: v }))} /></div>
            </>
          )}
        </div>
        <button onClick={search} disabled={loading} className="btn btn-primary mt-4">{loading ? 'AranÄ±yor...' : 'Master KaydÄ± Ara'}</button>

        {result && (
          <div className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p className="font-medium text-gray-900 dark:text-white">{result.message}</p>
            {result.found ? (
              <div className="mt-3 space-y-2 text-sm">
                <p><b>Ad Soyad / Ãœnvan:</b> {result.displayName}</p>
                <p><b>Kimlik No / VKN:</b> {result.identityNo || '-'}</p>
                <p><b>Mevcut Roller:</b> {result.roles?.length ? result.roles.join(', ') : '-'}</p>
                <p><b>Mevcut Cari Durumu:</b> {result.card?.status || 'Pasif gÃ¶rÃ¼nÃ¼m'}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link className="btn btn-primary" href="/app/muhasebe/cari-kartlar">Cari GÃ¶rÃ¼nÃ¼mÃ¼nÃ¼ AÃ§</Link>
                  <Link className="btn" href="/app/muhasebe/on-muhasebe-hareketleri">Hareketlerini GÃ¶r</Link>
                  <button className="btn">Finans AyarlarÄ±nÄ± DÃ¼zenle</button>
                  <button className="btn">Yeni Rol / Ä°liÅŸki Ekle</button>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-amber-700 dark:text-amber-300">Ã–nce ilgili iÅŸ formundan master kayÄ±t oluÅŸturulmalÄ±dÄ±r.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {targets.map(target => <Link key={target.key} className="btn" href={target.href}>{target.label}</Link>)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1 text-sm"><span>{label}</span><input value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border px-3 py-2 dark:bg-gray-800" /></label>
}

function ReadOnlyBox({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700">{text}</div>
}

function ReadOnlyField({ value }: { value: any }) {
  return <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">{value || '-'}</div>
}
