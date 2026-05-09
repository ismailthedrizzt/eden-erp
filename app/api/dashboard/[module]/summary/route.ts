import { NextRequest, NextResponse } from 'next/server'
import { employeesDashboardLayout } from '@/lib/modules/employees/dashboard/employeesDashboard.config'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ module: string }> }) {
  const { module } = await params

  if (module === 'employees') {
    return NextResponse.json({
      module,
      widgets: employeesDashboardLayout,
      dataMode: 'mock-config',
      message: 'Dashboard widget data contract is ready for backend-driven summaries.',
    })
  }

  return NextResponse.json({ module, widgets: [] })
}
