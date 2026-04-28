'use client'

import { useState } from 'react'
import { usePersonel } from '@/hooks/usePersonel'
import { useTeskilat } from '@/hooks/useTeskilat'
import { DurumBadge } from '@/components/ui/Badge'
import KpiCard from '@/components/ui/KpiCard'
import { initials } from '@/lib/utils'
import { Search, Plus, UserCheck, Clock, UserX, Users } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import StaffAddEditModal from '@/components/modules/ik/StaffAddEditModal'

const AVATAR_COLORS = ['#216688','#7c3aed','#0e8c61','#d97706','#db2777','#0891b2']
const SL = 'border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-eden-navy text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-eden-blue/20'

function PersonelEkleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({ ad: '', soyad: '', birim: '', pozisyon: '' })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-eden-navy-2 p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personel Ekle</h3>
        <div className="space-y-4">
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Ad
            <input
              value={formData.ad}
              onChange={(e) => setFormData(prev => ({ ...prev, ad: e.target.value }))}
              className="mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-eden-navy text-gray-900 dark:text-white px-3 py-2"
            />
          </label>
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Soyad
            <input
              value={formData.soyad}
              onChange={(e) => setFormData(prev => ({ ...prev, soyad: e.target.value }))}
              className="mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-eden-navy text-gray-900 dark:text-white px-3 py-2"
            />
          </label>
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Birim
            <input
              value={formData.birim}
              onChange={(e) => setFormData(prev => ({ ...prev, birim: e.target.value }))}
              className="mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-eden-navy text-gray-900 dark:text-white px-3 py-2"
            />
          </label>
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Pozisyon
            <input
              value={formData.pozisyon}
              onChange={(e) => setFormData(prev => ({ ...prev, pozisyon: e.target.value }))}
              className="mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-eden-navy text-gray-900 dark:text-white px-3 py-2"
            />
          </label>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
            İptal
          </button>
          <button onClick={onClose} className="flex-1 rounded-lg bg-eden-blue text-white px-4 py-2 text-sm hover:bg-eden-blue-dk">
            Ekle
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PersonelPage() {
  const [birimId, setBirimId] = useState('')
  const [durum, setDurum] = useState('')
  const [ara, setAra] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const { data, loading, gorevde, izinde, ayrilmis } = usePersonel({ birimId: birimId||undefined, durum: durum||undefined, ara: ara||undefined })
  const { birimler } = useTeskilat()

  function avatarColor(id: string) {
    return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length]
  }

  return (
    <>
      <PersonelEkleModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <PageBanner
        title="Çalışanlar"
        subtitle="Çalışan bilgilerini görüntüleyin ve yönetin"
        icon={<Users size={24} />}
        onAddClick={() => setModalOpen(true)}
        addButtonText="Ekle"
      />

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <KpiCard label="Görevde" value={gorevde} color="green"
          sub={<span className="flex items-center gap-1"><UserCheck size={11}/> Aktif</span> as any} />
        <KpiCard label="İzinde"  value={izinde}  color="blue"
          sub={<span className="flex items-center gap-1"><Clock size={11}/> İzin</span> as any} />
        <KpiCard label="Ayrılmış" value={ayrilmis} color="gray"
          sub={<span className="flex items-center gap-1"><UserX size={11}/> Pasif</span> as any} />
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={birimId} onChange={e=>setBirimId(e.target.value)} className={SL} style={{width:180}}>
          <option value="">Tüm Birimler</option>
          {birimler.map(b=><option key={b.id} value={b.id}>{b.ad}</option>)}
        </select>
        <select value={durum} onChange={e=>setDurum(e.target.value)} className={SL} style={{width:150}}>
          <option value="">Tüm Durumlar</option>
          <option value="gorevde">Görevde</option>
          <option value="izinde">İzinde</option>
          <option value="ayrilmis">Ayrılmış</option>
          <option value="askida">Askıda</option>
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input type="text" value={ara} onChange={e=>setAra(e.target.value)}
            placeholder="Ad Soyad ara..."
            className={`${SL} pl-8 w-full`} />
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {loading ? Array.from({length:4}).map((_,i)=>(
          <div key={i} className="card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse flex-shrink-0"/>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/3"/>
              <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2"/>
            </div>
          </div>
        )) : data.length === 0 ? (
          <div className="card p-10 text-center text-gray-400 text-sm">Personel bulunamadı</div>
        ) : data.map((p, idx) => (
          <div key={p.id}
            className={`card flex items-center gap-4 px-4 py-3 cursor-pointer hover:border-eden-blue/40 transition-all
              ${p.calisma_durumu === 'ayrilmis' ? 'opacity-60' : ''}`}>
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: avatarColor(p.id) }}>
              {initials(p.ad, p.soyad)}
            </div>
            {/* Bilgi */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800 dark:text-white">
                {p.ad} {p.soyad}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {(p as any).kadro?.unvan || '—'} • {(p as any).birim?.ad || '—'}
              </div>
            </div>
            {/* Şirket */}
            <div className="hidden md:block text-xs text-gray-400 flex-shrink-0">
              Eden Teknoloji A.Ş.
            </div>
            {/* Durum */}
            <DurumBadge durum={p.calisma_durumu} />
          </div>
        ))}
      </div>
    </>
  )
}
