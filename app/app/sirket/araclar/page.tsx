'use client'

// MODULE LICENSE: sirket/araclar
// Ana Modül: Şirket Yönetimi (sirket)
// Alt Modül: Şirket Araçlarımız

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  Car,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  FileText,
  Fuel,
  History,
  Image as ImageIcon,
  Plane,
  Plus,
  RefreshCw,
  Ship,
  ShieldCheck,
  Trash2,
  UserRound,
  Wrench,
  X,
} from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef, SortConfig, WidgetDef } from '@/components/ui/SmartDataTable'
import { DocumentSlotUploader, DocumentSlot, SlotDocument } from '@/components/ui/DocumentSlotUploader'
import { ImageSlotUploader, ImageSlot, SlotImage } from '@/components/ui/ImageSlotUploader'
import { formControlClass } from '@/components/ui/formControlStyles'
import { companyVehicleService } from '@/lib/services/companyVehicleService'
import type { ListMeta } from '@/lib/api/listEndpoint'
import { cn } from '@/lib/utils'

type PageState = 'list' | 'create' | 'view' | 'edit'
type VehicleCategory = 'Kara' | 'Deniz' | 'Hava'
type VehicleStatus = 'Aktif' | 'Atanmış' | 'Bakımda' | 'Kirada' | 'Operasyon Dışı' | 'Pasif'

interface Employee {
  id: string
  ad?: string
  last_name?: string
  title?: string
  email?: string
}

interface CompanyOption {
  id: string
  trade_name?: string
  short_name?: string
}

interface HistoryEntry {
  field?: string
  old_value?: unknown
  new_value?: unknown
  changed_at?: string
  changed_by?: string
}

interface Vehicle {
  id: string
  company_id?: string | null
  category: VehicleCategory
  vehicle_type: string
  brand: string
  manufacturer?: string | null
  model?: string | null
  model_year?: number | null
  color?: string | null
  registration_no?: string | null
  vin_serial_no?: string | null
  status: VehicleStatus | string
  ownership_type?: string | null
  assigned_to_employee_id?: string | null
  operator_employee_id?: string | null
  assigned_employee?: Employee | null
  operator_employee?: Employee | null
  location_name?: string | null
  current_usage_value?: number | null
  usage_unit?: string | null
  fuel_type?: string | null
  insurance_policy_no?: string | null
  insurance_expiry_date?: string | null
  inspection_expiry_date?: string | null
  maintenance_due_date?: string | null
  purchase_date?: string | null
  lease_start_date?: string | null
  lease_end_date?: string | null
  budget_code?: string | null
  cost_center?: string | null
  notes?: string | null
  api_notes?: string | null
  media?: SlotImage[]
  documents?: SlotDocument[]
  history?: HistoryEntry[]
  is_deleted?: boolean
}

const categoryTypes: Record<VehicleCategory, string[]> = {
  Kara: ['Otomobil', 'Kamyonet', 'Kamyon', 'Otobüs', 'Forklift', 'Motosiklet', 'İş Makinesi', 'Römork', 'Diğer'],
  Deniz: ['Tekne', 'Yat', 'Bot', 'Römorkör', 'Balıkçı Teknesi', 'Kargo Gemisi', 'Servis Teknesi', 'Diğer'],
  Hava: ['Drone', 'İHA', 'Helikopter', 'Uçak', 'Jet', 'Planör', 'Diğer'],
}

const statusOptions: VehicleStatus[] = ['Aktif', 'Atanmış', 'Bakımda', 'Kirada', 'Operasyon Dışı', 'Pasif']
const ownershipOptions = ['Şirket Malı', 'Leasing', 'Kiralık', 'Operasyonel Kiralama', 'Emanet']
const categoryOptions: VehicleCategory[] = ['Kara', 'Deniz', 'Hava']

const imageSlots: ImageSlot[] = [
  { id: 'main_photo', title: 'Ana Fotoğraf', description: 'Liste ve form önizlemesinde kullanılır' },
  { id: 'front_view', title: 'Ön Görünüm' },
  { id: 'side_view', title: 'Yan Görünüm' },
  { id: 'gallery', title: 'Galeri', description: 'Deniz ve hava varlıkları için ek görseller' },
]

