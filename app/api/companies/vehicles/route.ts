import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { listMetaFromRows, listRange, parseListQuery } from '@/lib/api/listEndpoint'

const missingTableCodes = ['42P01', 'PGRST205']
const VEHICLE_SELECT = 'id,company_id,category,vehicle_type,brand,manufacturer,model,model_year,color,registration_no,vin_serial_no,status,ownership_type,assigned_to_employee_id,operator_employee_id,location_name,current_usage_value,usage_unit,fuel_type,insurance_policy_no,insurance_expiry_date,inspection_expiry_date,maintenance_due_date,purchase_date,lease_start_date,lease_end_date,budget_code,cost_center,is_deleted,created_at,updated_at'
const COMPANY_OPTION_SELECT = 'id,trade_name,short_name'
const trackedFields = [
  'category',
  'vehicle_type',
  'registration_no',
  'vin_serial_no',
  'status',
  'assigned_to_employee_id',
  'operator_employee_id',
  'insurance_expiry_date',
  'inspection_expiry_date',
  'maintenance_due_date',
]

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const includeReferences = searchParams.get('include_refs') === 'true'
  const refsOnly = searchParams.get('refs_only') === 'true'
  const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'created_at', direction: 'desc' })
  const { from, to } = listRange(listQuery)
  const sortMap: Record<string, string> = {
    vehicle_name: 'brand',
    brand: 'brand',
    vehicle_type: 'vehicle_type',
    registration_no: 'registration_no',
    status: 'status',
    created_at: 'created_at',
  }
  const sortColumn = sortMap[listQuery.sort || ''] || 'created_at'

  if (refsOnly) {
    const [employees, { data: companies }] = await Promise.all([
      fetchVehicleEmployees(supabase),
      supabase.from('companies').select(COMPANY_OPTION_SELECT).eq('is_deleted', false).order('short_name'),
    ])

    return NextResponse.json({
      vehicles: [],
      employees: employees.data || [],
      companies: companies || [],
    })
  }

  const { data: vehicles, error } = await supabase
    .from('company_vehicles')
    .select(VEHICLE_SELECT)
    .eq('is_deleted', false)
    .order(sortColumn, { ascending: listQuery.direction !== 'desc' })
    .range(from, to)

  const vehicleRows = vehicles || []
  const employeeIds = uniqueIds(vehicleRows.flatMap(vehicle => [vehicle.assigned_to_employee_id, vehicle.operator_employee_id]))
  const companyIds = uniqueIds(vehicleRows.map(vehicle => vehicle.company_id))
  const [employees, { data: companies }] = await Promise.all([
    includeReferences
      ? fetchVehicleEmployees(supabase)
      : employeeIds.length
        ? fetchVehicleEmployees(supabase, employeeIds)
        : Promise.resolve({ data: [], error: null }),
    includeReferences
      ? supabase.from('companies').select(COMPANY_OPTION_SELECT).eq('is_deleted', false).order('short_name')
      : companyIds.length
        ? supabase.from('companies').select(COMPANY_OPTION_SELECT).in('id', companyIds)
        : Promise.resolve({ data: [] }),
  ])

  if (error) {
    if (missingTableCodes.includes(error.code || '')) {
        return NextResponse.json({
        vehicles: [],
        employees: employees.data || [],
        companies: companies || [],
        warning: 'company_vehicles tablosu bulunamadı. supabase/migrations/20240519_company_vehicles.sql uygulanmalı.',
      })
    }

    return NextResponse.json({ error: error.message, code: error.code || 'VEHICLES_FETCH_FAILED' }, { status: 500 })
  }

  const enrichedVehicles = attachPeople(vehicleRows, employees.data || [], companies || [])

  return NextResponse.json({
    vehicles: enrichedVehicles,
    data: enrichedVehicles,
    meta: listMetaFromRows(listQuery, enrichedVehicles.length),
    employees: includeReferences ? employees.data || [] : [],
    companies: includeReferences ? companies || [] : [],
  })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()
  const mapped = mapVehicle(body)

  if (!mapped.brand || !mapped.vehicle_type) {
    return NextResponse.json({ error: 'Marka / Üretici ve Araç Tipi zorunlu', code: 'VALIDATION_FAILED' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('company_vehicles')
    .insert(mapped)
    .select(VEHICLE_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'VEHICLE_CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()

  if (!body.id) return NextResponse.json({ error: 'id zorunlu', code: 'ID_REQUIRED' }, { status: 400 })

  const { data: current } = await supabase.from('company_vehicles').select(VEHICLE_SELECT).eq('id', body.id).single()
  const mapped = mapVehicle(body)
  const { data, error } = await supabase
    .from('company_vehicles')
    .update({
      ...mapped,
      history: buildHistory(current, mapped),
      updated_at: new Date().toISOString(),
      updated_by: 'Sistem Kullanıcısı',
    })
    .eq('id', body.id)
    .select(VEHICLE_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'VEHICLE_UPDATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'id zorunlu', code: 'ID_REQUIRED' }, { status: 400 })

  const { error } = await supabase
    .from('company_vehicles')
    .update({
      status: 'Pasif',
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: 'Sistem Kullanıcısı',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'VEHICLE_SOFT_DELETE_FAILED' }, { status: 500 })
  return NextResponse.json({ success: true })
}

function mapVehicle(body: Record<string, any>) {
  return {
    company_id: emptyToNull(body.company_id),
    category: body.category || 'Kara',
    vehicle_type: body.vehicle_type || '',
    brand: body.brand || body.manufacturer || '',
    manufacturer: body.manufacturer || body.brand || null,
    model: emptyToNull(body.model),
    model_year: body.model_year ? Number(body.model_year) : null,
    color: emptyToNull(body.color),
    registration_no: emptyToNull(body.registration_no),
    vin_serial_no: emptyToNull(body.vin_serial_no),
    status: body.status || 'Aktif',
    ownership_type: body.ownership_type || 'Şirket Malı',
    assigned_to_employee_id: emptyToNull(body.assigned_to_employee_id),
    operator_employee_id: emptyToNull(body.operator_employee_id),
    location_name: emptyToNull(body.location_name),
    current_usage_value: body.current_usage_value ? Number(body.current_usage_value) : null,
    usage_unit: body.usage_unit || (body.category === 'Hava' ? 'saat' : body.category === 'Deniz' ? 'saat' : 'km'),
    fuel_type: emptyToNull(body.fuel_type),
    insurance_policy_no: emptyToNull(body.insurance_policy_no),
    insurance_expiry_date: emptyToNull(body.insurance_expiry_date),
    inspection_expiry_date: emptyToNull(body.inspection_expiry_date),
    maintenance_due_date: emptyToNull(body.maintenance_due_date),
    purchase_date: emptyToNull(body.purchase_date),
    lease_start_date: emptyToNull(body.lease_start_date),
    lease_end_date: emptyToNull(body.lease_end_date),
    budget_code: emptyToNull(body.budget_code),
    cost_center: emptyToNull(body.cost_center),
    notes: emptyToNull(body.notes),
    api_notes: emptyToNull(body.api_notes),
    media: Array.isArray(body.media) ? body.media : [],
    documents: Array.isArray(body.documents) ? body.documents : [],
    is_deleted: !!body.is_deleted,
  }
}

function buildHistory(current: Record<string, any> | null, next: Record<string, any>) {
  const previous = Array.isArray(current?.history) ? current.history : []
  const changes = trackedFields
    .filter((field) => String(current?.[field] ?? '') !== String(next[field] ?? ''))
    .map((field) => ({
      field,
      old_value: current?.[field] ?? null,
      new_value: next[field] ?? null,
      changed_at: new Date().toISOString(),
      changed_by: 'Sistem Kullanıcısı',
    }))

  return [...previous, ...changes]
}

function attachPeople(vehicles: Record<string, any>[], employees: Record<string, any>[], companies: Record<string, any>[]) {
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]))
  const companyById = new Map(companies.map((company) => [company.id, company]))

  return vehicles.map((vehicle) => ({
    ...vehicle,
    assigned_employee: vehicle.assigned_to_employee_id ? employeeById.get(vehicle.assigned_to_employee_id) || null : null,
    operator_employee: vehicle.operator_employee_id ? employeeById.get(vehicle.operator_employee_id) || null : null,
    company: vehicle.company_id ? companyById.get(vehicle.company_id) || null : null,
  }))
}

async function fetchVehicleEmployees(supabase: ReturnType<typeof createServiceClient>, ids?: string[]) {
  let query = supabase
    .from('employees')
    .select('id,person_id')

  if (ids?.length) query = query.in('id', ids)

  const employees = await query
  if (employees.error) {
    if (isMissingSourceError(employees.error)) return { data: [], error: null }
    return employees
  }

  const rows = employees.data || []
  const personIds = uniqueIds(rows.map((employee: any) => employee.person_id))
  if (personIds.length === 0) return { data: rows, error: null }

  const people = await supabase
    .from('persons')
    .select('id,first_name,last_name,full_name,email')
    .in('id', personIds)

  if (people.error) {
    if (isMissingSourceError(people.error)) return { data: rows, error: null }
    return people
  }

  const personById = new Map((people.data || []).map((person: any) => [person.id, person]))
  return {
    data: rows.map((employee: any) => {
      const person = personById.get(employee.person_id)
      return {
        ...employee,
        first_name: person?.first_name || '',
        last_name: person?.last_name || '',
        full_name: person?.full_name || [person?.first_name, person?.last_name].filter(Boolean).join(' '),
        email: person?.email || '',
      }
    }),
    error: null,
  }
}

function emptyToNull(value: unknown) {
  return value === '' || value === undefined ? null : value
}

function uniqueIds(values: unknown[]) {
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)))
}

function isMissingSourceError(error: any) {
  const message = String(error?.message || '')
  return error?.code === '42P01'
    || error?.code === '42703'
    || error?.code === 'PGRST205'
    || message.includes('Could not find')
    || message.includes('does not exist')
    || message.includes('schema cache')
}
