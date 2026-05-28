'use client'

import { apiClient } from '@/lib/api/apiClient'
import type { ApiEnvelope } from './notificationService'

export type EmailMessageRecord = {
  id: string
  user_id?: string | null
  to_email: string
  to_name?: string | null
  subject: string
  template_key?: string | null
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'skipped'
  provider?: string | null
  provider_message_id?: string | null
  retry_count: number
  last_error?: string | null
  related_notification_id?: string | null
  related_entity_type?: string | null
  related_entity_id?: string | null
  created_at?: string
  sent_at?: string | null
  metadata_json?: Record<string, unknown>
}

export type EmailListResult = {
  data: EmailMessageRecord[]
  meta: {
    page: number
    pageSize: number
    total: number
  }
}

export const emailService = {
  async list(query: Record<string, string | number | boolean | null | undefined> = {}) {
    const response = await apiClient.get<ApiEnvelope<EmailListResult>>('/api/system/email/messages', {
      query,
      useCache: false,
    })
    return response.data
  },
  async retry(messageId: string) {
    const response = await apiClient.post<ApiEnvelope<EmailMessageRecord>>(`/api/system/email/messages/${messageId}/retry`, {}, {
      useCache: false,
    })
    apiClient.invalidate('/api/system/email/messages')
    return response.data
  },
  async test(payload: { to_email: string; to_name?: string; subject?: string; message?: string }) {
    const response = await apiClient.post<ApiEnvelope<EmailMessageRecord>>('/api/system/email/test', payload, {
      useCache: false,
    })
    apiClient.invalidate('/api/system/email/messages')
    return response.data
  },
}

