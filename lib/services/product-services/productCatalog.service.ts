'use client'

import type { ListMeta } from '@/lib/api/listEndpoint'

export type ApiEnvelope<T> = { data: T; message?: string | null }
export type ListResponse<T> = { data: T[]; meta: ListMeta }

export type ProductCatalogRecord = {
  id: string
  company_id?: string | null
  product_code: string
  product_name: string
  product_type: string
  category?: string | null
  brand?: string | null
  model?: string | null
  description?: string | null
  unit?: string | null
  serial_required: boolean
  warranty_months?: number | null
  maintenance_required: boolean
  maintenance_period_days?: number | null
  serviceable: boolean
  active: boolean
  sale_enabled: boolean
  after_sales_enabled: boolean
  default_currency?: string | null
  default_price?: string | number | null
  technical_specs?: Record<string, unknown>
  document_files?: Record<string, unknown>[]
  notes?: string | null
  updated_at?: string
  version?: number
}

export type ProductSummary = {
  total_products: number
  active_products: number
  after_sales_enabled: number
  maintenance_required: number
  by_type: Record<string, number>
}

export async function listProducts(query: Record<string, unknown> = {}) {
  const payload = await requestJson<ApiEnvelope<ListResponse<ProductCatalogRecord>>>(`/api/products${toQueryString(query)}`)
  return unwrapList(payload)
}

export async function getProductsSummary() {
  const payload = await requestJson<ApiEnvelope<ProductSummary>>('/api/products/summary')
  return payload.data
}

export async function createProduct(input: Partial<ProductCatalogRecord>) {
  const payload = await requestJson<ApiEnvelope<ProductCatalogRecord>>('/api/products', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return payload.data
}

export async function updateProduct(id: string, input: Partial<ProductCatalogRecord>) {
  const payload = await requestJson<ApiEnvelope<ProductCatalogRecord>>(`/api/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return payload.data
}

export async function deleteProduct(id: string) {
  const payload = await requestJson<ApiEnvelope<{ id: string }>>(`/api/products/${id}`, { method: 'DELETE' })
  return payload.data
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Urun/Hizmet islemi tamamlanamadi.')
  return payload as T
}

export function unwrapList<T>(response: ApiEnvelope<ListResponse<T>> | ListResponse<T>): ListResponse<T> {
  if ('data' in response && Array.isArray((response as ListResponse<T>).data)) return response as ListResponse<T>
  const envelope = response as ApiEnvelope<ListResponse<T>>
  return {
    data: envelope.data?.data || [],
    meta: envelope.data?.meta || { page: 1, pageSize: 50, total: 0, totalPages: 1 },
  }
}

export function toQueryString(query: Record<string, unknown>) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  const text = params.toString()
  return text ? `?${text}` : ''
}
