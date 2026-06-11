import { appSistemLoginSayfasiPageContract } from '@/contracts/pages/generated/app-sistem-login-sayfasi.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemLoginSayfasiContractReady = requirePageContract(appSistemLoginSayfasiPageContract)
void appSistemLoginSayfasiContractReady

import { redirect } from 'next/navigation'

export default function LegacyLoginSettingsPage() {
  redirect('/login')
}
