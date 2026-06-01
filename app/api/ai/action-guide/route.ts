// BACKEND_MIGRATION_STATUS: keep_ui_adapter
// TARGET_BACKEND_MODULE: action-guide
// TARGET_FASTAPI_ENDPOINT: /api/v1/action-guide
// NOTES: UI-specific BFF may remain; canonical action eligibility is provided by FastAPI policy endpoints.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { buildActionGuideContext } from '@/lib/action-guide/actionGuideContext'
import { resolveActionGuide } from '@/lib/action-guide/actionGuideResolver'
import { findActionGuideKnowledge } from '@/lib/action-guide/markdownKnowledge'
import { generateLocalGuideAnswer, isLocalGuideModelAvailable } from '@/lib/action-guide/ollamaClient'
import {
  guardedBusinessFallback,
  isTechnicalInfrastructureQuestion,
  isUnsafeTechnicalAnswer,
  resolveLocalRuleAnswer,
} from '@/lib/action-guide/localRuleProvider'
import type { ActionGuideResponse } from '@/lib/action-guide/actionGuide.types'
import { getAuthenticatedWorkspaceContext } from '@/lib/user-state/server'

export const runtime = 'nodejs'

const ActionGuideRequestSchema = z.object({
  query: z.string().trim().max(500).optional().default(''),
  currentPage: z.string().optional().nullable(),
  selectedRecordType: z.string().optional().nullable(),
  selectedRecordId: z.string().optional().nullable(),
  selectedRecordStatus: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  organizationUnitId: z.string().optional().nullable(),
  facilityId: z.string().optional().nullable(),
  context: z.record(z.string(), z.unknown()).optional().default({}),
})

export async function POST(request: NextRequest) {
  const workspace = await getAuthenticatedWorkspaceContext(request)
  if (workspace instanceof NextResponse) return workspace

  const parsed = ActionGuideRequestSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({
      error: 'Islem rehberi istegi gecersiz.',
      code: 'ACTION_GUIDE_REQUEST_INVALID',
      details: parsed.error.flatten(),
    }, { status: 400 })
  }

  try {
    const guideContext = await buildActionGuideContext({
      request,
      supabase: workspace.supabase as any,
      userId: workspace.userId,
      tenantId: workspace.workspaceId,
      input: parsed.data,
    })
    const result = await resolveActionGuide(parsed.data, guideContext)
    const enhancedResult = await enhanceWithLocalGuideEngine(parsed.data.query, result)
    return NextResponse.json(enhancedResult, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({
      error: 'Islem rehberi su anda cevap veremedi. Lutfen tekrar deneyin.',
      code: 'ACTION_GUIDE_FAILED',
    }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

async function enhanceWithLocalGuideEngine(query: string, guideResult: ActionGuideResponse): Promise<ActionGuideResponse> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return guideResult

  const ruleAnswer = resolveLocalRuleAnswer(trimmedQuery)
  if (ruleAnswer) {
    return {
      ...guideResult,
      intent: `local_rule_${guideResult.intent}`,
      title: ruleAnswer.title,
      explanation: ruleAnswer.answer,
      assistant_text: ruleAnswer.answer,
      conversation_only: true,
      confidence: Math.max(guideResult.confidence, ruleAnswer.confidence),
      steps: ruleAnswer.steps || [],
      suggested_actions: [],
      blocking_reasons: [],
      warnings: guideResult.warnings,
    }
  }

  const localModelAvailable = await isLocalGuideModelAvailable()
  if (!localModelAvailable) {
    if (isTechnicalInfrastructureQuestion(trimmedQuery)) {
      const fallback = guardedBusinessFallback()
      return {
        ...guideResult,
        intent: `local_guard_${guideResult.intent}`,
        title: fallback.title,
        explanation: fallback.answer,
        assistant_text: fallback.answer,
        conversation_only: true,
        confidence: Math.max(guideResult.confidence, fallback.confidence),
        steps: [],
        suggested_actions: [],
        blocking_reasons: [],
        warnings: guideResult.warnings,
      }
    }
    return guideResult
  }

  const knowledge = await findActionGuideKnowledge(trimmedQuery)
  const generatedAnswer = await generateLocalGuideAnswer({
    query: trimmedQuery,
    guideResult,
    ruleAnswer,
    knowledge,
  })

  if (generatedAnswer && !isUnsafeTechnicalAnswer(generatedAnswer)) {
    const conversationOnly = shouldRenderAsConversation(guideResult)
    return {
      ...guideResult,
      explanation: generatedAnswer,
      assistant_text: generatedAnswer,
      conversation_only: conversationOnly,
      steps: conversationOnly ? [] : guideResult.steps,
      suggested_actions: conversationOnly ? [] : guideResult.suggested_actions,
      blocking_reasons: conversationOnly ? [] : guideResult.blocking_reasons,
    }
  }

  if (isTechnicalInfrastructureQuestion(trimmedQuery)) {
    const fallback = guardedBusinessFallback()
    return {
      ...guideResult,
      intent: `local_guard_${guideResult.intent}`,
      title: fallback.title,
      explanation: fallback.answer,
      assistant_text: fallback.answer,
      conversation_only: true,
      confidence: Math.max(guideResult.confidence, fallback.confidence),
      steps: [],
      suggested_actions: [],
      blocking_reasons: [],
      warnings: guideResult.warnings,
    }
  }

  return guideResult
}

function shouldRenderAsConversation(guideResult: ActionGuideResponse) {
  if (guideResult.intent === 'unknown') return true
  if (!guideResult.suggested_actions.length && guideResult.confidence < 0.62) return true
  return false
}