const documentSlots: DocumentSlot[] = [
  { id: 'ruhsat', title: 'Ruhsat' },
  { id: 'lisans', title: 'Lisans' },
  { id: 'sigorta_policesi', title: 'Sigorta Poliçesi' },
  { id: 'muayene_belgesi', title: 'Muayene Belgesi' },
  { id: 'bakim_evraki', title: 'Bakım Evrakı' },
  { id: 'satin_alma_evraki', title: 'Satın Alma Evrakı' },
  { id: 'kiralama_sozlesmesi', title: 'Kiralama Sözleşmesi' },
  { id: 'denize_elverislilik', title: 'Denize Elverişlilik' },
  { id: 'ucusa_elverislilik', title: 'Uçuşa Elverişlilik' },
  { id: 'diger', title: 'Diğer Belgeler' },
]

export default function AraclarPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [overlayVehicle, setOverlayVehicle] = useState<Vehicle | null>(null)
  const [pageState, setPageState] = useState<PageState>('list')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [listQuery, setListQuery] = useState({ page: 1, pageSize: 50, search: '', sort: 'created_at', direction: 'desc' as 'asc' | 'desc' })
  const [listMeta, setListMeta] = useState<ListMeta>({ page: 1, pageSize: 50, total: 0, totalPages: 1 })

  const loadReferences = useCallback(async (force = false) => {
    const payload = await companyVehicleService.references({ useCache: !force })
    setEmployees(Array.isArray(payload.employees) ? payload.employees : [])
    setCompanies(Array.isArray(payload.companies) ? payload.companies : [])
  }, [])

  const loadData = useCallback(async (force = false) => {
    setLoading(true)
    try {
      if (force) companyVehicleService.invalidateList()
      const payload = await companyVehicleService.list({ useCache: !force, ...listQuery })
      setVehicles(Array.isArray(payload.vehicles) ? payload.vehicles : [])
      setListMeta(payload.meta ?? { page: listQuery.page, pageSize: listQuery.pageSize, total: payload.vehicles?.length ?? 0, totalPages: 1 })
      loadReferences(force).catch(() => {
        setEmployees([])
        setCompanies([])
      })
      if (payload.warning) setToast(payload.warning)
    } catch (error: unknown) {
      setToast(error instanceof Error ? error.message : 'Araç verisi yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [listQuery, loadReferences])

  useEffect(() => {
    loadData()
  }, [loadData])

  const activeVehicles = useMemo(() => vehicles.filter((vehicle) => !vehicle.is_deleted), [vehicles])
  const expiringVehicles = useMemo(() => activeVehicles.filter((vehicle) => hasUpcomingWarning(vehicle)).length, [activeVehicles])
  const tableData = useMemo(() => activeVehicles.map(enrichVehicleForTable), [activeVehicles])

  const columns: ColumnDef[] = [
    { key: 'vehicle_name', label: 'Araç', type: 'text', width: 240, render: (_value: unknown, row: Vehicle) => <VehicleNameCell vehicle={row} /> },
    { key: 'category', label: 'Kategori', type: 'enum', width: 110, render: (_value: unknown, row: Vehicle) => <CategoryBadge category={row.category} /> },
    { key: 'vehicle_type', label: 'Tip', type: 'text', width: 130 },
    { key: 'registration_no', label: 'Plaka / Tescil', type: 'text', width: 150 },
    { key: 'assigned_name', label: 'Zimmet / Operatör', type: 'text', width: 190, render: (_value: unknown, row: Vehicle) => personName(row.assigned_employee) || personName(row.operator_employee) || 'Atanmamış' },
    { key: 'status', label: 'Durum', type: 'enum', width: 130, render: (_value: unknown, row: Vehicle) => <StatusBadge status={row.status} /> },
    { key: 'risk', label: 'Takip', type: 'text', width: 180, render: (_value: unknown, row: Vehicle) => <RiskBadges vehicle={row} /> },
    { key: 'actions', label: 'İşlemler', type: 'text', width: 260, render: (_value: unknown, row: Vehicle) => <VehicleActions vehicle={row} onView={openView} onEdit={openEdit} onOverlay={setOverlayVehicle} onPassive={softDeleteVehicle} /> },
  ]

  const widgets: WidgetDef<Vehicle>[] = useMemo(() => [
    { key: 'total', label: 'Aktif Araç', render: () => activeVehicles.length },
    { key: 'road', label: 'Kara', render: () => activeVehicles.filter((vehicle) => vehicle.category === 'Kara').length },
    { key: 'marine', label: 'Deniz', render: () => activeVehicles.filter((vehicle) => vehicle.category === 'Deniz').length },
    { key: 'air', label: 'Hava', render: () => activeVehicles.filter((vehicle) => vehicle.category === 'Hava').length },
    { key: 'warnings', label: 'Yaklaşan Takip', render: () => expiringVehicles },
  ], [activeVehicles, expiringVehicles])

  const handleListSortChange = (sorts: SortConfig[]) => {
    const sort = sorts[0]
    setListQuery(prev => ({ ...prev, page: 1, sort: sort?.key || 'created_at', direction: sort?.direction || 'desc' }))
  }

  function openCreate() {
    if (employees.length === 0 || companies.length === 0) {
      loadReferences().catch(() => undefined)
    }
    setSelectedVehicle(createEmptyVehicle())
    setPageState('create')
  }

  function openView(vehicle: Vehicle) {
    setSelectedVehicle(vehicle)
    setPageState('view')
  }

  function openEdit(vehicle: Vehicle) {
    setSelectedVehicle(vehicle)
    setPageState('edit')
  }

  async function saveVehicle(vehicle: Vehicle) {
    setSaving(true)
    try {
      if (pageState === 'create') await companyVehicleService.create(vehicle as unknown as Record<string, unknown>)
      else await companyVehicleService.update(vehicle as unknown as Record<string, unknown>)
      await loadData(true)
      setSelectedVehicle(null)
      setPageState('list')
    } catch (error: unknown) {
      setToast(error instanceof Error ? error.message : 'Arac kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  async function softDeleteVehicle(vehicle: Vehicle) {
    try {
      await companyVehicleService.delete(vehicle.id)
      await loadData(true)
    } catch (error: unknown) {
      setToast(error instanceof Error ? error.message : 'Arac pasiflestirilemedi')
    }
  }

  return (
    <div className="relative">
      <PageBanner
        mode={pageState === 'list' ? 'list' : 'form'}
        formMode={pageState === 'edit' ? 'edit' : pageState === 'create' ? 'create' : 'view'}
        title={pageState === 'list' ? 'Araçlarımız' : pageState === 'create' ? 'Yeni Araç Kaydı' : vehicleTitle(selectedVehicle)}
        subtitle={pageState === 'list' ? 'Kara, deniz ve hava araçları için filo, bakım, belge ve zimmet merkezi' : 'Araç kayıt detayları, belgeler ve operasyon bilgileri'}
        icon={<Car size={24} />}
        onAddClick={openCreate}
        addButtonText="Yeni Araç Ekle"
        onBackClick={() => setPageState('list')}
      />

      {toast && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <span className="flex items-center gap-2"><AlertTriangle size={16} />{toast}</span>
          <button type="button" onClick={() => setToast(null)} className="rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900/50"><X size={16} /></button>
        </div>
      )}

      {pageState === 'list' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700">
              <Plus size={16} />Yeni Araç Ekle
            </button>
            <button type="button" onClick={() => loadData(true)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900">
              <RefreshCw size={16} />Yenile
            </button>
            <div className="ml-auto flex flex-wrap gap-2 text-xs">
              <FleetPill icon={<Car size={14} />} label="Kara Araçları" value={activeVehicles.filter((vehicle) => vehicle.category === 'Kara').length} />
              <FleetPill icon={<Ship size={14} />} label="Deniz Araçları" value={activeVehicles.filter((vehicle) => vehicle.category === 'Deniz').length} />
              <FleetPill icon={<Plane size={14} />} label="Hava Araçları" value={activeVehicles.filter((vehicle) => vehicle.category === 'Hava').length} />
            </div>
          </div>

          <SmartDataTable
            columns={columns}
            data={tableData}
            widgets={widgets}
            loading={loading}
            defaultView="list"
            storageKey="sirket-araclar"
            emptyText="Araç kaydı bulunamadı"
            onRowClick={openView}
            onRefresh={() => loadData(true)}
            defaultPageSize={listQuery.pageSize}
            pagination={{
              mode: 'server',
              page: listMeta.page,
              pageSize: listMeta.pageSize,
              total: listMeta.total,
              onPageChange: page => setListQuery(prev => ({ ...prev, page })),
              onPageSizeChange: pageSize => setListQuery(prev => ({ ...prev, page: 1, pageSize })),
              onSearchChange: search => setListQuery(prev => ({ ...prev, page: 1, search })),
              onSortChange: handleListSortChange,
            }}
          />
        </div>
      )}

      {pageState !== 'list' && selectedVehicle && (
        <VehicleForm
          vehicle={selectedVehicle}
          employees={employees}
          companies={companies}
          mode={pageState}
          saving={saving}
          onSave={saveVehicle}
          onCancel={() => setPageState('list')}
          onModeChange={() => setPageState('edit')}
        />
      )}

      {overlayVehicle && (
        <VehicleOverlay vehicle={overlayVehicle} onClose={() => setOverlayVehicle(null)} onEdit={(vehicle) => { setOverlayVehicle(null); openEdit(vehicle) }} />
      )}
    </div>
  )
}

function VehicleForm({
  vehicle,
  employees,
  companies,
  mode,
  saving,
  onSave,
  onCancel,
  onModeChange,
}: {
  vehicle: Vehicle
  employees: Employee[]
  companies: CompanyOption[]
  mode: PageState
  saving: boolean
  onSave: (vehicle: Vehicle) => void
  onCancel: () => void
  onModeChange: () => void
}) {
  const [formData, setFormData] = useState<Vehicle>(vehicle)
  const [activeTab, setActiveTab] = useState('genel')
  const readOnly = mode === 'view'
  const category = formData.category || 'Kara'
  const vehicleTypes = categoryTypes[category] || categoryTypes.Kara

  useEffect(() => {
    setFormData(vehicle)
  }, [vehicle])

  function updateField<K extends keyof Vehicle>(key: K, value: Vehicle[K]) {
    setFormData((current) => {
      if (key === 'category') {
        const nextCategory = value as VehicleCategory
        return { ...current, category: nextCategory, vehicle_type: categoryTypes[nextCategory][0], usage_unit: nextCategory === 'Kara' ? 'km' : 'saat' }
      }
      return { ...current, [key]: value }
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card title="Araç Medyası" icon={<ImageIcon size={18} />}>
            <ImageSlotUploader
              slots={imageSlots}
              images={formData.media || []}
              onChange={(images) => updateField('media', images)}
              readOnly={readOnly}
              allowExtraSlots
            />
          </Card>
          <Card title="Belgeler" icon={<FileText size={18} />}>
            <DocumentSlotUploader
              slots={documentSlots}
              documents={formData.documents || []}
              onChange={(documents) => updateField('documents', documents)}
              readOnly={readOnly}
              allowExtraSlots
              aiBadge={{ label: 'Belge Takibi', title: 'Sigorta, muayene ve bakım belgeleri ileride otomasyonlara bağlanabilir.' }}
            />
          </Card>
        </div>

        <Card title="TEMEL BİLGİLER" subtitle="Araç kayıt detayları" icon={categoryIcon(category)}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <SelectField label="Araç Kategorisi" value={formData.category} onChange={(value) => updateField('category', value as VehicleCategory)} options={categoryOptions} readOnly={readOnly} required />
            <SelectField label="Araç Tipi" value={formData.vehicle_type} onChange={(value) => updateField('vehicle_type', value)} options={vehicleTypes} readOnly={readOnly} required />
            <InputField label="Marka / Üretici" value={formData.brand} onChange={(value) => updateField('brand', value)} readOnly={readOnly} required />

            <InputField label="Model" value={formData.model || ''} onChange={(value) => updateField('model', value)} readOnly={readOnly} />
            <InputField label="Yıl" type="number" value={formData.model_year || ''} onChange={(value) => updateField('model_year', value ? Number(value) : null)} readOnly={readOnly} />
            <InputField label="Renk" value={formData.color || ''} onChange={(value) => updateField('color', value)} readOnly={readOnly} />

            <InputField label="Plaka / Tescil No" value={formData.registration_no || ''} onChange={(value) => updateField('registration_no', value)} readOnly={readOnly} history={fieldHistory(formData.history, 'registration_no')} />
            <InputField label="VIN / Seri No" value={formData.vin_serial_no || ''} onChange={(value) => updateField('vin_serial_no', value)} readOnly={readOnly} history={fieldHistory(formData.history, 'vin_serial_no')} />
            <SelectField label="Durum" value={formData.status} onChange={(value) => updateField('status', value)} options={statusOptions} readOnly={readOnly} required history={fieldHistory(formData.history, 'status')} />

            <SelectField label="Mülkiyet Tipi" value={formData.ownership_type || 'Şirket Malı'} onChange={(value) => updateField('ownership_type', value)} options={ownershipOptions} readOnly={readOnly} />
            <SelectField label="Bağlı Şirket" value={formData.company_id || ''} onChange={(value) => updateField('company_id', value || null)} options={companies.map((company) => ({ value: company.id, label: company.short_name || company.trade_name || 'Şirket' }))} readOnly={readOnly} />
            <InputField label="Yerleşke / Lokasyon" value={formData.location_name || ''} onChange={(value) => updateField('location_name', value)} readOnly={readOnly} />
          </div>
        </Card>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap gap-1 border-b border-gray-200 px-3 pt-3 dark:border-gray-700">
          {['genel', 'atama', 'bakim', 'sigorta', 'kullanim', 'belgeler', 'notes', 'gecmis'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn('rounded-t-lg px-3 py-2 text-left text-sm font-medium', activeTab === tab ? 'bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white')}
            >
              {tabLabel(tab)}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'genel' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <InputField label="Satın Alma Tarihi" type="date" value={formData.purchase_date || ''} onChange={(value) => updateField('purchase_date', value)} readOnly={readOnly} />
              <InputField label="Bütçe Kodu" value={formData.budget_code || ''} onChange={(value) => updateField('budget_code', value)} readOnly={readOnly} />
              <InputField label="Masraf Merkezi" value={formData.cost_center || ''} onChange={(value) => updateField('cost_center', value)} readOnly={readOnly} />
              <InputField label="Kiralama Başlangıç" type="date" value={formData.lease_start_date || ''} onChange={(value) => updateField('lease_start_date', value)} readOnly={readOnly} />
              <InputField label="Kiralama Bitiş" type="date" value={formData.lease_end_date || ''} onChange={(value) => updateField('lease_end_date', value)} readOnly={readOnly} />
              <InputField label="Web Servis / API Notları" value={formData.api_notes || ''} onChange={(value) => updateField('api_notes', value)} readOnly={readOnly} />
            </div>
          )}

          {activeTab === 'atama' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <SelectField label="Zimmetli Çalışan" value={formData.assigned_to_employee_id || ''} onChange={(value) => updateField('assigned_to_employee_id', value || null)} options={employees.map((employee) => ({ value: employee.id, label: personName(employee) }))} readOnly={readOnly} history={fieldHistory(formData.history, 'assigned_to_employee_id')} />
              <SelectField label="Operatör / Sürücü" value={formData.operator_employee_id || ''} onChange={(value) => updateField('operator_employee_id', value || null)} options={employees.map((employee) => ({ value: employee.id, label: personName(employee) }))} readOnly={readOnly} history={fieldHistory(formData.history, 'operator_employee_id')} />
              <InfoBox icon={<UserRound size={18} />} title="Operatör Bağlantısı" text="Çalışanlar modülü ile zimmet, yetkinlik ve kullanım geçmişi ilişkilendirilmeye hazır." />
            </div>
          )}

          {activeTab === 'bakim' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <InputField label="Bakım Son Tarihi" type="date" value={formData.maintenance_due_date || ''} onChange={(value) => updateField('maintenance_due_date', value)} readOnly={readOnly} history={fieldHistory(formData.history, 'maintenance_due_date')} />
              <InfoBox icon={<Wrench size={18} />} title="Bakım Uyarısı" text={daysUntil(formData.maintenance_due_date) <= 30 ? 'Yakında bakım zamanı geliyor.' : 'Planlı bakım tarihi normal aralıkta.'} tone={daysUntil(formData.maintenance_due_date) <= 30 ? 'warning' : 'normal'} />
              <InfoBox icon={<CalendarClock size={18} />} title="Otomasyon Hazırlığı" text="Periyodik bakım, kilometre/saat ve belge yenileme hatırlatmaları için veri modeli hazır." />
            </div>
          )}

          {activeTab === 'sigorta' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <InputField label="Sigorta Poliçe No" value={formData.insurance_policy_no || ''} onChange={(value) => updateField('insurance_policy_no', value)} readOnly={readOnly} />
              <InputField label="Sigorta Bitiş Tarihi" type="date" value={formData.insurance_expiry_date || ''} onChange={(value) => updateField('insurance_expiry_date', value)} readOnly={readOnly} history={fieldHistory(formData.history, 'insurance_expiry_date')} />
              <InputField label={category === 'Hava' ? 'Uçuşa Elverişlilik / Muayene' : category === 'Deniz' ? 'Denize Elverişlilik / Muayene' : 'Muayene Bitiş Tarihi'} type="date" value={formData.inspection_expiry_date || ''} onChange={(value) => updateField('inspection_expiry_date', value)} readOnly={readOnly} history={fieldHistory(formData.history, 'inspection_expiry_date')} />
            </div>
          )}

          {activeTab === 'kullanim' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <InputField label={category === 'Kara' ? 'Kilometre' : 'Kullanım Saati'} type="number" value={formData.current_usage_value || ''} onChange={(value) => updateField('current_usage_value', value ? Number(value) : null)} readOnly={readOnly} />
              <SelectField label="Kullanım Birimi" value={formData.usage_unit || 'km'} onChange={(value) => updateField('usage_unit', value)} options={['km', 'saat', 'mil', 'uçuş saati', 'deniz mili']} readOnly={readOnly} />
              <InputField label="Yakıt / Enerji Tipi" value={formData.fuel_type || ''} onChange={(value) => updateField('fuel_type', value)} readOnly={readOnly} />
            </div>
          )}

          {activeTab === 'belgeler' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {documentSlots.map((slot) => <DocumentStatus key={slot.id} slot={slot} documents={formData.documents || []} />)}
            </div>
          )}

          {activeTab === 'notes' && (
            <TextareaField label="Notlar" value={formData.notes || ''} onChange={(value) => updateField('notes', value)} readOnly={readOnly} />
          )}

          {activeTab === 'gecmis' && <Timeline history={formData.history || []} />}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900">Vazgeç</button>
        {readOnly ? (
          <button type="button" onClick={onModeChange} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"><Edit3 size={16} />Düzenle</button>
        ) : (
          <button type="button" onClick={() => onSave(formData)} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}Kaydet
          </button>
        )}
      </div>
    </div>
  )
}

