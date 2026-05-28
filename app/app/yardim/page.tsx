'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, BookOpen, HelpCircle, RotateCcw, Sparkles } from 'lucide-react'
import { syncUiPreferencesPatch } from '@/lib/user-state/client'
import { cn } from '@/lib/utils'

const HELP_TOPICS = [
  {
    key: 'company_opening',
    title: 'Sirket nasil acilir?',
    summary: '+ Ekle ile sirket karti taslagi olusturun, resmi acilis icin Sirket Acilisi sihirbazini tamamlayin.',
    actionQuery: 'sirket acilisi',
  },
  {
    key: 'create_partner_draft',
    title: 'Ortak nasil eklenir?',
    summary: 'Ortak karti taslagi kisi/kurum bilgisini tutar. Pay ve haklar Ilk Ortaklik Girisi veya ortaklik islemleriyle olusur.',
    actionQuery: 'yeni ortak ekle',
  },
  {
    key: 'representative_start',
    title: 'Temsilciye yetki nasil verilir?',
    summary: 'Temsilci karti yetki dogurmaz. Banka, GIB, SGK, limit ve kapsam Temsilcilik Baslatma veya yetki islemleriyle verilir.',
    actionQuery: 'temsilciye banka yetkisi verecegim',
  },
  {
    key: 'branch_opening',
    title: 'Sube nasil acilir?',
    summary: 'Sube acilisi aktif sirket kartindan baslatilir. Taslak sirketlerde once Sirket Acilisi tamamlanir.',
    actionQuery: 'sube acmak istiyorum',
  },
  {
    key: 'capital_increase',
    title: 'Sermaye artirimi nasil yapilir?',
    summary: 'Sermaye Artirimi icin aktif sirket, Ortaklarimiz modulu ve guncel ortaklik dagilimi gerekir.',
    actionQuery: 'sermaye artirimi nasil yapilir',
  },
  {
    key: 'audit_show_record_history',
    title: 'Denetim izi nedir?',
    summary: 'Yetkili kullanici bir kaydi kimin, ne zaman, hangi islemle degistirdigini Audit ekranindan izler.',
    actionQuery: 'bu kaydi kim degistirdi',
  },
  {
    key: 'open_setup_center',
    title: 'Kurulum eksikleri nasil tamamlanir?',
    summary: 'Kurulum Merkezi modul, lisans, bagimlilik ve hazirlik eksiklerini is diliyle gosterir.',
    actionQuery: 'kurulum eksiklerini goster',
  },
] as const

export default function HelpCenterPage() {
  const searchParams = useSearchParams()
  const topic = searchParams.get('topic')
  const [saving, setSaving] = useState(false)
  const highlightedTopic = useMemo(
    () => HELP_TOPICS.find(item => item.key === topic) || null,
    [topic],
  )

  const resetHelp = async () => {
    setSaving(true)
    try {
      await syncUiPreferencesPatch({
        hasSeenGlobalTour: false,
        completedTourSteps: [],
        dismissedPageTours: [],
        dismissedOperationHints: [],
        dismissedFieldHelpers: [],
        lockedFieldHintsDismissed: [],
        actionGuideDismissed: false,
        lastTourVersion: null,
      })
      window.localStorage.setItem('eden.forceSystemTour', 'true')
      window.location.href = '/app?tour=1'
    } finally {
      setSaving(false)
    }
  }

  const startGlobalTour = () => {
    window.localStorage.setItem('eden.forceSystemTour', 'true')
    window.location.href = '/app?tour=1'
  }

  const openGuide = (query: string) => {
    window.dispatchEvent(new CustomEvent('eden:open-action-guide', { detail: { query } }))
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
              <HelpCircle size={14} />
              Yardim Merkezi
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-gray-950 dark:text-white">Dogru isleme hizli ulasin</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
              Isinizi yazin, ilgili sayfa veya sihirbaz yolunu acin; engel varsa nedenini ve dogru sonraki adimi gorun.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openGuide('Ne yapmak istiyorsunuz?')}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100"
            >
              <Sparkles size={15} />
              Rehberi Ac
            </button>
            <button
              type="button"
              onClick={startGlobalTour}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              <BookOpen size={15} />
              Yardimi Tekrar Goster
            </button>
            <button
              type="button"
              onClick={resetHelp}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              <RotateCcw size={15} />
              Ipuclarini Sifirla
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {HELP_TOPICS.map(item => (
          <article
            key={item.key}
            className={cn(
              'flex min-h-44 flex-col rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-950',
              highlightedTopic?.key === item.key
                ? 'border-emerald-300 ring-2 ring-emerald-100 dark:border-emerald-800 dark:ring-emerald-950/50'
                : 'border-gray-200 dark:border-gray-800',
            )}
          >
            <h2 className="text-base font-semibold text-gray-950 dark:text-white">{item.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{item.summary}</p>
            <button
              type="button"
              onClick={() => openGuide(item.actionQuery)}
              className="mt-4 inline-flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              Rehberde Ac
              <ArrowRight size={15} />
            </button>
          </article>
        ))}
      </section>
    </div>
  )
}
