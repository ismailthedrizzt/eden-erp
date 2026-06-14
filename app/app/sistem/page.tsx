import { AdminConsolePage } from '@/components/admin/AdminConsolePage'
import { adminConsolePageContract } from '@/contracts/pages/system/admin-console.page.contract'

export default function SistemPage() {
  return <AdminConsolePage section={adminConsolePageContract.adminConsole.section} />
}
