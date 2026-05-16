'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, SlidersHorizontal } from 'lucide-react'
import { formControlClass } from '@/components/ui/formControlStyles'
import { dashboardWidgetRegistry, uniqueWidgetModules, uniqueWidgetPages } from '@/lib/dashboard/widgetRegistry'

export interface WidgetPickerItem {
  id: string
  title: string
  description?: string
  moduleKey: string
  moduleLabel: string
  pageKey: string
  pageLabel: string
}

interface WidgetPickerModalProps {
  open: boolean
  title: string
  description?: string
  items?: WidgetPickerItem[]
  selectedWidgetIds: string[]
  enableFilters?: boolean
  onClose: () => void
  onSave: (ids: string[]) => void
}

export function WidgetPickerModal({
  open,
  title,
  description,
  items,
  selectedWidgetIds,
  enableFilters = true,
  onClose,
  onSave,
}: WidgetPickerModalProps) {
  const [draftIds, setDraftIds] = useState<string[]>(selectedWidgetIds)
  const [moduleKey, setModuleKey] = useState('')
  const [pageKey, setPageKey] = useState('')
  const records = useMemo(() => items || dashboardWidgetRegistry, [items])

  useEffect(() => {
    if (!open) return
    setDraftIds(selectedWidgetIds)
    setModuleKey('')
    setPageKey('')
  }, [open, selectedWidgetIds])

  const modules = uniqueWidgetModules(records)
  const pages = uniqueWidgetPages(records, moduleKey || undefined)
  const filteredWidgets = records.filter(widget =>
    (!enableFilters || !moduleKey || widget.moduleKey === moduleKey) &&
    (!enableFilters || !pageKey || widget.pageKey === pageKey)
  )

  const toggleWidget = (id: string) => {
    setDraftIds(prev => prev.includes(id)
      ? prev.filter(item => item !== id)
      : [...prev, id]
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl dark:bg-eden-navy-2">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
          </div>
          <div className="rounded-lg bg-eden-blue/10 p-2 text-eden-blue">
            <SlidersHorizontal size={20} />
          </div>
        </div>

        {enableFilters && (
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              <span>Modul</span>
              <select
                value={moduleKey}
                onChange={(event) => {
                  setModuleKey(event.target.value)
                  setPageKey('')
                }}
                className={formControlClass()}
              >
                <option value="">Tum Moduller</option>
                {modules.map(module => (
                  <option key={module.key} value={module.key}>{module.label}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              <span>Sayfa</span>
              <select
                value={pageKey}
                onChange={(event) => setPageKey(event.target.value)}
                className={formControlClass()}
              >
                <option value="">Tum Sayfalar</option>
                {pages.map(page => (
                  <option key={`${page.moduleKey}:${page.key}`} value={page.key}>{page.label}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {filteredWidgets.map(widget => (
            <WidgetChoice
              key={widget.id}
              widget={widget}
              selected={draftIds.includes(widget.id)}
              onToggle={() => toggleWidget(widget.id)}
            />
          ))}
          {filteredWidgets.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Bu filtrelere uygun widget kaydi bulunamadi.
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-eden-navy"
          >
            Iptal
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draftIds)
              onClose()
            }}
            className="rounded-lg bg-eden-blue px-4 py-2 text-sm font-medium text-white hover:bg-eden-blue-dk"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}

function WidgetChoice({ widget, selected, onToggle }: { widget: WidgetPickerItem; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-start gap-3 rounded-lg border border-gray-200 p-3 text-left transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-eden-navy"
    >
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? 'border-eden-blue bg-eden-blue text-white' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900'}`}>
        {selected && <Check size={14} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-gray-900 dark:text-white">{widget.title}</span>
        <span className="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">
          {widget.moduleLabel} / {widget.pageLabel}
        </span>
        {widget.description && (
          <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">{widget.description}</span>
        )}
      </span>
    </button>
  )
}
