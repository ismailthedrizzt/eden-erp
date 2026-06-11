'use client'


import { loginPageContract } from '@/contracts/pages/generated/login.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const loginContractReady = requirePageContract(loginPageContract)
void loginContractReady

import { LoginExperience } from '@/components/auth/LoginExperience'

export default function LoginPage() {
  return <LoginExperience />
}
