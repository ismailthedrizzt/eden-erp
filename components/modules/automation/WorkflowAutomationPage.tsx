'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  Braces,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Pause,
  Play,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  Workflow,
} from 'lucide-react'
import {
  automationRegistry,
  automationRules,
  automationRuns,
  type AutomationActionDefinition,
  type AutomationConditionRegistry,
  type AutomationRule,
  type AutomationRun,
  type AutomationSimulation,
  type AutomationTemplate,
} from '@/lib/services/automation'

type LoadState = 'idle' | 'loading' | 'saving'

const moduleOptions = ['documents', 'project_management', 'crm', 'after_sales', 'accounting', 'hr', 'representatives', 'dataQuality', 'reporting']
const statusLabels: Record<string, string> = {
  draft: 'Taslak',
  active: 'Aktif',
  paused: 'Duraklatildi',
  disabled: 'Devre disi',
  failed: 'Hatali',
}

export function WorkflowAutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [templates, setTemplates] = useState<AutomationTemplate[]>([])
  const [conditions, setConditions] = useState<AutomationConditionRegistry | null>(null)
  const [actions, setActions] = useState<AutomationActionDefinition[]>([])
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('')
  const [ruleName, setRuleName] = useState('Belge suresi takip otomasyonu')
  const [moduleKey, setModuleKey] = useState('documents')
  const [triggerType, setTriggerType] = useState<'event' | 'schedule' | 'condition' | 'manual'>('schedule')
  const [conditionEntity, setConditionEntity] = useState('document')
  const [conditionField, setConditionField] = useState('expiry_date')
  const [conditionOperator, setConditionOperator] = useState('date_within_days')
  const [conditionValue, setConditionValue] = useState('30')
  const [actionType, setActionType] = useState('create_document_expiry_warning')
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [simulation, setSimulation] = useState<AutomationSimulation | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<LoadState>('idle')

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const [ruleData, runData, templateData, conditionData, actionData] = await Promise.all([
        automationRules.list({ pageSize: 50 }),
        automationRuns.list({ pageSize: 12 }),
        automationRegistry.templates(),
        automationRegistry.conditions(),
        automationRegistry.actions(),
      ])
      setRules(ruleData.items)
      setRuns(runData.items)
      setTemplates(templateData)
      setConditions(conditionData)
      setActions(actionData)
      setSelectedTemplateKey(current => current || templateData[0]?.template_key || '')
      setSelectedRuleId(current => current || ruleData.items[0]?.id || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Otomasyon verisi yuklenemedi.')
    } finally {
      setState('idle')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const selectedTemplate = useMemo(
    () => templates.find(template => template.template_key === selectedTemplateKey),
    [selectedTemplateKey, templates]
  )
  const selectedRule = useMemo(() => rules.find(rule => rule.id === selectedRuleId) || null, [rules, selectedRuleId])
  const selectedEntity = useMemo(
    () => conditions?.entities.find(entity => entity.key === conditionEntity) || conditions?.entities[0],
    [conditionEntity, conditions]
  )

  function applyTemplate(template: AutomationTemplate | undefined) {
    if (!template) return
    const condition = template.condition_config
    const rawActions = template.action_config.actions
    const firstAction = Array.isArray(rawActions) && rawActions[0] && typeof rawActions[0] === 'object'
      ? rawActions[0] as Record<string, unknown>
      : template.action_config
    setRuleName(template.template_name)
    setModuleKey(template.module_key)
    setTriggerType((template.trigger_config.event_type ? 'event' : 'schedule') as 'event' | 'schedule')
    setConditionEntity(String(condition.entity || 'document'))
    setConditionField(String(condition.field || 'expiry_date'))
    setConditionOperator(String(condition.operator || 'date_within_days'))
    setConditionValue(String(condition.value ?? '30'))
    setActionType(String(firstAction.action_type || 'create_notification'))
  }

  async function createRule() {
    setState('saving')
    setMessage(null)
    setError(null)
    try {
      const parsedValue = /^\d+$/.test(conditionValue) ? Number(conditionValue) : conditionValue
      const rule = await automationRules.create({
        rule_name: ruleName,
        module_key: moduleKey,
        trigger_type: triggerType,
        trigger_config: triggerType === 'event'
          ? { event_type: selectedTemplate?.trigger_config.event_type || 'document.expiring', module_key: moduleKey }
          : { frequency: 'daily', time: '09:00', timezone: 'Europe/Istanbul' },
        condition_config: {
          entity: conditionEntity,
          field: conditionField,
          operator: conditionOperator,
          value: parsedValue,
        },
        action_config: { actions: [{ action_type: actionType }] },
        status: 'draft',
        priority: 'normal',
        run_mode: 'async_worker',
        cooldown_minutes: 60,
        max_runs_per_day: 10,
      })
      setSelectedRuleId(rule.id)
      setMessage('Otomasyon kurali taslak olarak olusturuldu.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Otomasyon kurali olusturulamadi.')
    } finally {
      setState('idle')
    }
  }

  async function transition(action: 'activate' | 'pause' | 'disable' | 'runNow' | 'simulate') {
    if (!selectedRule) return
    setState('saving')
    setMessage(null)
    setError(null)
    try {
      if (action === 'activate') {
        await automationRules.activate(selectedRule.id)
        setMessage('Kural aktif edildi.')
      } else if (action === 'pause') {
        await automationRules.pause(selectedRule.id)
        setMessage('Kural duraklatildi.')
      } else if (action === 'disable') {
        await automationRules.disable(selectedRule.id)
        setMessage('Kural devre disi birakildi.')
      } else if (action === 'runNow') {
        await automationRules.runNow(selectedRule.id)
        setMessage('Run now tamamlandi.')
      } else {
        const result = await automationRules.simulate(selectedRule.id)
        setSimulation(result)
        setMessage('Simulation tamamlandi; gercek aksiyon olusturulmadi.')
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Otomasyon islemi tamamlanamadi.')
    } finally {
      setState('idle')
    }
  }

  const busy = state === 'loading' || state === 'saving'

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 dark:bg-slate-950 dark:text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Workflow Automation</p>
            <h1 className="mt-1 text-2xl font-semibold">Otomasyonlar</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryButtonClass} onClick={load} disabled={busy}>
              {state === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Yenile
            </button>
            <button type="button" className={primaryButtonClass} onClick={createRule} disabled={busy}>
              {state === 'saving' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Kural Olustur
            </button>
          </div>
        </header>

        {error ? <Alert tone="error" text={error} /> : null}
        {message ? <Alert tone="success" text={message} /> : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Panel title="Kural editoru" icon={<Workflow size={18} />}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Sablon">
                <select
                  className={inputClass}
                  value={selectedTemplateKey}
                  onChange={event => {
                    setSelectedTemplateKey(event.target.value)
                    applyTemplate(templates.find(template => template.template_key === event.target.value))
                  }}
                >
                  {templates.map(template => <option key={template.template_key} value={template.template_key}>{template.template_name}</option>)}
                </select>
              </Field>
              <Field label="Modul">
                <select className={inputClass} value={moduleKey} onChange={event => setModuleKey(event.target.value)}>
                  {moduleOptions.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Kural adi">
                <input className={inputClass} value={ruleName} onChange={event => setRuleName(event.target.value)} />
              </Field>
              <Field label="Trigger">
                <select className={inputClass} value={triggerType} onChange={event => setTriggerType(event.target.value as 'event' | 'schedule' | 'condition' | 'manual')}>
                  <option value="schedule">schedule</option>
                  <option value="condition">condition</option>
                  <option value="event">event</option>
                  <option value="manual">manual</option>
                </select>
              </Field>
              <Field label="Entity">
                <select className={inputClass} value={conditionEntity} onChange={event => {
                  const entityKey = event.target.value
                  const entity = conditions?.entities.find(item => item.key === entityKey)
                  setConditionEntity(entityKey)
                  setConditionField(entity?.fields[0] || 'id')
                }}>
                  {(conditions?.entities || []).map(entity => <option key={entity.key} value={entity.key}>{entity.label}</option>)}
                </select>
              </Field>
              <Field label="Alan">
                <select className={inputClass} value={conditionField} onChange={event => setConditionField(event.target.value)}>
                  {(selectedEntity?.fields || []).map(field => <option key={field} value={field}>{field}</option>)}
                </select>
              </Field>
              <Field label="Operator">
                <select className={inputClass} value={conditionOperator} onChange={event => setConditionOperator(event.target.value)}>
                  {(conditions?.operators || []).map(operator => <option key={operator} value={operator}>{operator}</option>)}
                </select>
              </Field>
              <Field label="Deger">
                <input className={inputClass} value={conditionValue} onChange={event => setConditionValue(event.target.value)} />
              </Field>
              <Field label="Action">
                <select className={inputClass} value={actionType} onChange={event => setActionType(event.target.value)}>
                  {actions.map(action => <option key={action.action_type} value={action.action_type}>{action.label}</option>)}
                </select>
              </Field>
              <Field label="Guvenlik">
                <div className="flex min-h-10 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100">
                  <ShieldCheck size={16} />
                  Registry disi kod, SQL ve mutation kapali
                </div>
              </Field>
            </div>
          </Panel>

          <Panel title="Kurallar" icon={<Braces size={18} />}>
            <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className={thClass}>Durum</th>
                    <th className={thClass}>Kural</th>
                    <th className={thClass}>Modul</th>
                    <th className={thClass}>Trigger</th>
                    <th className={thClass}>Sonraki</th>
                    <th className={thClass}>Run</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {rules.map(rule => (
                    <tr key={rule.id} className={rule.id === selectedRuleId ? 'bg-blue-50 dark:bg-blue-400/10' : 'bg-white dark:bg-slate-950'}>
                      <td className={tdClass}>
                        <button type="button" className={statusClass(rule.status)} onClick={() => setSelectedRuleId(rule.id)}>
                          {statusLabels[rule.status] || rule.status}
                        </button>
                      </td>
                      <td className={tdClass}>
                        <button type="button" className="font-medium text-slate-900 hover:text-blue-700 dark:text-slate-50" onClick={() => setSelectedRuleId(rule.id)}>
                          {rule.rule_name}
                        </button>
                        <div className="text-xs text-slate-500">{rule.rule_key}</div>
                      </td>
                      <td className={tdClass}>{rule.module_key}</td>
                      <td className={tdClass}>{rule.trigger_type}</td>
                      <td className={tdClass}>{formatDateTime(rule.next_run_at)}</td>
                      <td className={tdClass}>{rule.run_count} / {rule.failure_count}</td>
                    </tr>
                  ))}
                  {!rules.length && (
                    <tr>
                      <td className={tdClass} colSpan={6}>Kural bulunamadi.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={secondaryButtonClass} onClick={() => transition('simulate')} disabled={!selectedRule || busy}>
                <FlaskConical size={16} />
                Test Et
              </button>
              <button type="button" className={secondaryButtonClass} onClick={() => transition('activate')} disabled={!selectedRule || busy}>
                <Play size={16} />
                Aktiflestir
              </button>
              <button type="button" className={secondaryButtonClass} onClick={() => transition('pause')} disabled={!selectedRule || busy}>
                <Pause size={16} />
                Duraklat
              </button>
              <button type="button" className={secondaryButtonClass} onClick={() => transition('runNow')} disabled={!selectedRule || busy}>
                <Activity size={16} />
                Run Now
              </button>
              <button type="button" className={secondaryButtonClass} onClick={() => transition('disable')} disabled={!selectedRule || busy}>
                <Power size={16} />
                Devre Disi
              </button>
            </div>
          </Panel>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Panel title="Simulation" icon={<FlaskConical size={18} />}>
            {simulation ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric label="Match" value={simulation.matched_count} />
                  <Metric label="Action" value={simulation.action_preview.length} />
                  <Metric label="Warning" value={simulation.warnings.length} />
                </div>
                <pre className="max-h-72 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                  {JSON.stringify({ matched_preview: simulation.matched_preview, action_preview: simulation.action_preview, warnings: simulation.warnings }, null, 2)}
                </pre>
              </div>
            ) : (
              <EmptyState icon={<AlertTriangle size={18} />} text="Secili kural icin simulation sonucu yok." />
            )}
          </Panel>

          <Panel title="Run history" icon={<Activity size={18} />}>
            <div className="space-y-2">
              {runs.map(run => (
                <div key={run.id} className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{run.rule_name || run.rule_id}</p>
                      <p className="text-xs text-slate-500">{run.trigger_type} | {formatDateTime(run.started_at)}</p>
                    </div>
                    <span className={run.status === 'success' ? successPillClass : warningPillClass}>{run.status}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span>Match {run.matched_count}</span>
                    <span>Action {run.actions_created_count}</span>
                    <span>Skip {run.skipped_count}</span>
                    <span>Fail {run.failure_count}</span>
                  </div>
                </div>
              ))}
              {!runs.length ? <EmptyState icon={<CheckCircle2 size={18} />} text="Run log bulunamadi." /> : null}
            </div>
          </Panel>
        </section>
      </div>
    </main>
  )
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  )
}

function Alert({ tone, text }: { tone: 'success' | 'error'; text: string }) {
  const className = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100'
    : 'border-red-200 bg-red-50 text-red-800 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-100'
  return <div className={`rounded-md border px-3 py-2 text-sm ${className}`}>{text}</div>
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700">
      {icon}
      {text}
    </div>
  )
}

function statusClass(status: string) {
  if (status === 'active') return successPillClass
  if (status === 'failed') return 'rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-400/10 dark:text-red-100'
  if (status === 'paused') return warningPillClass
  return 'rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200'
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

const inputClass = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-400/20'
const primaryButtonClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900'
const thClass = 'px-3 py-2 font-semibold'
const tdClass = 'px-3 py-3 align-top'
const successPillClass = 'rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-100'
const warningPillClass = 'rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-100'
