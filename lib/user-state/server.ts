import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { APP_SESSION_COOKIE_NAME, verifyAppSessionToken } from '@/lib/auth/appSession'
import { extractCompanyLogoVariants } from '@/lib/media/companyLogo'
import { createServiceClient } from '@/lib/supabase/server'
import { DEFAULT_TENANT_ID } from '@/lib/tenancy/constants'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { DEFAULT_UI_PREFERENCES } from './default-ui-preferences'
import { mergeUiPreferences } from './merge-ui-preferences'

export const SYSTEM_TOUR_VERSION = 'v1'

const LOGIN_BYPASS_ENABLED = process.env.EDEN_LOGIN_DISABLED === 'true'
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

export type ServiceSupabase = ReturnType<typeof createServiceClient>

export type AuthenticatedWorkspaceContext = {
  supabase: ServiceSupabase
  userId: string
  workspaceId: string
}

type WorkspaceCompanySummary = {
  id: string
  short_name?: string | null
  trade_name?: string | null
  logo_url?: string | null
  hero_images?: unknown
}

export function getClientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || null
}

export function getUserAgent(request: NextRequest) {
  return request.headers.get('user-agent') || null
}

export async function getAuthenticatedWorkspaceContext(
  request: NextRequest
): Promise<AuthenticatedWorkspaceContext | NextResponse> {
  const supabase = createServiceClient()
  const tenantContext = resolveTenantContext(request)

  if (LOGIN_BYPASS_ENABLED) {
    return {
      supabase,
      userId: DEV_USER_ID,
      workspaceId: tenantContext.workspaceId || DEFAULT_TENANT_ID,
    }
  }

  const appSession = await verifyAppSessionToken(request.cookies.get(APP_SESSION_COOKIE_NAME)?.value)
  let userId = appSession?.userId || null

  if (!userId) {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (token) {
      const { data, error } = await supabase.auth.getUser(token)
      if (!error && data.user?.id) userId = data.user.id
    }
  }

  if (!userId) {
    return NextResponse.json({ error: 'Oturum bulunamadi.', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  const workspaceId = tenantContext.workspaceId || appSession?.tenantId || DEFAULT_TENANT_ID
  const membership = await validateWorkspaceMembership(supabase, userId, workspaceId)
  if (membership instanceof NextResponse) return membership

  return { supabase, userId, workspaceId }
}

export async function fetchWorkspaceSummary(supabase: ServiceSupabase, workspaceId: string) {
  const [instanceResult, company] = await Promise.all([
    supabase
      .from('erp_instances')
      .select('id,name')
      .eq('id', workspaceId)
      .maybeSingle(),
    fetchPrimaryWorkspaceCompany(supabase, workspaceId),
  ])

  if (instanceResult.error) {
    const logoUrls = resolveCompanyLogoUrls(company)
    return {
      id: workspaceId,
      name: 'Eden ERP',
      ...logoUrls,
    }
  }

  const companyName = getWorkspaceCompanyName(company)
  const logoUrls = resolveCompanyLogoUrls(company)

  return {
    id: instanceResult.data?.id || workspaceId,
    name: companyName || instanceResult.data?.name || 'Eden ERP',
    ...logoUrls,
  }
}

async function fetchPrimaryWorkspaceCompany(supabase: ServiceSupabase, workspaceId: string) {
  const scopedCompanyId = await fetchPrimaryScopedCompanyId(supabase, workspaceId)
  if (scopedCompanyId) return fetchCompanySummaryById(supabase, scopedCompanyId)

  const { data, error } = await supabase
    .from('companies')
    .select('id,short_name,trade_name,logo_url,hero_images')
    .eq('tenant_id', workspaceId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) return null
  return (data || null) as WorkspaceCompanySummary | null
}

async function fetchPrimaryScopedCompanyId(supabase: ServiceSupabase, workspaceId: string) {
  const primary = await supabase
    .from('tenant_company_scopes')
    .select('company_id')
    .eq('tenant_id', workspaceId)
    .eq('status', 'active')
    .eq('is_primary', true)
    .maybeSingle()

  if (!primary.error && primary.data?.company_id) return String(primary.data.company_id)

  const firstActive = await supabase
    .from('tenant_company_scopes')
    .select('company_id')
    .eq('tenant_id', workspaceId)
    .eq('status', 'active')
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (firstActive.error || !firstActive.data?.company_id) return null
  return String(firstActive.data.company_id)
}

async function fetchCompanySummaryById(supabase: ServiceSupabase, companyId: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('id,short_name,trade_name,logo_url,hero_images')
    .eq('id', companyId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) return null
  return (data || null) as WorkspaceCompanySummary | null
}

function getWorkspaceCompanyName(company: WorkspaceCompanySummary | null) {
  return cleanText(company?.short_name) || firstWords(company?.trade_name, 2)
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function firstWords(value: unknown, count: number) {
  return cleanText(value).split(/\s+/).filter(Boolean).slice(0, count).join(' ')
}

function resolveCompanyLogoUrls(company: WorkspaceCompanySummary | null) {
  const variants = extractCompanyLogoVariants(company?.hero_images, {
    fallbackUrl: cleanText(company?.logo_url),
    preferThumbnail: true,
  })

  return {
    logoUrl: variants.logoUrl || null,
    lightLogoUrl: variants.lightLogoUrl || null,
    darkLogoUrl: variants.darkLogoUrl || variants.lightLogoUrl || null,
  }
}

export async function ensureUserStateRow(
  supabase: ServiceSupabase,
  userId: string,
  workspaceId: string
) {
  const { error } = await supabase.rpc('merge_user_workspace_ui_preferences', {
    p_user_id: userId,
    p_workspace_id: workspaceId,
    p_patch: {},
    p_ui_defaults: DEFAULT_UI_PREFERENCES,
  })

  if (error) throw new Error(error.message)
}

export async function safeInsertSystemEvent(
  supabase: ServiceSupabase,
  input: {
    workspaceId: string | null
    actorUserId: string | null
    eventType: string
    metadata?: Record<string, unknown>
    ipAddress?: string | null
    userAgent?: string | null
  }
) {
  try {
    const { error } = await supabase
      .from('system_event_logs')
      .insert({
        workspace_id: input.workspaceId,
        actor_user_id: input.actorUserId,
        event_type: input.eventType,
        metadata: input.metadata || {},
        ip_address: input.ipAddress || null,
        user_agent: input.userAgent || null,
      })

    if (error) console.error('System event log write failed:', error.message)
  } catch (error) {
    console.error('System event log write failed:', error)
  }
}

export function mapUserStateForResponse(state: Record<string, any>, isFirstLogin: boolean) {
  const introVersion = state.intro_version || SYSTEM_TOUR_VERSION
  const introCompleted = Boolean(state.intro_completed_at)
  const shouldShowSystemTour = !introCompleted || introVersion !== SYSTEM_TOUR_VERSION

  return {
    isFirstLogin,
    shouldShowSystemTour,
    introVersion,
    introCurrentStep: state.intro_current_step || null,
    uiPreferences: mergeUiPreferences(DEFAULT_UI_PREFERENCES, state.ui_preferences),
  }
}

async function validateWorkspaceMembership(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
) {
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('id,status')
    .eq('tenant_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    if (isMissingWorkspaceAccessTable(error) && workspaceId === DEFAULT_TENANT_ID) return true
    return NextResponse.json({ error: error.message, code: 'WORKSPACE_ACCESS_CHECK_FAILED' }, { status: 500 })
  }

  if (!data && process.env.EDEN_ALLOW_LEGACY_API_ACCESS !== 'true') {
    return NextResponse.json({ error: 'Calisma alani erisimi bulunamadi.', code: 'WORKSPACE_ACCESS_DENIED' }, { status: 403 })
  }

  return true
}

function isMissingWorkspaceAccessTable(error: { code?: string; message?: string } | null) {
  const message = error?.message || ''
  return error?.code === '42P01'
    || error?.code === '42703'
    || error?.code === 'PGRST204'
    || error?.code === 'PGRST205'
    || message.includes('schema cache')
    || message.includes('does not exist')
    || message.includes('Could not find')
}
