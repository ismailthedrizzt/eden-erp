'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  Loader2,
  RefreshCw,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import {
  dataQualityService,
  type DataQualityCounts,
  type DataQualityFinding,
  type DataQualityRule,
  type DataQualitySummary,
  type DuplicateCandidateGroup,
  type MergePreview,
  type QualityScore,
} from '@/lib/services/dataQuality'

type ToastState = { type: ToastType; title?: string; message: string }

const entityFilters = [
  { key: '', label: 'Tum varliklar' },
  { key: 'master_organization', label: 'Master kurum' },
  { key: 'master_person', label: 'Master kisi' },
  { key: 'stakeholder', label: 'Paydas' },
  { key: 'cari_account', label: 'Cari kart' },
  { key: 'employee', label: 'Calisan' },
  { key: 'installed_asset', label: 'Kurulu urun' },
  { key: 'document', label: 'Belge' },
]

export default function DataQualityPage() {
  const [summary, setSummary] = useState<DataQualitySummary | null>(null)
  const [rules, setRules] = useState<DataQualityRule[]>([])
  const [selectedEntity, setSelectedEntity] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<DuplicateCandidateGroup | null>(null)
  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null)
  const [impactAck, setImpactAck] = useState(false)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [nextSummary, nextRules] = await Promise.all([
        dataQualityService.summary(),
        dataQualityService.rules(),
      ])
      setSummary(nextSummary)
      setRules(nextRules)
    } catch (error) {
      setToast({ type: 'error', title: 'Veri Kalitesi Yuklenemedi', message: errorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const duplicateGroups = summary?.duplicate_groups || []
  const findings = summary?.open_findings || []
  const qualityScores = summary?.quality_scores || []
  const counts = useMemo<DataQualityCounts>(() => summary?.counts || {}, [summary])
  const selectedItems = selectedGroup?.items || []
  const canPreviewMerge = selectedItems.length >= 2

  async function runScan() {
    setWorking(true)
    try {
      const result = await dataQualityService.runCheck({
        entity_types: selectedEntity ? [selectedEntity] : [],
        include_duplicates: true,
        include_scores: true,
        limit_per_entity: 100,
      })
      await loadData()
      setToast({
        type: 'success',
        title: 'Kontrol Tamamlandi',
        message: `${String(result.detected_duplicate_groups || 0)} duplicate grup, ${String(result.checked_scores || 0)} skor guncellendi.`,
      })
    } catch (error) {
      setToast({ type: 'error', title: 'Kontrol Basarisiz', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  async function detectDuplicates() {
    setWorking(true)
    try {
      const result = await dataQualityService.detectDuplicates({
        entity_types: selectedEntity ? [selectedEntity] : [],
        limit_per_rule: 25,
      })
      await loadData()
      setToast({ type: 'success', title: 'Duplicate Detection', message: `${result.detected_count} grup review queue'a yazildi.` })
    } catch (error) {
      setToast({ type: 'error', title: 'Detection Basarisiz', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  async function openGroup(group: DuplicateCandidateGroup) {
    setWorking(true)
    try {
      const detail = await dataQualityService.duplicateGroup(group.id)
      setSelectedGroup(detail)
      setMergePreview(null)
      setImpactAck(false)
    } catch (error) {
      setToast({ type: 'error', title: 'Grup Acilamadi', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  async function createMergePreview() {
    if (!selectedGroup || selectedItems.length < 2) return
    const target = selectedItems.find(item => item.is_suggested_master) || selectedItems[0]
    const sources = selectedItems.filter(item => item.entity_id !== target.entity_id)
    setWorking(true)
    try {
      const preview = await dataQualityService.mergePreview({
        entity_type: selectedGroup.entity_type,
        target_entity_id: target.entity_id,
        source_entity_ids: sources.map(item => item.entity_id),
        duplicate_group_id: selectedGroup.id,
        reason: 'Duplicate review queue onayi',
      })
      setMergePreview(preview)
      setImpactAck(false)
    } catch (error) {
      setToast({ type: 'error', title: 'Preview Basarisiz', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  async function confirmMerge() {
    if (!selectedGroup || !mergePreview) return
    setWorking(true)
    try {
      await dataQualityService.mergeConfirm({
        entity_type: mergePreview.entity_type,
        target_entity_id: mergePreview.target_entity_id,
        source_entity_ids: mergePreview.source_entity_ids,
        duplicate_group_id: selectedGroup.id,
        reason: 'Duplicate review queue onayi',
        confirmed_impact_ack: impactAck,
      })
      setToast({ type: 'success', title: 'Merge Tamamlandi', message: 'Kayitlar guvenli merge politikasiyla islendi.' })
      setSelectedGroup(null)
      setMergePreview(null)
      setImpactAck(false)
      await loadData()
    } catch (error) {
      setToast({ type: 'error', title: 'Merge Engellendi', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  async function resolveGroup(action: 'dismiss' | 'falsePositive') {
    if (!selectedGroup) return
    setWorking(true)
    try {
      if (action === 'dismiss') {
        await dataQualityService.dismissDuplicate(selectedGroup.id, 'Kullanici review sonrasi yok saydi.')
      } else {
        await dataQualityService.falsePositive(selectedGroup.id, 'Kayitlar farkli kisi/kurum olarak isaretlendi.')
      }
      setToast({ type: 'success', title: 'Review Guncellendi', message: 'Duplicate grup durumu guncellendi.' })
      setSelectedGroup(null)
      setMergePreview(null)
      await loadData()
    } catch (error) {
      setToast({ type: 'error', title: 'Islem Basarisiz', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Veri Kalitesi</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Master data duplicate, eksik veri, kalite skoru ve kontrollu merge incelemeleri.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={loadData} className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Yenile
            </button>
            <button type="button" onClick={detectDuplicates} disabled={working} className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50">
              {working ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <SearchCheck className="h-4 w-4" aria-hidden="true" />}
              Duplicate Tara
            </button>
            <button type="button" onClick={runScan} disabled={working} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Kalite Kontrolu
            </button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Metric label="Acik uyari" value={counts.open_findings || 0} icon={AlertTriangle} />
          <Metric label="Duplicate aday" value={counts.duplicate_candidates || 0} icon={GitMerge} tone="amber" />
          <Metric label="Kritik bulgu" value={counts.critical_findings || 0} icon={ShieldAlert} tone="red" />
          <Metric label="Dusuk kalite" value={counts.low_quality_records || 0} icon={XCircle} tone="red" />
          <Metric label="Cozulen" value={counts.resolved_findings || 0} icon={CheckCircle2} tone="emerald" />
          <Metric label="Son tarama" value={shortDate(counts.last_scan_at)} icon={RefreshCw} />
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold">Tarama Kapsami</h2>
              <p className="text-sm text-muted-foreground">Tum taramalar tenant ve permission scope altinda calisir.</p>
            </div>
            <label className="block text-sm">
              <span className="sr-only">Varlik tipi</span>
              <select value={selectedEntity} onChange={event => setSelectedEntity(event.target.value)} className="h-10 min-w-64 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                {entityFilters.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
          <DuplicateQueue groups={duplicateGroups} loading={loading} selectedId={selectedGroup?.id} onOpen={openGroup} />
          <MergePanel
            group={selectedGroup}
            preview={mergePreview}
            impactAck={impactAck}
            working={working}
            canPreviewMerge={canPreviewMerge}
            onPreview={createMergePreview}
            onConfirm={confirmMerge}
            onAckChange={setImpactAck}
            onDismiss={() => resolveGroup('dismiss')}
            onFalsePositive={() => resolveGroup('falsePositive')}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <FindingsTable findings={findings} loading={loading} />
          <QualityScores scores={qualityScores} loading={loading} />
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Kalite Kurallari</h2>
            <p className="text-sm text-muted-foreground">Baslangic rule set aktif/pasif ve severity override icin hazir.</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {rules.slice(0, 18).map(rule => (
              <div key={rule.rule_key} className="rounded-md border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{rule.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{rule.entity_type} - {rule.rule_key}</div>
                  </div>
                  <SeverityBadge severity={rule.severity} />
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{rule.description || 'Kural aciklamasi yok.'}</p>
              </div>
            ))}
            {!rules.length && !loading ? <EmptyBox text="Kural bulunamadi." /> : null}
          </div>
        </section>
      </div>
    </main>
  )
}

function DuplicateQueue({ groups, loading, selectedId, onOpen }: { groups: DuplicateCandidateGroup[]; loading: boolean; selectedId?: string; onOpen: (group: DuplicateCandidateGroup) => void }) {
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Duplicate Inceleme Kuyrugu</h2>
          <p className="text-sm text-muted-foreground">Sistem tespit eder; merge icin yetkili kullanici onayi gerekir.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Varlik</th>
              <th className="px-3 py-2">Skor</th>
              <th className="px-3 py-2">Neden</th>
              <th className="px-3 py-2">Durum</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {groups.map(group => (
              <tr key={group.id} className={cn(selectedId === group.id && 'bg-primary/5')}>
                <td className="px-3 py-2">
                  <div className="font-medium">{entityLabel(group.entity_type)}</div>
                  <div className="text-xs text-muted-foreground">{group.candidate_count || group.items?.length || 0} aday</div>
                </td>
                <td className="px-3 py-2">
                  <Confidence value={group.match_score} severity={group.severity} />
                </td>
                <td className="max-w-sm px-3 py-2 text-muted-foreground">{group.match_reason}</td>
                <td className="px-3 py-2"><SeverityBadge severity={group.severity} /></td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => onOpen(group)} className="inline-flex h-8 items-center rounded-md border border-border px-2 text-xs hover:bg-muted">
                    Incele
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!groups.length ? <EmptyBox text={loading ? 'Yukleniyor...' : 'Acik duplicate aday grubu yok.'} /> : null}
    </section>
  )
}

function MergePanel(props: {
  group: DuplicateCandidateGroup | null
  preview: MergePreview | null
  impactAck: boolean
  working: boolean
  canPreviewMerge: boolean
  onPreview: () => void
  onConfirm: () => void
  onAckChange: (value: boolean) => void
  onDismiss: () => void
  onFalsePositive: () => void
}) {
  const { group, preview, impactAck, working, canPreviewMerge, onPreview, onConfirm, onAckChange, onDismiss, onFalsePositive } = props
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Merge Preview</h2>
        <p className="text-sm text-muted-foreground">Target/source, alan cakismalari ve relation impact onaydan once gorunur.</p>
      </div>
      {!group ? (
        <EmptyBox text="Duplicate grubunu secince merge etkisi burada gorunur." />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2">
            {(group.items || []).map(item => (
              <div key={item.id || item.entity_id} className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{item.display_name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{item.entity_id}</div>
                  </div>
                  {item.is_suggested_master ? <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">Target onerisi</span> : null}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onPreview} disabled={!canPreviewMerge || working} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50">
              <GitMerge className="h-4 w-4" aria-hidden="true" />
              Preview
            </button>
            <button type="button" onClick={onDismiss} disabled={working} className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50">Yok Say</button>
            <button type="button" onClick={onFalsePositive} disabled={working} className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50">False Positive</button>
          </div>
          {preview ? <PreviewDetails preview={preview} impactAck={impactAck} onAckChange={onAckChange} onConfirm={onConfirm} working={working} /> : null}
        </div>
      )}
    </section>
  )
}

function PreviewDetails({ preview, impactAck, onAckChange, onConfirm, working }: { preview: MergePreview; impactAck: boolean; onAckChange: (value: boolean) => void; onConfirm: () => void; working: boolean }) {
  const conflicts = preview.field_comparison.filter(item => item.conflict).slice(0, 6)
  return (
    <div className="space-y-4 rounded-md border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Hedef kayit</div>
          <div className="font-mono text-xs text-muted-foreground">{preview.target_entity_id}</div>
        </div>
        <span className={cn('rounded-md px-2 py-1 text-xs font-semibold', preview.safe_to_merge ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200')}>
          {preview.safe_to_merge ? 'Guvenli merge' : 'Merge engelli'}
        </span>
      </div>
      {preview.blocked_reason ? <WarningBox text={preview.blocked_reason} /> : null}
      {preview.relation_impact.length ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Relation impact</h3>
          <div className="space-y-2">
            {preview.relation_impact.map(item => (
              <div key={`${item.relation_entity_type}:${item.relation_field}`} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm">
                <span>{item.relation_entity_type}.{item.relation_field || 'relation'}</span>
                <span className="text-muted-foreground">{item.count} kayit - {item.action}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {conflicts.length ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Alan cakismalari</h3>
          <div className="space-y-2">
            {conflicts.map(item => (
              <div key={item.field} className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                <span className="font-semibold">{item.field}</span>: target degeri korunacak.
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {preview.risks.length ? (
        <ul className="space-y-2 text-sm text-muted-foreground">
          {preview.risks.map(risk => <li key={risk} className="rounded-md border border-border bg-card px-3 py-2">{risk}</li>)}
        </ul>
      ) : null}
      <label className="flex items-start gap-2 rounded-md border border-border bg-card p-3 text-sm">
        <input type="checkbox" checked={impactAck} onChange={event => onAckChange(event.target.checked)} className="mt-1" />
        <span>Bu birlestirme isleminin iliskili kayitlari etkileyebilecegini anliyorum.</span>
      </label>
      <button type="button" onClick={onConfirm} disabled={!preview.safe_to_merge || !impactAck || working} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {working ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
        Merge Onayla
      </button>
    </div>
  )
}

function FindingsTable({ findings, loading }: { findings: DataQualityFinding[]; loading: boolean }) {
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <h2 className="mb-4 text-base font-semibold">Eksik Veri ve Tutarsizlik Uyarilari</h2>
      <div className="space-y-2">
        {findings.map(finding => (
          <div key={finding.id} className="rounded-md border border-border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{finding.message}</div>
                <div className="mt-1 text-xs text-muted-foreground">{entityLabel(finding.entity_type)} - {finding.rule_key}</div>
              </div>
              <SeverityBadge severity={finding.severity} />
            </div>
          </div>
        ))}
      </div>
      {!findings.length ? <EmptyBox text={loading ? 'Yukleniyor...' : 'Acik kalite uyarisi yok.'} /> : null}
    </section>
  )
}

function QualityScores({ scores, loading }: { scores: QualityScore[]; loading: boolean }) {
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <h2 className="mb-4 text-base font-semibold">Dusuk Kalite Kayitlar</h2>
      <div className="space-y-2">
        {scores.map(score => (
          <div key={`${score.entity_type}:${score.entity_id}`} className="rounded-md border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{entityLabel(score.entity_type)}</div>
                <div className="font-mono text-xs text-muted-foreground">{score.entity_id}</div>
              </div>
              <ScoreBadge score={Number(score.score || 0)} status={score.status} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Eksikler: {arrayish(score.missing_fields).slice(0, 4).join(', ') || '-'}
            </div>
          </div>
        ))}
      </div>
      {!scores.length ? <EmptyBox text={loading ? 'Yukleniyor...' : 'Skorlanmis kayit yok.'} /> : null}
    </section>
  )
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: LucideIcon; tone?: 'emerald' | 'red' | 'amber' }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className={cn('mt-2 truncate text-2xl font-semibold', tone === 'emerald' && 'text-emerald-700 dark:text-emerald-300', tone === 'red' && 'text-red-700 dark:text-red-300', tone === 'amber' && 'text-amber-700 dark:text-amber-300')}>{value}</div>
    </div>
  )
}

function Confidence({ value, severity }: { value: number; severity: string }) {
  const percent = Math.round(Number(value || 0) * 100)
  return (
    <div className="min-w-28">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold">{percent}%</span>
        <span className="text-muted-foreground">{severity}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
    </div>
  )
}

function SeverityBadge({ severity }: { severity?: string }) {
  const value = severity || 'info'
  const className = value === 'critical' || value === 'exact'
    ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200'
    : value === 'warning' || value === 'strong'
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
      : 'bg-muted text-muted-foreground'
  return <span className={cn('inline-flex rounded-md px-2 py-1 text-xs font-medium', className)}>{value}</span>
}

function ScoreBadge({ score, status }: { score: number; status: string }) {
  const className = score >= 80
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
    : score >= 60
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
      : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200'
  return <span className={cn('rounded-md px-2 py-1 text-xs font-semibold', className)}>{Math.round(score)} - {status}</span>
}

function WarningBox({ text }: { text: string }) {
  return <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{text}</div>
}

function EmptyBox({ text }: { text: string }) {
  return <div className="mt-3 rounded-md border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">{text}</div>
}

function entityLabel(entityType?: string) {
  const labels: Record<string, string> = {
    master_organization: 'Master kurum',
    master_person: 'Master kisi',
    stakeholder: 'Paydas',
    cari_account: 'Cari kart',
    company: 'Sirket',
    partner: 'Ortak',
    representative: 'Temsilci',
    employee: 'Calisan',
    installed_asset: 'Kurulu urun',
    document: 'Belge',
    product: 'Urun',
  }
  return labels[entityType || ''] || entityType || 'Kayit'
}

function arrayish(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => String(item))
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) return parsed.map(item => String(item))
    } catch {
      return value ? [value] : []
    }
  }
  return []
}

function shortDate(value?: string | null) {
  if (!value) return '-'
  try {
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  } catch {
    return value.slice(0, 10)
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Islem tamamlanamadi.'
}
