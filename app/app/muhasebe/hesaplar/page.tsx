'use client'

import { useState } from 'react'
import { useNakitIslemler } from '@/hooks/useNakitIslemler'
import { formatTRY, formatDate } from '@/lib/utils'
import { ProjeBadge } from '@/components/ui/Badge'
import KpiCard from '@/components/ui/KpiCard'
import IslemModal from '@/components/modules/muhasebe/IslemModal'
import { Plus, CreditCard } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'

const TARAFLAR = ['Eden','İsmail ILGAR','Canberk','Ergün']
const SL = 'border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-eden-navy text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-eden-blue/20'

export default function HesaplarPage() {
  const [taraf, setTaraf] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const { data, loading } = useNakitIslemler({ islemTarafi: taraf||undefined })

  const rows = [...data].sort((a,b)=>b.tarih.localeCompare(a.tarih))
  const tGelir = rows.reduce((s,r)=>s+(r.gelir||0),0)
  const tGider = rows.reduce((s,r)=>s+(r.gider||0),0)

  return (
    <>
      <IslemModal open={modalOpen} onClose={()=>setModalOpen(false)} defaultTaraf={taraf||undefined} />

      <PageBanner
        mode="list"
        title="Hesaplar"
        icon={<CreditCard size={24} />}
        onAddClick={()=>setModalOpen(true)}
        addButtonText="Yeni İşlem"
      />

      {/* Filtre */}
      <div className="flex gap-2 mb-4">
        <select value={taraf} onChange={e=>setTaraf(e.target.value)} className={SL}>
          <option value="">Tüm Taraflar</option>
          {TARAFLAR.map(t=><option key={t}>{t}</option>)}
        </select>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Toplam Gelir"  value={formatTRY(tGelir)} color="green" />
        <KpiCard label="Toplam Gider"  value={formatTRY(tGider)} color="red" />
        <KpiCard label="Net"           value={formatTRY(tGelir-tGider)} color={tGelir-tGider>=0?'green':'red'} />
        <KpiCard label="İşlem Sayısı"  value={rows.length} color="blue" />
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th><th>Açıklama</th><th>Proje</th><th>İşlem Tarafı</th>
                <th>Karşı Taraf</th><th>Banka</th><th>Hesap Tipi</th><th>Hesap No</th>
                <th className="text-right">Gelir</th><th className="text-right">Gider</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:8}).map((_,i)=>(
                <tr key={i}>{Array.from({length:10}).map((_,j)=>(
                  <td key={j}><div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"/></td>
                ))}</tr>
              )) : rows.map(r=>(
                <tr key={r.id}>
                  <td className="text-xs text-gray-400 whitespace-nowrap">{formatDate(r.tarih)}</td>
                  <td className="max-w-[200px] truncate">{r.aciklama}</td>
                  <td><ProjeBadge proje={r.proje}/></td>
                  <td className="text-xs">{r.islem_tarafi}</td>
                  <td className="text-xs text-gray-400">{r.karsi_taraf||'—'}</td>
                  <td className="text-xs text-gray-400">{r.banka||'—'}</td>
                  <td className="text-xs text-gray-400">{r.hesap_tipi||'—'}</td>
                  <td className="text-xs text-gray-400 font-mono">{r.hesap_no||'—'}</td>
                  <td className="text-right amt-pos whitespace-nowrap">{r.gelir?formatTRY(r.gelir):''}</td>
                  <td className="text-right amt-neg whitespace-nowrap">{r.gider?formatTRY(r.gider):''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