function VehicleOverlay({ vehicle, onClose, onEdit }: { vehicle: Vehicle; onClose: () => void; onEdit: (vehicle: Vehicle) => void }) {
  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{vehicleTitle(vehicle)}</h2>
          <p className="text-sm text-gray-500">Hızlı filo operasyon paneli</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
      </div>
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Durum" value={vehicle.status || 'Aktif'} />
          <MiniStat label="Kategori" value={vehicle.category} />
          <MiniStat label="Belge" value={`${(vehicle.documents || []).length}`} />
        </div>
        <Card title="Operasyon" icon={<Car size={18} />}>
          <div className="space-y-3 text-sm">
            <DetailLine label="Plaka / Tescil" value={vehicle.registration_no || '-'} />
            <DetailLine label="Zimmet" value={personName(vehicle.assigned_employee) || 'Atanmamış'} />
            <DetailLine label="Operatör" value={personName(vehicle.operator_employee) || 'Atanmamış'} />
            <DetailLine label="Lokasyon" value={vehicle.location_name || '-'} />
          </div>
        </Card>
        <Card title="Yaklaşan Takipler" icon={<Clock size={18} />}>
          <div className="space-y-2">
            <DueLine label="Sigorta" date={vehicle.insurance_expiry_date} />
            <DueLine label="Muayene / Elverişlilik" date={vehicle.inspection_expiry_date} />
            <DueLine label="Bakım" date={vehicle.maintenance_due_date} />
          </div>
        </Card>
        <button type="button" onClick={() => onEdit(vehicle)} className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Tam Formda Aç</button>
      </div>
    </div>
  )
}

