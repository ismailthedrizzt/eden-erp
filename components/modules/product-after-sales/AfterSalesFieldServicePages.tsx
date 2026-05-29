'use client'

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, CalendarClock, Camera, CheckCircle2, ClipboardCheck, FileText, MapPin, Navigation, Plus, RefreshCw, Send, UserRound, Wrench } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import {
  afterSalesAssets,
  afterSalesChecklistTemplates,
  afterSalesFieldAssignments,
  afterSalesMaintenanceDue,
  afterSalesMaintenancePlans,
  afterSalesRecords,
  afterSalesRequests,
  type ChecklistTemplateRecord,
  type FieldAssignmentRecord,
  type InstalledAssetRecord,
  type MaintenanceDueRecord,
  type MaintenancePlanRecord,
  type ServiceChecklistPayload,
  type ServiceRecordRecord,
  type ServiceRequestRecord,
} from '@/lib/services/after-sales'
import { documentService } from '@/lib/services/documents'

type ToastState = { type: 'success' | 'error' | 'warning'; message: string }

export function MaintenancePlansDeepPage() {
  const [plans, setPlans] = useState<MaintenancePlanRecord[]>([])
  const [assets, setAssets] = useState<InstalledAssetRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [form, setForm] = useState({
    company_id: '',
    product_id: '',
    installed_asset_id: '',
    plan_name: '',
    maintenance_type: 'periodic',
    interval_type: 'days',
    interval_value: '90',
    next_run_date: '',
    default_priority: 'medium',
  })

  async function load() {
    setLoading(true)
    try {
      const [planList, assetList] = await Promise.all([
        afterSalesMaintenancePlans.list({ pageSize: 100 }),
        afterSalesAssets.list({ pageSize: 100 }),
      ])
      setPlans(planList.data)
      setAssets(assetList.data)
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function createPlan() {
    try {
      await afterSalesMaintenancePlans.create({
        ...form,
        company_id: form.company_id || selectedAsset(assets, form.installed_asset_id)?.owning_company_id || undefined,
        product_id: form.product_id || selectedAsset(assets, form.installed_asset_id)?.product_id || undefined,
        installed_asset_id: form.installed_asset_id || undefined,
        plan_name: form.plan_name || 'Periyodik bakim plani',
        interval_value: Number(form.interval_value || 90),
        next_run_date: form.next_run_date || undefined,
        active: true,
      })
      setToast({ type: 'success', message: 'Bakim plani olusturuldu.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  return (
    <div className="space-y-5">
      <PageBanner mode="list" title="Bakim Planlari" subtitle="Kurulu urun ve urun seviyesi periyodik bakim planlari." icon={<CalendarClock size={24} />} />
      {toast && <InlineToast toast={toast} onClose={() => setToast(null)} />}
      <ActionPanel title="Bakim plani olustur" actionLabel="Kaydet" icon={<Plus size={16} />} onAction={createPlan}>
        <Input label="Sirket ID" value={form.company_id} onChange={value => setForm({ ...form, company_id: value })} />
        <Select label="Kurulu urun" value={form.installed_asset_id} onChange={value => {
          const asset = selectedAsset(assets, value)
          setForm({ ...form, installed_asset_id: value, company_id: asset?.owning_company_id || form.company_id, product_id: asset?.product_id || form.product_id })
        }} options={assets.map(item => item.id)} labels={Object.fromEntries(assets.map(item => [item.id, `${item.customer_name} - ${item.product_name}`]))} />
        <Input label="Plan adi" value={form.plan_name} onChange={value => setForm({ ...form, plan_name: value })} />
        <Select label="Tur" value={form.maintenance_type} onChange={value => setForm({ ...form, maintenance_type: value })} options={['periodic', 'warranty', 'inspection', 'calibration', 'cleaning', 'software_update', 'safety_check', 'other']} />
        <Select label="Aralik" value={form.interval_type} onChange={value => setForm({ ...form, interval_type: value })} options={['days', 'weeks', 'months', 'usage_hours', 'custom']} />
        <Input label="Deger" value={form.interval_value} onChange={value => setForm({ ...form, interval_value: value })} />
        <Input label="Sonraki tarih" value={form.next_run_date} onChange={value => setForm({ ...form, next_run_date: value })} placeholder="2026-08-29" />
        <Select label="Oncelik" value={form.default_priority} onChange={value => setForm({ ...form, default_priority: value })} options={['low', 'medium', 'high', 'urgent']} />
      </ActionPanel>
      <DataState loading={loading} onRetry={load} />
      <Table headers={['Plan', 'Tur', 'Aralik', 'Kapsam', 'Sonraki', 'Oncelik', 'Durum']}>
        {plans.map(plan => (
          <tr key={plan.id}>
            <Cell>{plan.plan_name}</Cell>
            <Cell><Badge>{plan.maintenance_type}</Badge></Cell>
            <Cell>{plan.interval_value} {plan.interval_type}</Cell>
            <Cell>{plan.installed_asset_id ? 'Kurulu urun' : plan.product_id ? 'Urun' : 'Genel'}</Cell>
            <Cell>{formatDate(plan.next_run_date)}</Cell>
            <Cell><PriorityBadge value={plan.default_priority} /></Cell>
            <Cell>{plan.active ? <Badge tone="green">Aktif</Badge> : <Badge>Pasif</Badge>}</Cell>
          </tr>
        ))}
      </Table>
    </div>
  )
}

export function MaintenanceDueDeepPage() {
  const [rows, setRows] = useState<MaintenanceDueRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastState | null>(null)

  async function load() {
    setLoading(true)
    try {
      setRows(await afterSalesMaintenanceDue.list({ limit: 200 }))
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function createRequest(row: MaintenanceDueRecord) {
    try {
      await afterSalesMaintenanceDue.createServiceRequest(row.id, { create_project_task: true })
      setToast({ type: 'success', message: 'Servis talebi olusturuldu.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  async function skip(row: MaintenanceDueRecord) {
    try {
      await afterSalesMaintenanceDue.skip(row.id, 'MVP ekranindan atlandi.')
      setToast({ type: 'warning', message: 'Bakim kaydi atlandi.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  const overdue = rows.filter(row => row.status === 'overdue').length
  return (
    <div className="space-y-5">
      <PageBanner mode="list" title="Bakimi Gelenler" subtitle="Bakim planlarindan uretilen saha servis hazirlik listesi." icon={<AlertTriangle size={24} />} />
      {toast && <InlineToast toast={toast} onClose={() => setToast(null)} />}
      <SummaryStrip items={[['Toplam', rows.length], ['Geciken', overdue], ['Talep olusan', rows.filter(row => row.status === 'service_request_created').length], ['Tamamlanan', rows.filter(row => row.status === 'completed').length]]} />
      <DataState loading={loading} onRetry={load} />
      <Table headers={['Tarih', 'Durum', 'Musteri', 'Urun', 'Seri', 'Plan', 'Garanti', 'Aksiyon']}>
        {rows.map(row => (
          <tr key={row.id}>
            <Cell>{formatDate(row.due_date)}</Cell>
            <Cell><StatusBadge value={row.status} /></Cell>
            <Cell>{row.customer_name || '-'}</Cell>
            <Cell>{row.product_name || '-'}</Cell>
            <Cell mono>{row.serial_no || '-'}</Cell>
            <Cell>{row.plan_name || row.maintenance_plan_name || '-'}</Cell>
            <Cell><WarrantyBadge value={row.warranty_status} /></Cell>
            <Cell>
              <div className="flex flex-wrap gap-2">
                <SmallButton onClick={() => void createRequest(row)} disabled={row.status === 'service_request_created' || row.status === 'completed'} icon={<Send size={14} />}>Talep</SmallButton>
                <SmallButton tone="muted" onClick={() => void skip(row)} disabled={row.status === 'completed' || row.status === 'skipped'}>Atla</SmallButton>
              </div>
            </Cell>
          </tr>
        ))}
      </Table>
    </div>
  )
}

export function FieldAssignmentsPage() {
  const [assignments, setAssignments] = useState<FieldAssignmentRecord[]>([])
  const [requests, setRequests] = useState<ServiceRequestRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [form, setForm] = useState({ service_request_id: '', technician_user_id: '', technician_employee_id: '', scheduled_start: '', scheduled_end: '' })

  async function load() {
    setLoading(true)
    try {
      const [assignmentList, requestList] = await Promise.all([
        afterSalesFieldAssignments.list({ pageSize: 100 }),
        afterSalesRequests.list({ pageSize: 100 }),
      ])
      setAssignments(assignmentList.data)
      setRequests(requestList.data)
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function assign() {
    if (!form.service_request_id) {
      setToast({ type: 'error', message: 'Servis talebi secilmeli.' })
      return
    }
    try {
      await afterSalesRequests.assignTechnician(form.service_request_id, {
        technician_user_id: form.technician_user_id || undefined,
        technician_employee_id: form.technician_employee_id || undefined,
        scheduled_start: form.scheduled_start || undefined,
        scheduled_end: form.scheduled_end || undefined,
        create_project_task: true,
      })
      setToast({ type: 'success', message: 'Teknisyen atandi.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  async function transition(id: string, status: string) {
    try {
      await afterSalesFieldAssignments.setStatus(id, { status })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  return (
    <div className="space-y-5">
      <PageBanner mode="list" title="Saha Gorevleri" subtitle="Teknisyen atama, planlama ve saha servis durum akisi." icon={<Navigation size={24} />} />
      {toast && <InlineToast toast={toast} onClose={() => setToast(null)} />}
      <ActionPanel title="Teknisyen ata" actionLabel="Ata" icon={<UserRound size={16} />} onAction={assign}>
        <Select label="Servis talebi" value={form.service_request_id} onChange={value => setForm({ ...form, service_request_id: value })} options={requests.map(item => item.id)} labels={Object.fromEntries(requests.map(item => [item.id, `${item.request_no} - ${item.subject}`]))} />
        <Input label="Teknisyen user ID" value={form.technician_user_id} onChange={value => setForm({ ...form, technician_user_id: value })} />
        <Input label="Teknisyen employee ID" value={form.technician_employee_id} onChange={value => setForm({ ...form, technician_employee_id: value })} />
        <Input label="Planlanan baslangic" value={form.scheduled_start} onChange={value => setForm({ ...form, scheduled_start: value })} placeholder="2026-05-29T09:00:00+03:00" />
        <Input label="Planlanan bitis" value={form.scheduled_end} onChange={value => setForm({ ...form, scheduled_end: value })} placeholder="2026-05-29T11:00:00+03:00" />
      </ActionPanel>
      <DataState loading={loading} onRetry={load} />
      <Table headers={['Durum', 'Tarih', 'Talep', 'Musteri', 'Teknisyen', 'Urun', 'Aksiyon']}>
        {assignments.map(row => (
          <tr key={row.id}>
            <Cell><StatusBadge value={row.status} /></Cell>
            <Cell>{formatDateTime(row.scheduled_start)}</Cell>
            <Cell mono>{row.request_no || row.service_request_id}</Cell>
            <Cell>{row.customer_name || '-'}</Cell>
            <Cell>{row.technician_user_id || row.technician_employee_id || '-'}</Cell>
            <Cell>{row.product_name || row.serial_no || '-'}</Cell>
            <Cell>
              <div className="flex flex-wrap gap-2">
                <Link className="rounded-md bg-eden-blue px-3 py-1.5 text-xs font-semibold text-white" href={`/app/satis-sonrasi/mobil-servis/${row.id}`}>Ac</Link>
                <SmallButton tone="muted" onClick={() => void transition(row.id, 'in_progress')}>Baslat</SmallButton>
                <SmallButton tone="success" onClick={() => void transition(row.id, 'completed')}>Tamamla</SmallButton>
              </div>
            </Cell>
          </tr>
        ))}
      </Table>
    </div>
  )
}

export function ChecklistTemplatesPage() {
  const [rows, setRows] = useState<ChecklistTemplateRecord[]>([])
  const [toast, setToast] = useState<ToastState | null>(null)
  const [form, setForm] = useState({
    checklist_name: '',
    service_type: 'maintenance',
    product_id: '',
    itemsText: '[{"key":"visual_check","label":"Gorsel kontrol tamamlandi","type":"checkbox","required":true}]',
  })

  async function load() {
    try {
      const result = await afterSalesChecklistTemplates.list({ pageSize: 100 })
      setRows(result.data)
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  useEffect(() => { void load() }, [])

  async function createTemplate() {
    try {
      const items = JSON.parse(form.itemsText) as Record<string, unknown>[]
      await afterSalesChecklistTemplates.create({
        checklist_name: form.checklist_name || 'Standart servis checklist',
        service_type: form.service_type,
        product_id: form.product_id || undefined,
        items,
        active: true,
      })
      setToast({ type: 'success', message: 'Checklist sablonu olusturuldu.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  return (
    <div className="space-y-5">
      <PageBanner mode="list" title="Checklistler" subtitle="Servis turu ve urun bazli saha kontrol sablonlari." icon={<ClipboardCheck size={24} />} />
      {toast && <InlineToast toast={toast} onClose={() => setToast(null)} />}
      <ActionPanel title="Checklist sablonu" actionLabel="Kaydet" icon={<Plus size={16} />} onAction={createTemplate}>
        <Input label="Ad" value={form.checklist_name} onChange={value => setForm({ ...form, checklist_name: value })} />
        <Select label="Servis turu" value={form.service_type} onChange={value => setForm({ ...form, service_type: value })} options={['maintenance', 'repair', 'inspection', 'installation', 'remote_support', 'other']} />
        <Input label="Urun ID" value={form.product_id} onChange={value => setForm({ ...form, product_id: value })} />
        <label className="text-xs font-medium text-gray-600 dark:text-gray-300 md:col-span-3">
          Items JSON
          <textarea className="mt-1 min-h-24 w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-xs dark:border-gray-800 dark:bg-gray-950" value={form.itemsText} onChange={event => setForm({ ...form, itemsText: event.target.value })} />
        </label>
      </ActionPanel>
      <Table headers={['Ad', 'Tur', 'Urun', 'Madde', 'Durum']}>
        {rows.map(row => (
          <tr key={row.id}>
            <Cell>{row.checklist_name}</Cell>
            <Cell><Badge>{row.service_type}</Badge></Cell>
            <Cell>{row.product_id || 'Genel'}</Cell>
            <Cell>{row.items?.length || 0}</Cell>
            <Cell>{row.active ? <Badge tone="green">Aktif</Badge> : <Badge>Pasif</Badge>}</Cell>
          </tr>
        ))}
      </Table>
    </div>
  )
}

export function MobileServiceFlowPage({ assignmentId }: { assignmentId: string }) {
  const [assignment, setAssignment] = useState<FieldAssignmentRecord | null>(null)
  const [record, setRecord] = useState<ServiceRecordRecord | null>(null)
  const [checklist, setChecklist] = useState<ServiceChecklistPayload | null>(null)
  const [report, setReport] = useState<Record<string, unknown> | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [workPerformed, setWorkPerformed] = useState('')
  const [result, setResult] = useState('resolved')
  const [warrantyCovered, setWarrantyCovered] = useState(true)
  const [checkResults, setCheckResults] = useState<Record<string, unknown>>({})
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    try {
      const nextAssignment = await afterSalesFieldAssignments.get(assignmentId)
      setAssignment(nextAssignment)
      if (nextAssignment.service_record_id) {
        const records = await afterSalesRecords.list({ service_request_id: nextAssignment.service_request_id, pageSize: 20 })
        const nextRecord = records.data.find(item => item.id === nextAssignment.service_record_id) || records.data[0] || null
        setRecord(nextRecord)
        if (nextRecord) {
          setChecklist(await afterSalesRecords.checklist(nextRecord.id))
        }
      }
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }, [assignmentId])

  useEffect(() => { void load() }, [load])

  const template = checklist?.suggested_template || null
  const items = useMemo(() => (template?.items || []) as Array<{ key?: string; label?: string; type?: string; required?: boolean; options?: string[] }>, [template])

  async function updateAssignment(status: string) {
    try {
      const updated = await afterSalesFieldAssignments.setStatus(assignmentId, { status })
      setAssignment(updated)
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  async function startService() {
    if (!record?.id) {
      await updateAssignment('in_progress')
      return
    }
    try {
      await afterSalesRecords.start(record.id)
      await updateAssignment('in_progress')
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  async function saveChecklist() {
    if (!record?.id || !template?.id) return
    try {
      const saved = await afterSalesRecords.patchChecklist(record.id, { checklist_template_id: template.id, results: checkResults, completed: true })
      setChecklist(current => ({ ...(current || {}), result: saved }))
      setToast({ type: 'success', message: 'Checklist kaydedildi.' })
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !record?.id) return
    setUploading(true)
    try {
      const document = await documentService.uploadForEntity('service_record', record.id, {
        owner_entity_type: 'service_record',
        owner_entity_id: record.id,
        document_type: 'service_photo',
        document_category: 'after_sales',
        relation_type: 'service_photo',
        file,
      })
      await afterSalesRecords.addPhotos(record.id, [{ document_id: document.id, file_name: document.file_name, mime_type: document.mime_type }])
      setToast({ type: 'success', message: 'Fotograf eklendi.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function completeService() {
    if (!record?.id) {
      setToast({ type: 'error', message: 'Once servisi baslatin.' })
      return
    }
    try {
      const completed = await afterSalesRecords.complete(record.id, { result, work_performed: workPerformed || 'Servis tamamlandi.', warranty_covered: warrantyCovered, create_followup_task: result === 'follow_up_required' })
      setRecord(completed)
      setReport(await afterSalesRecords.report(record.id))
      await updateAssignment('completed')
      setToast({ type: 'success', message: 'Servis tamamlandi.' })
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-24">
      <PageBanner mode="form" title="Mobil Servis" subtitle={assignment?.request_no || assignmentId} icon={<Wrench size={24} />} />
      {toast && <InlineToast toast={toast} onClose={() => setToast(null)} />}
      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">Gorev</div>
            <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{assignment?.subject || 'Saha servis gorevi'}</h2>
            <p className="mt-1 text-sm text-gray-500">{assignment?.customer_name || '-'} {assignment?.product_name ? `- ${assignment.product_name}` : ''}</p>
          </div>
          <StatusBadge value={assignment?.status || 'loading'} />
        </div>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <InfoLine icon={<MapPin size={15} />} label="Lokasyon" value={[assignment?.address, assignment?.district, assignment?.city].filter(Boolean).join(', ') || '-'} />
          <InfoLine icon={<CalendarClock size={15} />} label="Plan" value={formatDateTime(assignment?.scheduled_start)} />
          <InfoLine icon={<UserRound size={15} />} label="Teknisyen" value={assignment?.technician_user_id || assignment?.technician_employee_id || '-'} />
          <InfoLine icon={<FileText size={15} />} label="Servis kaydi" value={record?.service_no || assignment?.service_record_id || '-'} />
        </div>
      </section>
      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Checklist</h3>
        {!template ? <p className="mt-2 text-sm text-gray-500">Bu servis icin checklist sablonu yok.</p> : (
          <div className="mt-3 space-y-3">
            {items.map(item => (
              <ChecklistInput key={item.key || item.label} item={item} value={checkResults[String(item.key)]} onChange={value => item.key && setCheckResults(current => ({ ...current, [String(item.key)]: value }))} />
            ))}
            <SmallButton icon={<ClipboardCheck size={14} />} onClick={() => void saveChecklist()} disabled={!record?.id}>Checklist Kaydet</SmallButton>
          </div>
        )}
      </section>
      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Servis sonucu</h3>
        <div className="mt-3 grid gap-3">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Yapilan is<textarea className="mt-1 min-h-28 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950" value={workPerformed} onChange={event => setWorkPerformed(event.target.value)} /></label>
          <Select label="Sonuc" value={result} onChange={setResult} options={['resolved', 'unresolved', 'follow_up_required', 'customer_cancelled', 'warranty_rejected']} />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"><input type="checkbox" checked={warrantyCovered} onChange={event => setWarrantyCovered(event.target.checked)} /> Garanti kapsaminda</label>
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 dark:border-gray-800 dark:text-gray-200">
            <Camera size={16} />
            {uploading ? 'Yukleniyor' : 'Fotograf Ekle'}
            <input className="hidden" type="file" accept="image/*" onChange={event => void uploadPhoto(event)} disabled={!record?.id || uploading} />
          </label>
        </div>
      </section>
      {report && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Servis raporu onizleme</h3>
          <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-950" dangerouslySetInnerHTML={{ __html: String(report.html_preview || '') }} />
        </section>
      )}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 p-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto flex max-w-3xl gap-2">
          <button className="flex-1 rounded-md border border-gray-200 px-3 py-3 text-sm font-semibold text-gray-700 dark:border-gray-800 dark:text-gray-200" onClick={() => void updateAssignment('accepted')}>Kabul</button>
          <button className="flex-1 rounded-md bg-eden-blue px-3 py-3 text-sm font-semibold text-white" onClick={() => void startService()}>Baslat</button>
          <button className="flex-1 rounded-md bg-emerald-600 px-3 py-3 text-sm font-semibold text-white" onClick={() => void completeService()}>Tamamla</button>
        </div>
      </div>
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

function InlineToast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  const tone = toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200' : toast.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
  return <div className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${tone}`}><span>{toast.message}</span><button className="font-semibold" onClick={onClose}>Kapat</button></div>
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}<input className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950" value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} /></label>
}

function Select({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}<select className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950" value={value} onChange={event => onChange(event.target.value)}><option value="">Sec</option>{options.map(option => <option key={option} value={option}>{labels?.[option] || option}</option>)}</select></label>
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
  const tone = ['completed', 'resolved', 'closed'].includes(value) ? 'green' : ['cancelled', 'failed', 'rejected', 'overdue'].includes(value) ? 'red' : ['assigned', 'scheduled', 'due_soon', 'in_progress'].includes(value) ? 'amber' : 'blue'
  return <Badge tone={tone}>{value}</Badge>
}

function PriorityBadge({ value }: { value: string }) {
  const tone = value === 'urgent' || value === 'high' ? 'red' : value === 'medium' ? 'amber' : 'gray'
  return <Badge tone={tone}>{value}</Badge>
}

function WarrantyBadge({ value }: { value?: string | null }) {
  const tone = value === 'in_warranty' ? 'green' : value === 'out_of_warranty' || value === 'void' ? 'red' : 'gray'
  return <Badge tone={tone}>{value || 'unknown'}</Badge>
}

function SmallButton({ children, onClick, disabled, icon, tone = 'primary' }: { children: ReactNode; onClick: () => void; disabled?: boolean; icon?: ReactNode; tone?: 'primary' | 'muted' | 'success' }) {
  const classes = tone === 'success' ? 'bg-emerald-600 text-white' : tone === 'muted' ? 'border border-gray-200 text-gray-700 dark:border-gray-800 dark:text-gray-200' : 'bg-eden-blue text-white'
  return <button className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${classes}`} disabled={disabled} onClick={onClick}>{icon}{children}</button>
}

function DataState({ loading, onRetry }: { loading: boolean; onRetry: () => Promise<void> }) {
  if (!loading) return null
  return <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700"><RefreshCw size={16} /> Yukleniyor... <button className="font-semibold text-eden-blue" onClick={() => void onRetry()}>Yenile</button></div>
}

function InfoLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-950">{icon}<span className="text-gray-500">{label}</span><span className="min-w-0 truncate font-medium text-gray-900 dark:text-white">{value}</span></div>
}

function ChecklistInput({ item, value, onChange }: { item: { key?: string; label?: string; type?: string; required?: boolean; options?: string[] }; value: unknown; onChange: (value: unknown) => void }) {
  if (item.type === 'checkbox') {
    return <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"><input type="checkbox" checked={value === true} onChange={event => onChange(event.target.checked)} /> {item.label || item.key} {item.required ? '*' : ''}</label>
  }
  if (item.type === 'select') {
    return <Select label={`${item.label || item.key}${item.required ? ' *' : ''}`} value={String(value || '')} onChange={onChange} options={item.options || []} />
  }
  return <Input label={`${item.label || item.key}${item.required ? ' *' : ''}`} value={String(value || '')} onChange={onChange} />
}

function selectedAsset(assets: InstalledAssetRecord[], id: string) {
  return assets.find(asset => asset.id === id)
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return value.slice(0, 10)
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 16)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Islem tamamlanamadi.'
}
