'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { accountingService } from '@/lib/services/accountingService'

const PROJELER = ['PG', 'EPIRB', 'İdari', 'Sermaye', 'Aktarım', 'Finansal', 'Destek', 'Yatırım', 'Otel']
const TARAFLAR = ['Eden', 'İsmail ILGAR', 'Canberk', 'Ergün']
const HESAP_TIPLERI = ['Kredi Kartı', 'Vadesiz', 'Yatırım', 'Nakit', 'Bonus']

interface Props {
  open: boolean
  onClose: () => void
  defaultTaraf?: string
  onSaved?: () => void
}

export default function IslemModal({ open, onClose, defaultTaraf, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    tarih: today, gelir: '', gider: '', aciklama: '',
    proje: 'PG', islem_tarafi: defaultTaraf ?? 'Eden',
    karsi_taraf: '', banka: '', hesap_tipi: 'Kredi Kartı', hesap_no: '', belge_no: '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); setErr('') }

  async function handleSave() {
    if (!form.tarih || !form.aciklama) { setErr('Tarih ve açıklama zorunludur.'); return }
    const g = parseFloat(form.gelir) || 0
    const d = parseFloat(form.gider) || 0
    if (g === 0 && d === 0) { setErr('Gelir veya gider girilmelidir.'); return }
    setSaving(true)
    try {
      await accountingService.create({
        tarih: form.tarih, gelir: g, gider: d,
        aciklama: form.aciklama, proje: form.proje as any,
        islem_tarafi: form.islem_tarafi as any,
        karsi_taraf: form.karsi_taraf || undefined,
        banka: form.banka || undefined,
        hesap_tipi: form.hesap_tipi as any,
        hesap_no: form.hesap_no || undefined,
        belge_no: form.belge_no || undefined,
      })
      accountingService.invalidateList()
      onSaved?.()
      onClose()
      setForm(f => ({ ...f, gelir: '', gider: '', aciklama: '', karsi_taraf: '', banka: '', hesap_no: '', belge_no: '' }))
    } catch (e: any) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Yeni İşlem Ekle"
      footer={
        <>
          <button onClick={onClose} className="btn">İptal</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Tarih *', key: 'tarih', type: 'date', full: false },
          { label: 'İşlem Tarafı *', key: 'islem_tarafi', type: 'select', opts: TARAFLAR },
          { label: 'Gelir (₺)', key: 'gelir', type: 'number' },
          { label: 'Gider (₺)', key: 'gider', type: 'number' },
        ].map(f => (
          <div key={f.key} className={f.full ? 'col-span-2' : ''}>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
            {f.type === 'select' ? (
              <select value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-eden-navy text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-eden-blue/20">
                {f.opts!.map(o => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input type={f.type} value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-eden-navy text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-eden-blue/20" />
            )}
          </div>
        ))}

        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Açıklama *</label>
          <input type="text" value={form.aciklama} onChange={e => set('aciklama', e.target.value)}
            placeholder="İşlem açıklaması..."
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-eden-navy text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-eden-blue/20" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Proje</label>
          <select value={form.proje} onChange={e => set('proje', e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-eden-navy text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-eden-blue/20">
            {PROJELER.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Karşı Taraf</label>
          <input type="text" value={form.karsi_taraf} onChange={e => set('karsi_taraf', e.target.value)}
            placeholder="Tedarikçi / kişi..."
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-eden-navy text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-eden-blue/20" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Banka</label>
          <input type="text" value={form.banka} onChange={e => set('banka', e.target.value)}
            placeholder="Garanti, EnPara..."
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-eden-navy text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-eden-blue/20" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Hesap Tipi</label>
          <select value={form.hesap_tipi} onChange={e => set('hesap_tipi', e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-eden-navy text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-eden-blue/20">
            {HESAP_TIPLERI.map(h => <option key={h}>{h}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Hesap No</label>
          <input type="text" value={form.hesap_no} onChange={e => set('hesap_no', e.target.value)}
            placeholder="**** 1234"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-eden-navy text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-eden-blue/20" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Belge No</label>
          <input type="text" value={form.belge_no} onChange={e => set('belge_no', e.target.value)}
            placeholder="Fatura / dekont..."
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-eden-navy text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-eden-blue/20" />
        </div>

        {err && <p className="col-span-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
      </div>
    </Modal>
  )
}
