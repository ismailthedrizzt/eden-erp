'use client'
import { LoginExperience } from '@/components/auth/LoginExperience'
import { loginPageContract } from '@/contracts/pages/auth/login.page.contract'

const LOGIN_EXPERIENCE_ENABLED = loginPageContract.requiredComponents.includes(loginPageContract.auth.primaryExperienceComponent)

export default function LoginPage() {
  return LOGIN_EXPERIENCE_ENABLED ? <LoginExperience /> : null
}