function Card({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-start gap-3">
        {icon && <div className="rounded-lg bg-gray-100 p-2 text-gray-700 dark:bg-gray-900 dark:text-gray-200">{icon}</div>}
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-gray-900 dark:text-white">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function InputField({ label, value, onChange, type = 'text', readOnly, required, history }: FieldProps) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} history={history} />
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        className={formControlClass({ className: 'mt-1' })}
      />
    </label>
  )
}

function SelectField({ label, value, onChange, options, readOnly, required, history }: FieldProps & { options: Array<string | { value: string; label: string }> }) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} history={history} />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={readOnly}
        className={formControlClass({ className: 'mt-1' })}
      >
        <option value="">Seçiniz</option>
        {options.map((option) => {
          const next = typeof option === 'string' ? { value: option, label: option } : option
          return <option key={next.value} value={next.value}>{next.label}</option>
        })}
      </select>
    </label>
  )
}

function TextareaField({ label, value, onChange, readOnly }: FieldProps) {
  return (
    <label className="block">
      <FieldLabel label={label} />
      <textarea value={value} onChange={(event) => onChange(event.target.value)} readOnly={readOnly} rows={5} className={formControlClass({ className: 'mt-1' })} />
    </label>
  )
}

interface FieldProps {
  label: string
  value: string | number
  onChange: (value: string) => void
  type?: string
  readOnly?: boolean
  required?: boolean
  history?: HistoryEntry | null
}

