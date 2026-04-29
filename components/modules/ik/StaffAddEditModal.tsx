'use client'

import React, { useState, useRef, useEffect } from 'react'
import { User, Phone, GraduationCap, Briefcase, Landmark, Plus, X, Upload, Camera } from 'lucide-react'
import EdenModal from '@/components/ui/EdenModal'
import { ModalHeroSection } from '@/components/ui/ModalHeroSection'
import { cn } from '@/lib/utils'

interface FormData {
  // Hero fields
  fullname: string
  nationality: string
  idNumber: string
  gender: string
  birthPlace: string
  birthDate: string
  photo: string | null
  cvFile: File | null
  
  // Özel tab
  militaryStatus: string
  defermentDate: string
  disabilityStatus: boolean
  disabilityPercent: string
  bloodType: string
  criminalRecord: boolean
  
  // İletişim tab
  address: string
  city: string
  district: string
  contacts: Array<{ type: string; value: string }>
  emergencyContacts: Array<{ name: string; surname: string; relation: string; phone: string }>
  
  // Eğitim tab
  schools: Array<{ notLiterate: boolean; name: string; degree: string; department: string; graduationDate: string }>
  languages: Array<{ language: string; level: string; certificate: string }>
  courses: Array<{ name: string; subject: string; organization: string; certificateDate: string; certificate: string }>
  
  // Banka tab
  iban: string
}

const TURKEY_CODE = 'TR'
const MILITARY_STATUSES = ['Muaf', 'Çağında Değil', 'Belirsiz', 'Tecilli', 'Bakaya']
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-']
const LANGUAGE_LEVELS = ['Başlangıç', 'Orta', 'İyi', 'Çok İyi', 'Ana Dil']

const COUNTRIES = [
  { code: 'TR', name: 'Türkiye' },
  { code: 'US', name: 'Amerika Birleşik Devletleri' },
  { code: 'DE', name: 'Almanya' },
  { code: 'FR', name: 'Fransa' },
  { code: 'GB', name: 'Birleşik Krallık' },
  { code: 'IT', name: 'İtalya' },
  { code: 'ES', name: 'İspanya' },
  { code: 'NL', name: 'Hollanda' },
  { code: 'BE', name: 'Belçika' },
  { code: 'AT', name: 'Avusturya' },
  { code: 'CH', name: 'İsviçre' },
  { code: 'GR', name: 'Yunanistan' },
  { code: 'RU', name: 'Rusya' },
  { code: 'UA', name: 'Ukrayna' },
  { code: 'PL', name: 'Polonya' },
  { code: 'CZ', name: 'Çekya' },
  { code: 'HU', name: 'Macaristan' },
  { code: 'RO', name: 'Romanya' },
  { code: 'BG', name: 'Bulgaristan' },
  { code: 'SE', name: 'İsveç' },
  { code: 'NO', name: 'Norveç' },
  { code: 'DK', name: 'Danimarka' },
  { code: 'FI', name: 'Finlandiya' },
  { code: 'PT', name: 'Portekiz' },
  { code: 'IE', name: 'İrlanda' },
  { code: 'CA', name: 'Kanada' },
  { code: 'AU', name: 'Avustralya' },
  { code: 'JP', name: 'Japonya' },
  { code: 'CN', name: 'Çin' },
  { code: 'IN', name: 'Hindistan' },
  { code: 'BR', name: 'Brezilya' },
  { code: 'AR', name: 'Arjantin' },
  { code: 'MX', name: 'Meksika' },
  { code: 'ZA', name: 'Güney Afrika' },
  { code: 'EG', name: 'Mısır' },
  { code: 'SA', name: 'Suudi Arabistan' },
  { code: 'AE', name: 'Birleşik Arap Emirlikleri' },
  { code: 'TRNC', name: 'Kuzey Kıbrıs Türk Cumhuriyeti' },
  { code: 'AZ', name: 'Azerbaycan' },
  { code: 'KZ', name: 'Kazakistan' },
  { code: 'UZ', name: 'Özbekistan' },
  { code: 'IR', name: 'İran' },
  { code: 'IQ', name: 'Irak' },
  { code: 'SY', name: 'Suriye' },
  { code: 'JO', name: 'Ürdün' },
  { code: 'LB', name: 'Lübnan' },
  { code: 'IL', name: 'İsrail' },
  { code: 'CY', name: 'Kıbrıs' },
  { code: 'GE', name: 'Gürcistan' },
  { code: 'AM', name: 'Ermenistan' },
  { code: 'MK', name: 'Kuzey Makedonya' },
  { code: 'AL', name: 'Arnavutluk' },
  { code: 'RS', name: 'Sırbistan' },
  { code: 'BA', name: 'Bosna Hersek' },
  { code: 'HR', name: 'Hırvatistan' },
  { code: 'SI', name: 'Slovenya' },
  { code: 'SK', name: 'Slovakya' },
  { code: 'LV', name: 'Letonya' },
  { code: 'LT', name: 'Litvanya' },
  { code: 'EE', name: 'Estonya' },
  { code: 'IS', name: 'İzlanda' },
  { code: 'LU', name: 'Lüksemburg' },
  { code: 'MC', name: 'Monako' },
  { code: 'AD', name: 'Andorra' },
  { code: 'SM', name: 'San Marino' },
  { code: 'VA', name: 'Vatikan' },
  { code: 'MT', name: 'Malta' },
  { code: 'LI', name: 'Liechtenstein' }
]

