import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  ensureUserStateRow,
  getAuthenticatedWorkspaceContext,
  getClientIp,
  getUserAgent,
  safeInsertSystemEvent,
  SYSTEM_TOUR_VERSION,
} from '@/lib/user-state/server'

type TourAction = 'start' | 'step' | 'complete' | 'skip' | 'postpone'

const TourPayloadSchema = z.object({
  stepId: z.string().trim().min(1).max(80).optional(),
})

const ACTION_EVENT: Record<TourAction, string> = {
  start: 'SYSTEM_TOUR_STARTED',
  step: 'SYSTEM_TOUR_STEP_VIEWED',
  complete: 'SYSTEM_TOUR_COMPLETED',
  skip: 'SYSTEM_TOUR_SKIPPED',
  postpone: 'SYSTEM_TOUR_POSTPONED',
}

export async function handleSystemTourAction(request: NextRequest, action: TourAction) {
  const context = await getAuthenticatedWorkspaceContext(request)
  if (context instanceof NextResponse) return context

  const parsed = TourPayloadSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Tanitim adimi gecersiz.', code: 'INVALID_TOUR_STEP' }, { status: 400 })
  }

  const { supabase, userId, workspaceId } = context
  const now = new Date().toISOString()
  const stepId = parsed.data.stepId || null

  try {
    await ensureUserStateRow(supabase, userId, workspaceId)

    if (action === 'start') {
      const current = await supabase
        .from('user_workspace_state')
        .select('intro_started_at,intro_completed_at,intro_version')
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .maybeSingle()

      const isNewIntroVersion = current.data?.intro_version && current.data.intro_version !== SYSTEM_TOUR_VERSION
      const eventType = current.data?.intro_started_at && !current.data?.intro_completed_at
        ? 'SYSTEM_TOUR_REOPENED'
        : ACTION_EVENT.start
      const startUpdate: Record<string, unknown> = {
        intro_started_at: isNewIntroVersion ? now : current.data?.intro_started_at || now,
        intro_version: SYSTEM_TOUR_VERSION,
        intro_current_step: stepId,
      }

      if (isNewIntroVersion) {
        startUpdate.intro_completed_at = null
        startUpdate.intro_skipped_at = null
      }

      const { error } = await supabase
        .from('user_workspace_state')
        .update(startUpdate)
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)

      if (error) throw new Error(error.message)

      await safeInsertSystemEvent(supabase, {
        workspaceId,
        actorUserId: userId,
        eventType,
        metadata: { step_id: stepId, intro_version: SYSTEM_TOUR_VERSION },
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      })
    }

    if (action === 'step') {
      const { error } = await supabase
        .from('user_workspace_state')
        .update({ intro_current_step: stepId, intro_version: SYSTEM_TOUR_VERSION })
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)

      if (error) throw new Error(error.message)

      await safeInsertSystemEvent(supabase, {
        workspaceId,
        actorUserId: userId,
        eventType: ACTION_EVENT.step,
        metadata: { step_id: stepId, intro_version: SYSTEM_TOUR_VERSION },
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      })
    }

    if (action === 'complete') {
      const { error } = await supabase
        .from('user_workspace_state')
        .update({
          intro_completed_at: now,
          intro_current_step: null,
          intro_version: SYSTEM_TOUR_VERSION,
        })
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)

      if (error) throw new Error(error.message)

      await safeInsertSystemEvent(supabase, {
        workspaceId,
        actorUserId: userId,
        eventType: ACTION_EVENT.complete,
        metadata: { step_id: stepId, intro_version: SYSTEM_TOUR_VERSION },
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      })
    }

    if (action === 'skip') {
      const { error } = await supabase
        .from('user_workspace_state')
        .update({
          intro_skipped_at: now,
          intro_completed_at: now,
          intro_current_step: null,
          intro_version: SYSTEM_TOUR_VERSION,
        })
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)

      if (error) throw new Error(error.message)

      await safeInsertSystemEvent(supabase, {
        workspaceId,
        actorUserId: userId,
        eventType: ACTION_EVENT.skip,
        metadata: { step_id: stepId, intro_version: SYSTEM_TOUR_VERSION },
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      })
    }

    if (action === 'postpone') {
      const { error } = await supabase
        .from('user_workspace_state')
        .update({
          intro_current_step: stepId,
          intro_version: SYSTEM_TOUR_VERSION,
        })
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)

      if (error) throw new Error(error.message)

      await safeInsertSystemEvent(supabase, {
        workspaceId,
        actorUserId: userId,
        eventType: ACTION_EVENT.postpone,
        metadata: { step_id: stepId, intro_version: SYSTEM_TOUR_VERSION },
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      })
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Tanitim durumu kaydedilemedi.',
        code: 'SYSTEM_TOUR_UPDATE_FAILED',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