function FieldLabel({ label, required, history }: { label: string; required?: boolean; history?: HistoryEntry | null }) {
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
      {label}{required && <span className="text-red-600">*</span>}
      {history && (
        <span title={`${history.old_value || '-'} → ${history.new_value || '-'} / ${formatDateTime(history.changed_at)} / ${history.changed_by || '-'}`}>
          <History size={13} className="text-amber-500" />
        </span>
      )}
    </span>
  )
}

function VehicleActions({ vehicle, onView, onEdit, onOverlay, onPassive }: { vehicle: Vehicle; onView: (vehicle: Vehicle) => void; onEdit: (vehicle: Vehicle) => void; onOverlay: (vehicle: Vehicle) => void; onPassive: (vehicle: Vehicle) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      <IconButton label="Görüntüle" onClick={() => onView(vehicle)} icon={<Eye size={14} />} />
      <IconButton label="Düzenle" onClick={() => onEdit(vehicle)} icon={<Edit3 size={14} />} />
      <IconButton label="Operasyon" onClick={() => onOverlay(vehicle)} icon={<Wrench size={14} />} />
      <IconButton label="Pasifleştir" onClick={() => onPassive(vehicle)} icon={<Trash2 size={14} />} danger />
    </div>
  )
}

function IconButton({ label, icon, onClick, danger }: { label: string; icon: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" title={label} onClick={(event) => { event.stopPropagation(); onClick() }} className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium', danger ? 'border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300' : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800')}>
      {icon}<span>{label}</span>
    </button>
  )
}

