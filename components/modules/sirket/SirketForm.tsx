'use client'

/**
 * SirketForm - Şirket Form Bileşeni
 * 
 * Hero Alanı:
 * - Sol: LogoUploader + DocumentLoader
 * - Sağ: Kimlik, Tescil, Adres, İletişim grupları
 * 
 * Sekmeler:
 * 1. Kurumsal Kimlik
 * 2. Vergi ve SGK Bilgileri
 * 3. Ortaklar
 * 4. Şirket Temsilcileri
 * 5. ERP Ayarları
 * 
 * @see docs/templates/SirketForm.md
 */

import { useState, useEffect } from 'react'
import { Building2, Briefcase, Users, Settings, Shield, Globe, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoUploader, Logo } from './LogoUploader'
import { DocumentLoader, YüklenenDokuman } from './DocumentLoader'
import type { Sirket, SirketOrtak, SirketTemsilci } from '@/types/sirket'
import { 
  SIRKET_TURLERI, 
  TEHLIKE_SINIFLARI, 
  TEMSILCI_ROLLERI,
  PARA_BIRIMLERI,
  DILLER,
  SIRKET_DOKUMAN_TIPLERI 
} from '@/types/sirket'

// Form mode type
export type FormMode = 'create' | 'view' | 'edit'

// Custom FormTab with render support
interface FormTab {
  id: string
  label: string
  icon?: React.ReactNode
  fields?: any[]  // For field-based tabs
  render?: () => React.ReactNode  // For custom render tabs
}

interface SirketFormProps {
  mode: FormMode
  sirket?: Sirket | null
  onSave: (data: Record<string, any>, mode: FormMode) => void
  onCancel: () => void
  saving?: boolean
  deleting?: boolean
  onDelete?: () => void
  error?: string | null
}

// Dynamic Lists Component for array fields
function DynamicList({
  items,
  onChange,
  renderItem,
  addLabel,
  readOnly
}: {
  items: any[]
  onChange: (items: any[]) => void
  renderItem: (item: any, index: number, onItemChange: (item: any) => void, onRemove: () => void) => React.ReactNode
  addLabel: string
  readOnly?: boolean
}) {
  const handleAdd = () => {
    onChange([...items, {}])
  }

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, newItem: any) => {
    const newItems = [...items]
    newItems[index] = newItem
    onChange(newItems)
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="relative p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {renderItem(
            item,
            index,
            (newItem) => handleItemChange(index, newItem),
            () => handleRemove(index)
          )}
        </div>
      ))}
      
      {!readOnly && (
        <button
          type="button"
          onClick={handleAdd}
          className="w-full py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
        >
          + {addLabel}
        </button>
      )}
    </div>
  )
}

