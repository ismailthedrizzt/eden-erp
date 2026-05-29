'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  Plus,
  RefreshCw,
  Send,
  TimerReset,
  XCircle,
} from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import {
  attendanceService,
  employeesService,
  leaveBalancesService,
  leaveRequestsService,
  leaveTypesService,
  payrollPrepService,
  timesheetsService,
  workSchedulesService,
  type HRAttendanceRecord,
  type HREmployee,
  type HRLeaveBalance,
  type HRLeaveRequest,
  type HRLeaveType,
  type HRTimesheetPeriod,
  type HRWorkSchedule,
} from '@/lib/services/hr'

type ToastState = { type: 'success' | 'error' | 'warning'; message: string } | null
type Option = { value: string; label: string }

export function HRLeaveRequestsWorkspace() {
  const [rows, setRows] = useState<HRLeaveRequest[]>([])
  const [employees, setEmployees] = useState<HREmployee[]>([])
  const [types, setTypes] = useState<HRLeaveType[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: today(),
    end_date: today(),
    total_days: '1',
    reason: '',
    approver_id: '',
  })

  async function load() {
    setLoading(true)
    try {
      const [requestList, employeeList, typeList] = await Promise.all([
        leaveRequestsService.list({ pageSize: 100 }),
        employeesService.list({ pageSize: 200, employment_status: 'active' }),
        leaveTypesService.list({ pageSize: 100, active: true }),
      ])
      setRows(requestList.data)
      setEmployees(employeeList.data)
      setTypes(typeList.data)
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function createRequest() {
    if (!form.employee_id || !form.leave_type_id) {
      setToast({ type: 'error', message: 'Calisan ve izin turu secilmeli.' })
      return
    }
    try {
      await leaveRequestsService.create({
        employee_id: form.employee_id,
        leave_type_id: form.leave_type_id,
        start_date: form.start_date,
        end_date: form.end_date,
        total_days: Number(form.total_days || 1),
        reason: form.reason || undefined,
        approver_id: form.approver_id || undefined,
      })
      setToast({ type: 'success', message: 'Izin talebi taslak olarak olusturuldu.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  async function transition(row: HRLeaveRequest, action: 'submit' | 'approve' | 'reject' | 'cancel') {
    try {
      if (action === 'submit') await leaveRequestsService.submit(row.id)
      if (action === 'approve') await leaveRequestsService.approve(row.id)
      if (action === 'reject') await leaveRequestsService.reject(row.id, 'MVP ekranindan reddedildi.')
      if (action === 'cancel') await leaveRequestsService.cancel(row.id, 'MVP ekranindan iptal edildi.')
      setToast({ type: 'success', message: 'Izin talebi guncellendi.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  return (
    <WorkspaceShell
      title="Izinler"
      subtitle="Izin talebi, onay, belge uyarisi ve bakiye etkisi."
      icon={<CalendarCheck size={24} />}
      toast={toast}
      onCloseToast={() => setToast(null)}
    >
      <ActionPanel title="Izin talebi olustur" actionLabel="Kaydet" icon={<Plus size={16} />} onAction={createRequest}>
        <Select label="Calisan" value={form.employee_id} onChange={employee_id => setForm({ ...form, employee_id })} options={employees.map(employeeOption)} />
        <Select label="Izin turu" value={form.leave_type_id} onChange={leave_type_id => setForm({ ...form, leave_type_id })} options={types.map(typeOption)} />
        <Input label="Baslangic" type="date" value={form.start_date} onChange={start_date => setForm({ ...form, start_date })} />
        <Input label="Bitis" type="date" value={form.end_date} onChange={end_date => setForm({ ...form, end_date })} />
        <Input label="Gun" value={form.total_days} onChange={total_days => setForm({ ...form, total_days })} />
        <Input label="Onaylayan user ID" value={form.approver_id} onChange={approver_id => setForm({ ...form, approver_id })} />
        <Input label="Gerekce" value={form.reason} onChange={reason => setForm({ ...form, reason })} />
      </ActionPanel>
      <DataState loading={loading} onRetry={load} />
      <SummaryStrip items={[['Toplam', rows.length], ['Onay bekleyen', rows.filter(row => row.status === 'pending_approval').length], ['Onayli', rows.filter(row => row.status === 'approved').length], ['Belge bekleyen', rows.filter(row => row.document_required && !row.document_id).length]]} />
      <Table headers={['Talep No', 'Calisan', 'Izin Turu', 'Baslangic', 'Bitis', 'Gun', 'Durum', 'Belge', 'Aksiyon']}>
        {rows.map(row => (
          <tr key={row.id}>
            <Cell mono>{row.request_no}</Cell>
            <Cell>{row.employee_name || employeeLabel(employees, row.employee_id)}</Cell>
            <Cell>{row.leave_type_name || leaveTypeLabel(types, row.leave_type_id)}</Cell>
            <Cell>{formatDate(row.start_date)}</Cell>
            <Cell>{formatDate(row.end_date)}</Cell>
            <Cell>{row.total_days}</Cell>
            <Cell><StatusBadge value={row.status} /></Cell>
            <Cell>{row.document_required ? row.document_id ? <Badge tone="green">Var</Badge> : <Badge tone="amber">Gerekli</Badge> : <Badge>Zorunlu degil</Badge>}</Cell>
            <Cell>
              <div className="flex flex-wrap gap-2">
                <SmallButton icon={<Send size={14} />} onClick={() => void transition(row, 'submit')} disabled={!['draft', 'submitted'].includes(row.status)}>Gonder</SmallButton>
                <SmallButton tone="success" icon={<CheckCircle2 size={14} />} onClick={() => void transition(row, 'approve')} disabled={!['submitted', 'pending_approval'].includes(row.status)}>Onayla</SmallButton>
                <SmallButton tone="danger" icon={<XCircle size={14} />} onClick={() => void transition(row, 'reject')} disabled={['approved', 'cancelled', 'rejected'].includes(row.status)}>Reddet</SmallButton>
                <SmallButton tone="muted" onClick={() => void transition(row, 'cancel')} disabled={['cancelled', 'rejected'].includes(row.status)}>Iptal</SmallButton>
              </div>
            </Cell>
          </tr>
        ))}
      </Table>
    </WorkspaceShell>
  )
}

export function HRLeaveTypesWorkspace() {
  const [rows, setRows] = useState<HRLeaveType[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [form, setForm] = useState({
    leave_type_key: '',
    leave_type_name: '',
    category: 'annual',
    default_days_per_year: '14',
    requires_document: false,
    paid: true,
    negative_balance_allowed: false,
  })

  async function load() {
    try {
      const result = await leaveTypesService.list({ pageSize: 100 })
      setRows(result.data)
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  useEffect(() => { void load() }, [])

  async function createType() {
    try {
      await leaveTypesService.create({
        ...form,
        leave_type_key: form.leave_type_key || form.category,
        leave_type_name: form.leave_type_name || 'Yeni Izin Turu',
        default_days_per_year: Number(form.default_days_per_year || 0),
      })
      setToast({ type: 'success', message: 'Izin turu olusturuldu.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  return (
    <WorkspaceShell title="Izin Turleri" subtitle="Tenant ve sirket bazli izin politikasi tanimlari." icon={<ClipboardList size={24} />} toast={toast} onCloseToast={() => setToast(null)}>
      <ActionPanel title="Izin turu" actionLabel="Kaydet" icon={<Plus size={16} />} onAction={createType}>
        <Input label="Anahtar" value={form.leave_type_key} onChange={leave_type_key => setForm({ ...form, leave_type_key })} />
        <Input label="Ad" value={form.leave_type_name} onChange={leave_type_name => setForm({ ...form, leave_type_name })} />
        <Select label="Kategori" value={form.category} onChange={category => setForm({ ...form, category })} options={['annual', 'sick', 'unpaid', 'paid_excuse', 'maternity', 'paternity', 'marriage', 'bereavement', 'administrative', 'other'].map(value => ({ value, label: value }))} />
        <Input label="Yillik gun" value={form.default_days_per_year} onChange={default_days_per_year => setForm({ ...form, default_days_per_year })} />
        <Toggle label="Ucretli" checked={form.paid} onChange={paid => setForm({ ...form, paid })} />
        <Toggle label="Belge gerekli" checked={form.requires_document} onChange={requires_document => setForm({ ...form, requires_document })} />
        <Toggle label="Negatif bakiye" checked={form.negative_balance_allowed} onChange={negative_balance_allowed => setForm({ ...form, negative_balance_allowed })} />
      </ActionPanel>
      <Table headers={['Ad', 'Anahtar', 'Kategori', 'Ucretli', 'Belge', 'Yillik Gun', 'Devreden', 'Durum']}>
        {rows.map(row => (
          <tr key={row.id}>
            <Cell>{row.leave_type_name}</Cell>
            <Cell mono>{row.leave_type_key}</Cell>
            <Cell><Badge>{row.category}</Badge></Cell>
            <Cell>{row.paid ? 'Evet' : 'Hayir'}</Cell>
            <Cell>{row.requires_document ? <Badge tone="amber">Gerekli</Badge> : '-'}</Cell>
            <Cell>{row.default_days_per_year}</Cell>
            <Cell>{row.carry_over_allowed ? 'Evet' : 'Hayir'}</Cell>
            <Cell>{row.active ? <Badge tone="green">Aktif</Badge> : <Badge>Pasif</Badge>}</Cell>
          </tr>
        ))}
      </Table>
    </WorkspaceShell>
  )
}

export function HRLeaveBalancesWorkspace() {
  const [employees, setEmployees] = useState<HREmployee[]>([])
  const [rows, setRows] = useState<HRLeaveBalance[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [toast, setToast] = useState<ToastState>(null)

  async function loadEmployees() {
    try {
      const result = await employeesService.list({ pageSize: 200, employment_status: 'active' })
      setEmployees(result.data)
      setEmployeeId(current => current || result.data[0]?.id || '')
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  useEffect(() => { void loadEmployees() }, [])
  useEffect(() => {
    if (!employeeId) return
    let cancelled = false
    void leaveBalancesService.list(employeeId)
      .then(result => { if (!cancelled) setRows(result) })
      .catch(error => { if (!cancelled) setToast({ type: 'error', message: errorMessage(error) }) })
    return () => { cancelled = true }
  }, [employeeId])

  async function recalculate() {
    if (!employeeId) return
    try {
      setRows(await leaveBalancesService.recalculate(employeeId))
      setToast({ type: 'success', message: 'Bakiyeler yeniden hesaplandi.' })
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  return (
    <WorkspaceShell title="Izin Bakiyeleri" subtitle="Hak edis, kullanilan, bekleyen ve kalan izin gunleri." icon={<FileWarning size={24} />} toast={toast} onCloseToast={() => setToast(null)}>
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <Select label="Calisan" value={employeeId} onChange={setEmployeeId} options={employees.map(employeeOption)} />
        <SmallButton icon={<RefreshCw size={14} />} onClick={() => void recalculate()}>Yeniden Hesapla</SmallButton>
      </div>
      <Table headers={['Izin Turu', 'Yil', 'Hak Edilen', 'Devreden', 'Kullanilan', 'Bekleyen', 'Kalan', 'Duzeltme']}>
        {rows.map(row => (
          <tr key={row.id}>
            <Cell>{row.leave_type_name || row.leave_type_id}</Cell>
            <Cell>{row.period_year}</Cell>
            <Cell>{row.entitled_days}</Cell>
            <Cell>{row.carried_over_days}</Cell>
            <Cell>{row.used_days}</Cell>
            <Cell>{row.pending_days}</Cell>
            <Cell><strong>{row.remaining_days}</strong></Cell>
            <Cell>{row.adjusted_days}</Cell>
          </tr>
        ))}
      </Table>
    </WorkspaceShell>
  )
}

export function HRAttendanceWorkspace() {
  const [rows, setRows] = useState<HRAttendanceRecord[]>([])
  const [employees, setEmployees] = useState<HREmployee[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [form, setForm] = useState({
    employee_id: '',
    work_date: today(),
    status: 'present',
    planned_hours: '7.5',
    actual_hours: '7.5',
    source: 'manual',
    notes: '',
  })

  async function load() {
    try {
      const [attendanceList, employeeList] = await Promise.all([
        attendanceService.list({ pageSize: 100 }),
        employeesService.list({ pageSize: 200, employment_status: 'active' }),
      ])
      setRows(attendanceList.data)
      setEmployees(employeeList.data)
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  useEffect(() => { void load() }, [])

  async function createAttendance() {
    if (!form.employee_id) {
      setToast({ type: 'error', message: 'Calisan secilmeli.' })
      return
    }
    try {
      await attendanceService.create({
        employee_id: form.employee_id,
        work_date: form.work_date,
        status: form.status,
        planned_hours: Number(form.planned_hours || 0),
        actual_hours: Number(form.actual_hours || 0),
        source: form.source,
        notes: form.notes || undefined,
      })
      setToast({ type: 'success', message: 'Devam kaydi olusturuldu.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  return (
    <WorkspaceShell title="Devam Devamsizlik" subtitle="Manuel devam kayitlari, fazla mesai ve eksik saat hazirligi." icon={<TimerReset size={24} />} toast={toast} onCloseToast={() => setToast(null)}>
      <ActionPanel title="Devam kaydi" actionLabel="Kaydet" icon={<Plus size={16} />} onAction={createAttendance}>
        <Select label="Calisan" value={form.employee_id} onChange={employee_id => setForm({ ...form, employee_id })} options={employees.map(employeeOption)} />
        <Input label="Tarih" type="date" value={form.work_date} onChange={work_date => setForm({ ...form, work_date })} />
        <Select label="Durum" value={form.status} onChange={status => setForm({ ...form, status })} options={['present', 'absent', 'leave', 'sick_leave', 'holiday', 'weekend', 'remote', 'field', 'late', 'early_leave', 'overtime'].map(value => ({ value, label: value }))} />
        <Input label="Planlanan saat" value={form.planned_hours} onChange={planned_hours => setForm({ ...form, planned_hours })} />
        <Input label="Fiili saat" value={form.actual_hours} onChange={actual_hours => setForm({ ...form, actual_hours })} />
        <Input label="Not" value={form.notes} onChange={notes => setForm({ ...form, notes })} />
      </ActionPanel>
      <Table headers={['Tarih', 'Calisan', 'Durum', 'Plan', 'Fiili', 'Fazla Mesai', 'Eksik', 'Kaynak', 'Onay']}>
        {rows.map(row => (
          <tr key={row.id}>
            <Cell>{formatDate(row.work_date)}</Cell>
            <Cell>{row.employee_name || employeeLabel(employees, row.employee_id)}</Cell>
            <Cell><StatusBadge value={row.status} /></Cell>
            <Cell>{row.planned_hours}</Cell>
            <Cell>{row.actual_hours}</Cell>
            <Cell>{row.overtime_hours}</Cell>
            <Cell>{row.missing_hours}</Cell>
            <Cell>{row.source}</Cell>
            <Cell>{row.approved ? <Badge tone="green">Onayli</Badge> : <Badge>Bekliyor</Badge>}</Cell>
          </tr>
        ))}
      </Table>
    </WorkspaceShell>
  )
}

export function HRTimesheetsWorkspace() {
  const [rows, setRows] = useState<HRTimesheetPeriod[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [selected, setSelected] = useState<HRTimesheetPeriod | null>(null)
  const [payrollNotice, setPayrollNotice] = useState('')
  const [form, setForm] = useState({ company_id: '', period_key: '2026-05', period_start: '2026-05-01', period_end: '2026-05-31' })

  async function load() {
    try {
      const result = await timesheetsService.list({ pageSize: 100 })
      setRows(result.data)
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  useEffect(() => { void load() }, [])

  async function createPeriod() {
    if (!form.company_id) {
      setToast({ type: 'error', message: 'Sirket ID gerekli.' })
      return
    }
    try {
      await timesheetsService.create(form)
      setToast({ type: 'success', message: 'Puantaj donemi olusturuldu.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  async function transition(row: HRTimesheetPeriod, action: 'calculate' | 'approve' | 'lock' | 'ready') {
    try {
      let updated: HRTimesheetPeriod | null = null
      if (action === 'calculate') updated = await timesheetsService.calculate(row.id)
      if (action === 'approve') updated = await timesheetsService.approve(row.id)
      if (action === 'lock') updated = await timesheetsService.lock(row.id)
      if (action === 'ready') {
        const payroll = await payrollPrepService.markReady(row.id)
        setPayrollNotice(payroll.notice)
      }
      if (updated) setSelected(updated)
      setToast({ type: 'success', message: 'Puantaj islemi tamamlandi.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  return (
    <WorkspaceShell title="Puantaj" subtitle="Puantaj donemi, hesaplama, onay, kilit ve bordro hazirligi." icon={<CalendarClock size={24} />} toast={toast} onCloseToast={() => setToast(null)}>
      <ActionPanel title="Donem olustur" actionLabel="Kaydet" icon={<Plus size={16} />} onAction={createPeriod}>
        <Input label="Sirket ID" value={form.company_id} onChange={company_id => setForm({ ...form, company_id })} />
        <Input label="Donem anahtari" value={form.period_key} onChange={period_key => setForm({ ...form, period_key })} />
        <Input label="Baslangic" type="date" value={form.period_start} onChange={period_start => setForm({ ...form, period_start })} />
        <Input label="Bitis" type="date" value={form.period_end} onChange={period_end => setForm({ ...form, period_end })} />
      </ActionPanel>
      {payrollNotice && <InlineNotice>{payrollNotice}</InlineNotice>}
      <Table headers={['Donem', 'Baslangic', 'Bitis', 'Durum', 'Calisan', 'Calisilan', 'Izin', 'Devamsizlik', 'Fazla Mesai', 'Aksiyon']}>
        {rows.map(row => (
          <tr key={row.id} onClick={() => setSelected(row)} className="cursor-pointer">
            <Cell mono>{row.period_key}</Cell>
            <Cell>{formatDate(row.period_start)}</Cell>
            <Cell>{formatDate(row.period_end)}</Cell>
            <Cell><StatusBadge value={row.status} /></Cell>
            <Cell>{row.employee_count}</Cell>
            <Cell>{row.total_work_days}</Cell>
            <Cell>{row.total_leave_days}</Cell>
            <Cell>{row.total_absent_days}</Cell>
            <Cell>{row.total_overtime_hours}</Cell>
            <Cell>
              <div className="flex flex-wrap gap-2">
                <SmallButton onClick={() => void transition(row, 'calculate')}>Hesapla</SmallButton>
                <SmallButton tone="success" onClick={() => void transition(row, 'approve')}>Onayla</SmallButton>
                <SmallButton tone="muted" onClick={() => void transition(row, 'lock')}>Kilitle</SmallButton>
                <SmallButton icon={<Send size={14} />} onClick={() => void transition(row, 'ready')}>Bordro</SmallButton>
              </div>
            </Cell>
          </tr>
        ))}
      </Table>
      {selected?.rows?.length ? (
        <Table headers={['Calisan', 'Plan', 'Calisilan', 'Izin', 'Ucretsiz', 'Hastalik', 'Devamsiz', 'Fazla Mesai', 'Durum']}>
          {selected.rows.map(row => (
            <tr key={row.id}>
              <Cell>{row.employee_name || row.employee_id}</Cell>
              <Cell>{row.planned_days}</Cell>
              <Cell>{row.worked_days}</Cell>
              <Cell>{row.leave_days}</Cell>
              <Cell>{row.unpaid_leave_days}</Cell>
              <Cell>{row.sick_leave_days}</Cell>
              <Cell>{row.absent_days}</Cell>
              <Cell>{row.overtime_hours}</Cell>
              <Cell><StatusBadge value={row.status} /></Cell>
            </tr>
          ))}
        </Table>
      ) : null}
    </WorkspaceShell>
  )
}

export function HRWorkSchedulesWorkspace() {
  const [rows, setRows] = useState<HRWorkSchedule[]>([])
  const [employees, setEmployees] = useState<HREmployee[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [form, setForm] = useState({ company_id: '', schedule_name: 'Haftalik standart plan', daily_hours: '7.5' })
  const [assignment, setAssignment] = useState({ employee_id: '', work_schedule_id: '', effective_date: today() })

  async function load() {
    try {
      const [scheduleList, employeeList] = await Promise.all([
        workSchedulesService.list({ pageSize: 100 }),
        employeesService.list({ pageSize: 200, employment_status: 'active' }),
      ])
      setRows(scheduleList.data)
      setEmployees(employeeList.data)
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  useEffect(() => { void load() }, [])

  async function createSchedule() {
    if (!form.company_id) {
      setToast({ type: 'error', message: 'Sirket ID gerekli.' })
      return
    }
    try {
      await workSchedulesService.create({
        company_id: form.company_id,
        schedule_name: form.schedule_name,
        daily_hours: Number(form.daily_hours || 7.5),
        weekly_pattern: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true },
        active: true,
      })
      setToast({ type: 'success', message: 'Calisma plani olusturuldu.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  async function assignSchedule() {
    if (!assignment.employee_id || !assignment.work_schedule_id) {
      setToast({ type: 'error', message: 'Calisan ve calisma plani secilmeli.' })
      return
    }
    try {
      await workSchedulesService.assign(assignment.employee_id, assignment)
      setToast({ type: 'success', message: 'Calisma plani atandi.' })
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  return (
    <WorkspaceShell title="Calisma Planlari" subtitle="Haftalik plan ve calisan plan atamalari." icon={<ClipboardList size={24} />} toast={toast} onCloseToast={() => setToast(null)}>
      <ActionPanel title="Calisma plani" actionLabel="Kaydet" icon={<Plus size={16} />} onAction={createSchedule}>
        <Input label="Sirket ID" value={form.company_id} onChange={company_id => setForm({ ...form, company_id })} />
        <Input label="Plan adi" value={form.schedule_name} onChange={schedule_name => setForm({ ...form, schedule_name })} />
        <Input label="Gunluk saat" value={form.daily_hours} onChange={daily_hours => setForm({ ...form, daily_hours })} />
      </ActionPanel>
      <ActionPanel title="Calisana ata" actionLabel="Ata" icon={<CheckCircle2 size={16} />} onAction={assignSchedule}>
        <Select label="Calisan" value={assignment.employee_id} onChange={employee_id => setAssignment({ ...assignment, employee_id })} options={employees.map(employeeOption)} />
        <Select label="Plan" value={assignment.work_schedule_id} onChange={work_schedule_id => setAssignment({ ...assignment, work_schedule_id })} options={rows.map(row => ({ value: row.id, label: row.schedule_name }))} />
        <Input label="Baslangic" type="date" value={assignment.effective_date} onChange={effective_date => setAssignment({ ...assignment, effective_date })} />
      </ActionPanel>
      <Table headers={['Plan', 'Sirket', 'Gunluk Saat', 'Haftalik Pattern', 'Durum']}>
        {rows.map(row => (
          <tr key={row.id}>
            <Cell>{row.schedule_name}</Cell>
            <Cell mono>{row.company_id}</Cell>
            <Cell>{row.daily_hours}</Cell>
            <Cell mono>{JSON.stringify(row.weekly_pattern || {})}</Cell>
            <Cell>{row.active ? <Badge tone="green">Aktif</Badge> : <Badge>Pasif</Badge>}</Cell>
          </tr>
        ))}
      </Table>
    </WorkspaceShell>
  )
}

function WorkspaceShell({ title, subtitle, icon, toast, onCloseToast, children }: { title: string; subtitle: string; icon: ReactNode; toast: ToastState; onCloseToast: () => void; children: ReactNode }) {
  return (
    <div className="space-y-5">
      <PageBanner mode="list" title={title} subtitle={subtitle} icon={icon} />
      {toast && <InlineToast toast={toast} onClose={onCloseToast} />}
      {children}
    </div>
  )
}

function ActionPanel({ title, actionLabel, icon, children, onAction }: { title: string; actionLabel: string; icon?: ReactNode; children: ReactNode; onAction: () => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        <button className="inline-flex items-center gap-2 rounded-md bg-eden-blue px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={() => { setSaving(true); void onAction().finally(() => setSaving(false)) }}>
          {icon} {actionLabel}
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">{children}</div>
    </section>
  )
}

function SummaryStrip({ items }: { items: [string, number][] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs font-medium text-gray-500">{label}</div>
          <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        </div>
      ))}
    </div>
  )
}

function InlineToast({ toast, onClose }: { toast: NonNullable<ToastState>; onClose: () => void }) {
  const tone = toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200' : toast.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
  return <div className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${tone}`}><span>{toast.message}</span><button className="font-semibold" onClick={onClose}>Kapat</button></div>
}

function InlineNotice({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">{children}</div>
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}<input className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950" type={type} value={value} onChange={event => onChange(event.target.value)} /></label>
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Option[] }) {
  return <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}<select className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950" value={value} onChange={event => onChange(event.target.value)}><option value="">Sec</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex h-16 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />{label}</label>
}

function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-950"><tr>{headers.map(header => <th key={header} className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">{header}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

function Cell({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return <td className={`px-3 py-2 align-top text-gray-700 dark:text-gray-200 ${mono ? 'font-mono text-xs' : ''}`}>{children}</td>
}

function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'red' | 'blue' | 'amber' }) {
  const classes = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  }
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${classes[tone]}`}>{children}</span>
}

function StatusBadge({ value }: { value: string }) {
  const tone = ['approved', 'active', 'ready', 'locked', 'reviewed', 'present'].includes(value) ? 'green' : ['rejected', 'cancelled', 'absent'].includes(value) ? 'red' : ['pending_approval', 'submitted', 'ready_for_review', 'calculating', 'late'].includes(value) ? 'amber' : 'gray'
  return <Badge tone={tone}>{value}</Badge>
}

function SmallButton({ children, onClick, disabled, icon, tone = 'primary' }: { children: ReactNode; onClick: () => void; disabled?: boolean; icon?: ReactNode; tone?: 'primary' | 'muted' | 'success' | 'danger' }) {
  const classes = tone === 'success' ? 'bg-emerald-600 text-white' : tone === 'danger' ? 'bg-rose-600 text-white' : tone === 'muted' ? 'border border-gray-200 text-gray-700 dark:border-gray-800 dark:text-gray-200' : 'bg-eden-blue text-white'
  return <button type="button" className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${classes}`} disabled={disabled} onClick={event => { event.stopPropagation(); onClick() }}>{icon}{children}</button>
}

function DataState({ loading, onRetry }: { loading: boolean; onRetry: () => Promise<void> }) {
  if (!loading) return null
  return <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700"><RefreshCw size={16} /> Yukleniyor... <button className="font-semibold text-eden-blue" onClick={() => void onRetry()}>Yenile</button></div>
}

function employeeOption(employee: HREmployee): Option {
  return { value: employee.id, label: employee.full_name || employee.employee_no || employee.id }
}

function typeOption(type: HRLeaveType): Option {
  return { value: type.id, label: type.leave_type_name }
}

function employeeLabel(employees: HREmployee[], id: string) {
  return employees.find(employee => employee.id === id)?.full_name || id
}

function leaveTypeLabel(types: HRLeaveType[], id: string) {
  return types.find(type => type.id === id)?.leave_type_name || id
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return value.slice(0, 10)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Islem tamamlanamadi.'
}
