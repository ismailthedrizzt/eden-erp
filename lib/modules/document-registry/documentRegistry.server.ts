import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import { requirePermission } from '@/lib/security/serverPermissions'

export const MEDIA_STORAGE_BUCKET = 'eden-media'

export async function requireRegistryPermission(
  request: NextRequest,
  supabase: SupabaseClient,
  permission: string,
) {
  return requirePermission(request, supabase, permission)
}

export async function auditRegistryEvent(
  supabase: SupabaseClient,
  userId: string | null,
  resource: string,
  recordId: string | null,
  action: string,
  after?: Record<string, unknown>,
) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    module_code: resource === 'media_assets' ? 'media' : 'documents',
    resource,
    record_id: recordId,
    action,
    after_json: after || null,
  })
}

export function storagePathLooksSafe(path: string) {
  return !!path && !path.includes('..') && !path.startsWith('/') && !/^https?:\/\//i.test(path)
}

export function invalidRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, code: 'VALIDATION_FAILED', details }, { status: 400 })
}
