import { NextRequest, NextResponse } from 'next/server'
import { buildActionCenterContext } from '@/lib/action-center/actionCenterResolver'
import { listActionCenterItems } from '@/lib/action-center/actionCenterService'
import type { UnifiedActionItem } from '@/lib/action-center/actionCenter.types'

type PendingActionItem = {
  id: string
  type: string
  title: string
  subtitle: string
  statusLabel: string
  href: string
  severity: 'info' | 'warning'
  createdAt?: string
}

export async function GET(request: NextRequest) {
  const context = await buildActionCenterContext(request)
  if (context instanceof NextResponse) return context

  const result = await listActionCenterItems(context, { page: 1, pageSize: 30 })
  const items = result.data.map(toLegacyPendingAction)

  return NextResponse.json({
    data: {
      count: result.summary.total_open,
      items,
      summary: result.summary,
    },
    ...(result.warnings?.length ? { warnings: result.warnings } : {}),
  }, { headers: { 'Cache-Control': 'no-store' } })
}

function toLegacyPendingAction(item: UnifiedActionItem): PendingActionItem {
  return {
    id: item.id,
    type: item.source_type,
    title: item.title,
    subtitle: item.description || '',
    statusLabel: statusLabel(item),
    href: item.target_page || '/app',
    severity: item.severity === 'info' ? 'info' : 'warning',
    createdAt: item.updated_at || item.created_at,
  }
}

function statusLabel(item: UnifiedActionItem) {
  if (item.status === 'failed') return 'Tamamlanamadi'
  if (item.status === 'waiting') return 'Bekliyor'
  if (item.status === 'in_progress') return 'Devam Ediyor'
  if (item.status === 'completed') return 'Tamamlandi'
  if (item.status === 'dismissed') return 'Kapatildi'
  return 'Acik'
}
