export type ProductServicesAreaKey =
  | 'urun-kartlari'
  | 'hizmet-kartlari'
  | 'lisans-abonelik-urunleri'
  | 'seri-numarali-urunler'
  | 'garanti-sablonlari'
  | 'bakim-paketleri'

export type ProductCatalogRecordKind =
  | 'product_item'
  | 'service_item'
  | 'license_item'
  | 'serial_item'
  | 'warranty_template'
  | 'maintenance_package'

export type ProductServiceItemKind = 'product' | 'service' | 'license_subscription'
export type ProductItemType = 'physical_product' | 'device' | 'equipment' | 'spare_part' | 'manufactured_product' | 'imported_product' | 'consumable' | 'other'
export type ServiceItemType = 'installation' | 'maintenance' | 'technical_support' | 'training' | 'consulting' | 'integration' | 'project_service' | 'other'
export type LicenseItemType = 'single_user' | 'multi_user' | 'enterprise' | 'subscription' | 'perpetual' | 'trial'
export type SerialProductStatus = 'in_stock' | 'sold' | 'at_customer' | 'in_service' | 'returned' | 'replaced' | 'scrapped'
export type WarrantyTemplateType = 'standard' | 'extended' | 'manufacturer' | 'seller' | 'service'
export type MaintenancePackageType = 'periodic_maintenance' | 'technical_support' | 'sla_package' | 'license_maintenance' | 'warranty_extension' | 'enterprise_support'
export type CustomerAssetStatus = 'active' | 'under_warranty' | 'out_of_warranty' | 'in_service' | 'in_maintenance' | 'license_expired' | 'inactive' | 'returned'

export interface ProductServicesAreaConfig {
  key: ProductServicesAreaKey
  recordKind: ProductCatalogRecordKind
  title: string
  singularTitle: string
  shortTitle: string
  description: string
  href: string
  tableName: string
  emptyText: string
  codePrefix: string
}

export interface ProductCatalogBaseRecord {
  id: string
  company_id?: string | null
  company_name?: string | null
  code: string
  name: string
  description?: string | null
  status: string
  is_active: boolean
  is_deleted: boolean
  deleted_at?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
  metadata_json?: Record<string, unknown>
  notes?: string | null
}

export interface ProductServiceItem extends ProductCatalogBaseRecord {
  item_kind: ProductServiceItemKind
  item_type: ProductItemType | ServiceItemType | LicenseItemType
  category_id?: string | null
  category_name?: string | null
  brand_id?: string | null
  brand_name?: string | null
  model?: string | null
  unit?: string | null
  vat_rate?: number | null
  purchase_price?: number | null
  sale_price?: number | null
  currency?: string | null
  is_sellable: boolean
  is_purchasable: boolean
  is_stock_tracked: boolean
  is_manufacturable: boolean
  requires_serial_number: boolean
  has_warranty_tracking: boolean
  has_license_tracking: boolean
  is_serviceable: boolean
  is_maintenance_contract_eligible: boolean
  minimum_stock_level?: number | null
  default_warranty_duration?: number | null
  default_warranty_unit?: 'day' | 'month' | 'year' | null
  default_user_count?: number | null
  default_license_duration?: number | null
  default_license_unit?: 'day' | 'month' | 'year' | null
  is_time_limited_license?: boolean
  is_renewable?: boolean
  is_auto_renewal_eligible?: boolean
  is_periodic_service?: boolean
  can_attach_to_contract?: boolean
  can_attach_to_service_request?: boolean
  attachments_json?: unknown[]
}

export interface ProductSerial extends ProductCatalogBaseRecord {
  product_service_item_id: string
  product_service_item_name: string
  product_code?: string | null
  serial_number: string
  lot_number?: string | null
  brand_name?: string | null
  model?: string | null
  supplier_id?: string | null
  supplier_name?: string | null
  purchase_date?: string | null
  sale_date?: string | null
  delivery_date?: string | null
  customer_id?: string | null
  customer_display_name?: string | null
  warranty_start_date?: string | null
  warranty_end_date?: string | null
  warranty_status?: string | null
  status: SerialProductStatus
}

export interface WarrantyTemplate extends ProductCatalogBaseRecord {
  warranty_duration: number
  duration_unit: 'day' | 'month' | 'year'
  warranty_type: WarrantyTemplateType
  product_service_item_id?: string | null
  product_service_item_name?: string | null
  category_id?: string | null
  category_name?: string | null
  coverage?: string | null
  exclusions?: string | null
}

export interface MaintenancePackage extends ProductCatalogBaseRecord {
  package_type: MaintenancePackageType
  period?: string | null
  sla_enabled: boolean
  sla_level?: string | null
  response_time?: string | null
  resolution_time?: string | null
  sale_price?: number | null
  currency?: string | null
  vat_rate?: number | null
  related_category_id?: string | null
  related_category_name?: string | null
  is_sellable: boolean
}

export type ProductCatalogRecord =
  | ProductServiceItem
  | ProductSerial
  | WarrantyTemplate
  | MaintenancePackage

export interface ProductCatalogDashboardSummary {
  area: ProductServicesAreaConfig
  totalCount: number
  activeCount: number
}

export interface ProductCategory {
  id: string
  code: string
  name: string
  parent_id?: string | null
  status: string
  is_active: boolean
}

export interface ProductBrand {
  id: string
  code: string
  name: string
  status: string
  is_active: boolean
}

export interface CustomerAsset {
  id: string
  customer_asset_no: string
  customer_id?: string | null
  customer_display_name: string
  company_id?: string | null
  company_name?: string | null
  product_service_item_id: string
  product_service_item_name: string
  product_serial_id?: string | null
  serial_number?: string | null
  sales_record_id?: string | null
  sales_record_ref?: string | null
  license_id?: string | null
  warranty_id?: string | null
  contract_id?: string | null
  delivery_date?: string | null
  installation_date?: string | null
  warranty_start_date?: string | null
  warranty_end_date?: string | null
  license_end_date?: string | null
  location?: string | null
  assigned_to?: string | null
  assigned_to_name?: string | null
  status: CustomerAssetStatus
  warranty_status?: string | null
  license_status?: string | null
  service_status?: string | null
  notes?: string | null
  attachments_json?: unknown[]
  is_active: boolean
  is_deleted: boolean
  deleted_at?: string | null
  created_at: string
  updated_at: string
}
