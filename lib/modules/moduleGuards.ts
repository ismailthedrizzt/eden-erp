import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getModuleContract } from './moduleRegistry'
import {
  getModuleRuntimeStatus,
  isFeatureEnabled,
  loadModuleFeatureContext,
} from './moduleFeatureResolver'
import type { ModuleRuntimeStatus } from './moduleContract.types'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { getModuleReadiness } from '@/lib/setup/tenantReadinessService'
import { getSetupActionsForModule } from '@/lib/setup/setupActionResolver'

export async function requireModuleAvailable(request: NextRequest, moduleKey: string) {
  const supabase = createServiceClient()
  const tenantContext = resolveTenantContext(request)
  const context = await loadModuleFeatureContext(supabase, {
    tenantId: tenantContext.tenantId,
  }).catch(() => ({ moduleLicenses: [] }))
  const status = getModuleRuntimeStatus(moduleKey, context)
  if (status.status !== 'available') return moduleUnavailableResponse(status)
  const readiness = await getModuleReadiness(supabase as any, tenantContext, moduleKey).catch(() => null)
  if (readiness && !readiness.ready) return moduleSetupRequiredResponse(readiness)
  return null
}

export async function requireModuleFeature(request: NextRequest, moduleKey: string, featureKey: string) {
  const moduleResponse = await requireModuleAvailable(request, moduleKey)
  if (moduleResponse) return moduleResponse
  const supabase = createServiceClient()
  const context = await loadModuleFeatureContext(supabase, {
    tenantId: request.headers.get('x-tenant-id'),
  }).catch(() => ({ moduleLicenses: [] }))
  if (isFeatureEnabled(moduleKey, featureKey, context)) return null
  const contract = getModuleContract(moduleKey)
  return NextResponse.json({
    error: `${contract?.name || moduleKey} icinde bu ozellik aktif degil.`,
    code: 'MODULE_FEATURE_DISABLED',
    details: { moduleKey, featureKey, status: 'disabled' },
  }, { status: 403 })
}

export function moduleUnavailableResponse(status: ModuleRuntimeStatus) {
  const contract = getModuleContract(status.moduleKey)
  const code = status.status === 'disabled'
    ? 'MODULE_DISABLED'
    : status.status === 'unlicensed'
      ? 'MODULE_UNLICENSED'
      : status.status === 'setup_required'
        ? 'MODULE_SETUP_REQUIRED'
        : 'MODULE_DEPENDENCY_MISSING'

  return NextResponse.json({
    error: status.blocking_reasons[0] || `${contract?.name || status.moduleKey} modulu kullanilabilir degil.`,
    code,
    details: {
      moduleKey: status.moduleKey,
      status: status.status,
      blocking_reasons: status.blocking_reasons,
      warnings: status.warnings,
    },
  }, { status: status.status === 'unlicensed' ? 402 : 403 })
}

export function moduleSetupRequiredResponse(readiness: Awaited<ReturnType<typeof getModuleReadiness>>) {
  const actions = getSetupActionsForModule(readiness.moduleKey, readiness)
  const code = readiness.status === 'dependency_missing'
    ? 'MODULE_DEPENDENCY_MISSING'
    : readiness.status === 'unlicensed'
      ? 'MODULE_UNLICENSED'
      : readiness.status === 'disabled'
        ? 'MODULE_DISABLED'
        : 'MODULE_SETUP_REQUIRED'
  return NextResponse.json({
    error: readiness.blockingReasons[0] || 'Bu modulun kurulumu tamamlanmamis.',
    code,
    details: {
      moduleKey: readiness.moduleKey,
      status: readiness.status,
      blockingReasons: readiness.blockingReasons,
      warnings: readiness.warnings,
      setupActions: actions,
    },
  }, { status: readiness.status === 'unlicensed' ? 402 : readiness.status === 'dependency_missing' ? 403 : 503 })
}
