import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const StakeholderSchema = z.object({
  company_id: z.string().uuid().optional(),
  stakeholder_type: z.enum(['gercek_kisi', 'tuzel_kisi']).default('gercek_kisi'),
  category: z.string().min(1),
  display_name: z.string().min(1),
  tax_id: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.literal(''), z.string().email()]).optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  status: z.enum(['Aktif', 'Pasif', 'Askıda', 'Kara Liste', 'Çalışma Sonlandı']).default('Aktif'),
  priority_level: z.enum(['Düşük', 'Orta', 'Yüksek', 'Kritik']).optional(),
  internal_owner_employee_id: z.string().uuid().optional(),
  relationship_start_date: z.string().min(1),
  relationship_end_date: z.string().optional(),
  iban: z.string().optional(),
  bank_name: z.string().optional(),
  currency: z.string().optional(),
  contract_status: z.string().optional(),
  notes: z.string().optional(),
  photo_logo: z.array(z.record(z.any())).optional(),
  stakeholder_documents: z.array(z.record(z.any())).optional(),
  timeline: z.array(z.record(z.any())).optional(),
}).passthrough()

function omitNullishValues(value: Record<string, any>) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null && item !== undefined))
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('company_id')
  const status = searchParams.get('status')

  let query = supabase
    .from('stakeholders')
    .select('*')
    .order('created_at', { ascending: false })

  if (companyId) query = query.eq('company_id', companyId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) {
    if (error.message.includes("Could not find the table")) {
      return NextResponse.json({ data: [], warning: 'stakeholders tablosu bulunamadı. Migration uygulanmalı.' })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = omitNullishValues(await request.json())
  const parsed = StakeholderSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('stakeholders')
    .insert(mapStakeholderForDb(parsed.data))
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

function mapStakeholderForDb(stakeholder: Record<string, any>) {
  return {
    company_id: stakeholder.company_id || null,
    stakeholder_type: stakeholder.stakeholder_type,
    category: stakeholder.category,
    display_name: stakeholder.display_name,
    tax_id: stakeholder.tax_id || null,
    phone: stakeholder.phone || stakeholder.phone_1 || null,
    email: stakeholder.email || stakeholder.email_1 || null,
    country: stakeholder.country || null,
    city: stakeholder.city || null,
    status: stakeholder.status || 'Aktif',
    priority_level: stakeholder.priority_level || null,
    internal_owner_employee_id: stakeholder.internal_owner_employee_id || null,
    relationship_start_date: stakeholder.relationship_start_date,
    relationship_end_date: stakeholder.relationship_end_date || null,
    iban: stakeholder.iban || null,
    bank_name: stakeholder.bank_name || null,
    currency: stakeholder.currency || 'TRY',
    contract_status: stakeholder.contract_status || null,
    notes: stakeholder.notes || null,
    photo_logo: stakeholder.photo_logo || [],
    stakeholder_documents: stakeholder.stakeholder_documents || [],
    stakeholder_profile: stakeholder,
    history: stakeholder.timeline || [],
    is_deleted: false,
  }
}
