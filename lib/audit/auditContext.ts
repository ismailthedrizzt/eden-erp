import 'server-only'

import type { NextRequest } from 'next/server'
import type { TenantContext } from '@/lib/tenancy/server'
import type { AuditContext } from './audit.types'

export function buildAuditContextFromRequest(
  request: NextRequest,
  tenantContext: Pick<TenantContext, 'tenantId'>,
  input: Partial<AuditContext> = {}
): AuditContext {
  return {
    tenantId: tenantContext.tenantId,
    ...extractRequestAuditMetadata(request),
    ...input,
  }
}

export function buildAuditContextFromOperation(operation: Record<string, any> | null | undefined, input: Partial<AuditContext> = {}): AuditContext {
  return {
    tenantId: operation?.tenant_id || input.tenantId || null,
    companyId: operation?.company_id || input.companyId || null,
    entityType: operation?.entity_type || input.entityType || null,
    entityId: operation?.entity_id || input.entityId || null,
    operationId: operation?.id || input.operationId || null,
    userId: operation?.requested_by || input.userId || null,
    ...input,
  }
}

export function buildAuditContextFromProcess(processInstance: Record<string, any> | null | undefined, input: Partial<AuditContext> = {}): AuditContext {
  return {
    tenantId: processInstance?.tenant_id || input.tenantId || null,
    companyId: processInstance?.company_id || input.companyId || null,
    moduleKey: processInstance?.module_key || input.moduleKey || null,
    entityType: processInstance?.entity_type || input.entityType || null,
    entityId: processInstance?.entity_id || input.entityId || null,
    processInstanceId: processInstance?.id || input.processInstanceId || null,
    operationId: processInstance?.operation_id || input.operationId || null,
    ...input,
  }
}

export function extractRequestAuditMetadata(request: NextRequest): Pick<AuditContext, 'requestId' | 'ipAddress' | 'userAgent' | 'sessionId'> {
  return {
    requestId: request.headers.get('x-request-id') || request.headers.get('x-vercel-id') || null,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || null,
    userAgent: request.headers.get('user-agent') || null,
    sessionId: request.cookies.get('eden_session')?.value?.slice(0, 16) || null,
  }
}
