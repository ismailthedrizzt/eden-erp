'use client'

import { apiClient } from '@/lib/api/apiClient'
import type {
  CreateMediaAssetInput,
  MediaAsset,
  MediaSearchFilters,
} from './documentRegistry.types'

export const mediaRegistryService = {
  async listMedia(filters: MediaSearchFilters = {}) {
    const response = await apiClient.get<{ data: MediaAsset[] }>('/api/media-assets', { query: filters as Record<string, string | number | boolean | null | undefined> })
    return response.data
  },

  async createMedia(input: CreateMediaAssetInput) {
    const response = await apiClient.post<{ data: MediaAsset }>('/api/media-assets', input as unknown as Record<string, unknown>)
    apiClient.invalidate('/api/media-assets')
    return response.data
  },

  async linkMedia(assetId: string, linked_module: string, linked_record_id: string) {
    const response = await apiClient.patch<{ data: MediaAsset }>(`/api/media-assets/${assetId}`, {
      linked_module,
      linked_record_id,
    })
    apiClient.invalidate('/api/media-assets')
    return response.data
  },

  async getMediaSignedUrl(assetId: string) {
    const response = await apiClient.post<{ signedUrl: string }>(`/api/media-assets/${assetId}/signed-url`)
    return response.signedUrl
  },
}
