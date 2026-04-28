'use client'

import { useNakitIslemler } from '@/hooks/useNakitIslemler'
import { formatTRY } from '@/lib/utils'
import { ProjeBadge } from '@/components/ui/Badge'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { PROJE_GRAFIK_RENKLERI, TARAF_RENKLERI } from '@/lib/utils'
import { FolderOpen } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'

const PROJELER  = ['PG','EPIRB','İdari','Sermaye','Aktarım','Finansal','Destek','Yatırım','Otel']
const TARAFLAR  = ['Eden','İsmail ILGAR','Canberk','Ergün']

export default function ProjelerPage() {
  const { data, loading } = useNakitIslemler()

  const prjGelir: Record<string,number> = {}
  const prjGider: Record<string,number> = {}
  PROJELER.forEach(p => {
    prjGelir[p] = data.filter(r=>r.proje===p).reduce((s,r)=>s+(r.gelir||0),0)
    prjGider[p] = data.filter(r=>r.proje===p).reduce((s,r)=>s+(r.gider||0),0)
  })

  const aktifPrjler = PROJELER.filter(p=>prjGider[p]>0||prjGelir[p]>0)
  const top4 = [...aktifPrjler].sort((a,b)=>prjGider[b]-prjGider[a]).slice(0,4)

  const pieData = aktifPrjler.filter(p=>prjGider[p]>0)
    .map(p=>({ name: p, value: Math.round(prjGider[p]) }))

  const tarafData = TARAFLAR.map(t=>({
    taraf: t, gider: Math.round(data.filter(r=>r.islem_tarafi===t).reduce((s,r)=>s+(r.gider||0),0))
  }))

  return (
    <>
      <PageBanner
        title="Proje Özeti"
        icon={<FolderOpen size={24} />}
        onAddClick={undefined}
      />

      {/* Top KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {top4.map(p => (
          <div key={p} className="card p-4 border-t-[3px]" style={{borderTopColor: PROJE_GRAFIK_RENKLERI[p]||'#6b7280'}}>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{p}</div>
            <div className="text-xl font-bold font-display text-red-600">{formatTRY(prjGider[p])}</div>
            <div className="text-xs text-gray-400 mt-1">Gelir: {formatTRY(prjGelir[p])}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Pie */}
        <div className="card">
          <div className="card-hdr"><span className="card-title">Proje Gider Dağılımı</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {pieData.map((_,i)=><Cell key={i} fill={PROJE_GRAFIK_RENKLERI[pieData[i].name]||'#6b7280'} />)}
                </Pie>
                <Tooltip formatter={(v:number)=>formatTRY(v)} />
                <Legend wrapperStyle={{fontSize:11}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Taraf Bar */}
        <div className="card">
          <div className="card-hdr"><span className="card-title">Taraf Bazlı Giderler</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tarafData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="taraf" tick={{fontSize:11}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false}
                  tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} />
                <Tooltip formatter={(v:number)=>formatTRY(v)} />
                <Bar dataKey="gider" name="Gider" radius={[4,4,0,0]}
                  fill="#216688"
                  label={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detay Tablosu */}
      <div className="card">
        <div className="card-hdr"><span className="card-title">Proje Detay Tablosu</span></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Proje</th><th className="text-right">Gelir</th><th className="text-right">Gider</th><th className="text-right">Net</th><th className="text-right">İşlem</th></tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:6}).map((_,i)=>(
                <tr key={i}>{[1,2,3,4,5].map(j=><td key={j}><div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"/></td>)}</tr>
              )) : aktifPrjler.map(p => {
                const net = prjGelir[p] - prjGider[p]
                const cnt = data.filter(r=>r.proje===p).length
                return (
                  <tr key={p}>
                    <td><ProjeBadge proje={p} /></td>
                    <td className="text-right amt-pos">{formatTRY(prjGelir[p])}</td>
                    <td className="text-right amt-neg">{formatTRY(prjGider[p])}</td>
                    <td className={`text-right font-semibold ${net>=0?'text-eden-green':'text-red-600'}`}>{formatTRY(net)}</td>
                    <td className="text-right text-gray-400 text-xs">{cnt}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
