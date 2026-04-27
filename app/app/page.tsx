'use client'

import { useState } from 'react'
import { useNakitIslemler } from '@/hooks/useNakitIslemler'
import { usePersonel } from '@/hooks/usePersonel'
import { formatTRY, formatDate } from '@/lib/utils'
import KpiCard from '@/components/ui/KpiCard'
import { ProjeBadge, DurumBadge } from '@/components/ui/Badge'
import { Pin, MessageSquare, CheckSquare, ChevronRight } from 'lucide-react'
import IslemModal from '@/components/modules/muhasebe/IslemModal'
import Link from 'next/link'

const DUYURULAR = [
  { id: 1, baslik: 'Q2 hedefleri güncellendi', tarih: '25 Nis 2026', kaynak: 'Yönetim', pinned: true },
  { id: 2, baslik: 'SGK Nisan bildirge son tarihi', tarih: '22 Nis 2026', kaynak: 'İK', pinned: false },
  { id: 3, baslik: 'PG Projesi milestone güncelleme', tarih: '18 Nis 2026', kaynak: 'Proje', pinned: false },
]

const GOREVLER = [
  { id: 1, baslik: 'Personel onboarding formu', detay: 'Canberk Kaya — Bugün', done: false, late: false },
  { id: 2, baslik: 'SGK bildirge gönderildi', detay: '', done: true, late: false },
  { id: 3, baslik: 'İş ilanı yayınla — Yazılım Geliştirici', detay: 'Gecikmiş — 20 Nis 2026', done: false, late: true },
  { id: 4, baslik: 'PG Proje haftalık raporu', detay: '27 Nis 2026', done: false, late: false },
]

const TICKETLAR = [
  { id: 1, baslik: 'Ekipman talebi — Laptop', meta: 'Canberk Kaya • 2 saat önce', renk: '#216688', badge: 'Yeni', badgeClass: 'badge-blue' },
  { id: 2, baslik: 'Bordro düzeltme talebi', meta: 'Ergün Demir • Dün', renk: '#f4c323', badge: 'Bekliyor', badgeClass: 'badge-gold' },
  { id: 3, baslik: 'İzin onayı — Nisan', meta: 'İsmail ILGAR • 3 gün önce', renk: '#0e8c61', badge: 'Kapalı', badgeClass: 'badge-green' },
]

export default function AnaSayfa() {
  const [modalOpen, setModalOpen] = useState(false)
  const [doneIds, setDoneIds] = useState<number[]>([2])
  const { toplamGelir, toplamGider, netBakiye, acikBorc, data: islemler, loading } = useNakitIslemler()
  const { data: personel, gorevde, izinde } = usePersonel()

  const sonIslemler = [...islemler].sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 5)

  return (
    <>
      <IslemModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Karşılama */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white">
          Merhaba, İsmail 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">2 yıl 3 ay, 7 gündür bizimlesin. İyi ki varsın!</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Net Bakiye" value={loading ? '—' : formatTRY(netBakiye)} color={netBakiye >= 0 ? 'green' : 'red'} />
        <KpiCard label="Toplam Gider" value={loading ? '—' : formatTRY(toplamGider)} color="red" />
        <KpiCard label="Toplam Personel" value={gorevde} sub={`${izinde} izinde`} color="blue" />
        <KpiCard label="Açık Borç" value={loading ? '—' : formatTRY(acikBorc)} sub="Ortak & çalışan" color="gold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sol: Duyurular + Son İşlemler */}
        <div className="lg:col-span-2 space-y-4">

          {/* Duyurular */}
          <div className="card">
            <div className="card-hdr">
              <span className="card-title flex items-center gap-2"><Pin size={14} className="text-eden-gold" />Duyurular</span>
              <Link href="#" className="text-xs text-eden-blue hover:underline flex items-center gap-1">
                Tümünü gör <ChevronRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {DUYURULAR.map(d => (
                <div key={d.id} className={`px-4 py-3 flex items-start gap-3 border-l-2 ${d.pinned ? 'border-l-eden-gold bg-eden-gold-lt/30 dark:bg-yellow-900/10' : 'border-l-eden-blue bg-transparent'}`}>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{d.baslik}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{d.tarih} — {d.kaynak}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Son İşlemler */}
          <div className="card">
            <div className="card-hdr">
              <span className="card-title">Son İşlemler</span>
              <Link href="/muhasebe/islemler" className="text-xs text-eden-blue hover:underline flex items-center gap-1">
                Tümünü gör <ChevronRight size={12} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Tarih</th><th>Açıklama</th><th>Proje</th><th className="text-right">Gelir</th><th className="text-right">Gider</th></tr></thead>
                <tbody>
                  {loading ? (
                    Array.from({length:4}).map((_,i) => (
                      <tr key={i}>{Array.from({length:5}).map((_,j) => <td key={j}><div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"/></td>)}</tr>
                    ))
                  ) : sonIslemler.map(r => (
                    <tr key={r.id}>
                      <td className="text-xs text-gray-400 whitespace-nowrap">{formatDate(r.tarih)}</td>
                      <td className="max-w-[200px] truncate">{r.aciklama}</td>
                      <td><ProjeBadge proje={r.proje} /></td>
                      <td className="text-right amt-pos whitespace-nowrap">{r.gelir ? formatTRY(r.gelir) : ''}</td>
                      <td className="text-right amt-neg whitespace-nowrap">{r.gider ? formatTRY(r.gider) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sağ: Görevler + Ticketlar */}
        <div className="space-y-4">
          {/* Görevler */}
          <div className="card">
            <div className="card-hdr">
              <span className="card-title flex items-center gap-2"><CheckSquare size={14} />Görevlerim</span>
            </div>
            <div className="px-4 py-2 divide-y divide-gray-100 dark:divide-gray-800">
              {GOREVLER.map(g => (
                <div key={g.id} className="flex items-start gap-2.5 py-2.5">
                  <button
                    onClick={() => setDoneIds(prev => prev.includes(g.id) ? prev.filter(x=>x!==g.id) : [...prev, g.id])}
                    className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border transition-colors
                      ${doneIds.includes(g.id) ? 'bg-eden-green border-eden-green' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm text-gray-800 dark:text-gray-100 ${doneIds.includes(g.id) ? 'line-through text-gray-400' : ''}`}>
                      {g.baslik}
                    </div>
                    {g.detay && (
                      <div className={`text-xs mt-0.5 ${g.late ? 'text-red-500' : 'text-gray-400'}`}>{g.detay}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ticketlar */}
          <div className="card">
            <div className="card-hdr">
              <span className="card-title flex items-center gap-2"><MessageSquare size={14} />Ticketlar</span>
              <button className="btn btn-sm text-xs">+ Yeni</button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {TICKETLAR.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-eden-navy/50 cursor-pointer transition-colors">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background: t.renk}} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{t.baslik}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t.meta}</div>
                  </div>
                  <span className={`badge ${t.badgeClass} flex-shrink-0`}>{t.badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
