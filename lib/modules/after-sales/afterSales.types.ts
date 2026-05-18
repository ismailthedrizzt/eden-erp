export type AfterSalesAreaKey =
  | 'garanti-takip'
  | 'lisans-takip'
  | 'servis-destek-kayitlari'
  | 'bakim-sozlesme-takip'

export type AfterSalesRecordType = 'warranty' | 'license' | 'service' | 'maintenance_contract'
export type AfterSalesRecordStatus = 'draft' | 'active' | 'pending' | 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed' | 'expired' | 'cancelled'
export type AfterSalesPriority = 'low' | 'normal' | 'high' | 'critical'
export type AfterSalesRecordHealth = 'ok' | 'warning' | 'critical' | 'passive'

export interface AfterSalesAreaConfig {
  key: AfterSalesAreaKey
  recordType: AfterSalesRecordType
  title: string
  singularTitle: string
  shortTitle: string
  description: string
  href: string
  tableName: string
  emptyText: string
}

export interface AfterSalesRecord {
  id: string
  record_no: string
  record_type: AfterSalesRecordType
  title: string
  customer_display_name: string
  customer_person_id?: string | null
  customer_organization_id?: string | null
  owner_company_id?: string | null
  owner_company_name: string
  related_company_id?: string | null
  related_company_name?: string | null
  product_service_item_id?: string | null
  product_service_name: string
  product_service_kind: 'product' | 'device' | 'software' | 'license' | 'service'
  customer_asset_id?: string | null
  customer_asset_no?: string | null
  warranty_template_id?: string | null
  maintenance_package_id?: string | null
  serial_or_license_no?: string | null
  responsible_employee_id?: string | null
  responsible_employee_name: string
  sales_record_id?: string | null
  sales_record_ref?: string | null
  status: AfterSalesRecordStatus
  priority: AfterSalesPriority
  start_date?: string | null
  end_date?: string | null
  renewal_date?: string | null
  next_action_date?: string | null
  sla_due_at?: string | null
  last_contact_at?: string | null
  channel?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  warning_count: number
  alert_note?: string | null
  notes?: string | null
  portal_visibility: 'internal' | 'customer_visible' | 'partner_visible'
  preferred_contact_channel: 'phone' | 'email' | 'portal' | 'whatsapp' | 'onsite'
  metadata_json?: Record<string, unknown>
  record_status: 'active' | 'passive'
  is_deleted: boolean
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export interface AfterSalesDashboardSummary {
  area: AfterSalesAreaConfig
  activeCount: number
  warningCount: number
  criticalCount: number
}
