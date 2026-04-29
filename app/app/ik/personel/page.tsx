'use client'

import { useState, useMemo } from 'react'
import { usePersonel } from '@/hooks/usePersonel'
import { Users, Search, Filter, ChevronUp, ChevronDown, Plus, X, User, Phone, GraduationCap, Briefcase, Landmark, Upload, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageBanner } from '@/components/ui/PageBanner'

interface Column<T> {
  key: keyof T
  label: string
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, row: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  searchPlaceholder?: string
}

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchPlaceholder = "Ara..."
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filterColumn, setFilterColumn] = useState<keyof T | null>(null)
  const [filterValue, setFilterValue] = useState('')

  const filteredAndSortedData = useMemo(() => {
    let result = [...data]

    if (searchTerm) {
      result = result.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    if (filterColumn && filterValue) {
      result = result.filter(row =>
        String(row[filterColumn]).toLowerCase().includes(filterValue.toLowerCase())
      )
    }

    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]
        
        if (aVal === bVal) return 0
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1
        
        const comparison = String(aVal).localeCompare(String(bVal))
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return result
  }, [data, searchTerm, filterColumn, filterValue, sortColumn, sortDirection])

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortableColumns = columns.filter(col => col.sortable)
  const filterableColumns = columns.filter(col => col.filterable)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {filterableColumns.length > 0 && (
          <select
            value={String(filterColumn || '')}
            onChange={(e) => {
              setFilterColumn((e.target.value || null) as keyof T | null)
              setFilterValue('')
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Filtrele</option>
            {filterableColumns.map(col => (
              <option key={String(col.key)} value={String(col.key)}>
                {col.label}
              </option>
            ))}
          </select>
        )}
        
        {filterColumn && (
          <input
            type="text"
            placeholder="Filtre değeri..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.sortable && (
                        <button
                          onClick={() => handleSort(column.key)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                          {sortColumn === column.key ? (
                            sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                          ) : (
                            <Filter size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-200 dark:border-gray-800">
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/3" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredAndSortedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Kayıt bulunamadı
                  </td>
                </tr>
              ) : (
                filteredAndSortedData.map((row, i) => (
                  <tr key={i} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    {columns.map((column) => (
                      <td key={String(column.key)} className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                        {column.render ? column.render(row[column.key], row) : String(row[column.key] || '-')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function CalisanlarPage() {
  const [showAddForm, setShowAddForm] = useState(false)
  const { data: personel, loading, yenile } = usePersonel()

  const columns: Column<any>[] = [
    {
      key: 'ad',
      label: 'Ad',
      sortable: true,
      filterable: true,
      render: (value, row) => `${value} ${row.soyad}`
    },
    {
      key: 'birim',
      label: 'Birim',
      sortable: true,
      filterable: true,
      render: (value) => value?.ad || '-'
    },
    {
      key: 'kadronorm_kadrolar',
      label: 'Pozisyon',
      sortable: true,
      filterable: true,
      render: (value) => value?.unvan || '-'
    },
    {
      key: 'cep_telefonu',
      label: 'Telefon',
      sortable: false,
      filterable: true
    },
    {
      key: 'email',
      label: 'E-posta',
      sortable: false,
      filterable: true
    }
  ]

  return (
    <>
      <PageBanner
        title="Çalışanlar"
        icon={<Users size={24} />}
        onAddClick={() => setShowAddForm(!showAddForm)}
        addButtonText={showAddForm ? "Formu Kapat" : "Yeni Personel Ekle"}
      />

      <div className="mt-6">
        <DataTable
          data={personel}
          columns={columns}
          loading={loading}
          searchPlaceholder="Çalışan ara..."
        />
      </div>

      {showAddForm && (
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-bold mb-6">Yeni Personel Ekle</h2>
          <PersonelForm onSuccess={() => {
            setShowAddForm(false)
            yenile()
          }} onCancel={() => setShowAddForm(false)} />
        </div>
      )}
    </>
  )
}

function PersonelForm({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
  const [activeTab, setActiveTab] = useState('ozel')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fullname: '',
    nationality: 'TR',
    idNumber: '',
    gender: '',
    birthPlace: '',
    birthDate: '',
    address: '',
    city: '',
    district: '',
    phones: [''],
    emails: [''],
    photo: null as File | null,
    cv: null as File | null,
    militaryStatus: '',
    militaryExemptionDate: '',
    disabilityStatus: '',
    disabilityPercent: '',
    bloodType: '',
    criminalRecord: '',
    maritalStatus: '',
    familyMembers: [] as Array<{ name: string, surname: string, relation: string }>,
    isIlliterate: false,
    schools: [] as Array<{ name: string, degree: string, department: string, startDate: string, endDate: string }>,
    languages: [] as Array<{ name: string, level: string, document: File | null }>,
    courses: [] as Array<{ name: string, institution: string, document: File | null }>,
    iban: ''
  })

  const isTurkey = formData.nationality === 'TR'

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
          cep_telefonu: formData.phones[0] || '',
          email: formData.emails[0] || ''
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Kayıt başarısız')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'ozel', label: 'Özel', icon: <User size={16} /> },
    { id: 'iletisim', label: 'İletişim', icon: <Phone size={16} /> },
    { id: 'egitim', label: 'Eğitim', icon: <GraduationCap size={16} /> },
    { id: 'aile', label: 'Aile', icon: <Briefcase size={16} /> },
    { id: 'banka', label: 'Banka', icon: <Landmark size={16} /> }
  ]

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'ozel' && (
        <div className="space-y-6">
          {/* Photo and CV Upload */}
          <div className="flex gap-6">
            <div className="relative group">
              <div className="w-36 h-36 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-100 dark:bg-gray-800 overflow-hidden">
                {formData.photo ? (
                  <img src={URL.createObjectURL(formData.photo)} alt="Fotoğraf" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400">Fotoğraf</span>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <label className="cursor-pointer">
                  <Camera className="text-white" size={24} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setFormData({ ...formData, photo: e.target.files?.[0] || null })}
                  />
                </label>
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CV Yükle (PDF/Word)</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                {formData.cv ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{formData.cv.name}</span>
                    <button
                      onClick={() => setFormData({ ...formData, cv: null })}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    <Upload className="text-gray-400 mb-2" size={24} />
                    <span className="text-sm text-gray-500">Dosya seçmek için tıklayın</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => setFormData({ ...formData, cv: e.target.files?.[0] || null })}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Adı Soyadı *</label>
              <input
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Ad Soyad"
                value={formData.fullname}
                onChange={e => setFormData({ ...formData, fullname: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Uyruğu *</label>
              <select
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={formData.nationality}
                onChange={e => setFormData({ ...formData, nationality: e.target.value })}
              >
                <option value="TR">Türkiye</option>
                <option value="US">Amerika Birleşik Devletleri</option>
                <option value="DE">Almanya</option>
                <option value="FR">Fransa</option>
                <option value="GB">Birleşik Krallık</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isTurkey ? 'T.C. Kimlik No *' : 'Pasaport No *'}
              </label>
              <input
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder={isTurkey ? '11 haneli T.C. Kimlik' : 'Pasaport No'}
                value={formData.idNumber}
                onChange={e => setFormData({ ...formData, idNumber: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cinsiyet *</label>
              <select
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="">Seçiniz</option>
                <option value="erkek">Erkek</option>
                <option value="kadin">Kadın</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Doğum Yeri</label>
              <input
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Doğum yeri"
                value={formData.birthPlace}
                onChange={e => setFormData({ ...formData, birthPlace: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Doğum Tarihi</label>
              <input
                type="date"
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={formData.birthDate}
                onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
              />
            </div>
          </div>

          {/* Military Status (Conditional) */}
          {formData.gender === 'erkek' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Askerlik Durumu</label>
                <select
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={formData.militaryStatus}
                  onChange={e => setFormData({ ...formData, militaryStatus: e.target.value })}
                >
                  <option value="">Seçiniz</option>
                  <option value="muaf">Muaf</option>
                  <option value="caginda_degil">Askerlik Çağında Değil</option>
                  <option value="belirsiz">Belirsiz</option>
                  <option value="tecilli">Tecilli</option>
                  <option value="bakaya">Bakaya</option>
                </select>
              </div>

              {formData.militaryStatus === 'tecilli' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tecil Tarihi *</label>
                  <input
                    type="date"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={formData.militaryExemptionDate}
                    onChange={e => setFormData({ ...formData, militaryExemptionDate: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {/* Health and Legal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Engellilik Durumu</label>
              <select
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={formData.disabilityStatus}
                onChange={e => setFormData({ ...formData, disabilityStatus: e.target.value })}
              >
                <option value="">Seçiniz</option>
                <option value="yok">Yok</option>
                <option value="var">Var</option>
              </select>
            </div>

            {formData.disabilityStatus === 'var' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Engellilik Yüzdesi</label>
                <input
                  type="number"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="40"
                  value={formData.disabilityPercent}
                  onChange={e => setFormData({ ...formData, disabilityPercent: e.target.value })}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kan Grubu</label>
              <select
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={formData.bloodType}
                onChange={e => setFormData({ ...formData, bloodType: e.target.value })}
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hükümlülük Durumu</label>
              <select
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={formData.criminalRecord}
                onChange={e => setFormData({ ...formData, criminalRecord: e.target.value })}
              >
                <option value="">Seçiniz</option>
                <option value="yok">Yok</option>
                <option value="var">Var</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'iletisim' && (
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

          {/* Dynamic Phone Fields */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Telefonlar</label>
            {formData.phones.map((phone, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="0555 555 55 55"
                  value={phone}
                  onChange={e => {
                    const newPhones = [...formData.phones]
                    newPhones[index] = e.target.value
                    setFormData({ ...formData, phones: newPhones })
                  }}
                />
                {formData.phones.length > 1 && (
                  <button
                    onClick={() => {
                      const newPhones = formData.phones.filter((_, i) => i !== index)
                      setFormData({ ...formData, phones: newPhones })
                    }}
                    className="px-3 py-2 text-red-600 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setFormData({ ...formData, phones: [...formData.phones, ''] })}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus size={16} />
              Telefon Ekle
            </button>
          </div>

          {/* Dynamic Email Fields */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">E-postalar</label>
            {formData.emails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="email"
                  className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                  value={email}
                  onChange={e => {
                    const newEmails = [...formData.emails]
                    newEmails[index] = e.target.value
                    setFormData({ ...formData, emails: newEmails })
                  }}
                />
                {formData.emails.length > 1 && (
                  <button
                    onClick={() => {
                      const newEmails = formData.emails.filter((_, i) => i !== index)
                      setFormData({ ...formData, emails: newEmails })
                    }}
                    className="px-3 py-2 text-red-600 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setFormData({ ...formData, emails: [...formData.emails, ''] })}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus size={16} />
              E-posta Ekle
            </button>
          </div>
        </div>
      )}

      {activeTab === 'egitim' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="illiterate"
              checked={formData.isIlliterate}
              onChange={e => setFormData({ ...formData, isIlliterate: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="illiterate" className="text-sm font-medium text-gray-700 dark:text-gray-300">Okuryazar Değil</label>
          </div>

          {!formData.isIlliterate && (
            <>
              {/* Schools */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Okullar</label>
                {formData.schools.map((school, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-500">Okul Adı *</label>
                      <input
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Okul adı"
                        value={school.name}
                        onChange={e => {
                          const newSchools = [...formData.schools]
                          newSchools[index].name = e.target.value
                          setFormData({ ...formData, schools: newSchools })
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-500">Derece *</label>
                      <input
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Lisans, Yüksek Lisans"
                        value={school.degree}
                        onChange={e => {
                          const newSchools = [...formData.schools]
                          newSchools[index].degree = e.target.value
                          setFormData({ ...formData, schools: newSchools })
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-500">Bölüm *</label>
                      <input
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Bölüm"
                        value={school.department}
                        onChange={e => {
                          const newSchools = [...formData.schools]
                          newSchools[index].department = e.target.value
                          setFormData({ ...formData, schools: newSchools })
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex flex-col gap-1.5 flex-1">
                        <label className="text-xs text-gray-500">Başlangıç *</label>
                        <input
                          type="date"
                          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          value={school.startDate}
                          onChange={e => {
                            const newSchools = [...formData.schools]
                            newSchools[index].startDate = e.target.value
                            setFormData({ ...formData, schools: newSchools })
                          }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 flex-1">
                        <label className="text-xs text-gray-500">Bitiş *</label>
                        <input
                          type="date"
                          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          value={school.endDate}
                          onChange={e => {
                            const newSchools = [...formData.schools]
                            newSchools[index].endDate = e.target.value
                            setFormData({ ...formData, schools: newSchools })
                          }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const newSchools = formData.schools.filter((_, i) => i !== index)
                        setFormData({ ...formData, schools: newSchools })
                      }}
                      className="col-span-2 text-red-600 hover:text-red-700 text-sm"
                    >
                      Sil
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setFormData({ ...formData, schools: [...formData.schools, { name: '', degree: '', department: '', startDate: '', endDate: '' }] })}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus size={16} />
                  Okul Ekle
                </button>
              </div>

              {/* Languages */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Yabancı Diller</label>
                {formData.languages.map((lang, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-500">Dil *</label>
                      <input
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="İngilizce"
                        value={lang.name}
                        onChange={e => {
                          const newLanguages = [...formData.languages]
                          newLanguages[index].name = e.target.value
                          setFormData({ ...formData, languages: newLanguages })
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-500">Seviye *</label>
                      <select
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        value={lang.level}
                        onChange={e => {
                          const newLanguages = [...formData.languages]
                          newLanguages[index].level = e.target.value
                          setFormData({ ...formData, languages: newLanguages })
                        }}
                      >
                        <option value="">Seçiniz</option>
                        <option value="A1">A1</option>
                        <option value="A2">A2</option>
                        <option value="B1">B1</option>
                        <option value="B2">B2</option>
                        <option value="C1">C1</option>
                        <option value="C2">C2</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-500">Belge</label>
                      <input
                        type="file"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        onChange={e => {
                          const newLanguages = [...formData.languages]
                          newLanguages[index].document = e.target.files?.[0] || null
                          setFormData({ ...formData, languages: newLanguages })
                        }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        const newLanguages = formData.languages.filter((_, i) => i !== index)
                        setFormData({ ...formData, languages: newLanguages })
                      }}
                      className="col-span-3 text-red-600 hover:text-red-700 text-sm"
                    >
                      Sil
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setFormData({ ...formData, languages: [...formData.languages, { name: '', level: '', document: null }] })}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus size={16} />
                  Dil Ekle
                </button>
              </div>

              {/* Courses */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kurslar</label>
                {formData.courses.map((course, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-500">Kurs Adı *</label>
                      <input
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Kurs adı"
                        value={course.name}
                        onChange={e => {
                          const newCourses = [...formData.courses]
                          newCourses[index].name = e.target.value
                          setFormData({ ...formData, courses: newCourses })
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-500">Kurum *</label>
                      <input
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Kurum"
                        value={course.institution}
                        onChange={e => {
                          const newCourses = [...formData.courses]
                          newCourses[index].institution = e.target.value
                          setFormData({ ...formData, courses: newCourses })
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <label className="text-xs text-gray-500">Belge</label>
                      <input
                        type="file"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        onChange={e => {
                          const newCourses = [...formData.courses]
                          newCourses[index].document = e.target.files?.[0] || null
                          setFormData({ ...formData, courses: newCourses })
                        }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        const newCourses = formData.courses.filter((_, i) => i !== index)
                        setFormData({ ...formData, courses: newCourses })
                      }}
                      className="col-span-2 text-red-600 hover:text-red-700 text-sm"
                    >
                      Sil
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setFormData({ ...formData, courses: [...formData.courses, { name: '', institution: '', document: null }] })}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus size={16} />
                  Kurs Ekle
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'aile' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Medeni Durum</label>
            <select
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              value={formData.maritalStatus}
              onChange={e => setFormData({ ...formData, maritalStatus: e.target.value })}
            >
              <option value="">Seçiniz</option>
              <option value="bekar">Bekar</option>
              <option value="evli">Evli</option>
              <option value="bosanmis">Boşanmış</option>
            </select>
          </div>

          {/* Family Members */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Yakın Bilgileri</label>
            {formData.familyMembers.map((member, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-500">Ad *</label>
                  <input
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Ad"
                    value={member.name}
                    onChange={e => {
                      const newMembers = [...formData.familyMembers]
                      newMembers[index].name = e.target.value
                      setFormData({ ...formData, familyMembers: newMembers })
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-500">Soyad *</label>
                  <input
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Soyad"
                    value={member.surname}
                    onChange={e => {
                      const newMembers = [...formData.familyMembers]
                      newMembers[index].surname = e.target.value
                      setFormData({ ...formData, familyMembers: newMembers })
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-500">Yakınlık Derecesi *</label>
                  <input
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Anne, Baba, Eş"
                    value={member.relation}
                    onChange={e => {
                      const newMembers = [...formData.familyMembers]
                      newMembers[index].relation = e.target.value
                      setFormData({ ...formData, familyMembers: newMembers })
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    const newMembers = formData.familyMembers.filter((_, i) => i !== index)
                    setFormData({ ...formData, familyMembers: newMembers })
                  }}
                  className="col-span-3 text-red-600 hover:text-red-700 text-sm"
                >
                  Sil
                </button>
              </div>
            ))}
            <button
              onClick={() => setFormData({ ...formData, familyMembers: [...formData.familyMembers, { name: '', surname: '', relation: '' }] })}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus size={16} />
              Yakın Ekle
            </button>
          </div>
        </div>
      )}

      {activeTab === 'banka' && (
        <div className="space-y-4">
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
    </div>
  )
}
