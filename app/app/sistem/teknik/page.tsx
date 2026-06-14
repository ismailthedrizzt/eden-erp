import { AdminConsolePage } from '@/components/admin/AdminConsolePage'
import { adminConsoleTechnicalPageContract } from '@/contracts/pages/system/admin-console-technical.page.contract'

export default function SistemTeknikPage() {
  return <AdminConsolePage section={adminConsoleTechnicalPageContract.adminConsole.section} />
}
