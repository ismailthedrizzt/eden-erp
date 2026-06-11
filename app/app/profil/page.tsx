'use client'



import { appProfilFormContract } from '@/contracts/pages/generated/app-profil.form.contract'

void appProfilFormContract

import { appProfilPageContract } from '@/contracts/pages/generated/app-profil.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appProfilContractReady = requirePageContract(appProfilPageContract)
void appProfilContractReady

import { FormEvent, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Save, Trash2, Upload, UserRound } from 'lucide-react'
import { UserAvatar } from '@/components/ui/UserAvatar'

type UserProfile = {
  user_id?: string | null
  tenant_id?: string | null
  master_person_id?: string | null
  displayName?: string | null
  initials?: string | null
  email?: string | null
  phone?: string | null
  roleLabel?: string | null
  avatarUrl?: string | null
  avatar?: {
    type?: string
    initials?: string
  } | null
}

type FormState = {
  displayName: string
  email: string
  phone: string
}

const emptyForm: FormState = {
  displayName: '',
  email: '',
  phone: '',
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/users/me/profile', { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || payload.message || 'Profil yuklenemedi.')
        return (payload.data || payload) as UserProfile
      })
      .then(nextProfile => {
        if (cancelled) return
        setProfile(nextProfile)
        setForm({
          displayName: nextProfile.displayName || '',
          email: nextProfile.email || '',
          phone: nextProfile.phone || '',
        })
      })
      .catch(fetchError => {
        if (!cancelled) setError(fetchError?.message || 'Profil yuklenemedi.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/users/me/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          displayName: form.displayName,
          email: form.email,
          phone: form.phone,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || payload.message || 'Profil kaydedilemedi.')
      const nextProfile = (payload.data || payload) as UserProfile
      setProfile(nextProfile)
      setForm({
        displayName: nextProfile.displayName || '',
        email: nextProfile.email || '',
        phone: nextProfile.phone || '',
      })
      setSuccess('Profil guncellendi.')
      window.dispatchEvent(new CustomEvent('eden:user-profile-updated', { detail: nextProfile }))
    } catch (saveError: any) {
      setError(saveError?.message || 'Profil kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  async function uploadAvatar(file: File | null | undefined) {
    if (!file) return
    setAvatarSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const body = new FormData()
      body.set('file', file)
      const response = await fetch('/api/users/me/avatar', {
        method: 'POST',
        body,
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || payload.message || 'Profil fotografi kaydedilemedi.')
      const nextProfile = (payload.data || payload) as UserProfile
      setProfile(nextProfile)
      setSuccess('Profil fotografi guncellendi.')
      window.dispatchEvent(new CustomEvent('eden:user-profile-updated', { detail: nextProfile }))
    } catch (uploadError: any) {
      setError(uploadError?.message || 'Profil fotografi kaydedilemedi.')
    } finally {
      setAvatarSaving(false)
    }
  }

  async function deleteAvatar() {
    setAvatarSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/users/me/avatar', { method: 'DELETE' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || payload.message || 'Profil fotografi kaldirilamadi.')
      const nextProfile = (payload.data || payload) as UserProfile
      setProfile(nextProfile)
      setSuccess('Profil fotografi kaldirildi.')
      window.dispatchEvent(new CustomEvent('eden:user-profile-updated', { detail: nextProfile }))
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Profil fotografi kaldirilamadi.')
    } finally {
      setAvatarSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 dark:bg-gray-950">
        <div className="mx-auto flex max-w-4xl items-center gap-3 rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          <Loader2 size={18} className="animate-spin text-eden-blue" />
          Profil yukleniyor
        </div>
      </main>
    )
  }

  const displayName = profile?.displayName || profile?.email || profile?.phone || 'Kullanici'

  return (
    <main className="min-h-screen bg-gray-50 p-4 dark:bg-gray-950 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={displayName}
              photoUrl={profile?.avatarUrl}
              initials={profile?.initials || profile?.avatar?.initials || undefined}
              size="xl"
              showTooltip={false}
            />
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Profilim</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{profile?.roleLabel || 'Tenant kullanicisi'}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <UserRound size={15} />
            <span>{profile?.master_person_id ? 'Master person bagli' : 'Master person baglantisi yok'}</span>
          </div>
        </header>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            <AlertCircle size={16} />
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            <CheckCircle2 size={16} />
            {success}
          </div>
        ) : null}

        <form onSubmit={saveProfile} className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tenant ici kisi profili</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-200">Ad soyad</span>
                <input
                  value={form.displayName}
                  onChange={event => setForm(previous => ({ ...previous, displayName: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-eden-blue focus:outline-none focus:ring-2 focus:ring-eden-blue/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-200">Telefon</span>
                <input
                  value={form.phone}
                  onChange={event => setForm(previous => ({ ...previous, phone: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-eden-blue focus:outline-none focus:ring-2 focus:ring-eden-blue/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-gray-700 dark:text-gray-200">E-posta</span>
                <input
                  value={form.email}
                  onChange={event => setForm(previous => ({ ...previous, email: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-eden-blue focus:outline-none focus:ring-2 focus:ring-eden-blue/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-eden-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Kaydet
              </button>
            </div>
          </section>

          <aside className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Login hesabi</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-gray-400 dark:text-gray-500">User ID</dt>
                <dd className="mt-1 break-all text-gray-700 dark:text-gray-200">{profile?.user_id || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-gray-400 dark:text-gray-500">Tenant ID</dt>
                <dd className="mt-1 break-all text-gray-700 dark:text-gray-200">{profile?.tenant_id || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-gray-400 dark:text-gray-500">Master Person</dt>
                <dd className="mt-1 break-all text-gray-700 dark:text-gray-200">{profile?.master_person_id || '-'}</dd>
              </div>
            </dl>
            <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Avatar</h3>
              <div className="mt-3 flex flex-col gap-2">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                  {avatarSaving ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  Yukle
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={avatarSaving}
                    onChange={event => {
                      uploadAvatar(event.target.files?.[0])
                      event.currentTarget.value = ''
                    }}
                    className="sr-only"
                  />
                </label>
                {profile?.avatarUrl ? (
                  <button
                    type="button"
                    disabled={avatarSaving}
                    onClick={deleteAvatar}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/30"
                  >
                    <Trash2 size={15} />
                    Kaldir
                  </button>
                ) : null}
              </div>
            </div>
          </aside>
        </form>
      </div>
    </main>
  )
}
