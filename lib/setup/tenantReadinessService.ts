import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { TenantContext } from '@/lib/tenancy/server'
import {
  checkModuleReadiness,
  checkTenantReadiness,
} from './moduleReadinessChecker'

export async function getTenantReadiness(supabase: SupabaseClient, tenantContext: TenantContext) {
  return checkTenantReadiness(supabase, tenantContext)
}

export async function getModuleReadiness(
  supabase: SupabaseClient,
  tenantContext: TenantContext,
  moduleKey: string
) {
  return checkModuleReadiness(supabase, tenantContext, moduleKey)
}

export async function getBlockingSetupIssues(supabase: SupabaseClient, tenantContext: TenantContext) {
  const readiness = await getTenantReadiness(supabase, tenantContext)
  return readiness.modules.filter(module => !module.ready)
}

export async function getNextRecommendedSetupSteps(supabase: SupabaseClient, tenantContext: TenantContext) {
  const readiness = await getTenantReadiness(supabase, tenantContext)
  return readiness.nextRecommendedSteps
}
