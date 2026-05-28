'use client'

import { apiClient } from '@/lib/api/apiClient'

export type ApiEnvelope<T> = {
  data: T
  message?: string | null
  warnings?: string[]
}

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error' | 'critical'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'
export type NotificationStatus = 'unread' | 'read' | 'dismissed' | 'archived'

export type NotificationRecord = {
  id: string
  user_id: string
  company_id?: string | null
  branch_id?: string | null
  module_key: string
  notification_type: string
  title: string
  message: string
  severity: NotificationSeverity
  priority: NotificationPriority
  status: NotificationStatus
  action_required?: boolean
  action_key?: string | null
  action_label?: string | null
  target_page?: string | null
  related_entity_type?: string | null
  related_entity_id?: string | null
  related_record_label?: string | null
  due_at?: string | null
  expires_at?: string | null
  delivered_channels?: string[]
  delivery_status?: string | null
  created_at?: string
  read_at?: string | null
  dismissed_at?: string | null
  metadata_json?: Record<string, unknown>
}

export type NotificationListResult = {
  data: NotificationRecord[]
  meta: {
    page: number
    pageSize: number
    total: number
  }
}

export type NotificationCounts = {
  unread: number
  high_priority: number
  critical: number
  action_required: number
}

export type NotificationListQuery = {
  status?: NotificationStatus
  notification_type?: string
  module_key?: string
  severity?: NotificationSeverity
  priority?: NotificationPriority
  action_required?: boolean
  related_entity_type?: string
  related_entity_id?: string
  search?: string
  page?: number
  pageSize?: number
}

function unwrap<T>(response: ApiEnvelope<T> | { data: T }): T {
  return response.data
}

export const notificationService = {
  async list(query: NotificationListQuery = {}) {
    const response = await apiClient.get<ApiEnvelope<NotificationListResult>>('/api/notifications', {
      query,
      useCache: false,
    })
    return unwrap(response)
  },
  async counts() {
    const response = await apiClient.get<ApiEnvelope<NotificationCounts>>('/api/notifications/counts', {
      useCache: false,
    })
    return unwrap(response)
  },
  async get(notificationId: string) {
    const response = await apiClient.get<ApiEnvelope<NotificationRecord>>(`/api/notifications/${notificationId}`, {
      useCache: false,
    })
    return unwrap(response)
  },
  async markRead(notificationId: string) {
    const response = await apiClient.post<ApiEnvelope<NotificationRecord>>(`/api/notifications/${notificationId}/read`, {}, {
      useCache: false,
    })
    apiClient.invalidate('/api/notifications')
    return unwrap(response)
  },
  async readAll() {
    const response = await apiClient.post<ApiEnvelope<{ updated: number }>>('/api/notifications/read-all', {}, {
      useCache: false,
    })
    apiClient.invalidate('/api/notifications')
    return unwrap(response)
  },
  async dismiss(notificationId: string) {
    const response = await apiClient.post<ApiEnvelope<NotificationRecord>>(`/api/notifications/${notificationId}/dismiss`, {}, {
      useCache: false,
    })
    apiClient.invalidate('/api/notifications')
    return unwrap(response)
  },
  async archive(notificationId: string) {
    const response = await apiClient.post<ApiEnvelope<NotificationRecord>>(`/api/notifications/${notificationId}/archive`, {}, {
      useCache: false,
    })
    apiClient.invalidate('/api/notifications')
    return unwrap(response)
  },
}

