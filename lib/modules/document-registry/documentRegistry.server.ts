import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import { requirePermission } from '@/lib/security/serverPermissions'
import type { RegistryDocument } from './documentRegistry.types'

export const DOCUMENT_STORAGE_BUCKET = 'eden-documents'
export const MEDIA_STORAGE_BUCKET = 'eden-media'

const sensitiveDocumentTypes = new Set(['İmza Sirküleri', 'Kimlik', 'Pasaport', 'Vekaletname'])
const sensitiveConfidentialityLevels = new Set(['confidential', 'sensitive'])

export async function requireRegistryPermission(
  request: NextRequest,
  supabase: SupabaseClient,
  permission: string,
) {
  return requirePermission(request, supabase, permission)
}

export async function requireSensitiveDocumentAccess(
  request: NextRequest,
  supabase: SupabaseClient,
  document: Pick<RegistryDocument, 'document_type' | 'confidentiality_level'>,
) {
  if (!isSensitiveDocument(document)) return { userId: null }
  return requirePermission(request, supabase, 'documents.view_sensitive')
}

export function isSensitiveDocument(document: Pick<RegistryDocument, 'document_type' | 'confidentiality_level'>) {
  return sensitiveDocumentTypes.has(document.document_type) || sensitiveConfidentialityLevels.has(document.confidentiality_level)
}

export function maskDocumentForUnauthorizedUser(document: RegistryDocument): RegistryDocument {
  if (!isSensitiveDocument(document)) return document
  return {
    ...document,
    document_title: 'Yetki gerekli',
    document_no: null,
    issuing_authority: null,
    document_files: [],
  }
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
