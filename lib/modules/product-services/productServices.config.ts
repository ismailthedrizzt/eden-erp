import type { ColumnDef } from '@/components/ui/SmartDataTable'
import type { FormField, FormTab } from '@/components/ui/EntityForm'
import type {
  CustomerAsset,
  CustomerAssetStatus,
  MaintenancePackageType,
  ProductCatalogRecord,
  ProductItemType,
  ProductServicesAreaConfig,
  ProductServicesAreaKey,
  SerialProductStatus,
  ServiceItemType,
  LicenseItemType,
  WarrantyTemplateType,
} from './productServices.types'

export const PRODUCT_SERVICES_MODULE_KEY = 'product_services'

export const productServicesAreas: ProductServicesAreaConfig[] = [
  {
    key: 'urun-kartlari',
    recordKind: 'product_item',
    title: 'Ürün Kartları',
    singularTitle: 'Ürün Kartı',
    shortTitle: 'Ürün',
    description: 'Fiziksel ürün, cihaz, ekipman ve stokta takip edilen ürünleri tanımlar.',
    href: '/app/urun-ve-hizmetler/urun-kartlari',
    tableName: 'product_service_items',
    emptyText: 'Ürün kartı bulunamadı',
    codePrefix: 'URN',
  },
  {
    key: 'hizmet-kartlari',
    recordKind: 'service_item',
    title: 'Hizmet Kartları',
    singularTitle: 'Hizmet Kartı',
    shortTitle: 'Hizmet',
    description: 'Kurulum, bakım, teknik destek, eğitim, danışmanlık ve proje hizmetlerini tanımlar.',
    href: '/app/urun-ve-hizmetler/hizmet-kartlari',
    tableName: 'product_service_items',
    emptyText: 'Hizmet kartı bulunamadı',
    codePrefix: 'HZM',
  },
  {
    key: 'lisans-abonelik-urunleri',
    recordKind: 'license_item',
    title: 'Lisans / Abonelik Ürünleri',
    singularTitle: 'Lisans / Abonelik Ürünü',
    shortTitle: 'Lisans',
    description: 'Yazılım, abonelik, süreli lisans ve kullanıcı bazlı ürünleri tanımlar.',
    href: '/app/urun-ve-hizmetler/lisans-abonelik-urunleri',
    tableName: 'product_service_items',
    emptyText: 'Lisans veya abonelik ürünü bulunamadı',
    codePrefix: 'LIS',
  },
  {
    key: 'seri-numarali-urunler',
    recordKind: 'serial_item',
    title: 'Seri Numaralı Ürünler',
    singularTitle: 'Seri Numaralı Ürün',
    shortTitle: 'Seri No',
    description: 'Seri numarası ile takip edilen ürünlerin gerçek örneklerini izler.',
    href: '/app/urun-ve-hizmetler/seri-numarali-urunler',
    tableName: 'product_serials',
    emptyText: 'Seri numaralı ürün bulunamadı',
    codePrefix: 'SRN',
  },
  {
    key: 'garanti-sablonlari',
    recordKind: 'warranty_template',
    title: 'Garanti Şablonları',
    singularTitle: 'Garanti Şablonu',
    shortTitle: 'Garanti',
    description: 'Ürünlere uygulanacak standart veya özel garanti kurallarını tanımlar.',
    href: '/app/urun-ve-hizmetler/garanti-sablonlari',
    tableName: 'warranty_templates',
    emptyText: 'Garanti şablonu bulunamadı',
    codePrefix: 'GRT',
  },
  {
    key: 'bakim-paketleri',
    recordKind: 'maintenance_package',
    title: 'Bakım Paketleri',
    singularTitle: 'Bakım Paketi',
    shortTitle: 'Bakım',
    description: 'Periyodik bakım, destek, SLA ve garanti uzatma paketlerini tanımlar.',
    href: '/app/urun-ve-hizmetler/bakim-paketleri',
    tableName: 'maintenance_packages',
    emptyText: 'Bakım paketi bulunamadı',
    codePrefix: 'BAK',
  },
]

