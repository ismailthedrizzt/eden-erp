'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CalendarClock, CheckCircle2, KanbanSquare, Plus, RefreshCw, Send, Trophy, UserRoundPlus, XCircle } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import {
  crmFollowups,
  crmLeads,
  crmOpportunities,
  crmPipelines,
  type CRMFollowupRecord,
  type CRMLeadRecord,
  type CRMOpportunityRecord,
  type CRMPipelineRecord,
  type CRMPipelineStageRecord,
} from '@/lib/services/crm'

type ToastState = { type: 'success' | 'error' | 'warning'; message: string } | null

export function CrmLeadsPage() {
  const [rows, setRows] = useState<CRMLeadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastState>(null)
  const [form, setForm] = useState({
    company_id: '',
    lead_name: '',
    contact_name: '',
    phone: '',
    email: '',
    company_name: '',
    source: 'manual',
    interest_area: '',
    product_interest: '',
    estimated_value: '',
    currency: 'TRY',
    expected_close_date: '',
    assigned_owner_user_id: '',
    next_followup_date: '',
    tags: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await crmLeads.list({ pageSize: 100 })
      setRows(result.data)
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function createLead() {
    if (!form.company_id || !form.lead_name) {
      setToast({ type: 'error', message: 'Sirket ID ve lead adi zorunlu.' })
      return
    }
    try {
      await crmLeads.create({
        ...form,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined,
        expected_close_date: form.expected_close_date || undefined,
        next_followup_date: form.next_followup_date || undefined,
        assigned_owner_user_id: form.assigned_owner_user_id || undefined,
        tags: splitTags(form.tags),
      })
      setToast({ type: 'success', message: 'Lead olusturuldu.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  async function qualify(row: CRMLeadRecord) {
    try {
      await crmLeads.qualify(row.id, { qualification_score: row.qualification_score || 70 })
      setToast({ type: 'success', message: 'Lead qualified oldu.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  async function convert(row: CRMLeadRecord) {
    try {
      await crmLeads.convert(row.id, { create_stakeholder: true, create_opportunity: true })
      setToast({ type: 'success', message: 'Lead musteri/firsat akisina donusturuldu.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  async function markLost(row: CRMLeadRecord) {
    try {
      await crmLeads.markLost(row.id, 'MVP ekranindan kaybedildi.')
      setToast({ type: 'warning', message: 'Lead kaybedildi olarak isaretlendi.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  return (
    <WorkspaceShell title="Leadler" subtitle="Lead kaydi, kaynak, takip tarihi ve donusum akisidir." icon={<UserRoundPlus size={24} />} toast={toast} onCloseToast={() => setToast(null)}>
      <ActionPanel title="Lead olustur" actionLabel="Kaydet" icon={<Plus size={16} />} onAction={createLead}>
        <Input label="Sirket ID" value={form.company_id} onChange={company_id => setForm({ ...form, company_id })} />
        <Input label="Lead adi" value={form.lead_name} onChange={lead_name => setForm({ ...form, lead_name })} />
        <Input label="Kisi" value={form.contact_name} onChange={contact_name => setForm({ ...form, contact_name })} />
        <Input label="Telefon" value={form.phone} onChange={phone => setForm({ ...form, phone })} />
        <Input label="E-posta" value={form.email} onChange={email => setForm({ ...form, email })} />
        <Input label="Firma" value={form.company_name} onChange={company_name => setForm({ ...form, company_name })} />
        <Select label="Kaynak" value={form.source} onChange={source => setForm({ ...form, source })} options={['manual', 'website', 'referral', 'event', 'exhibition', 'phone', 'email', 'social_media', 'partner', 'import', 'other']} />
        <Input label="Ilgi alani" value={form.interest_area} onChange={interest_area => setForm({ ...form, interest_area })} />
        <Input label="Urun ilgisi" value={form.product_interest} onChange={product_interest => setForm({ ...form, product_interest })} />
        <Input label="Potansiyel" value={form.estimated_value} onChange={estimated_value => setForm({ ...form, estimated_value })} />
        <Input label="Para birimi" value={form.currency} onChange={currency => setForm({ ...form, currency })} />
        <Input label="Beklenen kapanis" type="date" value={form.expected_close_date} onChange={expected_close_date => setForm({ ...form, expected_close_date })} />
        <Input label="Sorumlu user ID" value={form.assigned_owner_user_id} onChange={assigned_owner_user_id => setForm({ ...form, assigned_owner_user_id })} />
        <Input label="Sonraki takip" type="date" value={form.next_followup_date} onChange={next_followup_date => setForm({ ...form, next_followup_date })} />
        <Input label="Etiketler" value={form.tags} onChange={tags => setForm({ ...form, tags })} />
      </ActionPanel>
      <SummaryStrip items={[['Toplam', rows.length], ['Yeni', count(rows, 'lead_status', 'new')], ['Qualified', count(rows, 'lead_status', 'qualified')], ['Duplicate uyarisi', rows.filter(row => (row.duplicate_warnings || []).length > 0).length]]} />
      <DataState loading={loading} onRetry={load} />
      <Table headers={['Lead', 'Durum', 'Kaynak', 'Sorumlu', 'Ilgi', 'Potansiyel', 'Son temas', 'Sonraki takip', 'Aksiyon']}>
        {rows.map(row => (
          <tr key={row.id}>
            <Cell>
              <div className="font-medium text-gray-950 dark:text-gray-100">{row.lead_name}</div>
              <div className="text-xs text-gray-500">{row.company_name || row.contact_name || row.email || '-'}</div>
            </Cell>
            <Cell><StatusBadge value={row.lead_status} /></Cell>
            <Cell><Badge>{row.source}</Badge></Cell>
            <Cell mono>{row.assigned_owner_user_id || '-'}</Cell>
            <Cell>{row.interest_area || row.product_interest || '-'}</Cell>
            <Cell>{money(row.estimated_value, row.currency)}</Cell>
            <Cell>{formatDateTime(row.last_contacted_at)}</Cell>
            <Cell>{formatDate(row.next_followup_date)}</Cell>
            <Cell>
              <div className="flex flex-wrap gap-2">
                <SmallButton icon={<CheckCircle2 size={14} />} onClick={() => void qualify(row)} disabled={row.lead_status === 'qualified' || row.lead_status === 'converted'}>Qualify</SmallButton>
                <SmallButton tone="success" icon={<Send size={14} />} onClick={() => void convert(row)} disabled={row.lead_status === 'converted'}>Donustur</SmallButton>
                <SmallButton tone="danger" icon={<XCircle size={14} />} onClick={() => void markLost(row)} disabled={['lost', 'converted'].includes(row.lead_status)}>Kaybet</SmallButton>
              </div>
            </Cell>
          </tr>
        ))}
      </Table>
    </WorkspaceShell>
  )
}

export function CrmOpportunitiesPage() {
  const [rows, setRows] = useState<CRMOpportunityRecord[]>([])
  const [pipelines, setPipelines] = useState<CRMPipelineRecord[]>([])
  const [stages, setStages] = useState<CRMPipelineStageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastState>(null)
  const [form, setForm] = useState({
    company_id: '',
    opportunity_name: '',
    customer_name: '',
    pipeline_id: '',
    stage_id: '',
    estimated_value: '',
    probability: '',
    currency: 'TRY',
    expected_close_date: '',
    assigned_owner_user_id: '',
    product_interest: '',
    next_followup_date: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [opportunityList, pipelineList] = await Promise.all([
        crmOpportunities.list({ pageSize: 100 }),
        crmPipelines.list({ pageSize: 100 }),
      ])
      setRows(opportunityList.data)
      setPipelines(pipelineList.data)
      const firstPipeline = pipelineList.data[0]?.id
      if (firstPipeline) {
        setStages(await crmPipelines.stages(firstPipeline))
        setForm(current => ({ ...current, pipeline_id: current.pipeline_id || firstPipeline }))
      }
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function selectPipeline(pipeline_id: string) {
    setForm({ ...form, pipeline_id, stage_id: '' })
    if (!pipeline_id) return
    try {
      setStages(await crmPipelines.stages(pipeline_id))
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  async function createOpportunity() {
    if (!form.company_id || !form.opportunity_name || !form.customer_name) {
      setToast({ type: 'error', message: 'Sirket, firsat adi ve musteri zorunlu.' })
      return
    }
    try {
      await crmOpportunities.create({
        ...form,
        pipeline_id: form.pipeline_id || undefined,
        stage_id: form.stage_id || undefined,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined,
        probability: form.probability ? Number(form.probability) : undefined,
        expected_close_date: form.expected_close_date || undefined,
        next_followup_date: form.next_followup_date || undefined,
        assigned_owner_user_id: form.assigned_owner_user_id || undefined,
      })
      setToast({ type: 'success', message: 'Firsat olusturuldu.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  async function stage(row: CRMOpportunityRecord, stage_id: string) {
    try {
      await crmOpportunities.changeStage(row.id, { stage_id })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  async function markWon(row: CRMOpportunityRecord) {
    try {
      await crmOpportunities.markWon(row.id, { won_reason: 'MVP ekranindan kazanildi.' })
      setToast({ type: 'success', message: 'Firsat kazanildi.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  async function markLost(row: CRMOpportunityRecord) {
    try {
      await crmOpportunities.markLost(row.id, { lost_reason: 'MVP ekranindan kaybedildi.' })
      setToast({ type: 'warning', message: 'Firsat kaybedildi.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  return (
    <WorkspaceShell title="Firsatlar" subtitle="Opportunity tutari, asama, olasilik, teklif ve kapanis takibi." icon={<Trophy size={24} />} toast={toast} onCloseToast={() => setToast(null)}>
      <ActionPanel title="Firsat olustur" actionLabel="Kaydet" icon={<Plus size={16} />} onAction={createOpportunity}>
        <Input label="Sirket ID" value={form.company_id} onChange={company_id => setForm({ ...form, company_id })} />
        <Input label="Firsat adi" value={form.opportunity_name} onChange={opportunity_name => setForm({ ...form, opportunity_name })} />
        <Input label="Musteri" value={form.customer_name} onChange={customer_name => setForm({ ...form, customer_name })} />
        <Select label="Pipeline" value={form.pipeline_id} onChange={selectPipeline} options={pipelines.map(item => item.id)} labels={Object.fromEntries(pipelines.map(item => [item.id, item.pipeline_name]))} />
        <Select label="Asama" value={form.stage_id} onChange={stage_id => setForm({ ...form, stage_id })} options={stages.map(item => item.id)} labels={Object.fromEntries(stages.map(item => [item.id, item.stage_name]))} />
        <Input label="Tutar" value={form.estimated_value} onChange={estimated_value => setForm({ ...form, estimated_value })} />
        <Input label="Olasilik" value={form.probability} onChange={probability => setForm({ ...form, probability })} />
        <Input label="Para birimi" value={form.currency} onChange={currency => setForm({ ...form, currency })} />
        <Input label="Beklenen kapanis" type="date" value={form.expected_close_date} onChange={expected_close_date => setForm({ ...form, expected_close_date })} />
        <Input label="Sorumlu user ID" value={form.assigned_owner_user_id} onChange={assigned_owner_user_id => setForm({ ...form, assigned_owner_user_id })} />
        <Input label="Urun ilgisi" value={form.product_interest} onChange={product_interest => setForm({ ...form, product_interest })} />
        <Input label="Sonraki takip" type="date" value={form.next_followup_date} onChange={next_followup_date => setForm({ ...form, next_followup_date })} />
      </ActionPanel>
      <SummaryStrip items={[['Acik', count(rows, 'status', 'open')], ['Kazanildi', count(rows, 'status', 'won')], ['Kaybedildi', count(rows, 'status', 'lost')], ['Pipeline', money(rows.filter(row => row.status === 'open').reduce((sum, row) => sum + numberValue(row.estimated_value), 0), rows[0]?.currency)]]} />
      <DataState loading={loading} onRetry={load} />
      <Table headers={['No', 'Firsat', 'Musteri', 'Asama', 'Durum', 'Tutar', 'Olasilik', 'Agirlikli', 'Kapanis', 'Aksiyon']}>
        {rows.map(row => (
          <tr key={row.id}>
            <Cell mono>{row.opportunity_no}</Cell>
            <Cell>{row.opportunity_name}</Cell>
            <Cell>{row.customer_name}</Cell>
            <Cell>{row.stage_name || row.stage_id}</Cell>
            <Cell><StatusBadge value={row.status} /></Cell>
            <Cell>{money(row.estimated_value, row.currency)}</Cell>
            <Cell>{row.probability ?? '-'}</Cell>
            <Cell>{money(row.weighted_value, row.currency)}</Cell>
            <Cell>{formatDate(row.expected_close_date)}</Cell>
            <Cell>
              <div className="flex flex-wrap gap-2">
                <SelectButton value={row.stage_id} options={stages} onChange={stage_id => void stage(row, stage_id)} />
                <SmallButton tone="success" icon={<Trophy size={14} />} onClick={() => void markWon(row)} disabled={row.status === 'won'}>Won</SmallButton>
                <SmallButton tone="danger" icon={<XCircle size={14} />} onClick={() => void markLost(row)} disabled={row.status === 'lost'}>Lost</SmallButton>
              </div>
            </Cell>
          </tr>
        ))}
      </Table>
    </WorkspaceShell>
  )
}

export function CrmPipelinePage() {
  const [opportunities, setOpportunities] = useState<CRMOpportunityRecord[]>([])
  const [pipelines, setPipelines] = useState<CRMPipelineRecord[]>([])
  const [stages, setStages] = useState<CRMPipelineStageRecord[]>([])
  const [pipelineId, setPipelineId] = useState('')
  const [toast, setToast] = useState<ToastState>(null)

  const load = useCallback(async () => {
    try {
      const [opportunityList, pipelineList] = await Promise.all([crmOpportunities.list({ pageSize: 200 }), crmPipelines.list({ pageSize: 50 })])
      setOpportunities(opportunityList.data)
      setPipelines(pipelineList.data)
      const selected = pipelineList.data[0]?.id || ''
      setPipelineId(selected)
      if (selected) setStages(await crmPipelines.stages(selected))
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const byStage = useMemo(() => stages.map(stage => ({
    stage,
    rows: opportunities.filter(row => row.pipeline_id === pipelineId && row.stage_id === stage.id && row.status === 'open'),
  })), [opportunities, pipelineId, stages])

  return (
    <WorkspaceShell title="Pipeline" subtitle="Asama kolonlari ve acik firsat toplam degerleri." icon={<KanbanSquare size={24} />} toast={toast} onCloseToast={() => setToast(null)}>
      <div className="flex flex-wrap items-end gap-3">
        <Select label="Pipeline" value={pipelineId} onChange={async value => {
          setPipelineId(value)
          setStages(value ? await crmPipelines.stages(value) : [])
        }} options={pipelines.map(item => item.id)} labels={Object.fromEntries(pipelines.map(item => [item.id, item.pipeline_name]))} />
        <SmallButton icon={<RefreshCw size={14} />} onClick={() => void load()}>Yenile</SmallButton>
      </div>
      <div className="grid gap-3 xl:grid-cols-4">
        {byStage.map(column => (
          <section key={column.stage.id} className="min-h-48 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-950 dark:text-gray-100">{column.stage.stage_name}</h2>
              <Badge>{money(column.rows.reduce((sum, row) => sum + numberValue(row.estimated_value), 0), column.rows[0]?.currency)}</Badge>
            </div>
            <div className="space-y-2">
              {column.rows.map(row => (
                <div key={row.id} className="rounded-md border border-gray-200 p-3 text-sm dark:border-gray-800">
                  <div className="font-medium text-gray-950 dark:text-gray-100">{row.opportunity_name}</div>
                  <div className="mt-1 text-xs text-gray-500">{row.customer_name} - {money(row.estimated_value, row.currency)}</div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                    <span>{formatDate(row.next_followup_date)}</span>
                    <StatusBadge value={row.proposal_status || 'not_started'} />
                  </div>
                </div>
              ))}
              {!column.rows.length && <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-800">Bos</div>}
            </div>
          </section>
        ))}
      </div>
    </WorkspaceShell>
  )
}

export function CrmFollowupsPage() {
  const [rows, setRows] = useState<CRMFollowupRecord[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [snoozeDate, setSnoozeDate] = useState(today())

  const load = useCallback(async () => {
    try {
      setRows(await crmFollowups.due({ limit: 200 }))
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function complete(row: CRMFollowupRecord) {
    try {
      await crmFollowups.complete(row.entity_type, row.id, { outcome: 'completed' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  async function snooze(row: CRMFollowupRecord) {
    try {
      await crmFollowups.snooze(row.entity_type, row.id, { next_followup_date: snoozeDate, notes: 'MVP ekranindan ertelendi.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  return (
    <WorkspaceShell title="Takipler" subtitle="Gunu gelen ve geciken lead/firsat takipleri." icon={<CalendarClock size={24} />} toast={toast} onCloseToast={() => setToast(null)}>
      <div className="flex flex-wrap items-end gap-3">
        <Input label="Erteleme tarihi" type="date" value={snoozeDate} onChange={setSnoozeDate} />
        <SmallButton icon={<RefreshCw size={14} />} onClick={() => void load()}>Yenile</SmallButton>
      </div>
      <SummaryStrip items={[['Toplam', rows.length], ['Geciken', rows.filter(row => row.followup_state === 'overdue').length], ['Lead', rows.filter(row => row.entity_type === 'lead').length], ['Firsat', rows.filter(row => row.entity_type === 'opportunity').length]]} />
      <Table headers={['Tip', 'Kayit', 'Durum', 'Sorumlu', 'Takip', 'Tutar', 'Aksiyon']}>
        {rows.map(row => (
          <tr key={`${row.entity_type}-${row.id}`}>
            <Cell><Badge>{row.entity_type}</Badge></Cell>
            <Cell>{row.title}</Cell>
            <Cell><StatusBadge value={row.followup_state} /></Cell>
            <Cell mono>{row.assigned_owner_user_id || '-'}</Cell>
            <Cell>{formatDate(row.next_followup_date)}</Cell>
            <Cell>{money(row.estimated_value, row.currency)}</Cell>
            <Cell>
              <div className="flex flex-wrap gap-2">
                <SmallButton icon={<CheckCircle2 size={14} />} onClick={() => void complete(row)}>Tamamla</SmallButton>
                <SmallButton tone="muted" onClick={() => void snooze(row)}>Ertele</SmallButton>
              </div>
            </Cell>
          </tr>
        ))}
      </Table>
    </WorkspaceShell>
  )
}

export function CrmPipelineSettingsPage() {
  const [rows, setRows] = useState<CRMPipelineRecord[]>([])
  const [stages, setStages] = useState<CRMPipelineStageRecord[]>([])
  const [selected, setSelected] = useState('')
  const [toast, setToast] = useState<ToastState>(null)
  const [form, setForm] = useState({ company_id: '', pipeline_name: '', is_default: true })

  const load = useCallback(async () => {
    try {
      const result = await crmPipelines.list({ pageSize: 100, include_inactive: true })
      setRows(result.data)
      const id = result.data[0]?.id || ''
      setSelected(id)
      if (id) setStages(await crmPipelines.stages(id))
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function createPipeline() {
    try {
      await crmPipelines.create({ ...form, company_id: form.company_id || undefined })
      setToast({ type: 'success', message: 'Pipeline olusturuldu.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: errorMessage(error) })
    }
  }

  return (
    <WorkspaceShell title="Pipeline Ayarlari" subtitle="Pipeline ve asama olasiliklari." icon={<KanbanSquare size={24} />} toast={toast} onCloseToast={() => setToast(null)}>
      <ActionPanel title="Pipeline olustur" actionLabel="Kaydet" icon={<Plus size={16} />} onAction={createPipeline}>
        <Input label="Sirket ID" value={form.company_id} onChange={company_id => setForm({ ...form, company_id })} />
        <Input label="Pipeline adi" value={form.pipeline_name} onChange={pipeline_name => setForm({ ...form, pipeline_name })} />
        <Toggle label="Varsayilan" checked={form.is_default} onChange={is_default => setForm({ ...form, is_default })} />
      </ActionPanel>
      <div className="flex flex-wrap items-end gap-3">
        <Select label="Pipeline" value={selected} onChange={async value => {
          setSelected(value)
          setStages(value ? await crmPipelines.stages(value) : [])
        }} options={rows.map(item => item.id)} labels={Object.fromEntries(rows.map(item => [item.id, item.pipeline_name]))} />
      </div>
      <Table headers={['Asama', 'Anahtar', 'Sira', 'Olasilik', 'Tip', 'Sonraki aksiyon', 'Durum']}>
        {stages.map(stage => (
          <tr key={stage.id}>
            <Cell>{stage.stage_name}</Cell>
            <Cell mono>{stage.stage_key}</Cell>
            <Cell>{stage.order_index}</Cell>
            <Cell>{stage.probability}</Cell>
            <Cell><Badge>{stage.stage_type}</Badge></Cell>
            <Cell>{stage.requires_next_action ? 'Evet' : 'Hayir'}</Cell>
            <Cell>{stage.active ? <Badge tone="green">Aktif</Badge> : <Badge>Pasif</Badge>}</Cell>
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

function ActionPanel({ title, actionLabel, icon, onAction, children }: { title: string; actionLabel: string; icon: ReactNode; onAction: () => void; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-950 dark:text-gray-100">{title}</h2>
        <SmallButton icon={icon} onClick={onAction}>{actionLabel}</SmallButton>
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">{children}</div>
    </section>
  )
}

function InlineToast({ toast, onClose }: { toast: NonNullable<ToastState>; onClose: () => void }) {
  const tone = toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200' : toast.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${tone}`}>
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10">Kapat</button>
    </div>
  )
}

function SummaryStrip({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs text-gray-500">{label}</div>
          <div className="mt-1 text-lg font-semibold text-gray-950 dark:text-gray-100">{value}</div>
        </div>
      ))}
    </div>
  )
}

function DataState({ loading, onRetry }: { loading?: boolean; onRetry: () => void }) {
  if (!loading) return null
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
      <RefreshCw size={14} className="animate-spin" />
      Veriler yukleniyor.
      <button type="button" onClick={onRetry} className="ml-auto rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">Yenile</button>
    </div>
  )
}

function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-normal text-gray-500 dark:bg-gray-950/40">
          <tr>{headers.map(header => <th key={header} className="px-3 py-3 font-semibold">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{children}</tbody>
      </table>
    </div>
  )
}

function Cell({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return <td className={`px-3 py-3 align-top text-gray-700 dark:text-gray-200 ${mono ? 'font-mono text-xs' : ''}`}>{children}</td>
}

function Input({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
      {label}
      <input type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} className="min-h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-950 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100" />
    </label>
  )
}

function Select({ label, value, onChange, options, labels = {} }: { label: string; value: string; onChange: (value: string) => void | Promise<void>; options: string[]; labels?: Record<string, string> }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
      {label}
      <select value={value} onChange={event => void onChange(event.target.value)} className="min-h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-950 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
        <option value="">Seciniz</option>
        {options.map(option => <option key={option} value={option}>{labels[option] || option}</option>)}
      </select>
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-10 items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  )
}

function SmallButton({ children, icon, onClick, disabled, tone = 'default' }: { children: ReactNode; icon?: ReactNode; onClick: () => void; disabled?: boolean; tone?: 'default' | 'success' | 'danger' | 'muted' }) {
  const toneClass = tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200' : tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200' : tone === 'muted' ? 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300' : 'border-gray-900 bg-gray-950 text-white hover:bg-gray-800 dark:border-gray-100 dark:bg-gray-100 dark:text-gray-950'
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}>
      {icon}
      {children}
    </button>
  )
}

function SelectButton({ value, options, onChange }: { value: string; options: CRMPipelineStageRecord[]; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={event => onChange(event.target.value)} className="min-h-9 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200">
      {options.map(option => <option key={option.id} value={option.id}>{option.stage_name}</option>)}
    </select>
  )
}

function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'amber' }) {
  const toneClass = tone === 'green' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-900' : tone === 'amber' ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-900' : 'bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700'
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ring-1 ${toneClass}`}>{children}</span>
}

function StatusBadge({ value }: { value?: string | null }) {
  const status = value || 'unknown'
  const tone = ['won', 'qualified', 'converted', 'active', 'due'].includes(status) ? 'green' : ['lost', 'overdue'].includes(status) ? 'amber' : 'gray'
  return <Badge tone={tone}>{status}</Badge>
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('tr-TR').format(new Date(value))
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function money(value?: string | number | null, currency?: string | null) {
  if (value === undefined || value === null || value === '') return '-'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'TRY', maximumFractionDigits: 0 }).format(numberValue(value))
}

function numberValue(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return 0
  return Number(value) || 0
}

function count<T extends Record<string, unknown>>(rows: T[], key: keyof T, value: unknown) {
  return rows.filter(row => row[key] === value).length
}

function splitTags(value: string) {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Islem tamamlanamadi.'
}
