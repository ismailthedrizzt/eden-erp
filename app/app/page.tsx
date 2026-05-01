'use client'

import { useState, useEffect } from 'react'
import { usePersonel } from '@/hooks/usePersonel'
import { Plus, Settings, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageBanner } from '@/components/ui/PageBanner'

// Widget seçimi modalı
function WidgetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem('user_widgets')
      if (saved) {
        setSelectedWidgets(JSON.parse(saved))
      }
    }
  }, [open])

  const widgets = [
    { id: 'ik_ozeti', name: 'İK Özeti', module: 'İK', desc: 'Personel sayısı, izin durumu' },
    { id: 'kadro_doluluk', name: 'Kadro Doluluk', module: 'İK', desc: 'Kadroların doluluk oranı' },
    { id: 'nakit_akisi_kpi', name: 'Nakit Akışı KPI', module: 'Muhasebe', desc: 'Gelir, gider, bakiye' },
    { id: 'son_islemler', name: 'Son İşlemler', module: 'Muhasebe', desc: 'Son yapılan işlemler' },
    { id: 'borc_ozeti', name: 'Borç Özeti', module: 'Muhasebe', desc: 'Açık borçlar' },
    { id: 'duyurular', name: 'Duyurular', module: 'Genel', desc: 'Şirket duyuruları' },
    { id: 'gorevlerim', name: 'Görevlerim', module: 'Genel', desc: 'Kişisel görevler' },
  ]

  const saveWidgets = () => {
    localStorage.setItem('user_widgets', JSON.stringify(selectedWidgets))
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-eden-navy-2 rounded-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Widget&apos;ları Özelleştir</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {widgets.map(widget => (
            <label key={widget.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-eden-navy cursor-pointer">
              <input
                type="checkbox"
                checked={selectedWidgets.includes(widget.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedWidgets(prev => [...prev, widget.id])
                  } else {
                    setSelectedWidgets(prev => prev.filter(id => id !== widget.id))
                  }
                }}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">{widget.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{widget.module} • {widget.desc}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-eden-navy">
            İptal
          </button>
          <button onClick={saveWidgets} className="flex-1 py-2 px-4 bg-eden-blue text-white rounded-lg hover:bg-eden-blue-dk">
            Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AnaSayfa() {
  const [widgetModalOpen, setWidgetModalOpen] = useState(false)
  const { data: personel } = usePersonel()

  // Kullanıcı bilgilerini al (şimdilik sabit, gerçek auth'dan gelecek)
  const currentUser = {
    ad: 'İsmail',
    soyad: 'ILGAR',
    sgk_giris: '2024-01-15', // Demo tarih
    dogum_tarihi: '1990-04-27' // Demo tarih
  }

  // Süre hesaplaması
  const calculateDuration = (startDate: string) => {
    const start = new Date(startDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const years = Math.floor(diffDays / 365)
    const months = Math.floor((diffDays % 365) / 30)
    const days = diffDays % 30

    return { years, months, days }
  }

  // Doğum günü kontrolü
  const isBirthday = () => {
    if (!currentUser.dogum_tarihi) return false
    const today = new Date()
    const birth = new Date(currentUser.dogum_tarihi)
    return today.getMonth() === birth.getMonth() && today.getDate() === birth.getDate()
  }

  const duration = calculateDuration(currentUser.sgk_giris)
  const birthday = isBirthday()

  return (
    <>
      <WidgetModal open={widgetModalOpen} onClose={() => setWidgetModalOpen(false)} />

      <PageBanner
        mode="list"
        title={birthday ? `🎉 Doğum Günün Kutlu Olsun, ${currentUser.ad}!` : `Merhaba, ${currentUser.ad} 👋`}
        subtitle={birthday
          ? 'Bugün senin özel günün! 🎂'
          : `${duration.years} yıl ${duration.months} ay, ${duration.days} gündür bizimlesin. İyi ki varsın!`
        }
        icon={<Home size={24} />}
        onAddClick={() => setWidgetModalOpen(true)}
        addButtonText="Ekle"
      />

      {/* Widget Grid - Şimdilik boş */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Widget'lar buraya gelecek */}
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Settings size={48} className="mx-auto mb-4 opacity-50" />
          <p>Henüz widget eklenmemiş</p>
          <p className="text-sm mt-1">&quot;+Ekle&quot; butonuna tıklayarak widget&apos;ları ekleyebilirsiniz</p>
        </div>
      </div>
    </>
  )
}
