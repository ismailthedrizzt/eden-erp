import type { EdenPageContract } from '../../core/page.contract'
import { profileFormContract } from '../../forms/security/profile.form.contract'

export const profilePageContract = {
  route: '/app/profil',
  pageKind: 'form',
  owningEntity: 'security_user_profile',
  allowedActions: ['update_profile', 'upload_avatar', 'delete_avatar'],
  requiredComponents: ['UserAvatar', 'ProfileForm', 'AvatarUploadAdapter'],
  requiredStates: {
    empty: true,
    loading: true,
    error: true,
  },
  releaseStatus: 'live',
  visibleInProduction: true,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  form: profileFormContract,
  profile: {
    pageTitle: 'Profilim',
    roleFallbackLabel: 'Tenant kullanicisi',
    profileSectionTitle: 'Tenant ici kisi profili',
    accountSectionTitle: 'Login hesabi',
    avatarSectionTitle: 'Avatar',
  },
} as const satisfies EdenPageContract & {
  profile: {
    pageTitle: string
    roleFallbackLabel: string
    profileSectionTitle: string
    accountSectionTitle: string
    avatarSectionTitle: string
  }
}