function VehicleNameCell({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-lg bg-gray-100 p-2 text-gray-700 dark:bg-gray-900 dark:text-gray-200">{categoryIcon(vehicle.category, 16)}</div>
      <div>
        <div className="font-medium text-gray-900 dark:text-white">{vehicleTitle(vehicle)}</div>
        <div className="text-xs text-gray-500">{vehicle.vin_serial_no || 'Seri no girilmedi'}</div>
      </div>
    </div>
  )
}

function CategoryBadge({ category }: { category: VehicleCategory }) {
  const colors = {
    Kara: 'bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-200',
    Deniz: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200',
    Hava: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200',
  }
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium', colors[category])}>{categoryIcon(category, 13)}{category}</span>
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'Aktif' || status === 'Atanmış' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' : status === 'Bakımda' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200'
  return <span className={cn('rounded-full px-2 py-1 text-xs font-medium', tone)}>{status}</span>
}

function RiskBadges({ vehicle }: { vehicle: Vehicle }) {
  const items = [
    dueBadge('Sigorta', vehicle.insurance_expiry_date),
    dueBadge('Muayene', vehicle.inspection_expiry_date),
    dueBadge('Bakım', vehicle.maintenance_due_date),
  ].filter(Boolean)
  if (!items.length) return <span className="text-xs text-gray-400">Takip yok</span>
  return <div className="flex flex-wrap gap-1">{items}</div>
}

