'use client'
import { useEffect, useMemo, useState } from 'react'
import { ListChecks, Settings2, SlidersHorizontal } from 'lucide-react'
import { EntityForm, type FormField, type FormMode, type FormTab } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, type ColumnDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { formControlClass } from '@/components/ui/formControlStyles'
import { apiClient } from '@/lib/api/apiClient'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'
import {
  systemParameterDefinitions,
  type SystemParameterDefinition,
} from '@/lib/system/systemParameters.config'

type ParameterRow = SystemParameterDefinition & {
  id: string
  value: string
  updatedAt?: string | null
  descriptionOverride?: string | null
}

type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }
type PageMode = 'list' | 'view' | 'edit'

export default function SystemParametersPage() {
  const [rows, setRows] = useState<ParameterRow[]>([])
  const [selected, setSelected] = useState<ParameterRow | null>(null)
  const [mode, setMode] = useState<PageMode>('list')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    loadParameters()
  }, [])

  const columns: ColumnDef[] = [
    { key: 'moduleLabel', label: 'Modül', type: 'text', width: 150 },
    { key: 'pageLabel', label: 'Sayfa', type: 'text', width: 160 },
    { key: 'label', label: 'Parametre Adı', type: 'text', width: 260 },
  ]

  const tableRows = useMemo(() => rows.map(row => ({
    ...row,
    valueDisplay: formatParameterValue(row),
  })), [rows])

  const heroFields = useMemo<FormField[]>(() => [
    {
      name: 'moduleLabel',
      label: 'Modül',
      type: 'custom',
      render: ({ value }) => <ReadOnlyField value={value} />,
    },
    {
      name: 'pageLabel',
      label: 'Sayfa',
      type: 'custom',
      render: ({ value }) => <ReadOnlyField value={value} />,
    },
    {
      name: 'label',
      label: 'Parametre Adı',
      type: 'custom',
      render: ({ value }) => <ReadOnlyField value={value} />,
    },
    {
      name: 'value',
      label: 'Değer',
      type: 'custom',
      required: true,
      render: ({ value, onChange, readOnly, className }) => selected
        ? <ParameterValueInput row={selected} value={value} onChange={onChange} readOnly={readOnly} className={className} />
        : <ReadOnlyField value={value} />,
    },
    {
      name: 'key',
      label: 'Parametre Kodu',
      type: 'custom',
      colSpan: 2,
      render: ({ value }) => <ReadOnlyField value={value} monospace />,
    },
  ], [selected])

  const detailTabs = useMemo<FormTab[]>(() => [
    {
      id: 'enum-list',
      label: 'Enum Listesi',
      icon: <ListChecks size={16} />,
      fields: [
        {
          name: 'enumOptions',
          label: 'Enum Değerleri',
          type: 'custom',
          colSpan: 3,
          render: () => selected ? <EnumOptionsList row={selected} /> : null,
        },
        {
          name: 'descriptionOverride',
          label: 'Açıklama',
          type: 'textarea',
          colSpan: 3,
          placeholder: 'Parametre açıklaması',
        },
      ],
    },
  ], [selected])
  const formLoadStages = createProgressiveFormLoadStages({
    mode,
    hasSnapshot: mode !== 'list' && !!selected,
    detailReady: mode !== 'list' && !!selected,
  })

  async function loadParameters() {
    setLoading(true)
    try {
      const payload = await apiClient.get<{ data?: ParameterRow[]; warning?: string }>('/api/settings/system-parameters', { skipAuth: true, staleTime: 120_000 })
      const nextRows = normalizeRows(payload.data)
      setRows(nextRows)
      setSelected(current => current ? nextRows.find(row => row.key === current.key) || current : current)
      if (payload.warning) setToast({ type: 'warning', title: 'Uyarı', message: payload.warning })
    } catch (error) {
      setRows(normalizeRows())
      setToast({ type: 'warning', title: 'Varsayılanlar', message: error instanceof Error ? error.message : 'Varsayılan parametreler gösteriliyor.' })
    } finally {
      setLoading(false)
    }
  }

  function openParameter(row: ParameterRow) {
    setSelected(row)
    setMode('view')
  }

  async function saveParameter(data: Record<string, any>) {
    if (!selected) return
    setSaving(true)
    try {
      await apiClient.patch('/api/settings/system-parameters', {
        key: selected.key,
        value: data.value,
        description: data.descriptionOverride || selected.description || '',
      })
      apiClient.invalidate('/api/settings/system-parameters')
      setToast({ type: 'success', title: 'Kaydedildi', message: 'Sistem parametresi güncellendi.' })
      setMode('view')
      await loadParameters()
    } catch (error) {
      setToast({ type: 'error', title: 'Kaydedilemedi', message: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <PageBanner
        mode={mode === 'list' ? 'list' : 'form'}
        formMode={mode === 'edit' ? 'edit' : 'view'}
        title={mode === 'list' ? 'Sistem Parametreleri' : selected?.label || 'Sistem Parametresi'}
        subtitle="Kodlama aşamasında üretilen parametreleri modül ve sayfa bazında yönetin."
        icon={<Settings2 size={24} />}
        onAddClick={mode === 'list' ? () => undefined : undefined}
        addButtonDisabled
        onBackClick={mode === 'list' ? undefined : () => { setMode('list'); setSelected(null) }}
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {mode === 'list' ? (
        <SmartDataTable
          columns={columns}
          data={tableRows}
          loading={loading}
          defaultView="list"
          storageKey="system-parameters-catalog"
          emptyText="Sistem parametresi bulunamadı"
          onRefresh={loadParameters}
          onRowClick={(row: any) => openParameter(row)}
        />
      ) : selected ? (
        <EntityForm
          mode={mode as FormMode}
          entityName="Sistem Parametreleri"
          entityNameSingular="Sistem Parametresi"
          heroFields={heroFields}
          tabs={detailTabs}
          data={{
            ...selected,
            descriptionOverride: selected.descriptionOverride || selected.description || '',
          }}
          saving={saving}
          loadStages={formLoadStages}
          canEdit
          heroLeftPanel={<ParameterHeroPanel row={selected} />}
          showHeroHeader
          onSave={saveParameter}
          onCancel={() => mode === 'edit' ? setMode('view') : setMode('list')}
          onModeChange={(nextMode) => setMode(nextMode === 'create' ? 'edit' : nextMode)}
        />
      ) : null}
    </div>
  )
}

function normalizeRows(data?: ParameterRow[]) {
  const byKey = new Map((data || []).map(item => [item.key, item]))
  return systemParameterDefinitions.map(definition => {
    const stored = byKey.get(definition.key)
    return {
      ...definition,
      ...stored,
      id: definition.key,
      value: stored?.value ?? definition.defaultValue,
    }
  })
}

function formatParameterValue(row: ParameterRow) {
  if (row.type === 'boolean') return String(row.value) === 'true' ? 'Açık' : 'Kapalı'
  return row.value || row.defaultValue || '-'
}

function ParameterHeroPanel({ row }: { row: ParameterRow }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          <SlidersHorizontal size={20} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{row.label}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{row.moduleLabel} / {row.pageLabel}</p>
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-950 dark:text-gray-300">
        {row.descriptionOverride || row.description || 'Bu parametre kodlama aşamasında üretilir; ekleme kapalıdır, yalnızca değer güncellenir.'}
      </div>
    </div>
  )
}

function ReadOnlyField({ value, monospace = false }: { value: unknown; monospace?: boolean }) {
  return (
    <div className={`min-h-10 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 ${monospace ? 'font-mono' : ''}`}>
      {String(value || '-')}
    </div>
  )
}

function ParameterValueInput({ row, value, onChange, readOnly, className }: { row: ParameterRow; value: any; onChange: (value: any) => void; readOnly: boolean; className?: string }) {
  const controlClassName = className || formControlClass({ rounded: 'md', className: 'min-h-10' })
  if (row.type === 'enum') {
    return (
      <select value={value ?? ''} disabled={readOnly} onChange={event => onChange(event.target.value)} className={controlClassName}>
        {(row.options || []).map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    )
  }

  if (row.type === 'boolean') {
    return (
      <select value={String(value ?? row.defaultValue)} disabled={readOnly} onChange={event => onChange(event.target.value)} className={controlClassName}>
        <option value="true">Açık</option>
        <option value="false">Kapalı</option>
      </select>
    )
  }

  return (
    <input
      type={row.type === 'number' ? 'number' : 'text'}
      value={value ?? ''}
      readOnly={readOnly}
      onChange={event => onChange(event.target.value)}
      className={controlClassName}
    />
  )
}

function EnumOptionsList({ row }: { row: ParameterRow }) {
  if (row.type !== 'enum' || !row.options?.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400">
        Bu parametre için enum listesi tanımlı değil.
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950">
      {row.options.map(option => (
        <span key={option} className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
          {option}
        </span>
      ))}
    </div>
  )
}
