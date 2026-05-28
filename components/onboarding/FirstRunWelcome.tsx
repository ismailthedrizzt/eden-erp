'use client'

import { BookOpen, Building2, CheckCircle2, FileArchive, GitBranch, HelpCircle, ListChecks, Users } from 'lucide-react'
import type { OnboardingOverview } from '@/lib/services/onboarding'

type FirstRunWelcomeProps = {
  open: boolean
  overview?: OnboardingOverview | null
  busy?: boolean
  onStartSetup: () => void
  onStartTour: () => void
  onPostpone: () => void
  onHelp: () => void
}

const summaryCards = [
  { label: 'Sirketler', icon: Building2, text: 'Ilk kayit taslak olarak baslar.' },
  { label: 'Ortaklar', icon: Users, text: 'Haklar resmi islemlerle dogar.' },
  { label: 'Temsilciler', icon: CheckCircle2, text: 'Yetkiler sihirbazla verilir.' },
  { label: 'Subeler', icon: GitBranch, text: 'Acilis kontrollu akisla yapilir.' },
  { label: 'Gorevler', icon: ListChecks, text: 'Bekleyen isler Action Centerdadir.' },
  { label: 'Belgeler', icon: FileArchive, text: 'Dosyalar merkezi olarak izlenir.' },
]

export function FirstRunWelcome({
  open,
  overview,
  busy,
  onStartSetup,
  onStartTour,
  onPostpone,
  onHelp,
}: FirstRunWelcomeProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-run-title"
        className="max-h-[calc(100vh-3rem)] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950"
      >
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100">
              <BookOpen size={14} />
              Ilk calisma alani deneyimi
            </div>
            <h1 id="first-run-title" className="mt-4 text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">
              Eden ERPye hos geldiniz.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Kayitlarinizi once taslak olarak olusturur, resmi sonuc doguran islemleri ise adim adim sihirbazlarla tamamlarsiniz. Boylece sirket, ortaklik, temsilci ve sube islemleri kontrollu ve izlenebilir olur.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {summaryCards.map(card => {
                const Icon = card.icon
                return (
                  <div key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <Icon size={16} className="text-emerald-600 dark:text-emerald-300" />
                      {card.label}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{card.text}</p>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={onStartSetup} disabled={busy} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                Kuruluma Basla
              </button>
              <button type="button" onClick={onStartTour} disabled={busy} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/10">
                Sistemi Tani
              </button>
              <button type="button" onClick={onPostpone} disabled={busy} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10">
                Daha Sonra
              </button>
              <button type="button" onClick={onHelp} disabled={busy} className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-200 dark:hover:bg-emerald-400/10">
                <HelpCircle size={16} />
                Yardim Al
              </button>
            </div>
          </div>

          <aside className="border-t border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/[0.03] lg:border-l lg:border-t-0">
            <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Siradaki adim</div>
            <h2 className="mt-2 text-base font-semibold text-slate-950 dark:text-white">
              {overview?.next_action?.title || 'Ilk sirketinizi olusturun'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {overview?.next_action?.description || 'Eden ERPde islemler sirket karti uzerinden ilerler. Baslamak icin ilk sirket karti taslaginizi olusturun.'}
            </p>
            <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
              <div className="text-xs text-slate-500 dark:text-slate-400">Kurulum ilerlemesi</div>
              <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-white/10">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progressPercent(overview)}%` }} />
              </div>
              <div className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                %{progressPercent(overview)} tamamlandi
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}

function progressPercent(overview?: OnboardingOverview | null) {
  const steps = overview?.recommended_steps || []
  if (!steps.length) return 10
  return Math.round((steps.filter(step => step.status === 'completed').length / steps.length) * 100)
}
