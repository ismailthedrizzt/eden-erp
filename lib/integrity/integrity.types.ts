import type { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TenantContext } from '@/lib/tenancy/server'

export type IntegritySeverity = 'info' | 'warning' | 'blocking' | 'critical'

export interface IntegrityAffectedEntity {
  entityType: string
  entityId: string
  label?: string
  status?: string
}

export interface IntegritySuggestedAction {
  label: string
  actionKey?: string
  targetPage?: string
  wizardKey?: string
}

export interface IntegrityCheckResult {
  key: string
  ok: boolean
  severity: IntegritySeverity
  message: string
  reasons: string[]
  warnings: string[]
  affectedEntities: IntegrityAffectedEntity[]
  suggestedActions: IntegritySuggestedAction[]
  metadata?: Record<string, any>
}

export interface IntegrityContext {
  supabase: SupabaseClient
  tenantContext: TenantContext
  userId?: string | null
  companyId?: string | null
  branchId?: string | null
  partnerId?: string | null
  representativeId?: string | null
  organizationUnitId?: string | null
  facilityId?: string | null
  operationKey?: string | null
  entityType?: string | null
  entityId?: string | null
  payload?: Record<string, any>
}

export interface IntegrityCheckDefinition {
  key: string
  label: string
  domain: string
  moduleKey: string
  operationKeys?: string[]
  entityType?: string
  severity: IntegritySeverity
  description?: string
  requiredModules?: string[]
  optionalModules?: string[]
  run: (context: IntegrityContext) => Promise<IntegrityCheckResult>
}

export interface IntegritySummary {
  ok: boolean
  blockingCount: number
  warningCount: number
  criticalCount: number
  results: IntegrityCheckResult[]
  blockingReasons: string[]
  warnings: string[]
  suggestedActions: IntegritySuggestedAction[]
}

export type IntegrityAssertResult =
  | { ok: true; summary: IntegritySummary }
  | { ok: false; summary: IntegritySummary; response: NextResponse }
