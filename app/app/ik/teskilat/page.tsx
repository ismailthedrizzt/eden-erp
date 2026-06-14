'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Building2, ChevronDown, ChevronRight, Eye, Layers, Pencil, Plus, Users } from 'lucide-react'
import { DurumBadge } from '@/components/ui/Badge'
import { formatTRY } from '@/lib/utils'
import { useTeskilat } from '@/hooks/useTeskilat'
import { organizationStaffingPageContract } from '@/contracts/pages/hr/organization-staffing.page.contract'
import { organizationStaffingListContract } from '@/contracts/lists/hr/organization-staffing.list.contract'
import type { Birim } from '@/types'

type TabId = typeof organizationStaffingPageContract.dashboard.tabs[number]['id']

type TreeUnit = Birim & { alt_birimler?: Birim[] }

const staffingDashboard = organizationStaffingPageContract.dashboard
const staffingColumns = organizationStaffingListContract.columns

const typeIconByKey: Record<string, ReactNode> = {
  sirket: <Building2 size={13} className="text-eden-blue" />,
  departman: <Layers size={13} className="text-eden-green" />,
  bolum: <Users size={13} className="text-eden-gold-dk" />,
  default: <Layers size={13} className="text-gray-400" />,
}

export default function TeskilatPage() {
  const { organization_units, positions, loading, buildTree, filled, open, fillRate } = useTeskilat()
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>(staffingDashboard.tabs[0].id)

  const tree = buildTree(null) as TreeUnit[]
  const selectedUnit = organization_units.find(unit => unit.id === selectedUnitId)
  const selectedPositions = positions.filter(position => position.unit_id === selectedUnitId)

  const statValues = useMemo(() => ({
    total_positions: positions.length,
    filled_positions: filled,
    open_positions: open,
    filled_budget: formatTRY(positions.filter(position => position.status === 'filled').reduce((sum, position) => sum + (position.budget_amount || 0), 0)),
    fill_rate: `%${fillRate}`,
    unit_count: organization_units.length,
  }), [fillRate, filled, open, organization_units.length, positions])

  const budgetValues = useMemo(() => ({
    approved_budget: formatTRY(positions.reduce((sum, position) => sum + (position.budget_amount || 0), 0)),
    used_budget: formatTRY(positions.filter(position => position.status === 'filled').reduce((sum, position) => sum + (position.budget_amount || 0), 0)),
    open_budget: formatTRY(positions.filter(position => position.status === 'open').reduce((sum, position) => sum + (position.budget_amount || 0), 0)),
  }), [positions])

  function toggleOpen(id: string) {
    setOpenIds(current => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function TreeNode({ unit, depth = 0 }: { unit: TreeUnit; depth?: number }) {
    const hasChildren = (unit.alt_birimler?.length ?? 0) > 0
    const isOpen = openIds.has(unit.id)
    const isSelected = selectedUnitId === unit.id

    return (
      <div>
        <div
          className={`group flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${isSelected ? 'bg-eden-blue-lt dark:bg-eden-blue/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          onClick={() => {
            setSelectedUnitId(unit.id)
            if (hasChildren) toggleOpen(unit.id)
          }}
        >
          {hasChildren ? (
            <button onClick={event => { event.stopPropagation(); toggleOpen(unit.id) }} className="flex h-4 w-4 items-center justify-center text-gray-400">
              {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </button>
          ) : <span className="w-4" />}
          {typeIconByKey[unit.type] ?? typeIconByKey.default}
          <span className="flex-1 text-xs text-gray-700 dark:text-gray-200">{unit.name}</span>
          <span className="hidden rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400 group-hover:inline dark:bg-gray-800">{unit.type}</span>
          <div className="ml-1 hidden gap-0.5 group-hover:flex">
            <button className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:text-eden-blue" title="Goruntule"><Eye size={11} /></button>
            <button className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:text-eden-blue" title="Duzenle"><Pencil size={11} /></button>
            <button className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:text-eden-green" title="Alt Birim Ekle"><Plus size={11} /></button>
          </div>
        </div>
        {hasChildren && isOpen ? (
          <div className="ml-4 border-l border-gray-200 dark:border-gray-700">
            {unit.alt_birimler!.map(child => <TreeNode key={child.id} unit={child as TreeUnit} depth={depth + 1} />)}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-5 font-display text-xl font-bold text-gray-900 dark:text-white">{staffingDashboard.title}</h1>
      <div className="flex h-[calc(100vh-160px)] gap-4">
        <div className="card flex w-72 flex-shrink-0 flex-col overflow-hidden">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{staffingDashboard.treePanelTitle}</span>
            <button className="btn btn-primary btn-sm px-2 py-1 text-xs"><Plus size={12} /> {staffingDashboard.addRootUnitLabel}</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-6 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />)}
              </div>
            ) : tree.map(unit => <TreeNode key={unit.id} unit={unit} />)}
          </div>
        </div>

        <div className="card flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-shrink-0 border-b border-gray-200 px-2 dark:border-gray-700">
            {staffingDashboard.tabs.map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-medium transition-colors ${tab === item.id ? 'border-eden-blue text-eden-blue' : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === 'kadro' ? (
              <div>
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
                  <div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-white">{selectedUnit ? selectedUnit.name : staffingDashboard.selectUnitEmptyState}</div>
                    {selectedUnit ? (
                      <div className="mt-0.5 text-xs text-gray-400">
                        {selectedPositions.length} {staffingDashboard.positionSummaryLabels.total} - {selectedPositions.filter(position => position.status === 'filled').length} {staffingDashboard.positionSummaryLabels.filled} - {selectedPositions.filter(position => position.status === 'open').length} {staffingDashboard.positionSummaryLabels.open}
                      </div>
                    ) : null}
                  </div>
                  {selectedUnit ? <button className="btn btn-primary btn-sm text-xs"><Plus size={12} /> {staffingDashboard.addPositionLabel}</button> : null}
                </div>
                {!selectedUnit ? (
                  <div className="flex h-40 items-center justify-center text-sm text-gray-400">{staffingDashboard.selectUnitEmptyState}</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>{staffingColumns.map(column => <th key={column.key} className={column.key === 'budget_amount' ? 'text-right' : undefined}>{column.label}</th>)}</tr>
                    </thead>
                    <tbody>
                      {selectedPositions.length === 0 ? (
                        <tr><td colSpan={staffingColumns.length} className="py-10 text-center text-sm text-gray-400">{staffingDashboard.emptyPositionsState}</td></tr>
                      ) : selectedPositions.map(position => (
                        <tr key={position.id} className={position.status === 'open' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}>
                          <td><span className="text-sm font-medium">{position.title}</span>{position.is_manager ? <span className="ml-2 text-[10px] font-bold text-eden-gold">Amir</span> : null}</td>
                          <td className="text-sm italic text-gray-500">{position.status === 'open' ? 'Bos Kadro' : ''}</td>
                          <td><DurumBadge status={position.status} /></td>
                          <td className="text-right text-xs text-gray-400">{position.budget_amount ? formatTRY(position.budget_amount) : '-'}</td>
                          <td>{position.status === 'open' ? <button className="btn btn-primary btn-sm text-xs">{staffingDashboard.openPositionLabel}</button> : <button className="btn btn-sm text-xs">{staffingDashboard.moreActionsLabel}</button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : null}

            {tab === 'istatistik' ? (
              <div className="space-y-6 p-5">
                <div className="grid grid-cols-3 gap-3">
                  {staffingDashboard.statCards.map(card => {
                    const toneClass = card.tone === 'success' ? 'text-eden-green' : card.tone === 'danger' ? 'text-red-600' : card.tone === 'info' ? 'text-eden-blue' : 'text-gray-800 dark:text-white'
                    return (
                      <div key={card.key} className="rounded-xl bg-gray-50 p-4 text-center dark:bg-eden-navy">
                        <div className={`font-display text-2xl font-bold ${toneClass}`}>{statValues[card.key as keyof typeof statValues]}</div>
                        <div className="mt-1 text-xs text-gray-400">{card.label}</div>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Birim Bazli Doluluk</div>
                  <div className="space-y-2.5">
                    {organization_units.filter(unit => unit.parent_unit_id !== null).map(unit => {
                      const unitPositions = positions.filter(position => position.unit_id === unit.id)
                      const unitFilled = unitPositions.filter(position => position.status === 'filled').length
                      const pct = unitPositions.length ? Math.round(unitFilled / unitPositions.length * 100) : 0
                      return (
                        <div key={unit.id} className="flex items-center gap-3">
                          <div className="w-24 flex-shrink-0 text-right text-xs text-gray-400">{unit.name}</div>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-eden-blue" style={{ width: `${pct}%` }} /></div>
                          <div className="w-12 text-xs font-medium text-gray-600 dark:text-gray-300">%{pct}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {tab === 'gender' ? (
              <div className="p-5">
                <div className="mb-6 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-gray-50 p-4 text-center dark:bg-eden-navy"><div className="font-display text-2xl font-bold text-eden-blue">7</div><div className="mt-1 text-xs text-gray-400">Erkek (%58)</div></div>
                  <div className="rounded-xl bg-gray-50 p-4 text-center dark:bg-eden-navy"><div className="font-display text-2xl font-bold" style={{ color: '#d4537e' }}>5</div><div className="mt-1 text-xs text-gray-400">Kadin (%42)</div></div>
                  <div className="rounded-xl bg-gray-50 p-4 text-center dark:bg-eden-navy"><div className="font-display text-2xl font-bold text-gray-800 dark:text-white">0</div><div className="mt-1 text-xs text-gray-400">Engelli</div></div>
                </div>
              </div>
            ) : null}

            {tab === 'butce' ? (
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3">
                  {staffingDashboard.budgetCards.map(card => {
                    const toneClass = card.tone === 'success' ? 'text-eden-green' : card.tone === 'danger' ? 'text-red-600' : 'text-gray-800 dark:text-white'
                    return (
                      <div key={card.key} className="rounded-xl bg-gray-50 p-4 text-center dark:bg-eden-navy">
                        <div className={`font-display text-xl font-bold ${toneClass}`}>{budgetValues[card.key as keyof typeof budgetValues]}</div>
                        <div className="mt-1 text-xs text-gray-400">{card.label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
