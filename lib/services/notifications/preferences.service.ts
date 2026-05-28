'use client'

import { apiClient } from '@/lib/api/apiClient'
import type { ApiEnvelope } from './notificationService'

export type NotificationPreferences = {
  id?: string
  user_id?: string
  in_app_enabled: boolean
  email_enabled: boolean
  task_notifications: boolean
  approval_notifications: boolean
  system_warnings: boolean
  document_expiry: boolean
  service_reminders: boolean
  hr_reminders: boolean
  security_notifications: boolean
  quiet_hours?: Record<string, unknown>
  digest_frequency: 'never' | 'daily' | 'weekly'
  language: string
  timezone: string
  updated_at?: string
}

export type NotificationPreferencePatch = Partial<NotificationPreferences>

export const notificationPreferenceService = {
  async get() {
    const response = await apiClient.get<ApiEnvelope<NotificationPreferences>>('/api/notifications/preferences', {
      useCache: false,
    })
    return response.data
  },
  async update(payload: NotificationPreferencePatch) {
    const response = await apiClient.patch<ApiEnvelope<NotificationPreferences>>('/api/notifications/preferences', payload, {
      useCache: false,
    })
    apiClient.invalidate('/api/notifications/preferences')
    return response.data
  },
}

