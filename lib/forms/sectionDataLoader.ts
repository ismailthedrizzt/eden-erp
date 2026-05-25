'use client'

import { apiClient, type ApiClientOptions } from '@/lib/api/apiClient'
import type { FormLoadStageStatus } from '@/components/ui/EntityForm'

export type EntitySectionStage =
  | 'hero'
  | 'mediaMetadata'
  | 'profile'
  | 'relationsSummary'
  | 'sectionDetail'
  | 'history'
  | 'fullMedia'

export interface SectionLoadState {
  status: FormLoadStageStatus
  error?: string | null
  updatedAt?: number
}

export function createSectionEndpoint(basePath: string, entityId: string, section: EntitySectionStage | string) {
  return `${basePath.replace(/\/$/, '')}/${entityId}?section=${encodeURIComponent(section)}`
}

export async function loadEntitySection<T = Record<string, any>>(
  basePath: string,
  entityId: string,
  section: EntitySectionStage | string,
  options: ApiClientOptions = {}
) {
  return apiClient.get<{ data: T }>(createSectionEndpoint(basePath, entityId, section), {
    ...options,
    useCache: options.useCache ?? false,
  })
}

export function markSectionLoading(state: Record<string, SectionLoadState>, key: string) {
  return {
    ...state,
    [key]: { status: 'loading' as const, error: null, updatedAt: Date.now() },
  }
}

export function markSectionReady(state: Record<string, SectionLoadState>, key: string) {
  return {
    ...state,
    [key]: { status: 'ready' as const, error: null, updatedAt: Date.now() },
  }
}

export function markSectionError(state: Record<string, SectionLoadState>, key: string, error: unknown) {
  return {
    ...state,
    [key]: {
      status: 'error' as const,
      error: error instanceof Error ? error.message : 'Bölüm yüklenemedi.',
      updatedAt: Date.now(),
    },
  }
}

