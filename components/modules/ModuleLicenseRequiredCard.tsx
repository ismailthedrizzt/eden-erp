'use client'

import ModuleUnavailableState from './ModuleUnavailableState'

export function ModuleLicenseRequiredCard({
  moduleKey,
  moduleLabel = 'Bu modul',
}: {
  moduleKey: string
  moduleLabel?: string
}) {
  return (
    <ModuleUnavailableState
      moduleKey={moduleKey}
      status="unlicensed"
      title={`${moduleLabel} lisansinizda bulunmuyor`}
      message="Bu alani kullanabilmek icin modul lisanslarinizi veya modul ayarlarinizi kontrol edin."
      actions={[{
        label: 'Modul Lisanslarina Git',
        targetPage: '/app/sistem/module-licenses',
      }]}
    />
  )
}
