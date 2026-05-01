'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { User, ArrowLeft, Trash2, Save, Loader2 } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { Toast, ToastType } from '@/components/ui/Toast'
import type { Personel } from '@/types'

export default function PersonelDetayPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [personel, setPersonel] = useState<Personel | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null)
  const [formData, setFormData] = useState<Partial<Personel>>({})

  useEffect(() => {
    fetchPersonel()
  }, [id])

  const fetchPersonel = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ik/personel/${id}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Personel bilgisi alınamadı')
      }

      setPersonel(result.data)
      setFormData(result.data)
    } catch (err: any) {
      setToast({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/ik/personel/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Güncelleme başarısız')
      }

      setPersonel(result.data)
      setToast({ type: 'success', message: 'Personel bilgileri güncellendi' })
    } catch (err: any) {
      setToast({ type: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Bu personel kaydını silmek istediğinize emin misiniz?')) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/ik/personel/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Silme işlemi başarısız')
      }

      setToast({ type: 'success', message: 'Personel kaydı silindi' })
      setTimeout(() => router.push('/app/ik/personel'), 1500)
    } catch (err: any) {
      setToast({ type: 'error', message: err.message })
      setDeleting(false)
    }
  }

  const handleChange = (field: keyof Personel, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <>
        <PageBanner 
          mode="form" 
          title="Personel Detayı" 
          icon={<User size={24} />}
          onBackClick={() => router.push('/app/ik/personel')}
        />
        <div className="mt-8 flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      </>
    )
  }

  if (!personel) {
    return (
      <>
        <PageBanner 
          mode="form" 
          title="Personel Detayı" 
          icon={<User size={24} />}
          onBackClick={() => router.push('/app/ik/personel')}
        />
        <div className="mt-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">Personel bulunamadı</p>
          <button
            onClick={() => router.push('/app/ik/personel')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Listeye Dön
          </button>
        </div>
      </>
    )
  }

  const fullName = `${formData.ad || ''} ${formData.soyad || ''}`.trim()

  return (
    <>
      <PageBanner
        title={fullName || 'Personel Detayı'}
        subtitle={personel.kadro?.unvan || personel.birim?.ad || undefined}
        icon={<User size={24} />}
        onAddClick={() => router.push('/app/ik/personel')}
        addButtonText="Listeye Dön"
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        {/* Header Actions */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => router.push('/app/ik/personel')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Geri</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
              <span className="hidden sm:inline">Sil</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              <span className="hidden sm:inline">Kaydet</span>
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Personal Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ad *</label>
              <input
                type="text"
                value={formData.ad || ''}
                onChange={(e) => handleChange('ad', e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Soyad *</label>
              <input
                type="text"
                value={formData.soyad || ''}
                onChange={(e) => handleChange('soyad', e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">TC Kimlik / Pasaport</label>
              <input
                type="text"
                value={formData.tc_kimlik || formData.pasaport_no || ''}
                onChange={(e) => handleChange(formData.uyruk === 'tc' ? 'tc_kimlik' : 'pasaport_no', e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Uyruk</label>
              <select
                value={formData.uyruk || 'tc'}
                onChange={(e) => handleChange('uyruk', e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="tc">T.C.</option>
                <option value="yabanci">Yabancı</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cinsiyet</label>
              <select
                value={formData.cinsiyet || ''}
                onChange={(e) => handleChange('cinsiyet', e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Seçiniz</option>
                <option value="erkek">Erkek</option>
                <option value="kadin">Kadın</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Doğum Tarihi</label>
              <input
                type="date"
                value={formData.dogum_tarihi ? formData.dogum_tarihi.split('T')[0] : ''}
                onChange={(e) => handleChange('dogum_tarihi', e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Doğum Yeri</label>
              <input
                type="text"
                value={formData.dogum_yeri || ''}
                onChange={(e) => handleChange('dogum_yeri', e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kan Grubu</label>
              <select
                value={formData.kan_grubu || ''}
                onChange={(e) => handleChange('kan_grubu', e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Seçiniz</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="0+">0+</option>
                <option value="0-">0-</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Medeni Durum</label>
              <select
                value={formData.medeni_durum || ''}
                onChange={(e) => handleChange('medeni_durum', e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Seçiniz</option>
                <option value="bekar">Bekar</option>
                <option value="evli">Evli</option>
                <option value="dul">Dul</option>
                <option value="bosanmis">Boşanmış</option>
              </select>
            </div>
          </div>

          {/* Contact Info */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">İletişim Bilgileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cep Telefonu</label>
                <input
                  type="tel"
                  value={formData.cep_telefonu || ''}
                  onChange={(e) => handleChange('cep_telefonu', e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">İş Telefonu</label>
                <input
                  type="tel"
                  value={formData.is_telefonu || ''}
                  onChange={(e) => handleChange('is_telefonu', e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">E-posta</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1 md:col-span-2 lg:col-span-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Adres</label>
                <textarea
                  value={formData.adres || ''}
                  onChange={(e) => handleChange('adres', e.target.value)}
                  rows={2}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">İl</label>
                <input
                  type="text"
                  value={formData.il || ''}
                  onChange={(e) => handleChange('il', e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">İlçe</label>
                <input
                  type="text"
                  value={formData.ilce || ''}
                  onChange={(e) => handleChange('ilce', e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Work Info */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Çalışma Bilgileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Çalışma Durumu</label>
                <select
                  value={formData.calisma_durumu || 'gorevde'}
                  onChange={(e) => handleChange('calisma_durumu', e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="gorevde">Görevde</option>
                  <option value="izinde">İzinde</option>
                  <option value="ayrilmis">Ayrılmış</option>
                  <option value="askida">Askıda</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">SGK Giriş Tarihi</label>
                <input
                  type="date"
                  value={formData.sgk_giris ? formData.sgk_giris.split('T')[0] : ''}
                  onChange={(e) => handleChange('sgk_giris', e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">İşten Ayrılış Tarihi</label>
                <input
                  type="date"
                  value={formData.isten_ayrilis ? formData.isten_ayrilis.split('T')[0] : ''}
                  onChange={(e) => handleChange('isten_ayrilis', e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">IBAN</label>
                <input
                  type="text"
                  value={formData.iban || ''}
                  onChange={(e) => handleChange('iban', e.target.value)}
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Acil Durum Kişisi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ad</label>
                <input
                  type="text"
                  value={formData.acil_kisi_ad || ''}
                  onChange={(e) => handleChange('acil_kisi_ad', e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Soyad</label>
                <input
                  type="text"
                  value={formData.acil_kisi_soyad || ''}
                  onChange={(e) => handleChange('acil_kisi_soyad', e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Yakınlık</label>
                <input
                  type="text"
                  value={formData.acil_kisi_yakinlik || ''}
                  onChange={(e) => handleChange('acil_kisi_yakinlik', e.target.value)}
                  placeholder="Eş, Anne, Baba, vb."
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Telefon</label>
                <input
                  type="tel"
                  value={formData.acil_kisi_telefon || ''}
                  onChange={(e) => handleChange('acil_kisi_telefon', e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notlar</h3>
            <div className="space-y-1">
              <textarea
                value={formData.notlar || ''}
                onChange={(e) => handleChange('notlar', e.target.value)}
                rows={4}
                placeholder="Personel hakkında notlar..."
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
