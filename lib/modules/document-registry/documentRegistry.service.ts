'use client'

import { apiClient } from '@/lib/api/apiClient'
import type {
  CreateDocumentInput,
  CreateDocumentLinkInput,
  CreateMediaAssetInput,
  DocumentSearchFilters,
  MediaAsset,
  MediaSearchFilters,
  RegistryDocument,
  RegistryDocumentLink,
} from './documentRegistry.types'

export const documentRegistryService = {
  async listDocuments(filters: DocumentSearchFilters = {}) {
    const response = await apiClient.get<{ data: RegistryDocument[] }>('/api/documents', { query: filters as Record<string, string | number | boolean | null | undefined> })
    return response.data
  },

  async createDocument(input: CreateDocumentInput) {
    const response = await apiClient.post<{ data: RegistryDocument }>('/api/documents', input as unknown as Record<string, unknown>)
    apiClient.invalidate('/api/documents')
    return response.data
  },

  async linkDocument(input: CreateDocumentLinkInput) {
    const response = await apiClient.post<{ data: RegistryDocumentLink }>('/api/document-links', input as unknown as Record<string, unknown>)
    apiClient.invalidate('/api/documents')
    return response.data
  },

  async unlinkDocument(linkId: string) {
    await apiClient.delete<{ success: true }>(`/api/document-links/${linkId}`)
    apiClient.invalidate('/api/documents')
  },

  async getDocumentSignedUrl(documentId: string, fileId?: string) {
    const response = await apiClient.post<{ signedUrl: string }>(`/api/documents/${documentId}/signed-url`, { file_id: fileId })
    return response.signedUrl
  },
}

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
