import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isDraftRecord } from '@/lib/forms/entityState'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: movement, error: selectError } = await supabase
    .from('account_movements')
    .select('id,status,workflow_status,is_deleted')
    .eq('id', id)
    .maybeSingle()

  if (selectError) {
    return NextResponse.json({ error: selectError.message, code: selectError.code || 'MOVEMENT_LOOKUP_FAILED' }, { status: 500 })
  }

  if (!movement || movement.is_deleted) {
    return NextResponse.json({ error: 'Ön muhasebe hareketi bulunamadı.', code: 'MOVEMENT_NOT_FOUND' }, { status: 404 })
  }

  if (!isDraftRecord(movement)) {
    return NextResponse.json({ error: 'Yalnızca taslak ön muhasebe hareketleri silinebilir.', code: 'ONLY_DRAFT_CAN_BE_DELETED' }, { status: 409 })
  }

  const { error: deleteError } = await supabase
    .from('account_movements')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message, code: deleteError.code || 'MOVEMENT_DELETE_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
