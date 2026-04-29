'use client'

// MODULE LICENSE: ik/teskilat
// Ana Modül: İnsan Kaynakları (ik)
// Alt Modül: Teşkilat & Kadro (teskilat)

import { useState } from 'react'
import { useTeskilat } from '@/hooks/useTeskilat'
import { DurumBadge } from '@/components/ui/Badge'
import { formatTRY } from '@/lib/utils'
import { ChevronDown, ChevronRight, Building2, Layers, Users, Plus, Eye, Pencil } from 'lucide-react'
import type { Birim } from '@/types'

const TAB_IDS = ['kadro', 'istatistik', 'cinsiyet', 'butce'] as const
type TabId = typeof TAB_IDS[number]
const TAB_LABELS: Record<TabId, string> = {
  kadro: 'Norm Kadro', istatistik: 'Kadro İstatistikleri', cinsiyet: 'Cinsiyet & Engelli', butce: 'Bütçe Durumu'
}

const TIP_ICON: Record<string, React.ReactNode> = {
  sirket: <Building2 size={13} className="text-eden-blue" />,
  departman: <Layers size={13} className="text-eden-green" />,
  bolum: <Users size={13} className="text-eden-gold-dk" />,
  default: <Layers size={13} className="text-gray-400" />,
}

export default function TeskilatPage() {
  const { birimler, kadrolar, loading, buildTree, dolu, acik, dolulukOrani } = useTeskilat()
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [selId, setSelId] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('kadro')

  function toggleOpen(id: string) {
    setOpenIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const tree = buildTree(null)
  const selBirim = birimler.find(b => b.id === selId)
  const selKadrolar = kadrolar.filter(k => k.birim_id === selId)

  function TreeNode({ birim, depth = 0 }: { birim: Birim & { alt_birimler?: Birim[] }; depth?: number }) {
    const hasChildren = (birim.alt_birimler?.length ?? 0) > 0
    const isOpen = openIds.has(birim.id)
    const isSel = selId === birim.id
    return (
      <div>
        <div
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer group transition-colors
            ${isSel ? 'bg-eden-blue-lt dark:bg-eden-blue/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          onClick={() => { setSelId(birim.id); if (hasChildren) toggleOpen(birim.id) }}
        >
          {hasChildren ? (
            <button onClick={e => { e.stopPropagation(); toggleOpen(birim.id) }}
              className="w-4 h-4 flex items-center justify-center text-gray-400">
              {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </button>
          ) : <span className="w-4" />}
          {TIP_ICON[birim.tip] ?? TIP_ICON.default}
          <span className="text-xs flex-1 text-gray-700 dark:text-gray-200">{birim.ad}</span>
          <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full hidden group-hover:inline">
            {birim.tip}
          </span>
          <div className="hidden group-hover:flex gap-0.5 ml-1">
            <button className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-eden-blue rounded" title="Görüntüle"><Eye size={11}/></button>
            <button className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-eden-blue rounded" title="Düzenle"><Pencil size={11}/></button>
            <button className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-eden-green rounded" title="Alt Birim Ekle"><Plus size={11}/></button>
          </div>
        </div>
        {hasChildren && isOpen && (
          <div className="border-l border-gray-200 dark:border-gray-700 ml-4">
            {birim.alt_birimler!.map(child => (
              <TreeNode key={child.id} birim={child as any} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold font-display text-gray-900 dark:text-white mb-5">Teşkilat & Norm Kadro</h1>
      <div className="flex gap-4 h-[calc(100vh-160px)]">

        {/* Ağaç Paneli */}
        <div className="w-72 flex-shrink-0 card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800 dark:text-white">Teşkilat Yapısı</span>
            <button className="btn btn-primary btn-sm text-xs py-1 px-2"><Plus size={12}/> Şirket</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="space-y-2 p-2">
                {Array.from({length:5}).map((_,i)=>(
                  <div key={i} className="h-6 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"/>
                ))}
              </div>
            ) : tree.map(b => <TreeNode key={b.id} birim={b as any} />)}
          </div>
        </div>

        {/* Detay Paneli */}
        <div className="flex-1 card flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0 px-2">
            {TAB_IDS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap
                  ${tab === t
                    ? 'border-eden-blue text-eden-blue'
                    : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* NORM KADRO */}
            {tab === 'kadro' && (
              <div>
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-white">
                      {selBirim ? selBirim.ad : 'Bir birim seçin'}
                    </div>
                    {selBirim && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {selKadrolar.length} Kadro • {selKadrolar.filter(k=>k.durum==='dolu').length} Dolu • {selKadrolar.filter(k=>k.durum==='acik').length} Açık
                      </div>
                    )}
                  </div>
                  {selBirim && <button className="btn btn-primary btn-sm text-xs"><Plus size={12}/> Kadro Ekle</button>}
                </div>
                {!selBirim ? (
                  <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                    Sol taraftan bir birim seçin
                  </div>
                ) : (
                  <table className="data-table">
                    <thead><tr><th>Unvan</th><th>Çalışan</th><th>Durum</th><th className="text-right">Bütçe</th><th></th></tr></thead>
                    <tbody>
                      {selKadrolar.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">Bu birimde kadro tanımlanmamış</td></tr>
                      ) : selKadrolar.map(k => (
                        <tr key={k.id} className={k.durum==='acik' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}>
                          <td>
                            <span className="font-medium text-sm">{k.unvan}</span>
                            {k.amir && <span className="ml-2 text-[10px] text-eden-gold font-bold">★ Amir</span>}
                          </td>
                          <td className="text-sm text-gray-500 italic">
                            {k.durum === 'acik' ? '— Boş Kadro —' : ''}
                          </td>
                          <td><DurumBadge durum={k.durum} /></td>
                          <td className="text-right text-xs text-gray-400">{k.butce ? formatTRY(k.butce) : '—'}</td>
                          <td>
                            {k.durum === 'acik'
                              ? <button className="btn btn-primary btn-sm text-xs">İlan Aç</button>
                              : <button className="btn btn-sm text-xs">⋯</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* İSTATİSTİK */}
            {tab === 'istatistik' && (
              <div className="p-5 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { n: kadrolar.length, l: 'Toplam Kadro', c: 'text-gray-800 dark:text-white' },
                    { n: dolu, l: 'Dolu', c: 'text-eden-green' },
                    { n: acik, l: 'Açık', c: 'text-red-600' },
                    { n: formatTRY(kadrolar.filter(k=>k.durum==='dolu').reduce((s,k)=>s+(k.butce||0),0)), l: 'Dolu Kadro Bütçe', c: 'text-gray-800 dark:text-white' },
                    { n: `%${dolulukOrani}`, l: 'Doluluk Oranı', c: 'text-eden-green' },
                    { n: birimler.length, l: 'Birim Sayısı', c: 'text-eden-blue' },
                  ].map((s, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-eden-navy rounded-xl p-4 text-center">
                      <div className={`text-2xl font-bold font-display ${s.c}`}>{s.n}</div>
                      <div className="text-xs text-gray-400 mt-1">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Birim Bazlı Doluluk</div>
                  <div className="space-y-2.5">
                    {birimler.filter(b=>b.ust_birim_id !== null).map(b => {
                      const bK = kadrolar.filter(k=>k.birim_id===b.id)
                      const bDolu = bK.filter(k=>k.durum==='dolu').length
                      const pct = bK.length ? Math.round(bDolu/bK.length*100) : 0
                      return (
                        <div key={b.id} className="flex items-center gap-3">
                          <div className="w-24 text-xs text-gray-400 text-right flex-shrink-0">{b.ad}</div>
                          <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-eden-blue" style={{width:`${pct}%`}} />
                          </div>
                          <div className="w-12 text-xs font-medium text-gray-600 dark:text-gray-300">%{pct}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* CİNSİYET */}
            {tab === 'cinsiyet' && (
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-gray-50 dark:bg-eden-navy rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold font-display text-eden-blue">7</div>
                    <div className="text-xs text-gray-400 mt-1">Erkek (%58)</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-eden-navy rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold font-display" style={{color:'#d4537e'}}>5</div>
                    <div className="text-xs text-gray-400 mt-1">Kadın (%42)</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-eden-navy rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold font-display text-gray-800 dark:text-white">0</div>
                    <div className="text-xs text-gray-400 mt-1">Engelli</div>
                  </div>
                </div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Birim Bazlı Dağılım</div>
                {[
                  { birim: 'Mühendislik', e: 2, k: 1 },
                  { birim: 'Operasyon',   e: 1, k: 1 },
                  { birim: 'Yönetim',     e: 1, k: 0 },
                ].map(r => (
                  <div key={r.birim} className="flex items-center gap-3 mb-2.5">
                    <div className="w-24 text-xs text-gray-400 text-right">{r.birim}</div>
                    <div className="flex-1 h-3 rounded-full overflow-hidden flex">
                      <div style={{width:`${Math.round(r.e/(r.e+r.k||1)*100)}%`, background:'#216688'}} />
                      <div style={{width:`${Math.round(r.k/(r.e+r.k||1)*100)}%`, background:'#d4537e'}} />
                    </div>
                    <div className="text-xs text-gray-500 w-16">E:{r.e} K:{r.k}</div>
                  </div>
                ))}
              </div>
            )}

            {/* BÜTÇE */}
            {tab === 'butce' && (
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { n: formatTRY(kadrolar.reduce((s,k)=>s+(k.butce||0),0)), l: 'Onaylı Bütçe', c:'text-gray-800 dark:text-white' },
                    { n: formatTRY(kadrolar.filter(k=>k.durum==='dolu').reduce((s,k)=>s+(k.butce||0),0)), l: 'Kullanılan', c:'text-red-600' },
                    { n: formatTRY(kadrolar.filter(k=>k.durum==='acik').reduce((s,k)=>s+(k.butce||0),0)), l: 'Açık Kadro Bütçe', c:'text-eden-green' },
                  ].map((s,i)=>(
                    <div key={i} className="bg-gray-50 dark:bg-eden-navy rounded-xl p-4 text-center">
                      <div className={`text-xl font-bold font-display ${s.c}`}>{s.n}</div>
                      <div className="text-xs text-gray-400 mt-1">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
