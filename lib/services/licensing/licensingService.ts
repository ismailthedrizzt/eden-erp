'use client'

import { apiClient } from '@/lib/api/apiClient'
import type { TenantEntitlements } from '@/lib/licensing/tenantEntitlements'

export interface ApiEnvelope<T> {
  data: T
  warnings?: string[]
  message?: string
}

export interface LicensedProduct {
  id: string
  product_key: string
  product_name: string
  description?: string | null
  status: string
  source?: string
}

export interface ProductPlan {
  id: string
  product_key?: string
  product_id?: string
  plan_key: string
  plan_name: string
  description?: string | null
  status: string
  business_size_label?: string | null
  default_billing_period?: string
  base_price?: number | null
  currency?: string
  trial_days?: number
  support_level?: string
  visible_in_setup?: boolean
  is_development_plan?: boolean
  sort_order?: number
  limits?: Record<string, number | null | undefined>
  source?: string
}

export interface TenantLicense {
  id: string
  tenant_id: string
  product_id?: string
  product_plan_id?: string
  license_key: string
  status: string
  product_key?: string
  product_name?: string
  plan_key?: string
  plan_name?: string
  starts_at?: string | null
  ends_at?: string | null
  renews_at?: string | null
  billing_period?: string
  price?: number | null
  currency?: string
  payment_status?: string
  max_users?: number | null
  max_companies?: number | null
  max_branches?: number | null
  max_storage_mb?: number | null
  updated_at?: string
}

export interface PlanModule {
  module_key: string
  enabled: boolean
  visibility?: string
  included_level?: string
  source?: string
}

export interface PlanFeature {
  feature_key: string
  enabled: boolean
  source?: string
}

export async function getCurrentEntitlements() {
  const response = await apiClient.get<ApiEnvelope<TenantEntitlements>>('/api/licensing/current', { useCache: false })
  return response
}

export async function getLicensedProducts() {
  return apiClient.get<ApiEnvelope<{ products: LicensedProduct[] }>>('/api/licensing/products', { useCache: false })
}

export async function getProductPlans(productId = 'eden_erp') {
  return apiClient.get<ApiEnvelope<{ plans: ProductPlan[] }>>(`/api/licensing/products/${encodeURIComponent(productId)}/plans`, { useCache: false })
}

export async function getPlanModules(planId: string) {
  return apiClient.get<ApiEnvelope<{ modules: PlanModule[] }>>(`/api/licensing/plans/${encodeURIComponent(planId)}/modules`, { useCache: false })
}

export async function getPlanFeatures(planId: string) {
  return apiClient.get<ApiEnvelope<{ features: PlanFeature[] }>>(`/api/licensing/plans/${encodeURIComponent(planId)}/features`, { useCache: false })
}

export async function getTenantLicenses() {
  return apiClient.get<ApiEnvelope<{ licenses: TenantLicense[] }>>('/api/licensing/tenant-licenses', { useCache: false })
}

export async function changeTenantLicensePlan(licenseId: string, planKey: string) {
  return apiClient.post<ApiEnvelope<TenantLicense>>(`/api/licensing/tenant-licenses/${encodeURIComponent(licenseId)}/change-plan`, { plan_key: planKey }, { useCache: false })
}

export async function updateTenantLicenseStatus(licenseId: string, action: 'suspend' | 'reactivate' | 'cancel' | 'archive') {
  return apiClient.post<ApiEnvelope<TenantLicense>>(`/api/licensing/tenant-licenses/${encodeURIComponent(licenseId)}/${action}`, {}, { useCache: false })
}

