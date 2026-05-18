import type { ColumnDef } from '@/components/ui/SmartDataTable'
import type { FormField, FormTab } from '@/components/ui/EntityForm'
import type { AfterSalesAreaConfig, AfterSalesAreaKey, AfterSalesRecord, AfterSalesRecordHealth, AfterSalesRecordStatus } from './afterSales.types'

export const AFTER_SALES_MODULE_KEY = 'after_sales'

export const afterSalesAreas: AfterSalesAreaConfig[] = [
  {
    key: 'garanti-takip',
    recordType: 'warranty',
    title: 'Garanti Takip',
    singularTitle: 'Garanti Kaydı',
    shortTitle: 'Garanti',
    description: 'Satılan ürün ve cihazların garanti başlangıç, bitiş, talep ve yenileme süreçlerini takip edin.',
    href: '/app/satis-sonrasi/garanti-takip',
    tableName: 'after_sales_records',
    emptyText: 'Garanti kaydı bulunamadı',
  },
  {
    key: 'lisans-takip',
    recordType: 'license',
    title: 'Lisans Takip',
    singularTitle: 'Lisans Kaydı',
    shortTitle: 'Lisans',
    description: 'Yazılım ve hizmet lisanslarının koltuk, bitiş, yenileme ve sorumlu takibini yönetin.',
    href: '/app/satis-sonrasi/lisans-takip',
    tableName: 'after_sales_records',
    emptyText: 'Lisans kaydı bulunamadı',
  },
  {
    key: 'servis-destek-kayitlari',
    recordType: 'service',
    title: 'Servis ve Destek Kayıtları',
    singularTitle: 'Servis Kaydı',
    shortTitle: 'Servis',
    description: 'Açık destek taleplerini, servis önceliklerini, kritik kayıtları ve çözüm durumunu izleyin.',
    href: '/app/satis-sonrasi/servis-destek-kayitlari',
    tableName: 'after_sales_records',
    emptyText: 'Servis veya destek kaydı bulunamadı',
  },
  {
    key: 'bakim-sozlesme-takip',
    recordType: 'maintenance_contract',
    title: 'Bakım ve Sözleşme Takip',
    singularTitle: 'Bakım/Sözleşme Kaydı',
    shortTitle: 'Bakım',
    description: 'Bakım planlarını, sözleşme bitişlerini, yenileme uyarılarını ve sorumlu takibini yönetin.',
    href: '/app/satis-sonrasi/bakim-sozlesme-takip',
    tableName: 'after_sales_records',
    emptyText: 'Bakım veya sözleşme kaydı bulunamadı',
  },
]

export const afterSalesAreaByKey = Object.fromEntries(afterSalesAreas.map(area => [area.key, area])) as Record<AfterSalesAreaKey, AfterSalesAreaConfig>

export const afterSalesStatusLabels: Record<AfterSalesRecordStatus, string> = {
  draft: 'Taslak',
  active: 'Aktif',
  pending: 'Bekliyor',
  open: 'Açık',
  in_progress: 'İşlemde',
  waiting_customer: 'Müşteri Bekliyor',
  resolved: 'Çözüldü',
  closed: 'Kapalı',
  expired: 'Süresi Doldu',
  cancelled: 'İptal',
}

export const afterSalesPriorityOptions = [
  { value: 'low', label: 'Düşük' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Yüksek' },
  { value: 'critical', label: 'Kritik' },
]

export const afterSalesStatusOptions = Object.entries(afterSalesStatusLabels).map(([value, label]) => ({ value, label }))

export const afterSalesProductKindOptions = [
  { value: 'product', label: 'Ürün' },
  { value: 'device', label: 'Cihaz' },
  { value: 'software', label: 'Yazılım' },
  { value: 'license', label: 'Lisans' },
  { value: 'service', label: 'Hizmet' },
]

export const afterSalesContactChannelOptions = [
  { value: 'phone', label: 'Telefon' },
  { value: 'email', label: 'E-posta' },
  { value: 'portal', label: 'Portal' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'onsite', label: 'Yerinde' },
]

export function getAfterSalesHealth(record: AfterSalesRecord, now = new Date()): AfterSalesRecordHealth {
  if (record.is_deleted || record.record_status === 'passive') return 'passive'
  if (record.priority === 'critical' && ['open', 'in_progress', 'waiting_customer'].includes(record.status)) return 'critical'
  if (record.status === 'expired') return 'critical'

  const nextDate = record.end_date || record.renewal_date || record.next_action_date || record.sla_due_at
  const daysLeft = daysUntil(nextDate, now)
  if (daysLeft !== null && daysLeft < 0) return 'critical'
  if (daysLeft !== null && daysLeft <= 30) return 'warning'
  if (record.warning_count > 0) return 'warning'

  return 'ok'
}

export function getAfterSalesHealthLabel(record: AfterSalesRecord) {
  const health = getAfterSalesHealth(record)
  if (health === 'critical') return 'Kritik'
  if (health === 'warning') return 'Uyarı'
  if (health === 'passive') return 'Pasif'
  return 'Sağlıklı'
}

export function isAfterSalesWarning(record: AfterSalesRecord) {
  return ['warning', 'critical'].includes(getAfterSalesHealth(record))
}

export function daysUntil(value?: string | null, now = new Date()) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

export function formatAfterSalesDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('tr-TR')
}

