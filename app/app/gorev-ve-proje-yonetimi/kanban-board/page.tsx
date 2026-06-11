import { appGorevVeProjeYonetimiKanbanBoardPageContract } from '@/contracts/pages/generated/app-gorev-ve-proje-yonetimi-kanban-board.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appGorevVeProjeYonetimiKanbanBoardContractReady = requirePageContract(appGorevVeProjeYonetimiKanbanBoardPageContract)
void appGorevVeProjeYonetimiKanbanBoardContractReady

import { ProjectKanbanMvpPage } from '@/components/modules/project-management/ProjectTaskMvpPages'

export default function KanbanBoardPage() {
  return <ProjectKanbanMvpPage />
}
