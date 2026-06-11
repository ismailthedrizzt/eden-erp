import { appOnboardingPageContract } from '@/contracts/pages/generated/app-onboarding.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appOnboardingContractReady = requirePageContract(appOnboardingPageContract)
void appOnboardingContractReady

import { redirect } from 'next/navigation'

export default function OnboardingPage() {
  redirect('/app')
}
