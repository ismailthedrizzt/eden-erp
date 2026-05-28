'use client'

import Link from 'next/link'
import { Building2, CheckCircle2, Compass, GitBranch, UserPlus, Users } from 'lucide-react'
import type { OnboardingOverview } from '@/lib/services/onboarding'

type DashboardOnboardingEmptyStateProps = {
  overview: OnboardingOverview | null
}

export function DashboardOnboardingEmptyState({ overview }: DashboardOnboardingEmptyStateProps) {
  const summary = overview?.company_summary
  if (!summary) return null
  if (summary.active > 0) {
    return (
      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-300/20 dark:bg-emerald-400/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-emerald-950 dark:text-emerald-50">Sirketiniz hazir. Simdi temel bilgileri tamamlayabilirsiniz.</h2>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-100">Ortak, temsilci, sube, cari kart ve ekip adimlariyla calisma alaninizi derinlestirin.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeSuggestions.map(item => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 dark:bg-slate-950 dark:text-emerald-100 dark:hover:bg-white/10">
                  <Icon size={15} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    )
  }
  if (summary.total > 0 && summary.draft > 0) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-300/20 dark:bg-amber-400/10">
        <h2 className="text-lg font-semibold text-amber-950 dark:text-amber-50">Sirket acilisini tamamlayin</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900 dark:text-amber-100">
          Taslak sirket henuz aktif islem yapilabilir sirket degildir. Sirket Acilisi sihirbazini tamamlayarak devam edin.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/app/sirket/companies?action=opening" className="rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800">
            Sirket Acilisi Sihirbazini Ac
          </Link>
          <Link href="/app/onboarding" className="rounded-md border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 dark:border-amber-200/30 dark:text-amber-100 dark:hover:bg-amber-400/10">
            Kurulum Merkezine Git
          </Link>
        </div>
      </section>
    )
  }
  return (
    <section className="rounded-lg border border-sky-200 bg-sky-50 p-5 dark:border-sky-300/20 dark:bg-sky-400/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-slate-950 dark:text-sky-100">
            <Building2 size={14} />
            Ilk kurulum
          </div>
          <h2 className="mt-3 text-lg font-semibold text-sky-950 dark:text-sky-50">Baslamak icin ilk sirketinizi olusturun</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-900 dark:text-sky-100">
            Eden ERPde sirket, ortak, temsilci, sube ve muhasebe islemleri sirket karti uzerinden ilerler.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/sirket/companies?action=create" className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800">
            Ilk Sirketi Olustur
          </Link>
          <Link href="/app?tour=1" className="inline-flex items-center gap-2 rounded-md border border-sky-300 px-4 py-2 text-sm font-semibold text-sky-900 transition hover:bg-sky-100 dark:border-sky-200/30 dark:text-sky-100 dark:hover:bg-sky-400/10">
            <Compass size={15} />
            Sistem Nasil Calisir?
          </Link>
          <Link href="/app/onboarding" className="rounded-md border border-sky-300 px-4 py-2 text-sm font-semibold text-sky-900 transition hover:bg-sky-100 dark:border-sky-200/30 dark:text-sky-100 dark:hover:bg-sky-400/10">
            Kurulum Merkezine Git
          </Link>
        </div>
      </div>
    </section>
  )
}

const activeSuggestions = [
  { label: 'Ortak ekle', href: '/app/sirket/companies/partners', icon: Users },
  { label: 'Temsilci ekle', href: '/app/sirket/companies/representatives', icon: CheckCircle2 },
  { label: 'Sube ac', href: '/app/sirket/companies/branches', icon: GitBranch },
  { label: 'Kullanici davet et', href: '/app/sistem/kullanicilar', icon: UserPlus },
]
