import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(_request: Request, { params }: { params: Promise<{ company_id: string }> }) {
  const { company_id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('v_current_ownership')
    .select('*')
    .eq('company_id', company_id)
    .order('current_share_ratio', { ascending: false })

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  return NextResponse.json({ data })
}
