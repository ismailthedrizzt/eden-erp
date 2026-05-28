'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BellRing, CheckCheck, Loader2, Plus, RefreshCw } from 'lucide-react'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { NotificationPreferencesForm } from '@/components/notifications/NotificationPreferencesForm'
import { ReminderList } from '@/components/notifications/ReminderList'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import {
  notificationService,
  reminderService,
  type NotificationCounts,
  type NotificationRecord,
} from '@/lib/services/notifications'

type ToastState = { type: ToastType; title?: string; message: string }

type TabKey = 'unread' | 'all' | 'tasks' | 'documents' | 'system'

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'unread', label: 'Okunmamis' },
  { key: 'all', label: 'Tum' },
  { key: 'tasks', label: 'Gorev / Onay' },
  { key: 'documents', label: 'Belgeler' },
  { key: 'system', label: 'Sistem' },
]

export default function NotificationSettingsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [counts, setCounts] = useState<NotificationCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [tab, setTab] = useState<TabKey>('unread')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [reminderDraft, setReminderDraft] = useState({
    title: '',
    message: '',
    remind_at: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [listResult, countResult] = await Promise.all([
        notificationService.list({ pageSize: 80 }),
        notificationService.counts(),
      ])
      setNotifications(listResult.data)
      setCounts(countResult)
    } catch (error) {
      setToast({ type: 'error', title: 'Bildirimler alinamadi', message: errorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visibleNotifications = useMemo(
    () => notifications.filter(notification => tabMatches(tab, notification)),
    [notifications, tab]
  )

  async function mutate(action: () => Promise<unknown>, successMessage?: string) {
    setWorking(true)
    try {
      await action()
      if (successMessage) setToast({ type: 'success', message: successMessage })
      await load()
    } catch (error) {
      setToast({ type: 'error', title: 'Islem tamamlanamadi', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  async function createReminder() {
    if (!reminderDraft.title.trim() || !reminderDraft.remind_at) {
      setToast({ type: 'warning', title: 'Eksik bilgi', message: 'Baslik ve hatirlatma zamani gereklidir.' })
      return
    }
    await mutate(
      () => reminderService.create({
        module_key: 'notifications',
        reminder_type: 'user_created',
        title: reminderDraft.title.trim(),
        message: reminderDraft.message.trim() || reminderDraft.title.trim(),
        remind_at: new Date(reminderDraft.remind_at).toISOString(),
        channels: ['in_app'],
      }),
      'Hatirlatma olusturuldu.'
    )
    setReminderDraft({ title: '', message: '', remind_at: '' })
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
              <BellRing className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Bildirimler</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Gorev, onay, belge, servis, sistem uyarilari ve hatirlatmalar.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void mutate(() => notificationService.readAll(), 'Bildirimler okundu.')} disabled={working} className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50">
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Tumunu Okundu Yap
            </button>
            <button type="button" onClick={load} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              Yenile
            </button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <Metric label="Okunmamis" value={counts?.unread || 0} />
          <Metric label="Aksiyon" value={counts?.action_required || 0} tone="amber" />
          <Metric label="Yuksek" value={counts?.high_priority || 0} tone="sky" />
          <Metric label="Kritik" value={counts?.critical || 0} tone="red" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Bildirim Akisi</h2>
              <div className="flex gap-1 overflow-x-auto">
                {tabs.map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={cn(
                      'h-8 rounded-md px-2 text-xs font-medium',
                      tab === item.key ? 'bg-eden-blue text-white' : 'border border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {loading && <LoadingBlock />}
              {!loading && visibleNotifications.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Bildirim yok.</div>
              )}
              {!loading && visibleNotifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={id => void mutate(() => notificationService.markRead(id))}
                  onDismiss={id => void mutate(() => notificationService.dismiss(id))}
                  onArchive={id => void mutate(() => notificationService.archive(id))}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-md border border-border bg-card p-4">
              <h2 className="text-base font-semibold">Yeni Hatirlatma</h2>
              <div className="mt-4 grid gap-3">
                <TextInput label="Baslik" value={reminderDraft.title} onChange={value => setReminderDraft(current => ({ ...current, title: value }))} />
                <TextInput label="Mesaj" value={reminderDraft.message} onChange={value => setReminderDraft(current => ({ ...current, message: value }))} />
                <TextInput label="Zaman" type="datetime-local" value={reminderDraft.remind_at} onChange={value => setReminderDraft(current => ({ ...current, remind_at: value }))} />
                <button type="button" onClick={createReminder} disabled={working} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
                  {working ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                  Olustur
                </button>
              </div>
            </section>
            <NotificationPreferencesForm />
          </div>
        </section>

        <ReminderList />
      </div>
    </main>
  )
}

function Metric({ label, value, tone = 'blue' }: { label: string; value: number; tone?: 'blue' | 'amber' | 'sky' | 'red' }) {
  const tones = {
    blue: 'bg-eden-blue/10 text-eden-blue',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    red: 'bg-red-500/10 text-red-700 dark:text-red-300',
  }
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={cn('mt-2 text-3xl font-semibold', tones[tone])}>{value}</div>
    </div>
  )
}

function TextInput({ label, value, onChange, type = 'text' }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
    </label>
  )
}

function LoadingBlock() {
  return (
    <div className="flex h-32 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
    </div>
  )
}

function tabMatches(tab: TabKey, item: NotificationRecord) {
  if (tab === 'all') return item.status !== 'archived'
  if (tab === 'unread') return item.status === 'unread'
  if (tab === 'tasks') return item.notification_type.startsWith('task_') || item.notification_type.startsWith('approval_')
  if (tab === 'documents') return item.notification_type.startsWith('document_')
  return ['system', 'security', 'module'].some(prefix => item.notification_type.startsWith(prefix))
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Beklenmeyen hata olustu.'
}
