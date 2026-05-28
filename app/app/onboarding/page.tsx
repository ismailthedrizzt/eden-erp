'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Compass, HelpCircle, Loader2, PackageCheck, RotateCcw, Settings, ShieldCheck } from 'lucide-react'
import { WorkspaceSetupChecklist } from '@/components/onboarding/WorkspaceSetupChecklist'
import { onboardingService, type OnboardingOverview } from '@/lib/services/onboarding'
import { cn } from '@/lib/utils'

const profileFields = [
  { key: 'workspace_name', label: 'Calisma alani adi', placeholder: 'Eden ERP' },
  { key: 'industry', label: 'Sektor', placeholder: 'Hizmet, uretim, finans...' },
  { key: 'country', label: 'Ulke', placeholder: 'TR' },
  { key: 'default_currency', label: 'Varsayilan para birimi', placeholder: 'TRY' },
  { key: 'language', label: 'Varsayilan dil', placeholder: 'tr' },
  { key: 'timezone', label: 'Zaman dilimi', placeholder: 'Europe/Istanbul' },
]

export default function CustomerOnboardingPage() {
  const [overview, setOverview] = useState<OnboardingOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyStep, setBusyStep] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Record<string, string>>({})
  const [selectedPackages, setSelectedPackages] = useState<string[]>(['starter'])

  useEffect(() => {
    load()
  }, [])

  const progress = useMemo(() => {
    const steps = overview?.recommended_steps || []
    if (!steps.length) return 0
    return Math.round((steps.filter(step => step.status === 'completed').length / steps.length) * 100)
  }, [overview])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await onboardingService.getWorkspace()
      setOverview(data)
      setProfile(normalizeProfile(data.workspace_state.workspace_profile))
      setSelectedPackages(data.workspace_state.selected_module_packages?.length ? data.workspace_state.selected_module_packages : ['starter'])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ilk kurulum bilgisi yuklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  async function completeStep(stepKey: string) {
    setBusyStep(stepKey)
    setMessage(null)
    setError(null)
    try {
      await onboardingService.completeWorkspaceStep(stepKey)
      if (stepKey === 'action_guide_intro') await onboardingService.patchUser({ actionGuideIntroSeen: true })
      if (stepKey === 'action_center_intro') await onboardingService.patchUser({ actionCenterIntroSeen: true })
      setMessage(stepKey === 'finish'
        ? 'Calisma alaninizin temel kurulumu tamamlandi. Artik sirket kayitlarinizi ve operasyonlarinizi yonetmeye baslayabilirsiniz.'
        : 'Adim tamamlandi.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Adim guncellenemedi.')
    } finally {
      setBusyStep(null)
    }
  }

  async function saveProfile() {
    setSavingProfile(true)
    setMessage(null)
    setError(null)
    try {
      await onboardingService.patchWorkspace({
        workspace_profile: profile,
        selected_module_packages: selectedPackages,
      })
      await onboardingService.completeWorkspaceStep('workspace_profile').catch(() => undefined)
      await onboardingService.completeWorkspaceStep('module_selection').catch(() => undefined)
      setMessage('Calisma alani profili ve baslangic paketleri kaydedildi.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profil kaydedilemedi.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function resetHelp() {
    setMessage(null)
    setError(null)
    try {
      await onboardingService.resetHelp()
      setMessage('Yardim ve tur durumu sifirlandi. Genel tur tekrar gosterilebilir.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yardim durumu sifirlanamadi.')
    }
  }

  async function skipWorkspaceSetup() {
    setMessage(null)
    setError(null)
    try {
      await onboardingService.skipWorkspace()
      setMessage('Kurulum daha sonra devam etmek uzere atlandi.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kurulum atlanamadi.')
    }
  }

  function togglePackage(packageKey: string) {
    setSelectedPackages(previous => {
      if (packageKey === 'starter') return previous.includes('starter') ? previous : ['starter', ...previous]
      return previous.includes(packageKey)
        ? previous.filter(key => key !== packageKey)
        : [...previous, packageKey]
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-5 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <Loader2 size={20} className="animate-spin text-emerald-600" />
          Ilk kurulum bilgileri yukleniyor.
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100">
                <Compass size={14} />
                Baslangic merkezi
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal">Calisma alaninizi hazirlayin</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Ilk sirket, modul hazirligi, tur, yardim ve onerilen baslangic adimlari tek yerde.
              </p>
            </div>
            <div className="min-w-[240px]">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Kurulum ilerlemesi</span>
                <span>%{progress}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-white/10">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </header>

        {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100">{message}</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-300/20 dark:bg-red-500/10 dark:text-red-100">{error}</div>}

        {overview && (
          <>
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2 text-base font-semibold">
                  <Settings size={18} />
                  Calisma alani profili
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {profileFields.map(field => (
                    <label key={field.key} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {field.label}
                      <input
                        value={profile[field.key] || ''}
                        onChange={event => setProfile(previous => ({ ...previous, [field.key]: event.target.value }))}
                        placeholder={field.placeholder}
                        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:ring-emerald-300/20"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={saveProfile} disabled={savingProfile} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                    {savingProfile ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    Profili Kaydet
                  </button>
                  <button type="button" onClick={resetHelp} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/10">
                    <RotateCcw size={15} />
                    Yardimi Sifirla
                  </button>
                </div>
              </div>

              <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2 text-base font-semibold">
                  <PackageCheck size={18} />
                  Baslangic paketleri
                </div>
                <div className="mt-4 space-y-3">
                  {overview.module_packages.map(pkg => {
                    const selected = selectedPackages.includes(pkg.key)
                    return (
                      <button
                        key={pkg.key}
                        type="button"
                        onClick={() => togglePackage(pkg.key)}
                        className={cn(
                          'w-full rounded-lg border p-3 text-left transition',
                          selected
                            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-300/20 dark:bg-emerald-400/10'
                            : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/10'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold">{pkg.label}</span>
                          {selected && <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-300" />}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{pkg.description}</p>
                        <p className="mt-2 text-[11px] font-medium text-slate-400">{pkg.modules.join(', ')}</p>
                      </button>
                    )
                  })}
                </div>
              </aside>
            </section>

            <WorkspaceSetupChecklist
              overview={overview}
              busyStep={busyStep}
              onCompleteStep={completeStep}
              onOpenActionCenter={() => window.dispatchEvent(new CustomEvent('eden:open-action-center'))}
            />

            <section className="grid gap-4 md:grid-cols-3">
              <InfoTile icon={ShieldCheck} title="Taslak mantigi" text="+ Ekle kaydi taslak yapar; resmi sonuc ayri sihirbazla olusur." />
              <InfoTile icon={HelpCircle} title="Action Guide" text="Ne yapmak istediginizi yazin, Eden ERP dogru islem yolunu onerir." />
              <InfoTile icon={CheckCircle2} title="Action Center" text="Gorev, onay ve kurulum eksikleri aksiyon merkezinde toplanir." />
            </section>
          </>
        )}

        <footer className="flex flex-wrap gap-2">
          <Link href="/app/sirket/companies?action=create" className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
            Ilk Sirketi Olustur
            <ArrowRight size={15} />
          </Link>
          <Link href="/app/sistem/kurulum" className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/10">
            Kurulum Merkezine Git
          </Link>
          <button type="button" onClick={skipWorkspaceSetup} className="rounded-md px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
            Kurulumu Atla
          </button>
        </footer>
      </div>
    </main>
  )
}

function InfoTile({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <Icon size={18} className="text-emerald-600 dark:text-emerald-300" />
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  )
}

function normalizeProfile(value: Record<string, unknown>) {
  return Object.fromEntries(profileFields.map(field => [field.key, typeof value[field.key] === 'string' ? String(value[field.key]) : '']))
}
