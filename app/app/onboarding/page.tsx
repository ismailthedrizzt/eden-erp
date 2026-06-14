import { redirect } from 'next/navigation'
import { onboardingRedirectPageContract } from '@/contracts/pages/onboarding/onboarding-redirect.page.contract'

export default function OnboardingPage() {
  redirect(onboardingRedirectPageContract.redirect.targetRoute)
}