export default function StaffAddEditModal({ open, onClose, onSuccess }: { open: boolean, onClose: () => void, onSuccess?: () => void }) {
  const [formData, setFormData] = useState<FormData>({
    fullname: '',
    nationality: TURKEY_CODE,
    idNumber: '',
    gender: '',
    birthPlace: '',
    birthDate: '',
    photo: null,
    cvFile: null,
    militaryStatus: '',
    defermentDate: '',
    disabilityStatus: false,
    disabilityPercent: '',
    bloodType: '',
    criminalRecord: false,
    address: '',
    city: '',
    district: '',
    contacts: [],
    emergencyContacts: [],
    schools: [],
    languages: [],
    courses: [],
    iban: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const cvInputRef = useRef<HTMLInputElement>(null)

  const isTurkey = formData.nationality === TURKEY_CODE
  const isMale = formData.gender === 'erkek'

  const countryList = COUNTRIES

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFormData(prev => ({ ...prev, cvFile: file }))
    setLoading(true)
    setError(null)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('file', file)

      const response = await fetch('/api/ik/personel/cv-parse', {
        method: 'POST',
        body: formDataToSend
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'CV işlenirken hata oluştu')
      }

      const { data } = await response.json()
      
      // Auto-fill form fields
      setFormData(prev => ({
        ...prev,
        fullname: data.fullname || prev.fullname,
        nationality: data.nationality || prev.nationality,
        idNumber: data.idNumber || prev.idNumber,
        gender: data.gender || prev.gender,
        birthPlace: data.birthPlace || prev.birthPlace,
        birthDate: data.birthDate || prev.birthDate,
        address: data.address || prev.address,
        city: data.city || prev.city,
        district: data.district || prev.district,
        iban: data.iban || prev.iban
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CV işlenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

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
          askerlik_durumu: isMale ? formData.militaryStatus : undefined,
          engellilik: formData.disabilityStatus,
          kan_grubu: formData.bloodType,
          hukumlulik: formData.criminalRecord,
          adres: formData.address,
          il: formData.city,
          ilce: formData.district,
          cep_telefonu: formData.contacts[0]?.value,
          email: formData.contacts.find(c => c.type === 'email')?.value,
          iban: formData.iban
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Kayıt başarısız')
      }

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
        onSuccess?.()
        // Reset form
        setFormData({
          fullname: '',
          nationality: TURKEY_CODE,
          idNumber: '',
          gender: '',
          birthPlace: '',
          birthDate: '',
          photo: null,
          cvFile: null,
          militaryStatus: '',
          defermentDate: '',
          disabilityStatus: false,
          disabilityPercent: '',
          bloodType: '',
          criminalRecord: false,
          address: '',
          city: '',
          district: '',
          contacts: [],
          emergencyContacts: [],
          schools: [],
          languages: [],
          courses: [],
          iban: ''
        })
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally {
      setLoading(false)
    }
  }

  const addContact = () => {
    setFormData(prev => ({ ...prev, contacts: [...prev.contacts, { type: 'phone', value: '' }] }))
  }

  const removeContact = (index: number) => {
    setFormData(prev => ({ ...prev, contacts: prev.contacts.filter((_, i) => i !== index) }))
  }

  const updateContact = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }))
  }

  const addEmergencyContact = () => {
    setFormData(prev => ({ ...prev, emergencyContacts: [...prev.emergencyContacts, { name: '', surname: '', relation: '', phone: '' }] }))
  }

  const removeEmergencyContact = (index: number) => {
    setFormData(prev => ({ ...prev, emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index) }))
  }

  const updateEmergencyContact = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }))
  }

  const addSchool = () => {
    setFormData(prev => ({ ...prev, schools: [...prev.schools, { notLiterate: false, name: '', degree: '', department: '', graduationDate: '' }] }))
  }

  const removeSchool = (index: number) => {
    setFormData(prev => ({ ...prev, schools: prev.schools.filter((_, i) => i !== index) }))
  }

  const updateSchool = (index: number, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      schools: prev.schools.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }))
  }

  const addLanguage = () => {
    setFormData(prev => ({ ...prev, languages: [...prev.languages, { language: '', level: '', certificate: '' }] }))
  }

  const removeLanguage = (index: number) => {
    setFormData(prev => ({ ...prev, languages: prev.languages.filter((_, i) => i !== index) }))
  }

  const updateLanguage = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.map((l, i) => i === index ? { ...l, [field]: value } : l)
    }))
  }

  const addCourse = () => {
    setFormData(prev => ({ ...prev, courses: [...prev.courses, { name: '', subject: '', organization: '', certificateDate: '', certificate: '' }] }))
  }

  const removeCourse = (index: number) => {
    setFormData(prev => ({ ...prev, courses: prev.courses.filter((_, i) => i !== index) }))
  }

  const updateCourse = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }))
  }

  const parseIBAN = (iban: string) => {
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase()
    if (!cleanIBAN.startsWith('TR') || cleanIBAN.length !== 26) return null
    
    const bankCode = cleanIBAN.substring(4, 9)
    const branchCode = cleanIBAN.substring(9, 13)
    
    // Bank codes mapping (simplified - can be expanded)
    const bankNames: Record<string, string> = {
      '00001': 'Ziraat Bankası',
      '00002': 'Halkbank',
      '00004': 'Vakıfbank',
      '00010': 'Garanti BBVA',
      '00011': 'Yapı Kredi',
      '00012': 'Akbank',
      '00059': 'İş Bankası',
      '00064': 'Denizbank',
      '00111': 'QNB Finansbank',
      '00124': 'Türkiye İş Bankası'
    }
    
    return {
      bank: bankNames[bankCode] || 'Bilinmeyen Banka',
      branch: branchCode
    }
  }

  const ibanInfo = parseIBAN(formData.iban)

  const HeroContent = (
    <ModalHeroSection
      leftSlot={
        <div className="relative group">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <div
            onClick={() => photoInputRef.current?.click()}
            className="w-36 h-36 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer overflow-hidden bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {formData.photo ? (
              <img
                src={formData.photo}
                alt="Fotoğraf"
                className="w-full h-full object-cover rounded-full"
                width={96}
                height={96}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                Fotoğraf
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Plus className="w-8 h-8 text-white bg-black/50 rounded-full p-1" />
            </div>
          <button
            onClick={() => cvInputRef.current?.click()}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Upload size={14} />
            CV Ekle (PDF/Word)
          </button>
          <input
            ref={cvInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleCVUpload}
            className="hidden"
          />
        </div>
      }
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
        <input
          list="countries"
          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          placeholder="Ülke ara..."
          value={formData.nationality}
          onChange={e => setFormData({ ...formData, nationality: e.target.value })}
        />
        <datalist id="countries">
          {countryList.map(c => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {isTurkey ? 'T.C. Kimlik No *' : 'Pasaport No *'}
        </label>
        <input
          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          placeholder={isTurkey ? '11 haneli T.C. Kimlik' : '3-20 karakter Pasaport No'}
          value={formData.idNumber}
          onChange={e => {
            const value = e.target.value
            if (isTurkey) {
              if (/^\d*$/.test(value) && value.length <= 11) {
                setFormData({ ...formData, idNumber: value })
              }
            } else {
              if (/^[a-zA-Z0-9]*$/.test(value) && value.length <= 20) {
                setFormData({ ...formData, idNumber: value })
              }
            }
          }}
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
      content: (
        <div className="space-y-6">
          {isMale && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Askerlik Durumu</label>
                <select
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={formData.militaryStatus}
                  onChange={e => setFormData({ ...formData, militaryStatus: e.target.value })}
                >
                  <option value="">Seçiniz</option>
                  {MILITARY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {formData.militaryStatus === 'Tecilli' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tecil Tarihi</label>
                  <input
                    type="date"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={formData.defermentDate}
                    onChange={e => setFormData({ ...formData, defermentDate: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Engellilik Durumu</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!formData.disabilityStatus}
                    onChange={() => setFormData({ ...formData, disabilityStatus: false })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Hayır</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={formData.disabilityStatus}
                    onChange={() => setFormData({ ...formData, disabilityStatus: true })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Evet</span>
                </label>
              </div>
            </div>
            {formData.disabilityStatus && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Engellilik Yüzdesi</label>
                <input
                  type="text"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Örn: %40"
                  value={formData.disabilityPercent}
                  onChange={e => setFormData({ ...formData, disabilityPercent: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kan Grubu</label>
              <select
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={formData.bloodType}
                onChange={e => setFormData({ ...formData, bloodType: e.target.value })}
              >
                <option value="">Seçiniz</option>
                {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hükümlülük Durumu</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!formData.criminalRecord}
                    onChange={() => setFormData({ ...formData, criminalRecord: false })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Hayır</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={formData.criminalRecord}
                    onChange={() => setFormData({ ...formData, criminalRecord: true })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Evet</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      label: 'İletişim',
      icon: <Phone size={16} />,
      content: (
        <div className="space-y-6">
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">İletişim Listesi</label>
              <button
                onClick={addContact}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Plus size={14} />
                Ekle
              </button>
            </div>
            {formData.contacts.map((contact, index) => (
              <div key={index} className="flex gap-2 items-start">
                <select
                  className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-2 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={contact.type}
                  onChange={e => updateContact(index, 'type', e.target.value)}
                >
                  <option value="phone">Telefon</option>
                  <option value="email">E-posta</option>
                </select>
                <input
                  className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder={contact.type === 'phone' ? '0555 555 55 55' : 'email@example.com'}
                  value={contact.value}
                  onChange={e => updateContact(index, 'value', e.target.value)}
                />
                <button
                  onClick={() => removeContact(index)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Acil Durumda Ulaşılacak Kişi</label>
              <button
                onClick={addEmergencyContact}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Plus size={14} />
                Ekle
              </button>
            </div>
            {formData.emergencyContacts.map((contact, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                <input
                  className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Adı"
                  value={contact.name}
                  onChange={e => updateEmergencyContact(index, 'name', e.target.value)}
                />
                <input
                  className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Soyadı"
                  value={contact.surname}
                  onChange={e => updateEmergencyContact(index, 'surname', e.target.value)}
                />
                <input
                  className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Yakınlık"
                  value={contact.relation}
                  onChange={e => updateEmergencyContact(index, 'relation', e.target.value)}
                />
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Telefon"
                    value={contact.phone}
                    onChange={e => updateEmergencyContact(index, 'phone', e.target.value)}
                  />
                  <button
                    onClick={() => removeEmergencyContact(index)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      label: 'Eğitim',
      icon: <GraduationCap size={16} />,
      content: (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Okuduğu Okullar</label>
              <button
                onClick={addSchool}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Plus size={14} />
                Ekle
              </button>
            </div>
            {formData.schools.map((school, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={school.notLiterate}
                    onChange={e => updateSchool(index, 'notLiterate', e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label className="text-sm text-gray-700 dark:text-gray-300">Okuryazar değil</label>
                </div>
                {!school.notLiterate && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="Okul Adı *"
                      value={school.name}
                      onChange={e => updateSchool(index, 'name', e.target.value)}
                    />
                    <input
                      className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="Derecesi *"
                      value={school.degree}
                      onChange={e => updateSchool(index, 'degree', e.target.value)}
                    />
                    <input
                      className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="Bölüm *"
                      value={school.department}
                      onChange={e => updateSchool(index, 'department', e.target.value)}
                    />
                    <input
                      type="date"
                      className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      value={school.graduationDate}
                      onChange={e => updateSchool(index, 'graduationDate', e.target.value)}
                    />
                  </div>
                )}
                <button
                  onClick={() => removeSchool(index)}
                  className="text-xs text-red-600 hover:text-red-700 dark:hover:text-red-400"
                >
                  Kaldır
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Yabancı Diller</label>
              <button
                onClick={addLanguage}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Plus size={14} />
                Ekle
              </button>
            </div>
            {formData.languages.map((lang, index) => (
              <div key={index} className="flex gap-2 items-start">
                <input
                  className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Dil *"
                  value={lang.language}
                  onChange={e => updateLanguage(index, 'language', e.target.value)}
                />
                <select
                  className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={lang.level}
                  onChange={e => updateLanguage(index, 'level', e.target.value)}
                >
                  <option value="">Seviye *</option>
                  {LANGUAGE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <input
                  className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Belge"
                  value={lang.certificate}
                  onChange={e => updateLanguage(index, 'certificate', e.target.value)}
                />
                <button
                  onClick={() => removeLanguage(index)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kurslar/Sertifikalar</label>
              <button
                onClick={addCourse}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Plus size={14} />
                Ekle
              </button>
            </div>
            {formData.courses.map((course, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-start">
                <input
                  className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Kurs Adı *"
                  value={course.name}
                  onChange={e => updateCourse(index, 'name', e.target.value)}
                />
                <input
                  className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Konusu *"
                  value={course.subject}
                  onChange={e => updateCourse(index, 'subject', e.target.value)}
                />
                <input
                  className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Veren Kuruluş *"
                  value={course.organization}
                  onChange={e => updateCourse(index, 'organization', e.target.value)}
                />
                <input
                  type="date"
                  className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={course.certificateDate}
                  onChange={e => updateCourse(index, 'certificateDate', e.target.value)}
                />
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Belge"
                    value={course.certificate}
                    onChange={e => updateCourse(index, 'certificate', e.target.value)}
                  />
                  <button
                    onClick={() => removeCourse(index)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      label: 'Banka',
      icon: <Landmark size={16} />,
      content: (
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">IBAN</label>
            <input
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono uppercase"
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              value={formData.iban}
              onChange={e => setFormData({ ...formData, iban: e.target.value })}
            />
          </div>
          {ibanInfo && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-medium">Banka:</span> {ibanInfo.bank}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-medium">Şube:</span> {ibanInfo.branch}
              </p>
            </div>
          )}
        </div>
      )
    },
    {
      label: 'İş',
      icon: <Briefcase size={16} />,
      content: (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-gray-500 dark:text-gray-400">Geliştirme Aşamasında</p>
        </div>
      )
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