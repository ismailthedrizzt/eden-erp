import type { TenantContext } from '@/lib/tenancy/server'
import type { DomainServiceContext } from './domainService.types'

export function createDomainServiceContext(input: DomainServiceContext): DomainServiceContext {
  return input
}

export function extendDomainServiceContext(
  context: DomainServiceContext,
  patch: Partial<Omit<DomainServiceContext, 'supabase' | 'tenantContext'>> & { tenantContext?: TenantContext },
): DomainServiceContext {
  return {
    ...context,
    ...patch,
    tenantContext: patch.tenantContext || context.tenantContext,
  }
}
