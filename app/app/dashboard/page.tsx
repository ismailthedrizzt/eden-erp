import { redirect } from 'next/navigation'
import { dashboardRedirectPageContract } from '@/contracts/pages/dashboard/dashboard-redirect.page.contract'

export default function DashboardPage() {
  redirect(dashboardRedirectPageContract.redirect.targetRoute)
}
