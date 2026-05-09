import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''

  const [persons, organizations, companies] = await Promise.all([
    supabase.from('persons').select('id,full_name,national_id,passport_no').eq('is_deleted', false).ilike('full_name', `%${q}%`).limit(50),
    supabase.from('organizations').select('id,legal_name,tax_number,registration_number').eq('is_deleted', false).ilike('legal_name', `%${q}%`).limit(50),
    supabase.from('sirketler').select('id,kisa_unvan,ticari_unvan').eq('is_active', true).limit(50),
  ])

  return NextResponse.json({
    persons: persons.data || [],
    organizations: organizations.data || [],
    companies: companies.data || [],
  })
}
