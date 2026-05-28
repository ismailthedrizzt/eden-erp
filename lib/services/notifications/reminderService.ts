'use client'

import { apiClient } from '@/lib/api/apiClient'
import type { ApiEnvelope } from './notificationService'

export type ReminderRecord = {
  id: string
  user_id?: string | null
  target_user_id?: string | null
  company_id?: string | null
  module_key: string
  reminder_type: string
  title: string
  message: string
  related_entity_type?: string | null
  related_entity_id?: string | null
  due_at?: string | null
  remind_at: string
  recurrence_rule?: string | null
  status: 'scheduled' | 'sent' | 'dismissed' | 'cancelled' | 'failed'
  channels: string[]
  created_by?: string | null
  created_at?: string
  sent_at?: string | null
  metadata_json?: Record<string, unknown>
}

export type ReminderListResult = {
  data: ReminderRecord[]
  meta: {
    page: number
    pageSize: number
    total: number
  }
}

export type ReminderCreateInput = {
  target_user_id?: string | null
  company_id?: string | null
  module_key: string
  reminder_type: string
  title: string
  message: string
  related_entity_type?: string | null
  related_entity_id?: string | null
  due_at?: string | null
  remind_at: string
  recurrence_rule?: string | null
  channels?: string[]
  metadata_json?: Record<string, unknown>
}

export const reminderService = {
  async list(query: Record<string, string | number | boolean | null | undefined> = {}) {
    const response = await apiClient.get<ApiEnvelope<ReminderListResult>>('/api/reminders', {
      query,
      useCache: false,
    })
    return response.data
  },
  async create(payload: ReminderCreateInput) {
    const response = await apiClient.post<ApiEnvelope<ReminderRecord>>('/api/reminders', payload, {
      useCache: false,
    })
    apiClient.invalidate('/api/reminders')
    return response.data
  },
  async dismiss(reminderId: string) {
    const response = await apiClient.post<ApiEnvelope<ReminderRecord>>(`/api/reminders/${reminderId}/dismiss`, {}, {
      useCache: false,
    })
    apiClient.invalidate('/api/reminders')
    return response.data
  },
  async cancel(reminderId: string) {
    const response = await apiClient.post<ApiEnvelope<ReminderRecord>>(`/api/reminders/${reminderId}/cancel`, {}, {
      useCache: false,
    })
    apiClient.invalidate('/api/reminders')
    return response.data
  },
}

