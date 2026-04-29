'use client'

import { useState } from 'react'
import { User, Phone, GraduationCap, Briefcase, Landmark } from 'lucide-react'
import EdenModal from '@/components/ui/EdenModal'
import { ModalHeroSection } from '@/components/ui/ModalHeroSection'

interface FormData {
  fullname: string
  nationality: string
  idNumber: string
  gender: string
  birthPlace: string
  birthDate: string
  address: string
  city: string
  district: string
  phone: string
  email: string
  iban: string
}

const TURKEY_CODE = 'TR'
const COUNTRIES = [
  { code: 'TR', name: 'Türkiye' },
  { code: 'US', name: 'Amerika Birleşik Devletleri' },
  { code: 'DE', name: 'Almanya' },
  { code: 'FR', name: 'Fransa' },
  { code: 'GB', name: 'Birleşik Krallık' }
]

export default function StaffAddEditModal({ open, onClose, onSuccess }: { open: boolean, onClose: () => void, onSuccess?: () => void }) {
  const [formData, setFormData] = useState<FormData>({
    fullname: '',
    nationality: TURKEY_CODE,
    idNumber: '',
    gender: '',
    birthPlace: '',
    birthDate: '',
    address: '',
    city: '',
    district: '',
    phone: '',
    email: '',
    iban: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isTurkey = formData.nationality === TURKEY_CODE

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ik/personel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ad: formData.fullname.split(' ')[0] || '',
          soyad: formData.fullname.split(' ').slice(1).join(' ') || '',
          uyruk: isTurkey ? 'tc' : 'yabanci',
          tc_kimlik: isTurkey ? formData.idNumber : undefined,
          pasaport_no: !isTurkey ? formData.idNumber : undefined,
          cinsiyet: formData.gender,
          dogum_yeri: formData.birthPlace,
          dogum_tarihi: formData.birthDate,
          adres: formData.address,
          il: formData.city,
          ilce: formData.district,
          cep_telefonu: formData.phone,
          email: formData.email,
          iban: formData.iban
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Kayıt başarısız')
      }

      onClose()
      onSuccess?.()
      setFormData({
        fullname: '',
        nationality: TURKEY_CODE,
        idNumber: '',
        gender: '',
        birthPlace: '',
        birthDate: '',
        address: '',
        city: '',
        district: '',
        phone: '',
        email: '',
        iban: ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally {
      setLoading(false)
    }
  }

  const HeroContent = (
    <ModalHeroSection
      leftSlot={<div className="w-36 h-36 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-100 dark:bg-gray-800">Fotoğraf</div>}
      message={error && <div className="text-red-600 dark:text-red-400">{error}</div>}
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Adı Soyadı *</label>
        <input
          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          placeholder="Ad Soyad"
          value={formData.fullname}
          onChange={e => setFormData({ ...formData, fullname: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Uyruğu *</label>
        <select
          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          value={formData.nationality}
          onChange={e => setFormData({ ...formData, nationality: e.target.value })}
        >
          {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {isTurkey ? 'T.C. Kimlik No *' : 'Pasaport No *'}
        </label>
        <input
          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          placeholder={isTurkey ? '11 haneli T.C. Kimlik' : 'Pasaport No'}
          value={formData.idNumber}
          onChange={e => setFormData({ ...formData, idNumber: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cinsiyet *</label>
        <select
          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          value={formData.gender}
          onChange={e => setFormData({ ...formData, gender: e.target.value })}
        >
          <option value="">Seçiniz</option>
          <option value="erkek">Erkek</option>
          <option value="kadin">Kadın</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Doğum Yeri</label>
        <input
          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          placeholder="Doğum yeri"
          value={formData.birthPlace}
          onChange={e => setFormData({ ...formData, birthPlace: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Doğum Tarihi</label>
        <input
          type="date"
          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          value={formData.birthDate}
          onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
        />
      </div>
    </ModalHeroSection>
  )

  const tabs = [
    {
      label: 'Özel',
      icon: <User size={16} />,
      content: <div className="p-4">Özel bilgileri</div>
    },
    {
      label: 'İletişim',
      icon: <Phone size={16} />,
      content: (
        <div className="space-y-4 p-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Adres</label>
            <textarea
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 min-h-20"
              placeholder="Açık adres"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">İl</label>
              <input
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="İl"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">İlçe</label>
              <input
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="İlçe"
                value={formData.district}
                onChange={e => setFormData({ ...formData, district: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Telefon</label>
              <input
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="0555 555 55 55"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">E-posta</label>
              <input
                type="email"
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
        </div>
      )
    },
    {
      label: 'Eğitim',
      icon: <GraduationCap size={16} />,
      content: <div className="p-4">Eğitim bilgileri</div>
    },
    {
      label: 'Banka',
      icon: <Landmark size={16} />,
      content: (
        <div className="space-y-4 p-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">IBAN</label>
            <input
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              value={formData.iban}
              onChange={e => setFormData({ ...formData, iban: e.target.value })}
            />
          </div>
        </div>
      )
    },
    {
      label: 'İş',
      icon: <Briefcase size={16} />,
      content: <div className="p-4">İş bilgileri</div>
    }
  ]

  return (
    <EdenModal
      open={open}
      onClose={onClose}
      title="Personel Tanımlama"
      heroSection={HeroContent}
      tabs={tabs}
      onSave={handleSave}
      loading={loading}
    />
  )
}
