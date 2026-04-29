'use client'

// MODULE LICENSE: muhasebe/cari
// Ana Modül: Muhasebe (muhasebe)
// Alt Modül: Borç Takip (cari)

import { useNakitIslemler } from '@/hooks/useNakitIslemler'
import { formatTRY } from '@/lib/utils'
import { ProjeBadge } from '@/components/ui/Badge'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DollarSign } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'

const IC_TARAFLAR = [
  { isim: 'İsmail ILGAR', rol: 'Ortak',   cls: 'border-l-eden-gold' },
  { isim: 'Canberk',      rol: 'Çalışan', cls: 'border-l-eden-blue' },
  { isim: 'Ergün',        rol: 'Çalışan', cls: 'border-l-gray-400'  },
]
const PIE_RENKLER = ['#c49a10', '#216688', '#6b7280']
const PROJELER = ['PG','EPIRB','İdari','Sermaye','Aktarım','Finansal','Destek','Yatırım','Otel']

export default function BorclarPage() {
  const { data, loading } = useNakitIslemler()

  const borclar = IC_TARAFLAR.map(t => {
    const harcama = data.filter(r => r.islem_tarafi === t.isim).reduce((s,r)=>s+(r.gider||0),0)
    const odeme   = data.filter(r => r.islem_tarafi==='Eden' && r.karsi_taraf===t.isim).reduce((s,r)=>s+(r.gelir||0),0)
    return { ...t, harcama, odeme, net: harcama - odeme }
  })

  const toplamBorc = borclar.reduce((s,b)=>s+b.net,0)

  const detay: { taraf: string; proje: string; tutar: number }[] = []
  IC_TARAFLAR.forEach(t => PROJELER.forEach(p => {
    const tu = data.filter(r=>r.islem_tarafi===t.isim&&r.proje===p).reduce((s,r)=>s+(r.gider||0),0)
    if (tu>0) detay.push({ taraf: t.isim, proje: p, tutar: tu })
  }))

  const pieData = borclar.filter(b=>b.net>0).map(b=>({ name: b.isim, value: Math.round(b.net) }))

  return (
    <>
      <PageBanner
        title="Borç Takip"
        subtitle={`Toplam açık borç: ${formatTRY(toplamBorc)}`}
        icon={<DollarSign size={24} />}
        onAddClick={undefined}
      />

      {/* Borç Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {borclar.map(b => (
          <div key={b.isim} className={`card border-l-4 ${b.cls} p-4`}>
            <div className="text-sm font-semibold text-gray-800 dark:text-white">{b.isim}</div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">{b.rol}</div>
            <div className="text-2xl font-bold font-display text-red-600 mb-3">{formatTRY(b.net)}</div>
            <div className="space-y-1 text-xs text-gray-500">
              <div>Harcama: <span className="font-semibold text-gray-700 dark:text-gray-200">{formatTRY(b.harcama)}</span></div>
              <div>Ödeme: <span className="font-semibold text-eden-green">{formatTRY(b.odeme)}</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tablo */}
        <div className="card">
          <div className="card-hdr"><span className="card-title">Proje Bazlı Kırılım</span></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Taraf</th><th>Proje</th><th className="text-right">Tutar</th></tr></thead>
              <tbody>
                {loading ? Array.from({length:5}).map((_,i)=>(
                  <tr key={i}>{[1,2,3].map(j=><td key={j}><div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"/></td>)}</tr>
                )) : detay.map((d,i)=>(
                  <tr key={i}>
                    <td className="font-medium text-sm">{d.taraf}</td>
                    <td><ProjeBadge proje={d.proje} /></td>
                    <td className="text-right amt-neg">{formatTRY(d.tutar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pie */}
        <div className="card">
          <div className="card-hdr"><span className="card-title">Borç Dağılımı</span></div>
          <div className="card-body">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                    dataKey="value" nameKey="name" paddingAngle={3}>
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_RENKLER[idx % PIE_RENKLER.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatTRY(v)} />
                  <Legend wrapperStyle={{fontSize:12}} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                Açık borç yok
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
