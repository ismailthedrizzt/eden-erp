'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { notificationPreferenceService, type NotificationPreferences } from '@/lib/services/notifications'

const toggles: Array<{ key: keyof NotificationPreferences; label: string }> = [
  { key: 'in_app_enabled', label: 'Uygulama ici' },
  { key: 'email_enabled', label: 'E-posta' },
  { key: 'task_notifications', label: 'Gorevler' },
  { key: 'approval_notifications', label: 'Onaylar' },
  { key: 'system_warnings', label: 'Sistem uyarilari' },
  { key: 'document_expiry', label: 'Belge sureleri' },
  { key: 'service_reminders', label: 'Servis hatirlatmalari' },
  { key: 'hr_reminders', label: 'IK hatirlatmalari' },
  { key: 'security_notifications', label: 'Guvenlik' },
]

export function NotificationPreferencesForm() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    notificationPreferenceService.get()
      .then(data => { if (!cancelled) setPreferences(data) })
      .catch(error => { if (!cancelled) setMessage(error instanceof Error ? error.message : 'Tercihler alinamadi.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function save() {
    if (!preferences) return
    setSaving(true)
    setMessage(null)
    try {
      setPreferences(await notificationPreferenceService.update(preferences))
      setMessage('Tercihler kaydedildi.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Tercihler kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-border bg-card">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!preferences) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message || 'Tercihler hazir degil.'}</div>
  }

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Bildirim Tercihleri</h2>
        <button type="button" onClick={save} disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-eden-blue px-3 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Kaydet
        </button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {toggles.map(item => (
          <label key={String(item.key)} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
            <span>{item.label}</span>
            <input
              type="checkbox"
              checked={Boolean(preferences[item.key])}
              onChange={event => setPreferences(current => current ? { ...current, [item.key]: event.target.checked } : current)}
              className="h-4 w-4"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Ozet</span>
          <select
            value={preferences.digest_frequency}
            onChange={event => setPreferences({ ...preferences, digest_frequency: event.target.value as NotificationPreferences['digest_frequency'] })}
            className="h-10 w-full rounded-md border border-border bg-background px-3"
          >
            <option value="never">Yok</option>
            <option value="daily">Gunluk</option>
            <option value="weekly">Haftalik</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Dil</span>
          <input value={preferences.language} onChange={event => setPreferences({ ...preferences, language: event.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-3" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Saat dilimi</span>
          <input value={preferences.timezone} onChange={event => setPreferences({ ...preferences, timezone: event.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-3" />
        </label>
      </div>
      {message && <div className="mt-3 text-sm text-muted-foreground">{message}</div>}
    </section>
  )
}