export const productServicesAreaByKey = Object.fromEntries(productServicesAreas.map(area => [area.key, area])) as Record<ProductServicesAreaKey, ProductServicesAreaConfig>

export const currencyOptions = [
  { value: 'TRY', label: 'TRY' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
]

export const unitOptions = [
  { value: 'adet', label: 'Adet' },
  { value: 'saat', label: 'Saat' },
  { value: 'gun', label: 'Gün' },
  { value: 'ay', label: 'Ay' },
  { value: 'paket', label: 'Paket' },
  { value: 'lisans', label: 'Lisans' },
]

export const productItemTypeLabels: Record<ProductItemType, string> = {
  physical_product: 'Fiziksel ürün',
  device: 'Cihaz',
  equipment: 'Ekipman',
  spare_part: 'Yedek parça',
  manufactured_product: 'Üretilen ürün',
  imported_product: 'İthal ürün',
  consumable: 'Sarf malzeme',
  other: 'Diğer',
}

export const serviceItemTypeLabels: Record<ServiceItemType, string> = {
  installation: 'Kurulum',
  maintenance: 'Bakım',
  technical_support: 'Teknik destek',
  training: 'Eğitim',
  consulting: 'Danışmanlık',
  integration: 'Entegrasyon',
  project_service: 'Proje hizmeti',
  other: 'Diğer',
}

export const licenseItemTypeLabels: Record<LicenseItemType, string> = {
  single_user: 'Tek kullanıcı',
  multi_user: 'Çok kullanıcı',
  enterprise: 'Kurumsal',
  subscription: 'Abonelik',
  perpetual: 'Süresiz lisans',
  trial: 'Deneme lisansı',
}

export const serialStatusLabels: Record<SerialProductStatus, string> = {
  in_stock: 'Stokta',
  sold: 'Satıldı',
  at_customer: 'Müşteride',
  in_service: 'Serviste',
  returned: 'İade edildi',
  replaced: 'Değişim yapıldı',
  scrapped: 'Hurdaya ayrıldı',
}

export const warrantyTemplateTypeLabels: Record<WarrantyTemplateType, string> = {
  standard: 'Standart garanti',
  extended: 'Uzatılmış garanti',
  manufacturer: 'Üretici garantisi',
  seller: 'Satıcı garantisi',
  service: 'Servis garantisi',
}

export const maintenancePackageTypeLabels: Record<MaintenancePackageType, string> = {
  periodic_maintenance: 'Periyodik bakım',
  technical_support: 'Teknik destek',
  sla_package: 'SLA paketi',
  license_maintenance: 'Lisans bakım paketi',
  warranty_extension: 'Garanti uzatma',
  enterprise_support: 'Kurumsal destek',
}

export const customerAssetStatusLabels: Record<CustomerAssetStatus, string> = {
  active: 'Aktif',
  under_warranty: 'Garanti kapsamında',
  out_of_warranty: 'Garanti dışı',
  in_service: 'Serviste',
  in_maintenance: 'Bakımda',
  license_expired: 'Lisansı dolmuş',
  inactive: 'Kullanım dışı',
  returned: 'İade edilmiş',
}

const statusOptions = [
  { value: 'active', label: 'Aktif' },
  { value: 'passive', label: 'Pasif' },
]

const durationUnitOptions = [
  { value: 'day', label: 'Gün' },
  { value: 'month', label: 'Ay' },
  { value: 'year', label: 'Yıl' },
]

const productTypeOptions = Object.entries(productItemTypeLabels).map(([value, label]) => ({ value, label }))
const serviceTypeOptions = Object.entries(serviceItemTypeLabels).map(([value, label]) => ({ value, label }))
const licenseTypeOptions = Object.entries(licenseItemTypeLabels).map(([value, label]) => ({ value, label }))
const serialStatusOptions = Object.entries(serialStatusLabels).map(([value, label]) => ({ value, label }))
const warrantyTypeOptions = Object.entries(warrantyTemplateTypeLabels).map(([value, label]) => ({ value, label }))
const maintenanceTypeOptions = Object.entries(maintenancePackageTypeLabels).map(([value, label]) => ({ value, label }))
export const customerAssetStatusOptions = Object.entries(customerAssetStatusLabels).map(([value, label]) => ({ value, label }))

export function getProductCatalogColumns(areaKey: ProductServicesAreaKey): ColumnDef[] {
  if (areaKey === 'urun-kartlari') {
    return [
      { key: 'code', label: 'Ürün Kodu', type: 'text', width: 130, sortable: true, filterable: true },
      { key: 'name', label: 'Ürün Adı', type: 'text', width: 220, sortable: true, filterable: true },
      { key: 'item_type_label', label: 'Ürün Türü', type: 'badge', width: 160, sortable: true, filterable: true },
      { key: 'brand_name', label: 'Marka', type: 'text', width: 140, sortable: true, filterable: true },
      { key: 'model', label: 'Model', type: 'text', width: 140, sortable: true, filterable: true },
      { key: 'category_name', label: 'Kategori', type: 'text', width: 170, sortable: true, filterable: true },
      { key: 'is_sellable', label: 'Satılabilir mi?', type: 'boolean', width: 130, sortable: true },
      { key: 'is_purchasable', label: 'Satın alınabilir mi?', type: 'boolean', width: 150, sortable: true },
      { key: 'is_stock_tracked', label: 'Stokta takip edilir mi?', type: 'boolean', width: 170, sortable: true },
      { key: 'is_manufacturable', label: 'Üretilebilir mi?', type: 'boolean', width: 140, sortable: true },
      { key: 'requires_serial_number', label: 'Seri no gerekir mi?', type: 'boolean', width: 150, sortable: true },
      { key: 'has_warranty_tracking', label: 'Garanti takibi var mı?', type: 'boolean', width: 165, sortable: true },
      { key: 'is_serviceable', label: 'Servis verilebilir mi?', type: 'boolean', width: 160, sortable: true },
      { key: 'is_active', label: 'Aktif mi?', type: 'boolean', width: 100, sortable: true },
    ]
  }

  if (areaKey === 'hizmet-kartlari') {
    return [
      { key: 'code', label: 'Hizmet Kodu', type: 'text', width: 140, sortable: true, filterable: true },
      { key: 'name', label: 'Hizmet Adı', type: 'text', width: 240, sortable: true, filterable: true },
      { key: 'item_type_label', label: 'Hizmet Türü', type: 'badge', width: 160, sortable: true, filterable: true },
      { key: 'is_sellable', label: 'Satılabilir mi?', type: 'boolean', width: 130, sortable: true },
      { key: 'is_periodic_service', label: 'Periyodik mi?', type: 'boolean', width: 130, sortable: true },
      { key: 'can_attach_to_contract', label: 'Sözleşmeye bağlanabilir mi?', type: 'boolean', width: 210, sortable: true },
      { key: 'is_active', label: 'Aktif mi?', type: 'boolean', width: 100, sortable: true },
    ]
  }

  if (areaKey === 'lisans-abonelik-urunleri') {
    return [
      { key: 'code', label: 'Lisans Ürün Kodu', type: 'text', width: 160, sortable: true, filterable: true },
      { key: 'name', label: 'Ürün Adı', type: 'text', width: 240, sortable: true, filterable: true },
      { key: 'item_type_label', label: 'Lisans Tipi', type: 'badge', width: 160, sortable: true, filterable: true },
      { key: 'is_user_based_display', label: 'Kullanıcı Bazlı mı?', type: 'badge', width: 160, sortable: true },
      { key: 'is_time_limited_license', label: 'Süreli mi?', type: 'boolean', width: 110, sortable: true },
      { key: 'is_renewable', label: 'Yenilenebilir mi?', type: 'boolean', width: 140, sortable: true },
      { key: 'is_active', label: 'Aktif mi?', type: 'boolean', width: 100, sortable: true },
    ]
  }

  if (areaKey === 'seri-numarali-urunler') {
    return [
      { key: 'serial_number', label: 'Seri No', type: 'text', width: 160, sortable: true, filterable: true },
      { key: 'product_service_item_name', label: 'Ürün', type: 'text', width: 230, sortable: true, filterable: true },
      { key: 'brand_name', label: 'Marka', type: 'text', width: 130, sortable: true, filterable: true },
      { key: 'model', label: 'Model', type: 'text', width: 130, sortable: true, filterable: true },
      { key: 'status_label', label: 'Mevcut Durum', type: 'badge', width: 150, sortable: true, filterable: true },
      { key: 'customer_display_name', label: 'Müşteri', type: 'text', width: 190, sortable: true, filterable: true },
      { key: 'sale_delivery_display', label: 'Satış / Teslim Tarihi', type: 'text', width: 170, sortable: true },
      { key: 'warranty_status', label: 'Garanti Durumu', type: 'badge', width: 150, sortable: true, filterable: true },
      { key: 'company_name', label: 'İlgili Şirket', type: 'text', width: 170, sortable: true, filterable: true },
    ]
  }

  if (areaKey === 'garanti-sablonlari') {
    return [
      { key: 'name', label: 'Şablon Adı', type: 'text', width: 240, sortable: true, filterable: true },
      { key: 'duration_display', label: 'Garanti Süresi', type: 'text', width: 140, sortable: true },
      { key: 'warranty_type_label', label: 'Garanti Türü', type: 'badge', width: 170, sortable: true, filterable: true },
      { key: 'product_category_display', label: 'Ürün / Kategori', type: 'text', width: 220, sortable: true, filterable: true },
      { key: 'is_active', label: 'Aktif mi?', type: 'boolean', width: 100, sortable: true },
    ]
  }

  return [
    { key: 'code', label: 'Paket Kodu', type: 'text', width: 140, sortable: true, filterable: true },
    { key: 'name', label: 'Paket Adı', type: 'text', width: 240, sortable: true, filterable: true },
    { key: 'package_type_label', label: 'Paket Türü', type: 'badge', width: 170, sortable: true, filterable: true },
    { key: 'period', label: 'Periyot', type: 'text', width: 130, sortable: true, filterable: true },
    { key: 'sla_enabled', label: 'SLA Var mı?', type: 'boolean', width: 120, sortable: true },
    { key: 'is_sellable', label: 'Satılabilir mi?', type: 'boolean', width: 130, sortable: true },
    { key: 'is_active', label: 'Aktif mi?', type: 'boolean', width: 100, sortable: true },
  ]
}

export function getProductCatalogHeroFields(areaKey: ProductServicesAreaKey): FormField[] {
  if (areaKey === 'seri-numarali-urunler') {
    return [
      { name: 'serial_number', label: 'Seri No', type: 'text', required: true, colSpan: 1 },
      { name: 'product_service_item_name', label: 'Ürün', type: 'text', required: true, colSpan: 2 },
      { name: 'status', label: 'Mevcut Durum', type: 'select', required: true, options: serialStatusOptions },
      { name: 'company_name', label: 'İlgili Şirket', type: 'text', required: true },
    ]
  }

  if (areaKey === 'garanti-sablonlari') {
    return [
      { name: 'code', label: 'Şablon Kodu', type: 'text', required: true },
      { name: 'name', label: 'Şablon Adı', type: 'text', required: true, colSpan: 2 },
      { name: 'warranty_duration', label: 'Garanti Süresi', type: 'number', required: true },
      { name: 'duration_unit', label: 'Süre Birimi', type: 'select', required: true, options: durationUnitOptions },
      { name: 'warranty_type', label: 'Garanti Türü', type: 'select', required: true, options: warrantyTypeOptions },
      { name: 'is_active', label: 'Aktif mi?', type: 'checkbox' },
    ]
  }

  if (areaKey === 'bakim-paketleri') {
    return [
      { name: 'code', label: 'Paket Kodu', type: 'text', required: true },
      { name: 'name', label: 'Paket Adı', type: 'text', required: true, colSpan: 2 },
      { name: 'package_type', label: 'Paket Türü', type: 'select', required: true, options: maintenanceTypeOptions },
      { name: 'period', label: 'Periyot', type: 'text', placeholder: 'Aylık, yıllık, 7/24' },
      { name: 'is_active', label: 'Aktif mi?', type: 'checkbox' },
    ]
  }

  const typeOptions = areaKey === 'hizmet-kartlari'
    ? serviceTypeOptions
    : areaKey === 'lisans-abonelik-urunleri'
      ? licenseTypeOptions
      : productTypeOptions

  return [
    { name: 'code', label: areaKey === 'hizmet-kartlari' ? 'Hizmet Kodu' : 'Ürün Kodu', type: 'text', required: true },
    { name: 'name', label: areaKey === 'hizmet-kartlari' ? 'Hizmet Adı' : 'Ürün Adı', type: 'text', required: true, colSpan: 2 },
    { name: 'item_type', label: areaKey === 'hizmet-kartlari' ? 'Hizmet Türü' : areaKey === 'lisans-abonelik-urunleri' ? 'Lisans Tipi' : 'Ürün Türü', type: 'select', required: true, options: typeOptions },
    { name: 'sale_price', label: 'Satış Fiyatı', type: 'number' },
    { name: 'currency', label: 'Para Birimi', type: 'select', options: currencyOptions },
    { name: 'is_active', label: 'Aktif mi?', type: 'checkbox' },
  ]
}

export function getProductCatalogTabs(areaKey: ProductServicesAreaKey): FormTab[] {
  if (areaKey === 'urun-kartlari') {
    return [
      {
        id: 'temel',
        label: 'Temel Bilgiler',
        fields: [
          { name: 'description', label: 'Ürün açıklaması', type: 'textarea', colSpan: 3 },
          { name: 'brand_name', label: 'Marka', type: 'text' },
          { name: 'model', label: 'Model', type: 'text' },
          { name: 'category_name', label: 'Kategori', type: 'text' },
          { name: 'unit', label: 'Birim', type: 'select', options: unitOptions },
          { name: 'vat_rate', label: 'KDV oranı', type: 'number' },
          { name: 'purchase_price', label: 'Alış fiyatı', type: 'number' },
        ],
      },
      {
        id: 'moduller',
        label: 'Modül Kullanımı',
        fields: [
          { name: 'is_sellable', label: 'Satılabilir mi?', type: 'checkbox' },
          { name: 'is_purchasable', label: 'Satın alınabilir mi?', type: 'checkbox' },
          { name: 'is_stock_tracked', label: 'Stokta takip edilir mi?', type: 'checkbox' },
          { name: 'is_manufacturable', label: 'Üretilebilir mi?', type: 'checkbox' },
          { name: 'requires_serial_number', label: 'Seri numarası gerekir mi?', type: 'checkbox' },
          { name: 'has_warranty_tracking', label: 'Garanti takibi var mı?', type: 'checkbox' },
          { name: 'has_license_tracking', label: 'Lisans takibi var mı?', type: 'checkbox' },
          { name: 'is_serviceable', label: 'Servis verilebilir mi?', type: 'checkbox' },
          { name: 'is_maintenance_contract_eligible', label: 'Bakım sözleşmesine uygun mu?', type: 'checkbox' },
          { name: 'default_warranty_duration', label: 'Varsayılan garanti süresi', type: 'number' },
          { name: 'default_warranty_unit', label: 'Garanti süre birimi', type: 'select', options: durationUnitOptions },
          { name: 'minimum_stock_level', label: 'Minimum stok seviyesi', type: 'number' },
        ],
      },
      fileAndNotesTab(),
    ]
  }

  if (areaKey === 'hizmet-kartlari') {
    return [
      {
        id: 'temel',
        label: 'Temel Bilgiler',
        fields: [
          { name: 'description', label: 'Hizmet açıklaması', type: 'textarea', colSpan: 3 },
          { name: 'unit', label: 'Birim', type: 'select', options: unitOptions },
          { name: 'vat_rate', label: 'KDV oranı', type: 'number' },
        ],
      },
      {
        id: 'kullanim',
        label: 'Kullanım',
        fields: [
          { name: 'is_sellable', label: 'Satılabilir mi?', type: 'checkbox' },
          { name: 'is_periodic_service', label: 'Periyodik hizmet mi?', type: 'checkbox' },
          { name: 'can_attach_to_contract', label: 'Bakım sözleşmesine bağlanabilir mi?', type: 'checkbox' },
          { name: 'can_attach_to_service_request', label: 'Servis talebiyle ilişkilendirilebilir mi?', type: 'checkbox' },
          { name: 'is_serviceable', label: 'Servis verilebilir mi?', type: 'checkbox' },
          { name: 'is_maintenance_contract_eligible', label: 'Bakım sözleşmesine uygun mu?', type: 'checkbox' },
        ],
      },
      fileAndNotesTab(),
    ]
  }

  if (areaKey === 'lisans-abonelik-urunleri') {
    return [
      {
        id: 'lisans',
        label: 'Lisans Bilgileri',
        fields: [
          { name: 'description', label: 'Açıklama', type: 'textarea', colSpan: 3 },
          { name: 'default_user_count', label: 'Varsayılan kullanıcı sayısı', type: 'number' },
          { name: 'default_license_duration', label: 'Varsayılan lisans süresi', type: 'number' },
          { name: 'default_license_unit', label: 'Lisans süre birimi', type: 'select', options: durationUnitOptions },
          { name: 'is_time_limited_license', label: 'Süreli lisans mı?', type: 'checkbox' },
          { name: 'is_renewable', label: 'Yenilenebilir mi?', type: 'checkbox' },
          { name: 'is_auto_renewal_eligible', label: 'Otomatik yenilemeye uygun mu?', type: 'checkbox' },
          { name: 'is_sellable', label: 'Satılabilir mi?', type: 'checkbox' },
          { name: 'has_license_tracking', label: 'Lisans takibi var mı?', type: 'checkbox' },
          { name: 'is_serviceable', label: 'Servis desteği var mı?', type: 'checkbox' },
          { name: 'is_maintenance_contract_eligible', label: 'Bakım sözleşmesine uygun mu?', type: 'checkbox' },
        ],
      },
      fileAndNotesTab(),
    ]
  }

  if (areaKey === 'seri-numarali-urunler') {
    return [
      {
        id: 'detay',
        label: 'Seri Detayları',
        fields: [
          { name: 'lot_number', label: 'Lot / parti numarası', type: 'text' },
          { name: 'supplier_name', label: 'Tedarikçi', type: 'text' },
          { name: 'purchase_date', label: 'Alış tarihi', type: 'date' },
          { name: 'sale_date', label: 'Satış tarihi', type: 'date' },
          { name: 'delivery_date', label: 'Teslim tarihi', type: 'date' },
          { name: 'customer_display_name', label: 'Müşteri', type: 'text' },
          { name: 'warranty_start_date', label: 'Garanti başlangıç tarihi', type: 'date' },
          { name: 'warranty_end_date', label: 'Garanti bitiş tarihi', type: 'date' },
        ],
      },
      fileAndNotesTab(),
    ]
  }

  if (areaKey === 'garanti-sablonlari') {
    return [
      {
        id: 'kapsam',
        label: 'Kapsam',
        fields: [
          { name: 'description', label: 'Açıklama', type: 'textarea', colSpan: 3 },
          { name: 'product_service_item_name', label: 'Geçerli ürün', type: 'text' },
          { name: 'category_name', label: 'Geçerli kategori', type: 'text' },
          { name: 'coverage', label: 'Kapsam', type: 'textarea', colSpan: 3 },
          { name: 'exclusions', label: 'Hariç tutulan durumlar', type: 'textarea', colSpan: 3 },
        ],
      },
      fileAndNotesTab(),
    ]
  }

  return [
    {
      id: 'sla',
      label: 'Paket ve SLA',
      fields: [
        { name: 'description', label: 'Açıklama', type: 'textarea', colSpan: 3 },
        { name: 'sla_enabled', label: 'SLA var mı?', type: 'checkbox' },
        { name: 'sla_level', label: 'SLA seviyesi', type: 'text' },
        { name: 'response_time', label: 'Yanıt süresi', type: 'text' },
        { name: 'resolution_time', label: 'Çözüm süresi', type: 'text' },
        { name: 'sale_price', label: 'Satış fiyatı', type: 'number' },
        { name: 'currency', label: 'Para birimi', type: 'select', options: currencyOptions },
        { name: 'vat_rate', label: 'KDV oranı', type: 'number' },
        { name: 'related_category_name', label: 'İlgili ürün / hizmet kategorisi', type: 'text' },
        { name: 'is_sellable', label: 'Satılabilir mi?', type: 'checkbox' },
      ],
    },
    fileAndNotesTab(),
  ]
}

export function decorateProductCatalogRecord(record: ProductCatalogRecord) {
  const base = {
    ...record,
    active_label: record.is_active ? 'Aktif' : 'Pasif',
  }

  if ('item_kind' in record) {
    const itemTypeLabel = record.item_kind === 'product'
      ? productItemTypeLabels[record.item_type as ProductItemType]
      : record.item_kind === 'service'
        ? serviceItemTypeLabels[record.item_type as ServiceItemType]
        : licenseItemTypeLabels[record.item_type as LicenseItemType]

    return {
      ...base,
      item_type_label: itemTypeLabel || record.item_type,
      is_user_based_display: Number(record.default_user_count || 0) > 0 ? 'Evet' : 'Hayır',
    }
  }

  if ('serial_number' in record) {
    return {
      ...base,
      status_label: serialStatusLabels[record.status] || record.status,
      sale_delivery_display: formatCatalogDate(record.sale_date || record.delivery_date),
    }
  }

  if ('warranty_duration' in record) {
    return {
      ...base,
      duration_display: `${record.warranty_duration || 0} ${durationUnitOptions.find(item => item.value === record.duration_unit)?.label || record.duration_unit}`,
      warranty_type_label: warrantyTemplateTypeLabels[record.warranty_type] || record.warranty_type,
      product_category_display: record.product_service_item_name || record.category_name || '-',
    }
  }

  return {
    ...base,
    package_type_label: maintenancePackageTypeLabels[record.package_type] || record.package_type,
  }
}

export function getProductCatalogRecordTitle(record: ProductCatalogRecord) {
  if ('serial_number' in record) return record.serial_number || record.product_service_item_name
  return record.name || record.code
}

export function getProductCatalogRecordSubtitle(record: ProductCatalogRecord) {
  if ('item_kind' in record) return [record.category_name, record.brand_name, record.model].filter(Boolean).join(' · ') || record.description || ''
  if ('serial_number' in record) return [record.product_service_item_name, record.customer_display_name].filter(Boolean).join(' · ')
  if ('warranty_duration' in record) return [record.product_service_item_name, record.category_name].filter(Boolean).join(' · ')
  return [record.package_type, record.period].filter(Boolean).join(' · ')
}

export function isProductCatalogRecordActive(record: ProductCatalogRecord) {
  return !record.is_deleted && record.is_active
}

export function validateProductCatalogRecord(areaKey: ProductServicesAreaKey, data: Record<string, any>) {
  const fields = [...getProductCatalogHeroFields(areaKey), ...getProductCatalogTabs(areaKey).flatMap(tab => tab.fields)]
  return fields
    .filter(field => field.required)
    .filter(field => !hasValue(data[field.name]))
    .map(field => field.label)
}

export function getCustomerAssetColumns(): ColumnDef[] {
  return [
    { key: 'customer_asset_no', label: 'Müşteri Ürün No', type: 'text', width: 160, sortable: true, filterable: true },
    { key: 'customer_display_name', label: 'Müşteri', type: 'text', width: 220, sortable: true, filterable: true },
    { key: 'product_service_item_name', label: 'Ürün / Hizmet', type: 'text', width: 230, sortable: true, filterable: true },
    { key: 'serial_number', label: 'Seri No', type: 'text', width: 150, sortable: true, filterable: true },
    { key: 'sale_delivery_display', label: 'Satış / Teslim Tarihi', type: 'text', width: 170, sortable: true },
    { key: 'warranty_status', label: 'Garanti Durumu', type: 'badge', width: 150, sortable: true, filterable: true },
    { key: 'license_status', label: 'Lisans Durumu', type: 'badge', width: 150, sortable: true, filterable: true },
    { key: 'service_status', label: 'Servis Durumu', type: 'badge', width: 150, sortable: true, filterable: true },
    { key: 'company_name', label: 'İlgili Şirket', type: 'text', width: 170, sortable: true, filterable: true },
  ]
}

export function getCustomerAssetHeroFields(): FormField[] {
  return [
    { name: 'customer_asset_no', label: 'Müşteri Ürün No', type: 'text', required: true },
    { name: 'customer_display_name', label: 'Müşteri', type: 'text', required: true, colSpan: 2 },
    { name: 'product_service_item_name', label: 'Ürün / Hizmet', type: 'text', required: true, colSpan: 2 },
    { name: 'serial_number', label: 'Seri numarası', type: 'text' },
    { name: 'status', label: 'Mevcut durum', type: 'select', required: true, options: customerAssetStatusOptions },
  ]
}

export function getCustomerAssetTabs(): FormTab[] {
  return [
    {
      id: 'iliski',
      label: 'İlişkiler',
      fields: [
        { name: 'company_name', label: 'İlgili şirket', type: 'text', required: true },
        { name: 'sales_record_ref', label: 'Satış kaydı bağlantısı', type: 'text' },
        { name: 'license_id', label: 'Lisans bağlantısı', type: 'text' },
        { name: 'contract_id', label: 'Bakım sözleşmesi bağlantısı', type: 'text' },
        { name: 'assigned_to_name', label: 'Sorumlu personel', type: 'text' },
      ],
    },
    {
      id: 'tarihler',
      label: 'Tarihler ve Durum',
      fields: [
        { name: 'delivery_date', label: 'Teslim tarihi', type: 'date' },
        { name: 'installation_date', label: 'Kurulum tarihi', type: 'date' },
        { name: 'warranty_start_date', label: 'Garanti başlangıç tarihi', type: 'date' },
        { name: 'warranty_end_date', label: 'Garanti bitiş tarihi', type: 'date' },
        { name: 'license_end_date', label: 'Lisans bitiş tarihi', type: 'date' },
        { name: 'location', label: 'Lokasyon', type: 'text' },
        { name: 'warranty_status', label: 'Garanti durumu', type: 'text' },
        { name: 'license_status', label: 'Lisans durumu', type: 'text' },
        { name: 'service_status', label: 'Servis durumu', type: 'text' },
      ],
    },
    fileAndNotesTab(),
  ]
}

export function decorateCustomerAsset(asset: CustomerAsset) {
  return {
    ...asset,
    status_label: customerAssetStatusLabels[asset.status] || asset.status,
    sale_delivery_display: formatCatalogDate(asset.delivery_date),
  }
}

export function validateCustomerAsset(data: Record<string, any>) {
  const fields = [...getCustomerAssetHeroFields(), ...getCustomerAssetTabs().flatMap(tab => tab.fields)]
  return fields
    .filter(field => field.required)
    .filter(field => !hasValue(data[field.name]))
    .map(field => field.label)
}

export function formatCatalogDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('tr-TR')
}

function fileAndNotesTab(): FormTab {
  return {
    id: 'dosyalar',
    label: 'Dosyalar ve Notlar',
    fields: [
      { name: 'attachments_json', label: 'Dosya ekleri', type: 'document', colSpan: 3 },
      { name: 'notes', label: 'Notlar', type: 'textarea', colSpan: 3 },
    ],
  }
}

function hasValue(value: unknown) {
  if (typeof value === 'boolean') return true
  if (typeof value === 'number') return !Number.isNaN(value)
  if (Array.isArray(value)) return value.length > 0
  return value !== null && value !== undefined && String(value).trim() !== ''
}
