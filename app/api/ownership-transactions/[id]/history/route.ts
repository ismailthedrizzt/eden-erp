import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const [{ data: transaction, error }, { data: technicalHistory }] = await Promise.all([
    supabase.from('ownership_transactions').select('history').eq('id', id).single(),
    supabase.from('record_history').select('id,instance_id,table_name,record_id,version,data_json,changed_by,created_at').eq('table_name', 'ownership_transactions').eq('record_id', id).order('created_at', { ascending: false }),
  ])

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  return NextResponse.json({
    data: {
      business: transaction?.history || [],
      technical: technicalHistory || [],
    },
  })
}
