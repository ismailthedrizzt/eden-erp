import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const UNIT_SELECT = 'id,company_id,parent_unit_id,unit_type_id,name,type,short_name,code,location_name,status,start_date,end_date,sort_order,notes,history,is_deleted'
const POSITION_SELECT = 'id,unit_id,title,grade,reports_to_position_id,is_manager,norm_count,active_count,budget_code,budget_amount,work_type,status,employee_id,history,is_deleted'
const UNIT_TYPE_SELECT = 'id,name,slug,color,icon,parent_type_id,sort_order,is_active'

export async function GET() {
  const supabase = createServiceClient()

  const [{ data: organization_units, error: unitError }, { data: positions, error: positionError }, { data: unitTypes, error: typeError }, { data: employees, error: employeeError }] = await Promise.all([
    supabase.from('organization_units').select(UNIT_SELECT).order('name'),
    supabase.from('positions').select(POSITION_SELECT).order('title'),
    supabase.from('organization_unit_types').select(UNIT_TYPE_SELECT).order('sort_order', { ascending: true }).order('name'),
    supabase.from('employees').select('id,first_name,last_name,gender,birth_date'),
  ])

  if (unitError) return NextResponse.json({ error: unitError.message, code: unitError.code || 'UNITS_FETCH_FAILED' }, { status: 500 })
  if (positionError) return NextResponse.json({ error: positionError.message, code: positionError.code || 'POSITIONS_FETCH_FAILED' }, { status: 500 })
  if (typeError && !['42P01', 'PGRST205'].includes(typeError.code || '')) return NextResponse.json({ error: typeError.message, code: typeError.code || 'UNIT_TYPES_FETCH_FAILED' }, { status: 500 })
  if (employeeError) return NextResponse.json({ error: employeeError.message, code: employeeError.code || 'EMPLOYEES_FETCH_FAILED' }, { status: 500 })

  const resolvedUnitTypes = unitTypes || fallbackUnitTypes()
  return NextResponse.json({ organization_units: attachUnitTypes(organization_units || [], resolvedUnitTypes), positions: attachEmployees(positions || [], employees || []), unitTypes: resolvedUnitTypes })
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
      .from('positions')
      .update({ status: 'kapali', is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: 'Sistem Kullanıcısı' })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message, code: error.code || 'POSITION_SOFT_DELETE_FAILED' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return rollbackUnit(supabase, id)
}

