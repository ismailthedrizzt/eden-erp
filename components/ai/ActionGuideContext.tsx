'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ActionGuideContext as ActionGuidePageContext } from '@/lib/ai/actionGuide'

type ActionGuideContextValue = {
  pageContext: ActionGuidePageContext
  setPageContext: (context: ActionGuidePageContext) => void
}

const ActionGuideContext = createContext<ActionGuideContextValue | null>(null)

export function ActionGuideProvider({ children }: { children: React.ReactNode }) {
  const [pageContext, setPageContext] = useState<ActionGuidePageContext>({})
  const value = useMemo(() => ({ pageContext, setPageContext }), [pageContext])
  return <ActionGuideContext.Provider value={value}>{children}</ActionGuideContext.Provider>
}

export function useActionGuideContext() {
  const context = useContext(ActionGuideContext)
  if (!context) throw new Error('useActionGuideContext must be used within ActionGuideProvider')
  return context
}

export function useRegisterActionGuideContext(context: ActionGuidePageContext) {
  const { setPageContext } = useActionGuideContext()

  useEffect(() => {
    setPageContext({
      currentPage: context.currentPage,
      selectedRecordId: context.selectedRecordId,
      selectedRecordType: context.selectedRecordType,
      selectedRecordStatus: context.selectedRecordStatus,
      companyId: context.companyId,
      branchId: context.branchId,
      organizationUnitId: context.organizationUnitId,
      facilityId: context.facilityId,
      activeCompanyId: context.activeCompanyId,
      activeBranchId: context.activeBranchId,
      route: context.route,
      availableModules: context.availableModules,
    })
    return () => setPageContext({})
  }, [
    setPageContext,
    context.currentPage,
    context.selectedRecordId,
    context.selectedRecordType,
    context.selectedRecordStatus,
    context.companyId,
    context.branchId,
    context.organizationUnitId,
    context.facilityId,
    context.activeCompanyId,
    context.activeBranchId,
    context.route,
    context.availableModules,
  ])
}
