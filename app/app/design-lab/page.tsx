import { appDesignLabPageContract } from '@/contracts/pages/generated/app-design-lab.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appDesignLabContractReady = requirePageContract(appDesignLabPageContract)
void appDesignLabContractReady

import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Temalarımız | Eden ERP',
}

export default function DesignLabPage() {
  redirect('/app/development/temalarimiz')
}