async function rollbackUnit(supabase: ReturnType<typeof createServiceClient>, unitId: string) {
  const now = new Date().toISOString()
  const { data: units, error: unitFetchError } = await supabase
    .from('organization_units')
    .select('id,parent_unit_id,type,is_deleted')

  if (unitFetchError) return NextResponse.json({ error: unitFetchError.message, code: unitFetchError.code || 'UNITS_FETCH_FAILED' }, { status: 500 })

  const targetUnit = (units || []).find((unit: Record<string, any>) => unit.id === unitId)
  if (!targetUnit || targetUnit.is_deleted) {
    return NextResponse.json({ error: 'Birim bulunamadı', code: 'UNIT_NOT_FOUND' }, { status: 404 })
  }

  if (!targetUnit.parent_unit_id && targetUnit.type === 'company') {
    return NextResponse.json({ error: 'Şirket kök birimi geri alınamaz.', code: 'COMPANY_ROOT_UNIT_PROTECTED' }, { status: 400 })
  }

  const unitIds = collectUnitSubtreeIds(units || [], unitId)
  const { data: positions, error: positionFetchError } = await supabase
    .from('positions')
    .select('id')
    .in('unit_id', unitIds)
    .eq('is_deleted', false)

  if (positionFetchError) return NextResponse.json({ error: positionFetchError.message, code: positionFetchError.code || 'POSITIONS_FETCH_FAILED' }, { status: 500 })

  const positionIds = (positions || []).map((position: Record<string, any>) => position.id)
  const assignedEmployeeIds = new Set<string>()
  const [employeesByUnit, employeesByPosition] = await Promise.all([
    supabase.from('employees').select('id').in('unit_id', unitIds),
    positionIds.length
      ? supabase.from('employees').select('id').in('position_id', positionIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (employeesByUnit.error) return NextResponse.json({ error: employeesByUnit.error.message, code: employeesByUnit.error.code || 'EMPLOYEES_BY_UNIT_FETCH_FAILED' }, { status: 500 })
  if (employeesByPosition.error) return NextResponse.json({ error: employeesByPosition.error.message, code: employeesByPosition.error.code || 'EMPLOYEES_BY_POSITION_FETCH_FAILED' }, { status: 500 })

  ;[...(employeesByUnit.data || []), ...(employeesByPosition.data || [])].forEach((employee: Record<string, any>) => {
    if (employee.id) assignedEmployeeIds.add(employee.id)
  })

  if (assignedEmployeeIds.size > 0) {
    const { error: employeeUpdateError } = await supabase
      .from('employees')
      .update({ unit_id: null, position_id: null, job_title: null })
      .in('id', Array.from(assignedEmployeeIds))

    if (employeeUpdateError) return NextResponse.json({ error: employeeUpdateError.message, code: employeeUpdateError.code || 'EMPLOYEE_ASSIGNMENT_CLEAR_FAILED' }, { status: 500 })
  }

  if (positionIds.length > 0) {
    const { error: positionUpdateError } = await supabase
      .from('positions')
      .update({
        status: 'closed',        active_count: 0,
        employee_id: null,
        is_deleted: true,
        deleted_at: now,
        deleted_by: 'Sistem Kullanıcısı',
      })
      .in('id', positionIds)

    if (positionUpdateError) return NextResponse.json({ error: positionUpdateError.message, code: positionUpdateError.code || 'POSITIONS_ROLLBACK_FAILED' }, { status: 500 })
  }

  const { error: unitUpdateError } = await supabase
    .from('organization_units')
    .update({ status: 'Pasif', active: false, is_deleted: true, deleted_at: now, deleted_by: 'Sistem Kullanıcısı' })
    .in('id', unitIds)

  if (unitUpdateError) return NextResponse.json({ error: unitUpdateError.message, code: unitUpdateError.code || 'UNIT_ROLLBACK_FAILED' }, { status: 500 })

  return NextResponse.json({
    success: true,
    rolledBackUnitCount: unitIds.length,
    closedPositionCount: positionIds.length,
    clearedEmployeeCount: assignedEmployeeIds.size,
  })
}

function collectUnitSubtreeIds(units: Record<string, any>[], rootId: string) {
  const childrenByParent = new Map<string, string[]>()
  units
    .filter(unit => !unit.is_deleted)
    .forEach(unit => {
      if (!unit.parent_unit_id) return
      childrenByParent.set(unit.parent_unit_id, [...(childrenByParent.get(unit.parent_unit_id) || []), unit.id])
    })

  const ids: string[] = []
  const walk = (id: string) => {
    ids.push(id)
    ;(childrenByParent.get(id) || []).forEach(walk)
  }
  walk(rootId)
  return ids
}

async function createUnit(supabase: ReturnType<typeof createServiceClient>, body: Record<string, any>) {
  const mappedUnit = await mapUnitForCreate(supabase, body)
  const { data, error } = await supabase
    .from('organization_units')
    .insert(mappedUnit)
    .select(UNIT_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'UNIT_CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data: await attachUnitType(supabase, data) }, { status: 201 })
}

async function mapUnitForCreate(supabase: ReturnType<typeof createServiceClient>, body: Record<string, any>) {
  const mapped = mapUnit(body)
  if (mapped.parent_unit_id) {
    const { data: parent } = await supabase
      .from('organization_units')
      .select('company_id')
      .eq('id', mapped.parent_unit_id)
      .maybeSingle()

    return parent?.company_id ? { ...mapped, company_id: parent.company_id } : mapped
  }

  if (!mapped.company_id) return mapped

  const companyTypeId = await getCompanyUnitTypeId(supabase)
  const isCompanyUnit = mapped.type === 'company' || (!!companyTypeId && mapped.unit_type_id === companyTypeId)
  if (isCompanyUnit) return mapped

  const { data: companyRoot } = await supabase
    .from('organization_units')
    .select('id')
    .eq('company_id', mapped.company_id)
    .is('parent_unit_id', null)
    .or(companyTypeId ? `type.eq.company,unit_type_id.eq.${companyTypeId}` : 'type.eq.company')
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle()

  return companyRoot?.id ? { ...mapped, parent_unit_id: companyRoot.id } : mapped
}

async function getCompanyUnitTypeId(supabase: ReturnType<typeof createServiceClient>) {
  const { data } = await supabase
    .from('organization_unit_types')
    .select('id')
    .eq('slug', 'company')
    .maybeSingle()

  return data?.id || null
}

async function updateUnit(supabase: ReturnType<typeof createServiceClient>, body: Record<string, any>) {
  if (!body.id) return NextResponse.json({ error: 'id zorunlu', code: 'ID_REQUIRED' }, { status: 400 })

  const { data: current } = await supabase.from('organization_units').select(UNIT_SELECT).eq('id', body.id).single()
  const mapped = mapUnit(body)
  const { data, error } = await supabase
    .from('organization_units')
    .update({ ...mapped, history: buildHistory(current, mapped, ['parent_unit_id', 'unit_type_id', 'code', 'location_name', 'status']) })
    .eq('id', body.id)
    .select(UNIT_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'UNIT_UPDATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data: await attachUnitType(supabase, data) })
}

async function createPosition(supabase: ReturnType<typeof createServiceClient>, body: Record<string, any>) {
  const managerWarning = await checkManagerWarning(supabase, body)
  const { data, error } = await supabase
    .from('positions')
    .insert(mapPosition(body))
    .select(POSITION_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'POSITION_CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data, warning: managerWarning }, { status: 201 })
}

async function updatePosition(supabase: ReturnType<typeof createServiceClient>, body: Record<string, any>) {
  if (!body.id) return NextResponse.json({ error: 'id zorunlu', code: 'ID_REQUIRED' }, { status: 400 })
  const { data: current } = await supabase.from('positions').select(POSITION_SELECT).eq('id', body.id).single()
  const managerWarning = await checkManagerWarning(supabase, body)
  const mapped = mapPosition(body)
  const { data, error } = await supabase
    .from('positions')
    .update({ ...mapped, history: buildHistory(current, mapped, ['norm_count', 'is_manager', 'status', 'reports_to_position_id']) })
    .eq('id', body.id)
    .select(POSITION_SELECT)
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
    company_id: body.company_id || null,
    parent_unit_id: body.parent_unit_id || null,
    unit_type_id: body.unit_type_id || null,
    name: body.name,
    short_name: body.short_name || null,
    type: body.type || 'department',
    code: body.code || null,
    location_id: body.location_id || null,
    location_name: body.location_name || null,
    status: body.status || 'Aktif',
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    sort_order: Number(body.sort_order || 0),
    notes: body.notes || null,
    documents: body.documents || [],
    active: body.status ? body.status === 'Aktif' : true,
    is_deleted: !!body.is_deleted,
  }
}

function attachUnitTypes(units: Record<string, any>[], unitTypes: Record<string, any>[]) {
  const typeById = new Map(unitTypes.map((type) => [type.id, type]))
  return units.map((unit) => ({
    ...unit,
    unit_type: unit.unit_type_id ? typeById.get(unit.unit_type_id) || null : null,
  }))
}

function attachEmployees(positions: Record<string, any>[], employees: Record<string, any>[]) {
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]))
  return positions.map((position) => ({
    ...position,
    employees: position.employee_id ? employeeById.get(position.employee_id) || null : null,
  }))
}

async function attachUnitType(supabase: ReturnType<typeof createServiceClient>, unit: Record<string, any>) {
  if (!unit?.unit_type_id) return { ...unit, unit_type: null }
  const { data } = await supabase
    .from('organization_unit_types')
    .select(UNIT_TYPE_SELECT)
    .eq('id', unit.unit_type_id)
    .single()

  return { ...unit, unit_type: data || null }
}

function fallbackUnitTypes() {
  const rows = [
    ['Şirket', 'company', '#0f766e'],
    ['Genel Müdürlük', 'headquarters', '#1d4ed8'],
    ['Direktörlük', 'directorate', '#7c3aed'],
    ['Müdürlük', 'management', '#0891b2'],
    ['Departman', 'department', '#2563eb'],
    ['Bölüm', 'division', '#16a34a'],
    ['Takım', 'team', '#65a30d'],
    ['Şube', 'branch', '#ea580c'],
    ['Ofis', 'ofis', '#f59e0b'],
    ['Operasyon', 'operasyon', '#dc2626'],
    ['Proje Ofisi', 'project_office', '#9333ea'],
    ['Komite', 'committee', '#475569'],
    ['Kurul', 'board', '#334155'],
    ['Diğer', 'other', '#6b7280'],
  ]

  return rows.map(([name, slug, color], index) => ({
    id: slug,
    name,
    slug,
    color,
    icon: 'Layers',
    sort_order: (index + 1) * 10,
    is_active: true,
  }))
}

function mapPosition(body: Record<string, any>) {
  const normCount = Number(body.norm_count ?? 1)
  const activeCount = Number(body.active_count ?? 0)
  return {
    unit_id: body.unit_id,
    title: body.title || body.position_name || 'Kadro',    grade: body.grade || null,
    reports_to_position_id: body.reports_to_position_id || null,
    is_manager: !!body.is_manager,
    norm_count: normCount,
    active_count: activeCount,
    budget_code: body.budget_code || null,
    work_type: body.work_type || 'Tam Zamanlı',
    status: body.status === 'Aktif' ? (activeCount > 0 ? 'filled' : 'open') : 'frozen',    budget_amount: body.budget_amount ? Number(body.budget_amount) : null,
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
  if (!body.is_manager) return null
  if (body.allow_multiple_managers) return null
  const unitId = body.unit_id || body.unit_id
  if (!unitId) return null

  const { data } = await supabase
    .from('positions')
    .select('id')
    .eq('unit_id', unitId)
    .eq('is_manager', true)
    .eq('is_deleted', false)
    .neq('id', body.id || '00000000-0000-0000-0000-000000000000')
    .limit(1)

  return data?.length ? 'Bu birimde aktif bir yönetici pozisyonu zaten mevcut.' : null
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
