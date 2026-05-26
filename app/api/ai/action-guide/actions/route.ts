import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedWorkspaceContext } from '@/lib/user-state/server'

export const runtime = 'nodejs'

const ActionCommandSchema = z.object({
  action_type: z.enum(['navigate', 'open_wizard', 'start_create', 'focus_record']),
  target_page: z.string().optional().nullable(),
  wizard_key: z.string().optional().nullable(),
  record_id: z.string().optional().nullable(),
  record_type: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  const context = await getAuthenticatedWorkspaceContext(request)
  if (context instanceof NextResponse) return context

  const parsed = ActionCommandSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'İşlem yönlendirmesi geçerli değil.', code: 'INVALID_ACTION_GUIDE_COMMAND' }, { status: 400 })
  }

  return NextResponse.json({
    data: {
      ...parsed.data,
      safe_to_execute: true,
      mutates_data: false,
    },
    message: 'Yönlendirme hazır',
  }, { headers: { 'Cache-Control': 'no-store' } })
}
