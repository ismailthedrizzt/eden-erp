import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()

  const [{ data: birimler, error: unitError }, { data: kadrolar, error: positionError }, { data: unitTypes, error: typeError }, { data: employees, error: employeeError }] = await Promise.all([
    supabase.from('birimler').select('*').order('ad'),
    supabase.from('norm_kadrolar').select('*').order('unvan'),
    supabase.from('organization_unit_types').select('*').order('sort_order', { ascending: true }).order('name'),
    supabase.from('employees').select('id,ad,soyad,cinsiyet,dogum_tarihi'),
  ])

  if (unitError) return NextResponse.json({ error: unitError.message, code: unitError.code || 'UNITS_FETCH_FAILED' }, { status: 500 })
  if (positionError) return NextResponse.json({ error: positionError.message, code: positionError.code || 'POSITIONS_FETCH_FAILED' }, { status: 500 })
  if (typeError && !['42P01', 'PGRST205'].includes(typeError.code || '')) return NextResponse.json({ error: typeError.message, code: typeError.code || 'UNIT_TYPES_FETCH_FAILED' }, { status: 500 })
  if (employeeError) return NextResponse.json({ error: employeeError.message, code: employeeError.code || 'EMPLOYEES_FETCH_FAILED' }, { status: 500 })

  const resolvedUnitTypes = unitTypes || fallbackUnitTypes()
  return NextResponse.json({ birimler: attachUnitTypes(birimler || [], resolvedUnitTypes), kadrolar: attachEmployees(kadrolar || [], employees || []), unitTypes: resolvedUnitTypes })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()

  if (body.entity === 'position') return createPosition(supabase, body)
  if (body.entity === 'unit_type') return createUnitType(supabase, body)
  return createUnit(supabase, body)
}

export async function PATCH(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()

  if (body.entity === 'position') return updatePosition(supabase, body)
  if (body.entity === 'unit_type') return updateUnitType(supabase, body)
  return updateUnit(supabase, body)
}

export async function DELETE(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const entity = searchParams.get('entity') || 'unit'
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'id zorunlu', code: 'ID_REQUIRED' }, { status: 400 })

  if (entity === 'position') {
    const { error } = await supabase
      .from('norm_kadrolar')
      .update({ durum: 'kapali', status: 'Kapatıldı', is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: 'Sistem Kullanıcısı' })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message, code: error.code || 'POSITION_SOFT_DELETE_FAILED' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  const { error } = await supabase
    .from('birimler')
    .update({ status: 'Pasif', aktif: false, is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: 'Sistem Kullanıcısı' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'UNIT_SOFT_DELETE_FAILED' }, { status: 500 })
  return NextResponse.json({ success: true })
}

async function createUnit(supabase: ReturnType<typeof createServiceClient>, body: Record<string, any>) {
  const { data, error } = await supabase
    .from('birimler')
    .insert(mapUnit(body))
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'UNIT_CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data: await attachUnitType(supabase, data) }, { status: 201 })
}

