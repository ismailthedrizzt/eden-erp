import { NextRequest, NextResponse } from 'next/server'
import { employeesDashboardLayout } from '@/lib/modules/employees/dashboard/employeesDashboard.config'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ module: string; widgetId: string }> }
) {
  const { module, widgetId } = await params

  if (module === 'employees') {
    const widget = employeesDashboardLayout.find(item => item.id === widgetId)
    return NextResponse.json({ module, widgetId, widget: widget || null, dataMode: 'mock-config' })
  }

  return NextResponse.json({ module, widgetId, widget: null })
}
