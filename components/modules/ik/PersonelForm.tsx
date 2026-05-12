'use client'

import { useState } from 'react'
import { User, Phone, GraduationCap, Briefcase, Landmark, X, Briefcase as Job } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModuleLicense } from '@/hooks/useModuleLicense'
import { ImageSlotUploader, ImageSlot, SlotImage } from '@/components/ui/ImageSlotUploader'
import { DocumentSlotUploader, DocumentSlot, SlotDocument } from '@/components/ui/DocumentSlotUploader'
import { IBANInput } from '@/components/ui/IBANInput'
import { Toast, ToastType } from '@/components/ui/Toast'

export default function PersonelForm({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
  const [activeTab, setActiveTab] = useState('ozel')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showHireModal, setShowHireModal] = useState(false)
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null)
  const { isModuleActive, isSubmoduleActive } = useModuleLicense()

  // Check if IK module and Teskilat & Kadro submodule are active
  const isIKActive = isModuleActive('ik')
  const isTeskilatSubmoduleActive = isSubmoduleActive('ik', 'teskilat')
  const isTeskilatActive = isIKActive && isTeskilatSubmoduleActive

  // STANDARD FORM LAYOUT: Left panel - Top: Image (photo, expected), Bottom: Document (CV, optional)
  
  // Image slot for employee photo (expected but not required)
  const imageSlots: ImageSlot[] = [
    { id: 'photo', title: 'Fotoğraf', required: false },
  ]
  const [images, setImages] = useState<SlotImage[]>([])

  // Document slot for CV (optional)
  const documentSlots: DocumentSlot[] = [
    { id: 'cv', title: 'CV', required: false },
    { id: 'diploma', title: 'Diploma', required: false },
  ]
  const [documents, setDocuments] = useState<SlotDocument[]>([])

  // Database-compatible field names (Turkish snake_case)
  const [formData, setFormData] = useState({
    ad: '',
    soyad: '',
    uyruk: 'tc',
    tc_kimlik: '',
    pasaport_no: '',
    cinsiyet: '',
    dogum_yeri: '',
    dogum_tarihi: '',
    medeni_durum: '',
    adres: '',
    il: '',
    ilce: '',
    eposta: '',
    cep_telefonu: '',
    askerlik_durumu: '',
    tecil_tarihi: '',
    kan_grubu: '',
    ehliyet: '',
    ogrenim_durumu: '',
    okul: '',
    bolum: '',
    mezuniyet_tarihi: '',
    yabanci_dil: '',
    yabanci_dil_seviye: '',
    acil_kisi_ad: '',
    acil_kisi_telefon: '',
    iban: '',
    birim_id: '',
    pozisyon: '',
    is_active: true,
    ise_giris_tarihi: '',
    isten_cikis_tarihi: ''
  })

  const isTurkey = formData.uyruk === 'tc'

  // Map API field names to display names for error messages
  const fieldDisplayNames: Record<string, string> = {
    ad: 'Ad',
    soyad: 'Soyad',
    uyruk: 'Uyruk',
    tc_kimlik: 'T.C. Kimlik No',
    pasaport_no: 'Pasaport No',
    cinsiyet: 'Cinsiyet',
    dogum_yeri: 'Doğum Yeri',
    dogum_tarihi: 'Doğum Tarihi',
    cep_telefonu: 'Cep Telefonu',
    email: 'E-posta'
  }

  const handleSave = async () => {
    setLoading(true)
    setFieldErrors({})

    try {
      // Send data directly matching database schema
      const response = await fetch('/api/ik/personel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ad: formData.ad,
          soyad: formData.soyad,
          uyruk: formData.uyruk,
          tc_kimlik: isTurkey ? formData.tc_kimlik : undefined,
          pasaport_no: !isTurkey ? formData.pasaport_no : undefined,
          cinsiyet: formData.cinsiyet,
          dogum_yeri: formData.dogum_yeri,
          dogum_tarihi: formData.dogum_tarihi || undefined,
          medeni_durum: formData.medeni_durum || undefined,
          adres: formData.adres,
          il: formData.il,
          ilce: formData.ilce,
          email: formData.eposta || undefined,
          cep_telefonu: formData.cep_telefonu,
          askerlik_durumu: formData.askerlik_durumu || undefined,
          kan_grubu: formData.kan_grubu || undefined,
          acil_kisi_ad: formData.acil_kisi_ad || undefined,
          acil_kisi_telefon: formData.acil_kisi_telefon || undefined,
          iban: formData.iban || undefined,
          birim_id: formData.birim_id || undefined,
          sgk_giris: formData.ise_giris_tarihi || undefined,
          isten_ayrilis: formData.isten_cikis_tarihi || undefined,
          calisma_durumu: formData.is_active ? 'gorevde' : 'ayrilmis'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        // Parse Zod validation errors
        if (errorData.details?.fieldErrors) {
          const errors: Record<string, string> = {}
          const errorFieldNames: string[] = []
          Object.entries(errorData.details.fieldErrors).forEach(([key, value]) => {
            errors[key] = Array.isArray(value) ? value[0] : String(value)
            if (fieldDisplayNames[key]) {
              errorFieldNames.push(fieldDisplayNames[key])
            }
          })
          setFieldErrors(errors)

          // Build detailed error message with field names
          let errorMessage = 'Geçersiz veri'
          if (errorFieldNames.length > 0) {
            errorMessage = `Geçersiz veri: ${errorFieldNames.join(', ')}`
          }
          throw new Error(errorMessage)
        }
        throw new Error(errorData.error || 'Kayıt başarısız')
      }

      setToast({ type: 'success', message: 'Çalışan başarıyla kaydedildi' })
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Kayıt başarısız'
      setToast({ type: 'error', message: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'ozel', label: 'Özel', icon: <User size={16} /> },
    { id: 'iletisim', label: 'İletişim', icon: <Phone size={16} /> },
    { id: 'egitim', label: 'Eğitim', icon: <GraduationCap size={16} /> },
    { id: 'aile', label: 'Aile', icon: <Briefcase size={16} /> },
    { id: 'is', label: 'İş', icon: <Job size={16} /> },
    { id: 'banka', label: 'Banka', icon: <Landmark size={16} /> }
  ]

  return (
    <div className="space-y-6">
      {/* Fixed Hero Section */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Left Panel - Image & Document Slots */}
          <div className="w-full md:w-64 flex flex-col gap-6 items-center md:items-start">
            {/* Image Slot Uploader */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fotoğraflar</label>
              <ImageSlotUploader
                slots={imageSlots}
                images={images}
                onChange={setImages}
                allowExtraSlots={true}
              />
            </div>

            {/* Document Slot Uploader */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Belgeler</label>
              <DocumentSlotUploader
                slots={documentSlots}
                documents={documents}
                onChange={setDocuments}
                allowExtraSlots={true}
              />
            </div>
          </div>

          {/* Right Panel - Basic Info */}
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ad *</label>
                <input
                  className={cn(
                    "w-full bg-white dark:bg-gray-900 border rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500",
                    fieldErrors.ad ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-700"
                  )}
                  placeholder="Ad"
                  value={formData.ad}
                  onChange={e => setFormData({ ...formData, ad: e.target.value })}
                />
                {fieldErrors.ad && <span className="text-xs text-red-500">{fieldErrors.ad}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Soyad *</label>
                <input
                  className={cn(
                    "w-full bg-white dark:bg-gray-900 border rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500",
                    fieldErrors.soyad ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-700"
                  )}
                  placeholder="Soyad"
                  value={formData.soyad}
                  onChange={e => setFormData({ ...formData, soyad: e.target.value })}
                />
                {fieldErrors.soyad && <span className="text-xs text-red-500">{fieldErrors.soyad}</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Uyruk *</label>
                <select
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={formData.uyruk}
                  onChange={e => setFormData({ ...formData, uyruk: e.target.value })}
                >
                  <option value="tc">T.C.</option>
                  <option value="yabanci">Yabancı</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cinsiyet *</label>
                <select
                  className={cn(
                    "w-full bg-white dark:bg-gray-900 border rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500",
                    fieldErrors.cinsiyet ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-700"
                  )}
                  value={formData.cinsiyet}
                  onChange={e => setFormData({ ...formData, cinsiyet: e.target.value })}
                >
                  <option value="">Seçiniz</option>
                  <option value="erkek">Erkek</option>
                  <option value="kadin">Kadın</option>
                </select>
                {fieldErrors.cinsiyet && <span className="text-xs text-red-500">{fieldErrors.cinsiyet}</span>}
              </div>

              {isTurkey ? (
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">T.C. Kimlik No *</label>
                  <input
                    className={cn(
                      "w-full bg-white dark:bg-gray-900 border rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500",
                      fieldErrors.tc_kimlik ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-700"
                    )}
                    placeholder="11 haneli"
                    value={formData.tc_kimlik}
                    onChange={e => setFormData({ ...formData, tc_kimlik: e.target.value })}
                  />
                  {fieldErrors.tc_kimlik && <span className="text-xs text-red-500">{fieldErrors.tc_kimlik}</span>}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Pasaport No *</label>
                  <input
                    className={cn(
                      "w-full bg-white dark:bg-gray-900 border rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500",
                      fieldErrors.pasaport_no ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-700"
                    )}
                    placeholder="Pasaport No"
                    value={formData.pasaport_no}
                    onChange={e => setFormData({ ...formData, pasaport_no: e.target.value })}
                  />
                  {fieldErrors.pasaport_no && <span className="text-xs text-red-500">{fieldErrors.pasaport_no}</span>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Doğum Yeri</label>
                <input
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Doğum yeri"
                  value={formData.dogum_yeri}
                  onChange={e => setFormData({ ...formData, dogum_yeri: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Doğum Tarihi</label>
                <input
                  type="date"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={formData.dogum_tarihi}
                  onChange={e => setFormData({ ...formData, dogum_tarihi: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto flex-nowrap border-b border-gray-200 dark:border-gray-700 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0",
              activeTab === tab.id
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.slice(0, 3)}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'ozel' && (
        <div className="space-y-6">
          {/* Military Status (Conditional) */}
          {formData.cinsiyet === 'erkek' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Askerlik Durumu</label>
                <select
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={formData.askerlik_durumu}
                  onChange={e => setFormData({ ...formData, askerlik_durumu: e.target.value })}
                >
                  <option value="">Seçiniz</option>
                  <option value="muaf">Muaf</option>
                  <option value="caginda_degil">Askerlik Çağında Değil</option>
                  <option value="belirsiz">Belirsiz</option>
                  <option value="tecilli">Tecilli</option>
                  <option value="bakaya">Bakaya</option>
                </select>
              </div>

              {formData.askerlik_durumu === 'tecilli' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tecil Tarihi *</label>
                  <input
                    type="date"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={formData.tecil_tarihi}
                    onChange={e => setFormData({ ...formData, tecil_tarihi: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {/* Sağlık ve Ehliyet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kan Grubu</label>
              <select
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={formData.kan_grubu}
                onChange={e => setFormData({ ...formData, kan_grubu: e.target.value })}
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

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ehliyet</label>
              <input
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="B, C, D vb."
                value={formData.ehliyet}
                onChange={e => setFormData({ ...formData, ehliyet: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'iletisim' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Açık Adres</label>
              <textarea
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 min-h-20"
                placeholder="Açık adres"
                value={formData.adres}
                onChange={e => setFormData({ ...formData, adres: e.target.value })}
              />
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">İl</label>
              <input
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="İl"
                value={formData.il}
                onChange={e => setFormData({ ...formData, il: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">İlçe</label>
              <input
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="İlçe"
                value={formData.ilce}
                onChange={e => setFormData({ ...formData, ilce: e.target.value })}
              />
            </div>
          </div>

          {/* Telefon */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Telefon</label>
            <input
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="0555 555 55 55"
              value={formData.cep_telefonu}
              onChange={e => setFormData({ ...formData, cep_telefonu: e.target.value })}
            />
          </div>

          {/* E-posta */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">E-posta</label>
            <input
              type="email"
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="email@example.com"
              value={formData.eposta}
              onChange={e => setFormData({ ...formData, eposta: e.target.value })}
            />
          </div>
        </div>
        </div>
      )}

      {activeTab === 'egitim' && (
        <div className="space-y-6">
          {/* Eğitim Bilgileri */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Öğrenim Durumu</label>
              <select
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={formData.ogrenim_durumu}
                onChange={e => setFormData({ ...formData, ogrenim_durumu: e.target.value })}
              >
                <option value="">Seçiniz</option>
                <option value="ilkokul">İlkokul</option>
                <option value="ortaokul">Ortaokul</option>
                <option value="lise">Lise</option>
                <option value="on_lisans">Ön Lisans</option>
                <option value="lisans">Lisans</option>
                <option value="yuksek_lisans">Yüksek Lisans</option>
                <option value="doktora">Doktora</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Okul</label>
              <input
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Okul adı"
                value={formData.okul}
                onChange={e => setFormData({ ...formData, okul: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bölüm</label>
              <input
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Bölüm"
                value={formData.bolum}
                onChange={e => setFormData({ ...formData, bolum: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mezuniyet Tarihi</label>
              <input
                type="date"
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={formData.mezuniyet_tarihi}
                onChange={e => setFormData({ ...formData, mezuniyet_tarihi: e.target.value })}
              />
            </div>
          </div>
          
          {/* Yabancı Dil */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Yabancı Dil</label>
              <input
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Yabancı dil"
                value={formData.yabanci_dil}
                onChange={e => setFormData({ ...formData, yabanci_dil: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dil Seviyesi</label>
              <select
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={formData.yabanci_dil_seviye}
                onChange={e => setFormData({ ...formData, yabanci_dil_seviye: e.target.value })}
              >
                <option value="">Seçiniz</option>
                <option value="baslangic">Başlangıç</option>
                <option value="orta">Orta</option>
                <option value="iyi">İyi</option>
                <option value="ileri">İleri</option>
              </select>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'aile' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Medeni Durum</label>
            <select
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              value={formData.medeni_durum}
              onChange={e => setFormData({ ...formData, medeni_durum: e.target.value })}
            >
              <option value="">Seçiniz</option>
              <option value="bekar">Bekar</option>
              <option value="evli">Evli</option>
            </select>
          </div>

          {/* Acil Durum Kişisi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Acil Durum Kişisi</label>
              <input
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Ad Soyad"
                value={formData.acil_kisi_ad}
                onChange={e => setFormData({ ...formData, acil_kisi_ad: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Acil Telefon</label>
              <input
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Telefon"
                value={formData.acil_kisi_telefon}
                onChange={e => setFormData({ ...formData, acil_kisi_telefon: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'is' && (
        <div className="space-y-6">
          {/* Work Status Display */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  formData.is_active ? "bg-green-500" : "bg-red-500"
                )} />
                <span className="font-medium text-gray-900 dark:text-white">
                  {formData.is_active ? 'Aktif Çalışan' : 'İşten Ayrıldı'}
                </span>
              </div>
              {formData.ise_giris_tarihi && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  İşe Giriş: {formData.ise_giris_tarihi}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowHireModal(true)}
              disabled={!!formData.ise_giris_tarihi}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                formData.ise_giris_tarihi
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  : "bg-green-500 text-white hover:bg-green-600"
              )}
            >
              <Briefcase size={18} />
              İşe Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => formData.ise_giris_tarihi && setFormData({ ...formData, is_active: false })}
              disabled={!formData.ise_giris_tarihi || !formData.is_active}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                (!formData.ise_giris_tarihi || !formData.is_active)
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  : "bg-red-500 text-white hover:bg-red-600"
              )}
            >
              <X size={18} />
              İşten Çıkış Yap
            </button>
          </div>

          {/* Termination Form - Shows when termination is active */}
          {!formData.is_active && formData.ise_giris_tarihi && (
            <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                İşten Çıkış Bilgileri
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">İşten Çıkış Tarihi *</label>
                  <input
                    type="date"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={formData.isten_cikis_tarihi}
                    onChange={e => setFormData({ ...formData, isten_cikis_tarihi: e.target.value })}
                  />
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Hire Modal */}
      {showHireModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">İşe Giriş</h3>
              <button
                onClick={() => setShowHireModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Birim</label>
                  <input
                    disabled={!isTeskilatActive}
                    className={cn(
                      "w-full border rounded-md px-3 py-2 text-sm",
                      isTeskilatActive
                        ? "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    )}
                    placeholder="Birim ID"
                    value={formData.birim_id}
                    onChange={e => setFormData({ ...formData, birim_id: e.target.value })}
                  />
                  {!isTeskilatActive && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Teşkilat modülü pasif</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Pozisyon / Görev</label>
                  <input
                    disabled={!isTeskilatActive}
                    className={cn(
                      "w-full border rounded-md px-3 py-2 text-sm",
                      isTeskilatActive
                        ? "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    )}
                    placeholder="Pozisyon"
                    value={formData.pozisyon}
                    onChange={e => setFormData({ ...formData, pozisyon: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">İşe Giriş Tarihi *</label>
                  <input
                    type="date"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={formData.ise_giris_tarihi}
                    onChange={e => setFormData({ ...formData, ise_giris_tarihi: e.target.value })}
                  />
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowHireModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  if (formData.ise_giris_tarihi) {
                    setFormData({ ...formData, is_active: true })
                    setShowHireModal(false)
                  }
                }}
                disabled={!formData.ise_giris_tarihi}
                className={cn(
                  "px-4 py-2 rounded-lg transition-colors",
                  formData.ise_giris_tarihi
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                )}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'banka' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">IBAN</label>
            <IBANInput
              value={formData.iban}
              onChange={value => setFormData({ ...formData, iban: value })}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          İptal
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>


      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
