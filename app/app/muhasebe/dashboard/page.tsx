'use client'

// MODULE LICENSE: muhasebe/dashboard
// Ana Modül: Muhasebe (muhasebe)
// Alt Modül: Dashboard (dashboard)

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useNakitIslemler } from '@/hooks/useNakitIslemler'
import { formatTRY, formatDate, PROJE_GRAFIK_RENKLERI, TARAF_RENKLERI } from '@/lib/utils'
import KpiCard from '@/components/ui/KpiCard'
import { ProjeBadge } from '@/components/ui/Badge'
import IslemModal from '@/components/modules/muhasebe/IslemModal'
import { Plus, BarChart3 } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'

const PROJELER = ['PG','EPIRB','İdari','Sermaye','Aktarım','Finansal','Destek','Yatırım','Otel']
const AYLAR = ['','Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']

export default function MuhasebeDashboard() {
  const [modalOpen, setModalOpen] = useState(false)
  const { data, loading, toplamGelir, toplamGider, netBakiye, acikBorc } = useNakitIslemler()

  // Aylık grafik verisi
  const aylikMap: Record<string, { gelir: number; gider: number }> = {}
  data.forEach(r => {
    const ay = r.tarih?.slice(0, 7)
    if (!ay) return
    if (!aylikMap[ay]) aylikMap[ay] = { gelir: 0, gider: 0 }
    aylikMap[ay].gelir += r.gelir || 0
    aylikMap[ay].gider += r.gider || 0
  })
  const aylikData = Object.entries(aylikMap).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
    .map(([k, v]) => ({ ay: AYLAR[+k.split('-')[1]], gelir: Math.round(v.gelir), gider: Math.round(v.gider) }))

  // Proje gider barları
  const prjGider: Record<string, number> = {}
  PROJELER.forEach(p => { prjGider[p] = data.filter(r => r.proje === p).reduce((s, r) => s + (r.gider || 0), 0) })
  const maxPrj = Math.max(...Object.values(prjGider), 1)
  const aktifPrjler = PROJELER.filter(p => prjGider[p] > 0).sort((a, b) => prjGider[b] - prjGider[a])

  // Son 10 işlem
  const sonIslemler = [...data].sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 10)

  return (
    <>
      <IslemModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <PageBanner
        title="Muhasebe Dashboard"
        icon={<BarChart3 size={24} />}
        onAddClick={() => setModalOpen(true)}
        addButtonText="Yeni İşlem"
      />

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Toplam Gelir"  value={loading ? '—' : formatTRY(toplamGelir)} color="green" />
        <KpiCard label="Toplam Gider"  value={loading ? '—' : formatTRY(toplamGider)} color="red" />
        <KpiCard label="Net Bakiye"    value={loading ? '—' : formatTRY(netBakiye)} color={netBakiye >= 0 ? 'green' : 'red'} />
        <KpiCard label="Açık Borç"     value={loading ? '—' : formatTRY(acikBorc)} sub="Ortak & çalışan" color="gold" />
        <KpiCard label="İşlem Sayısı"  value={data.length} color="blue" />
      </div>

      {/* Grafik + Proje Barları */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="card lg:col-span-2">
          <div className="card-hdr"><span className="card-title">Aylık Nakit Akışı</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={aylikData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="ay" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip formatter={(v: number) => formatTRY(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="gelir" name="Gelir" fill="#0e8c61" radius={[4,4,0,0]} />
                <Bar dataKey="gider" name="Gider" fill="#d93025" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-hdr"><span className="card-title">Proje Giderleri</span></div>
          <div className="card-body space-y-2.5">
            {aktifPrjler.map(p => (
              <div key={p} className="flex items-center gap-2">
                <div className="w-16 text-xs text-gray-400 text-right flex-shrink-0">{p}</div>
                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.round(prjGider[p] / maxPrj * 100)}%`,
                    background: PROJE_GRAFIK_RENKLERI[p] || '#6b7280'
                  }} />
                </div>
                <div className="w-24 text-xs font-medium text-gray-600 dark:text-gray-300 text-right flex-shrink-0">
                  {formatTRY(prjGider[p])}
                </div>
              </div>
            ))}
            {aktifPrjler.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Veri yok</p>}
          </div>
        </div>
      </div>

      {/* Son İşlemler Tablosu */}
      <div className="card">
        <div className="card-hdr"><span className="card-title">Son 10 İşlem</span></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Tarih</th><th>Açıklama</th><th>Proje</th><th>Taraf</th><th className="text-right">Gelir</th><th className="text-right">Gider</th></tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:5}).map((_,i) => (
                <tr key={i}>{Array.from({length:6}).map((_,j) => <td key={j}><div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"/></td>)}</tr>
              )) : sonIslemler.map(r => (
                <tr key={r.id}>
                  <td className="text-xs text-gray-400 whitespace-nowrap">{formatDate(r.tarih)}</td>
                  <td>{r.aciklama}</td>
                  <td><ProjeBadge proje={r.proje} /></td>
                  <td className="text-xs">{r.islem_tarafi}</td>
                  <td className="text-right amt-pos whitespace-nowrap">{r.gelir ? formatTRY(r.gelir) : ''}</td>
                  <td className="text-right amt-neg whitespace-nowrap">{r.gider ? formatTRY(r.gider) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
