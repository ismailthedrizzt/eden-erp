import { apiClient } from '@/lib/api/apiClient'

export const themeManagementService = {
  createDraftThemeRecord(payload: Record<string, unknown>) {
    return apiClient.post('/api/theme/import', payload, { useCache: false })
  },
  importTheme(payload: Record<string, unknown>) {
    return apiClient.post('/api/theme/import', payload, { useCache: false })
  },
  validateTheme(payload: Record<string, unknown>) {
    return apiClient.post('/api/theme/import', payload, { useCache: false })
  },
  activateTheme(payload: Record<string, unknown>) {
    return apiClient.post('/api/theme/import', payload, { useCache: false })
  },
  exportTheme(themeKey: string, format: string) {
    return apiClient.get(`/api/theme/export?themeKey=${encodeURIComponent(themeKey)}&format=${encodeURIComponent(format)}`, { useCache: false })
  },
  uploadThemeAsset(payload: Record<string, unknown>) {
    return apiClient.post('/api/theme/import', payload, { useCache: false })
  },
}
