'use client'

// MODULE LICENSE: muhasebe/fatura
// Ana Modül: Muhasebe (muhasebe)
// Alt Modül: Tüm İşlemler (fatura)

import { useState } from 'react'
import { useNakitIslemler } from '@/hooks/useNakitIslemler'
import { formatTRY, formatDate } from '@/lib/utils'
import { ProjeBadge } from '@/components/ui/Badge'
import IslemModal from '@/components/modules/muhasebe/IslemModal'
import { Plus, Search, Receipt } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'

const PROJELER  = ['PG','EPIRB','İdari','Sermaye','Aktarım','Finansal','Destek','Yatırım','Otel']
const TARAFLAR  = ['Eden','İsmail ILGAR','Canberk','Ergün']

export default function IslemlerPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [taraf, setTaraf]   = useState('')
  const [proje, setProje]   = useState('')
  const [tip,   setTip]     = useState('')
  const [ara,   setAra]     = useState('')

  const { data, loading } = useNakitIslemler({ islemTarafi: taraf||undefined, proje: proje||undefined, tip: tip as any, ara: ara||undefined })

  const filteredTotal = {
    gelir: data.reduce((s,r)=>s+(r.gelir||0),0),
    gider: data.reduce((s,r)=>s+(r.gider||0),0),
  }

  const SL = 'w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-eden-navy text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-eden-blue/20'

  return (
    <>
      <IslemModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <PageBanner
        mode="list"
        title="Tüm İşlemler"
        icon={<Receipt size={24} />}
        onAddClick={() => setModalOpen(true)}
        addButtonText="Yeni İşlem"
      />

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={taraf} onChange={e=>setTaraf(e.target.value)} className={SL} style={{width:160}}>
          <option value="">Tüm Taraflar</option>
          {TARAFLAR.map(t=><option key={t}>{t}</option>)}
        </select>
        <select value={proje} onChange={e=>setProje(e.target.value)} className={SL} style={{width:140}}>
          <option value="">Tüm Projeler</option>
          {PROJELER.map(p=><option key={p}>{p}</option>)}
        </select>
        <select value={tip} onChange={e=>setTip(e.target.value)} className={SL} style={{width:140}}>
          <option value="">Gelir & Gider</option>
          <option value="gelir">Sadece Gelir</option>
          <option value="gider">Sadece Gider</option>
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={ara} onChange={e=>setAra(e.target.value)}
            placeholder="Açıklama veya karşı taraf ara..."
            className={`${SL} pl-8`} />
        </div>
      </div>

      {/* Özet satırı */}
      <div className="flex gap-4 mb-3 text-sm">
        <span className="text-gray-400">{data.length} kayıt</span>
        <span className="amt-pos">{formatTRY(filteredTotal.gelir)} gelir</span>
        <span className="amt-neg">{formatTRY(filteredTotal.gider)} gider</span>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th><th>Açıklama</th><th>Proje</th><th>İşlem Tarafı</th>
                <th>Karşı Taraf</th><th>Banka</th><th className="text-right">Gelir</th>
                <th className="text-right">Gider</th><th>Belge</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:8}).map((_,i)=>(
                <tr key={i}>{Array.from({length:9}).map((_,j)=>(
                  <td key={j}><div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"/></td>
                ))}</tr>
              )) : data.length===0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400 text-sm">Sonuç bulunamadı</td></tr>
              ) : data.map(r=>(
                <tr key={r.id}>
                  <td className="text-xs text-gray-400 whitespace-nowrap">{formatDate(r.tarih)}</td>
                  <td className="max-w-[220px]"><span className="truncate block" title={r.aciklama}>{r.aciklama}</span></td>
                  <td><ProjeBadge proje={r.proje} /></td>
                  <td className="text-xs">{r.islem_tarafi}</td>
                  <td className="text-xs text-gray-400">{r.karsi_taraf || '—'}</td>
                  <td className="text-xs text-gray-400">{r.banka || '—'}</td>
                  <td className="text-right amt-pos whitespace-nowrap">{r.gelir ? formatTRY(r.gelir) : ''}</td>
                  <td className="text-right amt-neg whitespace-nowrap">{r.gider ? formatTRY(r.gider) : ''}</td>
                  <td className="text-xs text-gray-400">{r.belge_no || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