async function updateUnit(supabase: ReturnType<typeof createServiceClient>, body: Record<string, any>) {
  if (!body.id) return NextResponse.json({ error: 'id zorunlu', code: 'ID_REQUIRED' }, { status: 400 })

  const { data: current } = await supabase.from('birimler').select('*').eq('id', body.id).single()
  const mapped = mapUnit(body)
  const { data, error } = await supabase
    .from('birimler')
    .update({ ...mapped, history: buildHistory(current, mapped, ['ust_birim_id', 'unit_type_id', 'code', 'location_name', 'status']) })
    .eq('id', body.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'UNIT_UPDATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data: await attachUnitType(supabase, data) })
}

async function createPosition(supabase: ReturnType<typeof createServiceClient>, body: Record<string, any>) {
  const managerWarning = await checkManagerWarning(supabase, body)
  const { data, error } = await supabase
    .from('norm_kadrolar')
    .insert(mapPosition(body))
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'POSITION_CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data, warning: managerWarning }, { status: 201 })
}

async function updatePosition(supabase: ReturnType<typeof createServiceClient>, body: Record<string, any>) {
  if (!body.id) return NextResponse.json({ error: 'id zorunlu', code: 'ID_REQUIRED' }, { status: 400 })
  const { data: current } = await supabase.from('norm_kadrolar').select('*').eq('id', body.id).single()
  const managerWarning = await checkManagerWarning(supabase, body)
  const mapped = mapPosition(body)
  const { data, error } = await supabase
    .from('norm_kadrolar')
    .update({ ...mapped, history: buildHistory(current, mapped, ['norm_count', 'amir', 'is_manager', 'status', 'reports_to_position_id']) })
    .eq('id', body.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'POSITION_UPDATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data, warning: managerWarning })
}

async function createUnitType(supabase: ReturnType<typeof createServiceClient>, body: Record<string, any>) {
  const { data, error } = await supabase
    .from('organization_unit_types')
    .insert(mapUnitType(body))
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'UNIT_TYPE_CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

async function updateUnitType(supabase: ReturnType<typeof createServiceClient>, body: Record<string, any>) {
  if (!body.id) return NextResponse.json({ error: 'id zorunlu', code: 'ID_REQUIRED' }, { status: 400 })
  const { data, error } = await supabase
    .from('organization_unit_types')
    .update(mapUnitType(body))
    .eq('id', body.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'UNIT_TYPE_UPDATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data })
}

function mapUnit(body: Record<string, any>) {
  return {
    sirket_id: body.company_id || body.sirket_id || null,
    ust_birim_id: body.parent_unit_id || body.ust_birim_id || null,
    unit_type_id: body.unit_type_id || null,
    ad: body.name || body.ad,
    name: body.name || body.ad,
    short_name: body.short_name || null,
    tip: body.tip || 'departman',
    code: body.code || null,
    location_id: body.location_id || null,
    location_name: body.location_name || body.yerleske || null,
    status: body.status || 'Aktif',
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    sort_order: Number(body.sort_order || 0),
    notes: body.notes || null,
    documents: body.documents || [],
    aktif: body.status ? body.status === 'Aktif' : true,
    is_deleted: !!body.is_deleted,
  }
}

function attachUnitTypes(units: Record<string, any>[], unitTypes: Record<string, any>[]) {
  const typeById = new Map(unitTypes.map((type) => [type.id, type]))
  const typeByLegacy = new Map(unitTypes.map((type) => [type.legacy_tip || type.slug, type]))
  return units.map((unit) => ({
    ...unit,
    unit_type: unit.unit_type_id ? typeById.get(unit.unit_type_id) || null : typeByLegacy.get(unit.tip) || null,
  }))
}

function attachEmployees(positions: Record<string, any>[], employees: Record<string, any>[]) {
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]))
  return positions.map((position) => ({
    ...position,
    personel: position.personel_id ? employeeById.get(position.personel_id) || null : null,
  }))
}

async function attachUnitType(supabase: ReturnType<typeof createServiceClient>, unit: Record<string, any>) {
  if (!unit?.unit_type_id) return { ...unit, unit_type: null }
  const { data } = await supabase
    .from('organization_unit_types')
    .select('*')
    .eq('id', unit.unit_type_id)
    .single()

  return { ...unit, unit_type: data || null }
}

function fallbackUnitTypes() {
  const rows = [
    ['Genel Müdürlük', 'genel_mudurluk', '#1d4ed8'],
    ['Direktörlük', 'direktorluk', '#7c3aed'],
    ['Müdürlük', 'mudurluk', '#0891b2'],
    ['Departman', 'departman', '#2563eb'],
    ['Bölüm', 'bolum', '#16a34a'],
    ['Takım', 'takim', '#65a30d'],
    ['Şube', 'sube', '#ea580c'],
    ['Ofis', 'ofis', '#f59e0b'],
    ['Operasyon', 'operasyon', '#dc2626'],
    ['Proje Ofisi', 'proje_ofisi', '#9333ea'],
    ['Komite', 'komite', '#475569'],
    ['Kurul', 'kurul', '#334155'],
    ['Diğer', 'diger', '#6b7280'],
  ]

  return rows.map(([name, legacy_tip, color], index) => ({
    id: legacy_tip,
    name,
    slug: String(legacy_tip).replace(/_/g, '-'),
    legacy_tip,
    color,
    icon: 'Layers',
    sort_order: (index + 1) * 10,
    is_active: true,
  }))
}

function mapPosition(body: Record<string, any>) {
  const normCount = Number(body.norm_count ?? body.norm_adet ?? 1)
  const activeCount = Number(body.active_count ?? body.aktif_dolu ?? 0)
  return {
    birim_id: body.unit_id || body.birim_id,
    unvan: body.title || body.unvan || body.position_name || 'Kadro',
    title: body.title || body.unvan || body.position_name || 'Kadro',
    grade: body.grade || body.kademe || null,
    reports_to_position_id: body.reports_to_position_id || null,
    amir: !!(body.is_manager ?? body.amir),
    is_manager: !!(body.is_manager ?? body.amir),
    norm_count: normCount,
    active_count: activeCount,
    budget_code: body.budget_code || null,
    work_type: body.work_type || 'Tam Zamanlı',
    durum: body.status === 'Aktif' ? (activeCount > 0 ? 'dolu' : 'acik') : 'dondurulmus',
    status: body.status || 'Aktif',
    butce: body.budget_amount ? Number(body.budget_amount) : null,
    notes: body.notes || null,
    is_deleted: !!body.is_deleted,
  }
}

function mapUnitType(body: Record<string, any>) {
  return {
    name: body.name,
    slug: body.slug || slugify(body.name),
    color: body.color || '#2563eb',
    icon: body.icon || 'Layers',
    parent_type_id: body.parent_type_id || null,
    sort_order: Number(body.sort_order || 0),
    is_active: body.is_active ?? true,
  }
}

async function checkManagerWarning(supabase: ReturnType<typeof createServiceClient>, body: Record<string, any>) {
  if (!(body.is_manager ?? body.amir)) return null
  if (body.allow_multiple_managers) return null
  const unitId = body.unit_id || body.birim_id
  if (!unitId) return null

  const { data } = await supabase
    .from('norm_kadrolar')
    .select('id')
    .eq('birim_id', unitId)
    .eq('is_manager', true)
    .eq('is_deleted', false)
    .neq('id', body.id || '00000000-0000-0000-0000-000000000000')
    .limit(1)

  return data?.length ? 'Bu birimde aktif bir amir zaten mevcut.' : null
}

function buildHistory(current: Record<string, any> | null, updates: Record<string, any>, tracked: string[]) {
  const existing = Array.isArray(current?.history) ? current?.history : []
  if (!current) return existing
  const next = [...existing]
  tracked.forEach((field) => {
    if (JSON.stringify(current[field] ?? null) === JSON.stringify(updates[field] ?? null)) return
    next.push({
      field,
      old_value: current[field] ?? '',
      new_value: updates[field] ?? '',
      changed_at: new Date().toISOString(),
      changed_by: 'Sistem Kullanıcısı',
    })
  })
  return next
}

function slugify(value: string) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
