import { AdminConsolePage } from '@/components/admin/AdminConsolePage'
import { adminConsoleWorkspacePageContract } from '@/contracts/pages/system/admin-console-workspace.page.contract'

export default function SistemGenelPage() {
  return <AdminConsolePage section={adminConsoleWorkspacePageContract.adminConsole.section} />
}
