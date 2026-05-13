import type { ReactNode } from 'react'

export type WidgetType = 'kpi' | 'stackedBar' | 'distribution' | 'trend' | 'actionList' | 'geographicTradeReach'

export interface WidgetAction {
  id: string
  label: string
  icon?: ReactNode
  filter?: Record<string, any>
}

export interface DashboardWidgetSize {
  w: number
  h: number
  minWidth?: number
  minHeight?: number
}

export interface DashboardWidgetConfig {
  id: string
  type: WidgetType
  title: string
  description?: string
  module: string
  size: DashboardWidgetSize
  dataSource: string
  filters?: Record<string, any>
  permissions?: string[]
  actions?: WidgetAction[]
}

export interface DashboardFilterEvent {
  module: string
  field?: string
  value?: any
  filters?: Record<string, any>
  widgetId?: string
  itemId?: string
}

export interface KPIWidgetConfig extends DashboardWidgetConfig {
  type: 'kpi'
  value: string | number
  label?: string
  subtitle?: string
  trend?: {
    value: string
    direction?: 'up' | 'down' | 'flat'
  }
}

export interface StackedBarItem {
  label: string
  value: number
  count?: number
  color?: string
  filter?: Record<string, any>
}

export interface StackedBarWidgetConfig extends DashboardWidgetConfig {
  type: 'stackedBar'
  items: StackedBarItem[]
  total?: number
  showLegend?: boolean
  normalize?: boolean
}

export interface DistributionItem extends StackedBarItem {
  subtitle?: string
}

export interface DistributionWidgetConfig extends DashboardWidgetConfig {
  type: 'distribution'
  items: DistributionItem[]
}

export interface TrendPoint {
  label: string
  value: number
}

export interface TrendWidgetConfig extends DashboardWidgetConfig {
  type: 'trend'
  range: '7d' | '30d' | '6m' | '12m'
  points: TrendPoint[]
}

export interface ActionListItem {
  id: string
  label: string
  description?: string
  dueText?: string
  severity?: 'info' | 'warning' | 'danger' | 'success'
  filter?: Record<string, any>
}

export interface ActionListWidgetConfig extends DashboardWidgetConfig {
  type: 'actionList'
  items: ActionListItem[]
}

export interface GeographicTradeReachWidgetConfig extends DashboardWidgetConfig {
  type: 'geographicTradeReach'
  selectedCompanyId?: string | null
}

export type AnyDashboardWidgetConfig =
  | KPIWidgetConfig
  | StackedBarWidgetConfig
  | DistributionWidgetConfig
  | TrendWidgetConfig
  | ActionListWidgetConfig
  | GeographicTradeReachWidgetConfig
