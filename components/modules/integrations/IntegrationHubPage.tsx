'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  KeyRound,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  RotateCw,
  Send,
  ShieldCheck,
  Unplug,
} from 'lucide-react'
import {
  inboundEvents,
  integrationApps,
  integrationCredentials,
  integrationRegistry,
  webhookDeliveries,
  webhookSubscriptions,
  type InboundEvent,
  type IntegrationApp,
  type IntegrationCredential,
  type IntegrationEventType,
  type WebhookDelivery,
  type WebhookSubscription,
} from '@/lib/services/integrations'

type LoadState = 'idle' | 'loading' | 'saving'

const statusLabels: Record<string, string> = {
  draft: 'Taslak',
  active: 'Aktif',
  suspended: 'Askida',
  revoked: 'Iptal',
  paused: 'Duraklatildi',
  failed: 'Hatali',
  disabled: 'Devre disi',
  pending: 'Bekliyor',
  delivered: 'Teslim edildi',
  dead_letter: 'Dead-letter',
  rejected: 'Reddedildi',
  processed: 'Islendi',
}

export function IntegrationHubPage() {
  const [apps, setApps] = useState<IntegrationApp[]>([])
  const [eventTypes, setEventTypes] = useState<IntegrationEventType[]>([])
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([])
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [inbounds, setInbounds] = useState<InboundEvent[]>([])
  const [credentials, setCredentials] = useState<IntegrationCredential[]>([])
  const [selectedAppId, setSelectedAppId] = useState('')
  const [appName, setAppName] = useState('Operations Webhook App')
  const [targetUrl, setTargetUrl] = useState('https://example.com/eden-webhook')
  const [selectedEventType, setSelectedEventType] = useState('company.opened')
  const [lastSecret, setLastSecret] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<LoadState>('idle')

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const [appData, eventData, subscriptionData, deliveryData, inboundData] = await Promise.all([
        integrationApps.list({ pageSize: 50 }),
        integrationRegistry.eventTypes(),
        webhookSubscriptions.list({ pageSize: 50 }),
        webhookDeliveries.list({ pageSize: 20 }),
        inboundEvents.list({ pageSize: 20 }),
      ])
      setApps(appData.items)
      setEventTypes(eventData)
      setSubscriptions(subscriptionData.items)
      setDeliveries(deliveryData.items)
      setInbounds(inboundData.items)
      setSelectedAppId(current => current || appData.items[0]?.id || '')
      setSelectedEventType(current => current || eventData[0]?.event_type || 'company.opened')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Integration Hub verisi yuklenemedi.')
    } finally {
      setState('idle')
    }
  }, [])

  const loadCredentials = useCallback(async (appId: string) => {
    if (!appId) return
    setState('loading')
    setError(null)
    try {
      setCredentials(await integrationCredentials.list(appId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credential listesi yuklenemedi.')
    } finally {
      setState('idle')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selectedAppId) return
    void loadCredentials(selectedAppId)
  }, [loadCredentials, selectedAppId])

  const selectedApp = useMemo(() => apps.find(app => app.id === selectedAppId) || apps[0] || null, [apps, selectedAppId])
  const selectedAppSubscriptions = useMemo(
    () => subscriptions.filter(subscription => !selectedApp?.id || subscription.integration_app_id === selectedApp.id),
    [selectedApp?.id, subscriptions]
  )
  const failedDeliveries = deliveries.filter(delivery => ['failed', 'dead_letter'].includes(delivery.status))
  const activeApps = apps.filter(app => app.status === 'active').length

  async function createApp() {
    setState('saving')
    setMessage(null)
    setError(null)
    setLastSecret(null)
    try {
      const app = await integrationApps.create({
        app_name: appName,
        app_type: 'webhook',
        status: 'active',
        allowed_event_types: [selectedEventType],
        allowed_inbound_events: ['service_request_created_from_external', 'crm_lead_created_from_external'],
      })
      const credential = await integrationCredentials.create(app.id, { name: 'Primary webhook secret', credential_type: 'webhook_secret' })
      setLastSecret(credential.secret || null)
      setSelectedAppId(app.id)
      setMessage('Integration app ve signing secret olusturuldu. Secret yalnizca bir kez gosterilir.')
      await load()
      setCredentials([credential])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Integration app olusturulamadi.')
    } finally {
      setState('idle')
    }
  }

  async function createSubscription() {
    if (!selectedApp) return
    setState('saving')
    setMessage(null)
    setError(null)
    try {
      const credentialList = credentials.length ? credentials : await integrationCredentials.list(selectedApp.id)
      const signing = credentialList.find(item => item.status === 'active')
      await webhookSubscriptions.create({
        integration_app_id: selectedApp.id,
        subscription_name: `${selectedApp.app_name} ${selectedEventType}`,
        target_url: targetUrl,
        event_types: [selectedEventType],
        signing_secret_id: signing?.id,
      })
      setMessage('Webhook aboneligi olusturuldu.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Webhook aboneligi olusturulamadi.')
    } finally {
      setState('idle')
    }
  }

  async function testSubscription(subscription: WebhookSubscription) {
    setState('saving')
    setMessage(null)
    setError(null)
    try {
      await webhookSubscriptions.test(subscription.id)
      setMessage('Test webhook teslimati kuyruga alindi.')
      const deliveryData = await webhookDeliveries.list({ pageSize: 20 })
      setDeliveries(deliveryData.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test webhook olusturulamadi.')
    } finally {
      setState('idle')
    }
  }

  async function retryDelivery(delivery: WebhookDelivery) {
    setState('saving')
    setMessage(null)
    setError(null)
    try {
      await webhookDeliveries.retry(delivery.id)
      setMessage('Teslimat tekrar kuyruga alindi.')
      const deliveryData = await webhookDeliveries.list({ pageSize: 20 })
      setDeliveries(deliveryData.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Teslimat retry edilemedi.')
    } finally {
      setState('idle')
    }
  }

  async function rotateCredential(credential: IntegrationCredential) {
    setState('saving')
    setMessage(null)
    setError(null)
    try {
      const rotated = await integrationCredentials.rotate(credential.id)
      setLastSecret(rotated.secret || null)
      setMessage('Credential rotate edildi. Yeni secret yalnizca bir kez gosterilir.')
      await loadCredentials(credential.integration_app_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credential rotate edilemedi.')
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
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Integration Hub</p>
            <h1 className="mt-1 text-2xl font-semibold">Entegrasyonlar</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Webhook abonelikleri, inbound olaylar, credential rotasyonu ve teslimat retry/dead-letter akisini tek yerden yonetin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryButtonClass} onClick={load} disabled={busy}>
              {state === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Yenile
            </button>
            <button type="button" className={primaryButtonClass} onClick={createApp} disabled={busy}>
              {state === 'saving' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              App + Secret
            </button>
          </div>
        </header>

        {error ? <Alert tone="error" text={error} /> : null}
        {message ? <Alert tone="success" text={message} /> : null}
        {lastSecret ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <div className="font-semibold">Secret bir kez gosterilir</div>
            <code className="mt-2 block overflow-x-auto rounded bg-white/70 px-2 py-2 text-xs dark:bg-slate-900">{lastSecret}</code>
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-4">
          <Metric label="Aktif app" value={activeApps} icon={<Database size={18} />} />
          <Metric label="Abonelik" value={subscriptions.length} icon={<Send size={18} />} />
          <Metric label="Failed delivery" value={failedDeliveries.length} icon={<AlertTriangle size={18} />} tone={failedDeliveries.length ? 'red' : 'emerald'} />
          <Metric label="Inbound olay" value={inbounds.length} icon={<Unplug size={18} />} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Integration app" icon={<Database size={18} />}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="App adi">
                <input className={inputClass} value={appName} onChange={event => setAppName(event.target.value)} />
              </Field>
              <Field label="Event tipi">
                <select className={inputClass} value={selectedEventType} onChange={event => setSelectedEventType(event.target.value)}>
                  {eventTypes.map(event => <option key={event.event_type} value={event.event_type}>{event.event_type}</option>)}
                </select>
              </Field>
              <Field label="App sec">
                <select
                  className={inputClass}
                  value={selectedApp?.id || ''}
                  onChange={event => {
                    setSelectedAppId(event.target.value)
                    void loadCredentials(event.target.value)
                  }}
                >
                  <option value="">App yok</option>
                  {apps.map(app => <option key={app.id} value={app.id}>{app.app_name}</option>)}
                </select>
              </Field>
              <Field label="Target URL">
                <input className={inputClass} value={targetUrl} onChange={event => setTargetUrl(event.target.value)} />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={!selectedApp || busy}
                onClick={() => {
                  if (selectedApp) void loadCredentials(selectedApp.id)
                }}
              >
                <KeyRound size={16} />
                Credentiallari Yukle
              </button>
              <button type="button" className={primaryButtonClass} disabled={!selectedApp || busy} onClick={createSubscription}>
                <Plus size={16} />
                Webhook Aboneligi
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {apps.map(app => (
                <button key={app.id} type="button" onClick={() => { setSelectedAppId(app.id); void loadCredentials(app.id) }} className={`w-full rounded-md border px-3 py-2 text-left text-sm ${selectedApp?.id === app.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{app.app_name}</span>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{app.app_key} - {app.app_type}</div>
                </button>
              ))}
              {!apps.length ? <Empty text="Integration app yok." /> : null}
            </div>
          </Panel>

          <Panel title="Webhook abonelikleri" icon={<Send size={18} />}>
            <div className="space-y-2">
              {selectedAppSubscriptions.map(subscription => (
                <div key={subscription.id} className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{subscription.subscription_name}</div>
                      <div className="truncate text-xs text-slate-500">{subscription.target_url}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={subscription.status} />
                      <button type="button" className={iconButtonClass} onClick={() => void testSubscription(subscription)} disabled={busy} title="Test webhook">
                        <Play size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {subscription.event_types.map(event => <span key={event} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{event}</span>)}
                  </div>
                </div>
              ))}
              {!selectedAppSubscriptions.length ? <Empty text="Secili app icin webhook aboneligi yok." /> : null}
            </div>
          </Panel>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <Panel title="Credentials" icon={<KeyRound size={18} />}>
            <div className="space-y-2">
              {credentials.map(credential => (
                <div key={credential.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{credential.name}</div>
                    <div className="text-xs text-slate-500">{credential.credential_type} - {credential.secret_preview}</div>
                  </div>
                  <button type="button" className={iconButtonClass} onClick={() => void rotateCredential(credential)} disabled={busy} title="Rotate">
                    <RotateCw size={15} />
                  </button>
                </div>
              ))}
              {!credentials.length ? <Empty text="Credential listesi yuklemek icin app secin." /> : null}
            </div>
          </Panel>

          <Panel title="Teslimatlar" icon={<ShieldCheck size={18} />}>
            <div className="space-y-2">
              {deliveries.slice(0, 8).map(delivery => (
                <div key={delivery.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{delivery.event_type}</span>
                    <StatusBadge status={delivery.status} />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Attempt {delivery.attempt_count} - {delivery.response_status_code || 'no response'}</div>
                  {delivery.error_message ? <div className="mt-1 line-clamp-2 text-xs text-red-600">{delivery.error_message}</div> : null}
                  {['failed', 'dead_letter'].includes(delivery.status) ? (
                    <button type="button" className={`${secondaryButtonClass} mt-2 h-8 text-xs`} onClick={() => void retryDelivery(delivery)} disabled={busy}>
                      <RefreshCw size={14} />
                      Retry
                    </button>
                  ) : null}
                </div>
              ))}
              {!deliveries.length ? <Empty text="Teslimat kaydi yok." /> : null}
            </div>
          </Panel>

          <Panel title="Inbound olaylar" icon={<Unplug size={18} />}>
            <div className="space-y-2">
              {inbounds.slice(0, 8).map(event => (
                <div key={event.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{event.inbound_event_type}</span>
                    <StatusBadge status={event.status} />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{event.app_name || 'external'} - signature {event.signature_valid ? 'valid' : 'invalid'}</div>
                  {event.error_message ? <div className="mt-1 line-clamp-2 text-xs text-amber-700 dark:text-amber-300">{event.error_message}</div> : null}
                </div>
              ))}
              {!inbounds.length ? <Empty text="Inbound olay yok." /> : null}
            </div>
          </Panel>
        </section>
      </div>
    </main>
  )
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 bg-slate-100/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function Metric({ label, value, icon, tone }: { label: string; value: number; icon: ReactNode; tone?: 'emerald' | 'red' }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${tone === 'emerald' ? 'text-emerald-700 dark:text-emerald-300' : tone === 'red' ? 'text-red-700 dark:text-red-300' : ''}`}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const tone = ['active', 'delivered', 'processed'].includes(status)
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
    : ['failed', 'dead_letter', 'rejected', 'revoked'].includes(status)
      ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200'
      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${tone}`}>{statusLabels[status] || status}</span>
}

function Alert({ tone, text }: { tone: 'error' | 'success'; text: string }) {
  const classes = tone === 'error'
    ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100'
    : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100'
  return <div className={`rounded-md border px-3 py-2 text-sm ${classes}`}>{text}</div>
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-slate-300 bg-white/70 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">{text}</div>
}

const inputClass = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950'
const primaryButtonClass = 'inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white disabled:opacity-50'
const secondaryButtonClass = 'inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
const iconButtonClass = 'inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
