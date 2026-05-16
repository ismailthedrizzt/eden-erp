import type { AnyDashboardWidgetConfig, DistributionItem, StackedBarItem, TrendPoint } from '@/components/dashboard/dashboard.types'
import { employeesDashboardLayout } from './employeesDashboard.config'

interface EmployeeDashboardRow {
  id: string
  gender?: string | null
  egitim_durumu?: string | null
  work_type?: string | null
  work_status?: string | null
  employment_status?: string | null
  unit_name?: string | null
  birth_date?: string | null
  sgk_entry_date?: string | null
}

const palette = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#64748b']

export function buildEmployeesDashboard(rows: EmployeeDashboardRow[]): AnyDashboardWidgetConfig[] {
  const total = rows.length
  const active = rows.filter(row => normalize(row.work_status || row.employment_status) === 'active').length
  const thisMonthHires = rows.filter(row => isCurrentMonth(row.sgk_entry_date)).length

  return employeesDashboardLayout.map(widget => {
    switch (widget.id) {
      case 'employees-total':
        return {
          ...widget,
          type: 'kpi',
          value: total,
          label: 'Toplam Çalışan',
          subtitle: `${active} görevde`,
          trend: { value: `+${thisMonthHires} bu ay`, direction: thisMonthHires > 0 ? 'up' : 'flat' },
        }
      case 'employees-gender':
        return { ...widget, type: 'stackedBar', items: groupedItems(rows, 'gender', 'Belirtilmemiş'), normalize: true, showLegend: true }
      case 'employees-education':
        return { ...widget, type: 'stackedBar', items: groupedItems(rows, 'egitim_durumu', 'Belirtilmemiş'), normalize: true, showLegend: true }
      case 'employees-work-type':
        return { ...widget, type: 'stackedBar', items: groupedItems(rows, 'work_type', 'Belirtilmemiş'), normalize: true, showLegend: true }
      case 'employees-department':
        return { ...widget, type: 'stackedBar', items: groupedItems(rows, 'unit_name', 'Departmansız'), normalize: true, showLegend: true }
      case 'employees-age-group':
        return { ...widget, type: 'stackedBar', items: ageItems(rows), normalize: true, showLegend: true }
      case 'employees-hire-trend':
        return { ...widget, type: 'trend', range: '6m', points: hireTrend(rows) }
      case 'employees-department-detail':
        return { ...widget, type: 'distribution', items: groupedItems(rows, 'unit_name', 'Departmansız') as DistributionItem[] }
      case 'employees-actions':
        return {
          ...widget,
          type: 'actionList',
          items: [
            { id: 'missing-sgk', label: 'SGK girişi bekleyenler', description: `${rows.filter(row => !row.sgk_entry_date).length} kayıt`, severity: 'warning', filter: { sgk_entry_date: null } },
            { id: 'missing-birth-date', label: 'Doğum tarihi eksik kayıtlar', description: `${rows.filter(row => !row.birth_date).length} kayıt`, severity: 'info', filter: { birth_date: null } },
          ],
        }
      default:
        return widget as AnyDashboardWidgetConfig
    }
  }) as AnyDashboardWidgetConfig[]
}

function groupedItems(rows: EmployeeDashboardRow[], field: keyof EmployeeDashboardRow, fallback: string): StackedBarItem[] {
  const counts = new Map<string, number>()
  rows.forEach(row => {
    const label = readable(row[field]) || fallback
    counts.set(label, (counts.get(label) || 0) + 1)
  })
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count], index) => ({
      label,
      value: count,
      count,
      color: palette[index % palette.length],
      filter: { [field]: label },
    }))
}

function ageItems(rows: EmployeeDashboardRow[]): StackedBarItem[] {
  const buckets = new Map([['18-25', 0], ['26-35', 0], ['36-45', 0], ['46+', 0], ['Belirsiz', 0]])
  rows.forEach(row => {
    const age = getAge(row.birth_date)
    const key = age === null ? 'Belirsiz' : age <= 25 ? '18-25' : age <= 35 ? '26-35' : age <= 45 ? '36-45' : '46+'
    buckets.set(key, (buckets.get(key) || 0) + 1)
  })
  return Array.from(buckets.entries())
    .filter(([, count]) => count > 0)
    .map(([label, count], index) => ({ label, value: count, count, color: palette[index % palette.length], filter: { ageGroup: label } }))
}

function hireTrend(rows: EmployeeDashboardRow[]): TrendPoint[] {
  const now = new Date()
  const points: TrendPoint[] = []
  for (let offset = 5; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    points.push({
      label: date.toLocaleDateString('tr-TR', { month: 'short' }),
      value: rows.filter(row => String(row.sgk_entry_date || '').startsWith(key)).length,
    })
  }
  return points
}

function getAge(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - date.getFullYear()
  const monthDiff = now.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) age -= 1
  return age
}

function isCurrentMonth(value?: string | null) {
  if (!value) return false
  const now = new Date()
  return String(value).startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
}

function normalize(value?: string | null) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR')
}

function readable(value: unknown) {
  const text = String(value || '').trim()
  if (!text || text === '-') return ''
  return text.replace(/_/g, ' ').replace(/\b\w/g, char => char.toLocaleUpperCase('tr-TR'))
}