export function SirketForm({
  mode,
  sirket,
  onSave,
  onCancel,
  saving = false,
  deleting = false,
  onDelete,
  error = null
}: SirketFormProps) {
  // Extended form data with arrays
  const [formData, setFormData] = useState<Record<string, any>>({
    ...sirket,
    ortaklar: sirket?.ortaklar || [],
    temsilciler: sirket?.temsilciler || [],
    logolar: sirket?.logolar || [],
    dokumanlar: sirket?.dokumanlar || []
  })

  const isReadOnly = mode === 'view'
  const isCreate = mode === 'create'

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Custom Hero Section
  const renderHero = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Panel - Logo & Documents */}
      <div className="lg:col-span-3 space-y-4">
        <LogoUploader
          logolar={formData.logolar || []}
          onChange={(logolar) => handleFieldChange('logolar', logolar)}
          readOnly={isReadOnly}
        />
        
        <DocumentLoader
          dokumanTipleri={SIRKET_DOKUMAN_TIPLERI.map(t => ({ 
            value: t.value, 
            label: t.label, 
            required: t.required 
          }))}
          yuklenenDokumanlar={formData.dokumanlar || []}
          onChange={(dokumanlar) => handleFieldChange('dokumanlar', dokumanlar)}
          readOnly={isReadOnly}
        />
      </div>

      {/* Right Panel - Identity Groups */}
      <div className="lg:col-span-9">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kimlik - Identity */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Building2 size={16} />
              Kimlik
            </h4>
            
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Ticari Ünvan *</label>
                <input
                  type="text"
                  value={formData.ticari_unvan || ''}
                  onChange={(e) => handleFieldChange('ticari_unvan', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  placeholder="Örn: Eden Yazılım ve Danışmanlık A.Ş."
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Kısa Ünvan *</label>
                <input
                  type="text"
                  value={formData.kisa_unvan || ''}
                  onChange={(e) => handleFieldChange('kisa_unvan', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  placeholder="Örn: Eden"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">VKN/TCKN *</label>
                  <input
                    type="text"
                    value={formData.vkn_tckn || ''}
                    onChange={(e) => handleFieldChange('vkn_tckn', e.target.value)}
                    disabled={isReadOnly}
                    maxLength={11}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Vergi Dairesi *</label>
                  <input
                    type="text"
                    value={formData.vergi_dairesi || ''}
                    onChange={(e) => handleFieldChange('vergi_dairesi', e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    placeholder="Maltepe"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tescil - Registration */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <FileText size={16} />
              Tescil
            </h4>
            
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">MERSİS No</label>
                <input
                  type="text"
                  value={formData.mersis_no || ''}
                  onChange={(e) => handleFieldChange('mersis_no', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  placeholder="0-1234-5678-9101112131"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Ticaret Sicil No</label>
                <input
                  type="text"
                  value={formData.ticaret_sicil_no || ''}
                  onChange={(e) => handleFieldChange('ticaret_sicil_no', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  placeholder="123456"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Kuruluş Tarihi</label>
                  <input
                    type="date"
                    value={formData.kurulus_tarihi || ''}
                    onChange={(e) => handleFieldChange('kurulus_tarihi', e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Şirket Türü</label>
                  <select
                    value={formData.sirket_turu || ''}
                    onChange={(e) => handleFieldChange('sirket_turu', e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  >
                    <option value="">Seçin...</option>
                    {SIRKET_TURLERI.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Adres - Address */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Globe size={16} />
              Adres
            </h4>
            
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Ülke *</label>
                  <select
                    value={formData.ulke || 'Türkiye'}
                    onChange={(e) => handleFieldChange('ulke', e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  >
                    <option value="Türkiye">Türkiye</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">İl *</label>
                  <input
                    type="text"
                    value={formData.il || ''}
                    onChange={(e) => handleFieldChange('il', e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    placeholder="İstanbul"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">İlçe *</label>
                <input
                  type="text"
                  value={formData.ilce || ''}
                  onChange={(e) => handleFieldChange('ilce', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  placeholder="Maltepe"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Adres *</label>
                <textarea
                  value={formData.adres || ''}
                  onChange={(e) => handleFieldChange('adres', e.target.value)}
                  disabled={isReadOnly}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  placeholder="Cadde, sokak, bina no..."
                />
              </div>
            </div>
          </div>

          {/* İletişim - Contact */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Briefcase size={16} />
              İletişim
            </h4>
            
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Telefon</label>
                <input
                  type="tel"
                  value={formData.telefon || ''}
                  onChange={(e) => handleFieldChange('telefon', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  placeholder="+90 216 123 45 67"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  placeholder="info@company.com"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Web Sitesi</label>
                <input
                  type="url"
                  value={formData.web_sitesi || ''}
                  onChange={(e) => handleFieldChange('web_sitesi', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  placeholder="https://www.company.com"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Prepare tabs
  const tabs: FormTab[] = [
    {
      id: 'kurumsal',
      label: 'Kurumsal Kimlik',
      icon: <Building2 size={18} />,
      fields: [
        {
          name: 'legal_entity',
          label: 'Legal Entity',
          type: 'text',
          placeholder: 'Holding/legal bağlılık'
        },
        {
          name: 'parent_company_id',
          label: 'Parent Company',
          type: 'select',
          placeholder: 'Üst şirket (varsa)'
        },
        {
          name: 'sirket_kodu',
          label: 'Şirket Kodu',
          type: 'text',
          placeholder: 'Internal kod (EDN001 vb.)'
        }
      ]
    },
    {
      id: 'vergi-sgk',
      label: 'Vergi ve SGK Bilgileri',
      icon: <Shield size={18} />,
      render: () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vergi */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-300">Vergi Bilgileri</h4>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">VKN</label>
                  <input
                    type="text"
                    value={formData.vkn_tckn || ''}
                    disabled
                    className="w-full px-3 py-2 text-sm border rounded-md bg-gray-100 dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Vergi Dairesi</label>
                  <input
                    type="text"
                    value={formData.vergi_dairesi || ''}
                    disabled
                    className="w-full px-3 py-2 text-sm border rounded-md bg-gray-100 dark:bg-gray-900"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.e_fatura_mukellefi || false}
                    onChange={(e) => handleFieldChange('e_fatura_mukellefi', e.target.checked)}
                    disabled={isReadOnly}
                  />
                  <span className="text-sm">E-Fatura Mükellefi</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.e_arsiv_mukellefi || false}
                    onChange={(e) => handleFieldChange('e_arsiv_mukellefi', e.target.checked)}
                    disabled={isReadOnly}
                  />
                  <span className="text-sm">E-Arşiv Mükellefi</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.e_irsaliye_mukellefi || false}
                    onChange={(e) => handleFieldChange('e_irsaliye_mukellefi', e.target.checked)}
                    disabled={isReadOnly}
                  />
                  <span className="text-sm">E-İrsaliye Mükellefi</span>
                </label>
              </div>
            </div>
          </div>

          {/* SGK */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-300">SGK Bilgileri</h4>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">SGK İş Yeri Sicil No</label>
                <input
                  type="text"
                  value={formData.sgk_is_yeri_sicil_no || ''}
                  onChange={(e) => handleFieldChange('sgk_is_yeri_sicil_no', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">SGK İl</label>
                  <input
                    type="text"
                    value={formData.sgk_il || ''}
                    onChange={(e) => handleFieldChange('sgk_il', e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">SGK Şube</label>
                  <input
                    type="text"
                    value={formData.sgk_sube || ''}
                    onChange={(e) => handleFieldChange('sgk_sube', e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-500">NACE Kodları (virgülle ayırın)</label>
                <input
                  type="text"
                  value={(formData.nace_kodlari || []).join(', ')}
                  onChange={(e) => handleFieldChange('nace_kodlari', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800"
                  placeholder="62.01, 63.11"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500">Tehlike Sınıfı</label>
                <select
                  value={formData.tehlike_sinifi || ''}
                  onChange={(e) => handleFieldChange('tehlike_sinifi', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800"
                >
                  <option value="">Seçin...</option>
                  {TEHLIKE_SINIFLARI.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'ortaklar',
      label: 'Ortaklar',
      icon: <Users size={18} />,
      render: () => (
        <div className="space-y-4">
          <DynamicList
            items={formData.ortaklar || []}
            onChange={(ortaklar) => handleFieldChange('ortaklar', ortaklar)}
            readOnly={isReadOnly}
            addLabel="Ortak Ekle"
            renderItem={(ortak: Partial<SirketOrtak>, index, onChange, onRemove) => (
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-3">
                  <label className="text-xs text-gray-500">Ortak Adı *</label>
                  <input
                    type="text"
                    value={ortak.ortak_adi || ''}
                    onChange={(e) => onChange({ ...ortak, ortak_adi: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 text-sm border rounded-md"
                    placeholder="Ad Soyad / Şirket"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Tipi *</label>
                  <select
                    value={ortak.ortak_tipi || 'kisi'}
                    onChange={(e) => onChange({ ...ortak, ortak_tipi: e.target.value as any })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 text-sm border rounded-md"
                  >
                    <option value="kisi">Kişi</option>
                    <option value="sirket">Şirket</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-gray-500">TCKN/VKN *</label>
                  <input
                    type="text"
                    value={ortak.tckn_vkn || ''}
                    onChange={(e) => onChange({ ...ortak, tckn_vkn: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 text-sm border rounded-md"
                    placeholder="12345678901"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Hisse %</label>
                  <input
                    type="number"
                    value={ortak.hisse_orani || 0}
                    onChange={(e) => onChange({ ...ortak, hisse_orani: parseFloat(e.target.value) })}
                    disabled={isReadOnly}
                    min={0}
                    max={100}
                    step={0.01}
                    className="w-full px-3 py-2 text-sm border rounded-md"
                  />
                </div>
                <div className="col-span-1">
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={ortak.imza_yetkisi || false}
                      onChange={(e) => onChange({ ...ortak, imza_yetkisi: e.target.checked })}
                      disabled={isReadOnly}
                    />
                    İmza
                  </label>
                </div>
                <div className="col-span-1">
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={onRemove}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            )}
          />
        </div>
      )
    },
    {
      id: 'temsilciler',
      label: 'Şirket Temsilcileri',
      icon: <Briefcase size={18} />,
      render: () => (
        <div className="space-y-4">
          <DynamicList
            items={formData.temsilciler || []}
            onChange={(temsilciler) => handleFieldChange('temsilciler', temsilciler)}
            readOnly={isReadOnly}
            addLabel="Temsilci Ekle"
            renderItem={(temsilci: Partial<SirketTemsilci>, index, onChange, onRemove) => (
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-3">
                  <label className="text-xs text-gray-500">Ad Soyad *</label>
                  <input
                    type="text"
                    value={temsilci.ad_soyad || ''}
                    onChange={(e) => onChange({ ...temsilci, ad_soyad: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 text-sm border rounded-md"
                    placeholder="İsim Soyisim"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Görev</label>
                  <input
                    type="text"
                    value={temsilci.gorev || ''}
                    onChange={(e) => onChange({ ...temsilci, gorev: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 text-sm border rounded-md"
                    placeholder="Ünvan"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Yetki Türü *</label>
                  <select
                    value={temsilci.yetki_turu || 'diger'}
                    onChange={(e) => onChange({ ...temsilci, yetki_turu: e.target.value as any })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 text-sm border rounded-md"
                  >
                    {TEMSILCI_ROLLERI.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Telefon</label>
                  <input
                    type="tel"
                    value={temsilci.telefon || ''}
                    onChange={(e) => onChange({ ...temsilci, telefon: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 text-sm border rounded-md"
                    placeholder="+90 ..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Email</label>
                  <input
                    type="email"
                    value={temsilci.email || ''}
                    onChange={(e) => onChange({ ...temsilci, email: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 text-sm border rounded-md"
                    placeholder="email@company.com"
                  />
                </div>
                <div className="col-span-1">
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={onRemove}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            )}
          />
        </div>
      )
    },
    {
      id: 'erp-ayarlari',
      label: 'ERP Ayarları',
      icon: <Settings size={18} />,
      render: () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500">Varsayılan Para Birimi</label>
              <select
                value={formData.varsayilan_para_birimi || 'TRY'}
                onChange={(e) => handleFieldChange('varsayilan_para_birimi', e.target.value)}
                disabled={isReadOnly}
                className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800"
              >
                {PARA_BIRIMLERI.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs text-gray-500">Varsayılan Dil</label>
              <select
                value={formData.varsayilan_dil || 'tr'}
                onChange={(e) => handleFieldChange('varsayilan_dil', e.target.value)}
                disabled={isReadOnly}
                className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800"
              >
                {DILLER.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs text-gray-500">Zaman Dilimi</label>
              <select
                value={formData.zaman_dilimi || 'Europe/Istanbul'}
                onChange={(e) => handleFieldChange('zaman_dilimi', e.target.value)}
                disabled={isReadOnly}
                className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800"
              >
                <option value="Europe/Istanbul">Europe/Istanbul (UTC+3)</option>
                <option value="UTC">UTC</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500">Mali Yıl Başlangıcı (Ay)</label>
              <select
                value={formData.mali_yil_baslangici || 1}
                onChange={(e) => handleFieldChange('mali_yil_baslangici', parseInt(e.target.value))}
                disabled={isReadOnly}
                className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2024, i, 1).toLocaleString('tr-TR', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                checked={formData.is_active ?? true}
                onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                disabled={isReadOnly}
                id="sirket-aktif"
              />
              <label htmlFor="sirket-aktif" className="text-sm">
                Şirket Aktif
              </label>
            </div>
            
            <p className="text-xs text-gray-400">
              Pasif şirketler sistemde görünmez ve işlem yapılamaz.
            </p>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Custom Hero */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
        {renderHero()}
      </div>

      {/* Form Actions */}
      {!isReadOnly && (
        <div className="flex justify-end gap-3">
          {!isCreate && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              {deleting ? 'Siliniyor...' : 'Sil'}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => onSave(formData, mode)}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor...' : isCreate ? 'Oluştur' : 'Kaydet'}
          </button>
        </div>
      )}

      {isReadOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        {/* Tab Navigation */}
        <div className="flex gap-1 mb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content - All tabs shown for full form view */}
        <div className="space-y-8">
          {tabs.map((tab) => (
            <div key={tab.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </h3>
              {tab.render ? tab.render() : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tab.fields?.map((field) => (
                    <div key={field.name} className={field.colSpan === 2 ? 'md:col-span-2' : ''}>
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={formData[field.name] || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          disabled={isReadOnly}
                          className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                        >
                          <option value="">Seçin...</option>
                          {field.options?.map((opt: { value: string; label: string }) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={formData[field.name] || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          disabled={isReadOnly}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