export function getAfterSalesColumns(): ColumnDef[] {
  return [
    { key: 'record_no', label: 'Kayıt No', type: 'text', width: 130, sortable: true, filterable: true },
    { key: 'title', label: 'Başlık', type: 'text', width: 240, sortable: true, filterable: true },
    { key: 'customer_display_name', label: 'Müşteri', type: 'text', width: 210, sortable: true, filterable: true },
    { key: 'product_service_name', label: 'Ürün/Hizmet', type: 'text', width: 210, sortable: true, filterable: true },
    { key: 'status_label', label: 'Durum', type: 'badge', width: 140, sortable: true, filterable: true },
    { key: 'priority_label', label: 'Öncelik', type: 'badge', width: 120, sortable: true, filterable: true },
    { key: 'end_date_display', label: 'Bitiş/SLA', type: 'text', width: 130, sortable: true },
    { key: 'health_label', label: 'Sağlık', type: 'badge', width: 110, sortable: true, filterable: true },
    { key: 'responsible_employee_name', label: 'Sorumlu', type: 'text', width: 160, sortable: true, filterable: true },
    { key: 'owner_company_name', label: 'Şirket', type: 'text', width: 170, sortable: true, filterable: true },
  ]
}

export function getAfterSalesHeroFields(): FormField[] {
  return [
    { name: 'record_no', label: 'Kayıt No', type: 'text', colSpan: 1 },
    { name: 'title', label: 'Başlık', type: 'text', required: true, colSpan: 2, placeholder: 'Kayıt başlığı' },
    { name: 'customer_display_name', label: 'Müşteri', type: 'text', required: true, placeholder: 'Müşteri adı' },
    { name: 'product_service_name', label: 'Ürün ve Hizmetler Kaydı', type: 'text', required: true, placeholder: 'Merkezi katalogdaki ürün, cihaz, yazılım veya hizmet' },
    { name: 'status', label: 'Durum', type: 'select', required: true, options: afterSalesStatusOptions },
    { name: 'priority', label: 'Öncelik', type: 'select', required: true, options: afterSalesPriorityOptions },
    { name: 'end_date', label: 'Bitiş/SLA Tarihi', type: 'date' },
  ]
}

export function getAfterSalesTabs(area: AfterSalesAreaConfig): FormTab[] {
  return [
    {
      id: 'temel',
      label: 'Temel Bilgiler',
      fields: [
        { name: 'product_service_kind', label: 'Kayıt Nesnesi', type: 'select', options: afterSalesProductKindOptions, required: true },
        { name: 'serial_or_license_no', label: area.recordType === 'license' ? 'Lisans Anahtarı / No' : 'Seri / Referans No', type: 'text' },
        { name: 'start_date', label: 'Başlangıç Tarihi', type: 'date' },
        { name: 'renewal_date', label: 'Yenileme Tarihi', type: 'date' },
        { name: 'next_action_date', label: 'Sonraki Aksiyon', type: 'date' },
        { name: 'sla_due_at', label: 'SLA / Yanıt Zamanı', type: 'date' },
      ],
    },
    {
      id: 'iliski',
      label: 'İlişkiler',
      fields: [
        { name: 'owner_company_name', label: 'Yöneten Şirket', type: 'text', required: true },
        { name: 'related_company_name', label: 'Bağlı Şirket', type: 'text' },
        { name: 'responsible_employee_name', label: 'Sorumlu Personel', type: 'text', required: true },
        { name: 'customer_asset_no', label: 'Müşterideki Ürün', type: 'text', placeholder: 'Müşteri ürün no / installed base kaydı' },
        { name: 'sales_record_ref', label: 'Satış Kaydı', type: 'text', placeholder: 'Teklif / sipariş / fatura referansı' },
      ],
    },
    {
      id: 'iletisim',
      label: 'İletişim ve Kanal',
      fields: [
        { name: 'contact_name', label: 'İlgili Kişi', type: 'text' },
        { name: 'contact_email', label: 'E-posta', type: 'email' },
        { name: 'contact_phone', label: 'Telefon', type: 'tel' },
        { name: 'preferred_contact_channel', label: 'Tercih Edilen Kanal', type: 'select', options: afterSalesContactChannelOptions },
        { name: 'last_contact_at', label: 'Son Temas', type: 'date' },
        { name: 'portal_visibility', label: 'Portal Görünürlüğü', type: 'select', options: [
          { value: 'internal', label: 'Sadece İç Kullanım' },
          { value: 'customer_visible', label: 'Müşteri Görür' },
          { value: 'partner_visible', label: 'Paydaş Görür' },
        ] },
      ],
    },
    {
      id: 'notlar',
      label: 'Notlar',
      fields: [
        { name: 'alert_note', label: 'Uyarı Notu', type: 'textarea', colSpan: 3 },
        { name: 'notes', label: 'Açıklama', type: 'textarea', colSpan: 3 },
      ],
    },
  ]
}

export function decorateAfterSalesRow(record: AfterSalesRecord) {
  return {
    ...record,
    status_label: afterSalesStatusLabels[record.status] || record.status,
    priority_label: afterSalesPriorityOptions.find(item => item.value === record.priority)?.label || record.priority,
    health_label: getAfterSalesHealthLabel(record),
    end_date_display: formatAfterSalesDate(record.end_date || record.renewal_date || record.sla_due_at || record.next_action_date),
  }
}
