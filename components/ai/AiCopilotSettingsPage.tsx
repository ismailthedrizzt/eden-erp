'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Brain, CheckCircle2, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { aiCopilotService } from '@/lib/services/ai'

export function AiCopilotSettingsPage() {
  const [registry, setRegistry] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setError(null)
    try {
      setRegistry(await aiCopilotService.suggestions())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI Copilot registry okunamadi.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const actions = Array.isArray(registry?.actions) ? registry.actions : []
  const modes = Array.isArray(registry?.modes) ? registry.modes : []

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 dark:bg-slate-950 dark:text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">AI Assistance</p>
            <h1 className="mt-1 text-2xl font-semibold">AI Copilot Ayarlari</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Provider, safety, registry action ve belge zekasi hazirligini izler. Copilot resmi veri degistirmez; mutation icin domain validation ve kullanici onayi gerekir.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={load} className={secondaryButtonClass}>
              <RefreshCw size={16} />
              Yenile
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('eden:open-ai-copilot', { detail: { query: 'AI Copilot guvenlik sinirlarini acikla', mode: 'admin_assist' } }))}
              className={primaryButtonClass}
            >
              <Sparkles size={16} />
              Copilot ile Sor
            </button>
          </div>
        </header>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-100">{error}</div> : null}

        <section className="grid gap-4 md:grid-cols-3">
          <InfoCard icon={<Brain size={18} />} title="Provider" value="local_rule fallback" text="OpenAI veya baska provider yoksa deterministic cevaplar ve action resolver calisir." />
          <InfoCard icon={<ShieldCheck size={18} />} title="Safety" value="Level 0-2 aktif" text="Kritik Level 4 islemler yalnizca sihirbaza yonlendirilir." />
          <InfoCard icon={<CheckCircle2 size={18} />} title="Registry" value={`${actions.length} action`} text="UI sadece backend registry ve permission ile enabled olan aksiyonlari gosterir." />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Panel title="Modlar">
            <div className="grid gap-2">
              {modes.map((mode, index) => {
                const item = mode as { key?: string; label?: string; description?: string }
                return (
                  <div key={item.key || index} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="text-sm font-semibold">{item.label || item.key}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.description}</div>
                  </div>
                )
              })}
            </div>
          </Panel>
          <Panel title="Action registry">
            <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className={thClass}>Action</th>
                    <th className={thClass}>Modul</th>
                    <th className={thClass}>Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {actions.map((action, index) => {
                    const item = action as { action_key?: string; label?: string; module_key?: string; safety_level?: number }
                    return (
                      <tr key={item.action_key || index} className="bg-white dark:bg-slate-950">
                        <td className={tdClass}>
                          <div className="font-semibold">{item.label}</div>
                          <div className="text-xs text-slate-500">{item.action_key}</div>
                        </td>
                        <td className={tdClass}>{item.module_key}</td>
                        <td className={tdClass}>L{item.safety_level}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      </div>
    </main>
  )
}

function InfoCard({ icon, title, value, text }: { icon: ReactNode; title: string; value: string; text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
        {icon}
        {title}
      </div>
      <div className="mt-3 text-xl font-semibold">{value}</div>
      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

const primaryButtonClass = 'inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-700'
const secondaryButtonClass = 'inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900'
const thClass = 'px-3 py-2 font-semibold'
const tdClass = 'px-3 py-2 align-top text-slate-700 dark:text-slate-200'
