'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Loader2, ShieldCheck } from 'lucide-react'
import { DashboardFilters } from '@/components/dashboard/DashboardFilters'
import { DashboardOnboardingEmptyState } from '@/components/onboarding/DashboardOnboardingEmptyState'
import { ModuleSummarySection } from '@/components/dashboard/ModuleSummarySection'
import { RiskWarningCard } from '@/components/dashboard/RiskWarningCard'
import { StatusDistributionChart } from '@/components/dashboard/StatusDistributionChart'
import { ReportExportButton } from '@/components/reports/ReportExportButton'
import { ReportFilters } from '@/components/reports/ReportFilters'
import { ReportTable } from '@/components/reports/ReportTable'
import {
  reportingDashboard,
  reportingReports,
  type DashboardResponse,
  type KpiCardRecord,
  type ReportDefinitionRecord,
  type ReportingFilter,
  type ReportResult,
} from '@/lib/services/reporting'
import { onboardingService, type OnboardingOverview } from '@/lib/services/onboarding'

export function ManagementDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [reports, setReports] = useState<ReportDefinitionRecord[]>([])
  const [selectedReport, setSelectedReport] = useState<string>('')
  const [reportResult, setReportResult] = useState<ReportResult | null>(null)
  const [filters, setFilters] = useState<ReportingFilter>(() => defaultFilters())
  const [reportFilters, setReportFilters] = useState<ReportingFilter>(() => ({ page: 1, page_size: 50, date_from: monthStart(), date_to: today() }))
  const [loading, setLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [onboarding, setOnboarding] = useState<OnboardingOverview | null>(null)

  useEffect(() => {
    loadDashboard()
    loadReports()
    loadOnboarding()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const groupedCards = useMemo(() => groupCards(dashboard?.cards || []), [dashboard])
  const statusChart = dashboard?.charts.find(chart => chart.key === 'dashboard.statusDistribution') || null

  async function loadDashboard() {
    setLoading(true)
    setError(null)
    try {
      setDashboard(await reportingDashboard.get(filters))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dashboard yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  async function loadReports() {
    try {
      const definitions = await reportingReports.list()
      setReports(definitions)
      if (!selectedReport && definitions[0]) setSelectedReport(definitions[0].report_key)
    } catch {
      setReports([])
    }
  }

  async function loadOnboarding() {
    try {
      setOnboarding(await onboardingService.getWorkspace())
    } catch {
      setOnboarding(null)
    }
  }

  async function querySelectedReport() {
    if (!selectedReport) return
    setReportLoading(true)
    setError(null)
    try {
      setReportResult(await reportingReports.query(selectedReport, reportFilters))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rapor sorgulanamadı.')
    } finally {
      setReportLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-white/10 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-300/20 dark:bg-sky-400/10 dark:text-sky-100">
              <ShieldCheck size={14} />
              Projection / read model odaklı
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">Yönetim Dashboard</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Şirket, ortaklık, temsilci, şube, muhasebe, İK, görev, servis ve CRM durumunu yetki kapsamınıza göre tek panelden izleyin.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[520px]">
            <HeaderMetric label="Kart" value={dashboard?.cards.filter(card => card.visible).length ?? 0} />
            <HeaderMetric label="Uyarı" value={dashboard?.cards.filter(card => card.visible && card.status === 'warning').length ?? 0} tone="amber" />
            <HeaderMetric label="Kritik" value={dashboard?.cards.filter(card => card.visible && card.status === 'critical').length ?? 0} tone="red" />
          </div>
        </header>

        <DashboardFilters filters={filters} onChange={setFilters} onRefresh={loadDashboard} />

        <DashboardOnboardingEmptyState overview={onboarding} />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-300/20 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />)}
          </div>
        ) : (
          <>
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <RiskWarningCard cards={dashboard?.cards || []} warnings={dashboard?.warnings || []} />
              {statusChart && <StatusDistributionChart chart={statusChart} />}
            </section>

            <div className="space-y-4">
              {Object.entries(groupedCards).map(([moduleKey, cards]) => (
                <ModuleSummarySection key={moduleKey} moduleKey={moduleKey} cards={cards} />
              ))}
              {Object.keys(groupedCards).length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03]">
                  Görüntülenebilir KPI kartı yok. Yetki veya modül görünürlüğü ayarlarını kontrol edin.
                </div>
              )}
            </div>
          </>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <BarChart3 size={18} />
                Raporlar
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Başlangıç raporları server-side filtrelenir ve export güvenlik modeline hazırdır.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={selectedReport} onChange={event => { setSelectedReport(event.target.value); setReportResult(null) }} className={inputClass}>
                {reports.map(report => <option key={report.report_key} value={report.report_key}>{report.title}</option>)}
              </select>
              <button type="button" onClick={querySelectedReport} disabled={!selectedReport || reportLoading} className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                {reportLoading ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
                Sorgula
              </button>
              <ReportExportButton reportKey={selectedReport} filters={reportFilters} />
            </div>
          </div>
          <div className="mt-4">
            <ReportFilters filters={reportFilters} onChange={setReportFilters} />
          </div>
          <div className="mt-4">
            <ReportTable result={reportResult} />
          </div>
        </section>
      </div>
    </main>
  )
}

function groupCards(cards: KpiCardRecord[]) {
  return cards.reduce<Record<string, KpiCardRecord[]>>((acc, card) => {
    const key = card.module_key
    if (!acc[key]) acc[key] = []
    acc[key].push(card)
    return acc
  }, {})
}

function HeaderMetric({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'amber' | 'red' }) {
  const toneClass = tone === 'red'
    ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-300/20 dark:bg-red-500/10 dark:text-red-100'
    : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100'
      : 'border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white'
  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function defaultFilters(): ReportingFilter {
  return { date_from: monthStart(), date_to: today(), only_mine: false }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function monthStart() {
  const value = new Date()
  value.setDate(1)
  return value.toISOString().slice(0, 10)
}

const inputClass = 'min-w-[260px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-300/20'