function dueBadge(label: string, date?: string | null) {
  const days = daysUntil(date)
  if (!date || days > 30) return null
  const expired = days < 0
  return <span key={label} className={cn('rounded-full px-2 py-1 text-[11px] font-medium', expired ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200')}>{expired ? 'Süresi Doldu' : 'Yakında Süresi Doluyor'}: {label}</span>
}

function DocumentStatus({ slot, documents }: { slot: DocumentSlot; documents: SlotDocument[] }) {
  const doc = documents.find((item) => item.slotId === slot.id)
  return (
    <div className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
      <div className="flex items-center gap-2">
        <FileText size={16} className={doc ? 'text-emerald-600' : 'text-gray-400'} />
        <span className="font-medium text-gray-900 dark:text-white">{slot.title}</span>
      </div>
      <p className="mt-2 text-xs text-gray-500">{doc ? doc.name : 'Belge bekleniyor'}</p>
    </div>
  )
}

function Timeline({ history }: { history: HistoryEntry[] }) {
  if (!history.length) return <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">Henüz geçmiş kaydı yok.</div>
  return (
    <div className="space-y-3">
      {history.slice().reverse().map((item, index) => (
        <div key={`${item.field}-${index}`} className="flex gap-3 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
          <History size={16} className="mt-0.5 text-amber-500" />
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{fieldLabel(item.field || 'Alan')} değişti</div>
            <div className="text-gray-500">{String(item.old_value ?? '-')} → {String(item.new_value ?? '-')}</div>
            <div className="mt-1 text-xs text-gray-400">{formatDateTime(item.changed_at)} · {item.changed_by || '-'}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function InfoBox({ icon, title, text, tone = 'normal' }: { icon: ReactNode; title: string; text: string; tone?: 'normal' | 'warning' }) {
  return (
    <div className={cn('rounded-lg border p-3 text-sm', tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200' : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300')}>
      <div className="mb-1 flex items-center gap-2 font-medium">{icon}{title}</div>
      <p className="text-xs leading-5">{text}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  )
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><span className="text-gray-500">{label}</span><span className="font-medium text-gray-900 dark:text-white">{value}</span></div>
}

function DueLine({ label, date }: { label: string; date?: string | null }) {
  const days = daysUntil(date)
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
      <span>{label}</span>
      <span className={cn('font-medium', days <= 30 ? 'text-amber-600' : 'text-gray-500')}>{date ? `${formatDate(date)} (${days} gün)` : 'Plan yok'}</span>
    </div>
  )
}

function FleetPill({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-gray-700 dark:bg-gray-900 dark:text-gray-200">{icon}{label}: <strong>{value}</strong></span>
}

function createEmptyVehicle(): Vehicle {
  return {
    id: `new-${Date.now()}`,
    category: 'Kara',
    vehicle_type: 'Otomobil',
    brand: '',
    status: 'Aktif',
    ownership_type: 'Şirket Malı',
    usage_unit: 'km',
    media: [],
    documents: [],
    history: [],
  }
}

function enrichVehicleForTable(vehicle: Vehicle): Vehicle & { vehicle_name: string; assigned_name: string; risk: string } {
  return {
    ...vehicle,
    vehicle_name: vehicleTitle(vehicle),
    assigned_name: personName(vehicle.assigned_employee) || personName(vehicle.operator_employee) || '',
    risk: hasUpcomingWarning(vehicle) ? 'Yaklaşan takip' : '',
  }
}

function categoryIcon(category: VehicleCategory, size = 18) {
  if (category === 'Deniz') return <Ship size={size} />
  if (category === 'Hava') return <Plane size={size} />
  return <Car size={size} />
}

function vehicleTitle(vehicle?: Vehicle | null) {
  if (!vehicle) return 'Araç'
  return [vehicle.brand, vehicle.model, vehicle.model_year].filter(Boolean).join(' ') || vehicle.registration_no || 'Araç'
}

function personName(person?: Employee | null) {
  return [person?.ad, person?.last_name].filter(Boolean).join(' ').trim()
}

function hasUpcomingWarning(vehicle: Vehicle) {
  return [vehicle.insurance_expiry_date, vehicle.inspection_expiry_date, vehicle.maintenance_due_date].some((date) => {
    const days = daysUntil(date)
    return days <= 30
  })
}

function daysUntil(date?: string | null) {
  if (!date) return Number.POSITIVE_INFINITY
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function fieldHistory(history: HistoryEntry[] | undefined, field: string) {
  return [...(history || [])].reverse().find((item) => item.field === field) || null
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    category: 'Araç Kategorisi',
    vehicle_type: 'Araç Tipi',
    registration_no: 'Plaka / Tescil No',
    vin_serial_no: 'VIN / Seri No',
    status: 'Durum',
    assigned_to_employee_id: 'Zimmetli Çalışan',
    operator_employee_id: 'Operatör',
    insurance_expiry_date: 'Sigorta Bitiş Tarihi',
    inspection_expiry_date: 'Muayene Bitiş Tarihi',
    maintenance_due_date: 'Bakım Son Tarihi',
  }
  return labels[field] || field
}

function formatDate(date?: string | null) {
  if (!date) return '-'
  return new Intl.DateTimeFormat('tr-TR').format(new Date(date))
}

function formatDateTime(date?: string | null) {
  if (!date) return '-'
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date))
}

function tabLabel(tab: string) {
  const labels: Record<string, string> = {
    genel: 'Genel',
    atama: 'Atama',
    bakim: 'Bakım',
    sigorta: 'Sigorta',
    kullanim: 'Kullanım / Yakıt',
    belgeler: 'Belgeler',
    notes: 'Notlar',
    gecmis: 'Geçmiş',
  }
  return labels[tab] || tab
}
