'use client'

import ModuleUnavailableState from './ModuleUnavailableState'

export function ModuleSetupRequiredCard({
  moduleKey,
  moduleLabel = 'Bu modul',
}: {
  moduleKey: string
  moduleLabel?: string
}) {
  return (
    <ModuleUnavailableState
      moduleKey={moduleKey}
      status="setup_required"
      title={`${moduleLabel} kuruluma ihtiyac duyuyor`}
      message="Bu alani kullanabilmek icin modul kurulumunu tamamlamaniz gerekiyor."
      actions={[{
        label: 'Kuruluma Git',
        targetPage: `/app/sistem/kurulum?module=${encodeURIComponent(moduleKey)}`,
      }]}
    />
  )
}
