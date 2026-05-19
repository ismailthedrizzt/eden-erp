'use client'

import { apiClient, type ApiClientOptions } from '@/lib/api/apiClient'
import type { ListQuery, ListResponse } from '@/lib/api/listEndpoint'
import type { EntityContract } from '@/lib/crud/entityContracts'
import { getUnknownEntityPayloadFields } from '@/lib/crud/entityContracts'

export type EntityFormMode = 'create' | 'edit' | 'view'

type JsonRecord = Record<string, any>

export interface EntityCrudEndpoint {
  collectionPath: string
  recordPath?: string | ((id: string) => string)
}

export interface EntityCrudMutationOptions<TPrevious extends JsonRecord = JsonRecord> {
  endpoint: EntityCrudEndpoint
  id?: string | null
  data: JsonRecord
  mode: Extract<EntityFormMode, 'create' | 'edit'>
  previous?: TPrevious | null
  diffOnly?: boolean
  contract?: EntityContract
  rejectUnknownFields?: boolean
  options?: ApiClientOptions
}

export interface EntityCrudDeleteOptions {
  endpoint: EntityCrudEndpoint
  id: string
  options?: ApiClientOptions
}

export interface EntityCrudReadOptions {
  endpoint: EntityCrudEndpoint
  id: string
  query?: ApiClientOptions['query']
  options?: ApiClientOptions
}

export interface EntityCrudListOptions {
  endpoint: Pick<EntityCrudEndpoint, 'collectionPath'>
  query?: Partial<Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>> & Record<string, unknown>
  options?: ApiClientOptions
}

export async function createEntityRecord<T = unknown>(
  endpoint: Pick<EntityCrudEndpoint, 'collectionPath'>,
  data: JsonRecord,
  options: ApiClientOptions = {}
) {
  return apiClient.post<{ data: T }>(endpoint.collectionPath, data, options)
}

export async function readEntityRecord<T = unknown>({
  endpoint,
  id,
  query,
  options = {},
}: EntityCrudReadOptions) {
  return apiClient.get<{ data: T }>(recordPath(endpoint, id), {
    ...options,
    query: { ...query, ...options.query },
  })
}

export async function listEntityRecords<T = unknown>({
  endpoint,
  query,
  options = {},
}: EntityCrudListOptions) {
  return apiClient.get<ListResponse<T>>(endpoint.collectionPath, {
    ...options,
    query: { ...query, ...options.query } as ApiClientOptions['query'],
  })
}

export async function updateEntityRecord<T = unknown>(
  endpoint: EntityCrudEndpoint,
  id: string,
  data: JsonRecord,
  options: ApiClientOptions = {}
) {
  return apiClient.patch<{ data: T }>(recordPath(endpoint, id), data, options)
}

export async function deleteEntityRecord<T = unknown>({
  endpoint,
  id,
  options = {},
}: EntityCrudDeleteOptions) {
  return apiClient.delete<T>(recordPath(endpoint, id), options)
}

export async function saveEntityRecord<T = unknown>({
  endpoint,
  id,
  data,
  mode,
  previous,
  diffOnly = mode === 'edit',
  contract,
  rejectUnknownFields,
  options = {},
}: EntityCrudMutationOptions) {
  validateContractPayload(contract, data, rejectUnknownFields)
  if (mode === 'create') return createEntityRecord<T>(endpoint, data, options)
  if (!id) throw new Error('Guncellenecek kayit kimligi bulunamadi.')

  const payload = diffOnly && previous ? diffRecord(data, previous) : data
  validateContractPayload(contract, payload, rejectUnknownFields)
  return updateEntityRecord<T>(endpoint, id, payload, options)
}

export function diffRecord(next: JsonRecord, previous: JsonRecord) {
  const patch: JsonRecord = {}

  Object.entries(next).forEach(([key, value]) => {
    if (!deepEqual(value, previous[key])) patch[key] = value
  })

  return patch
}

function recordPath(endpoint: EntityCrudEndpoint, id: string) {
  if (typeof endpoint.recordPath === 'function') return endpoint.recordPath(id)
  if (endpoint.recordPath) return endpoint.recordPath.replace(':id', id)
  return `${endpoint.collectionPath.replace(/\/$/, '')}/${id}`
}

function deepEqual(left: unknown, right: unknown) {
  return stableStringify(left ?? null) === stableStringify(right ?? null)
}

function validateContractPayload(
  contract: EntityContract | undefined,
  payload: JsonRecord,
  rejectUnknownFields?: boolean
) {
  if (!contract || !rejectUnknownFields) return
  const unknownFields = getUnknownEntityPayloadFields(contract, payload)
  if (unknownFields.length > 0) {
    throw new Error(`${contract.key} form payload sozlesmesinde olmayan alanlar iceriyor: ${unknownFields.join(', ')}`)
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`
}
