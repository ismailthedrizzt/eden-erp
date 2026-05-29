import { PERMISSIONS } from '@/packages/shared/src/permissions'

export const aiCopilotPermissions = [
  { key: PERMISSIONS.aiCopilot.use, label: 'AI Copilot kullan' },
  { key: PERMISSIONS.aiCopilot.formAssist, label: 'AI form assist kullan' },
  { key: PERMISSIONS.aiCopilot.documentIntelligence, label: 'AI belge zekasi kullan' },
  { key: PERMISSIONS.aiCopilot.adminAssist, label: 'AI admin yardimi kullan' },
  { key: PERMISSIONS.aiCopilot.viewHistory, label: 'AI gecmisini gor' },
  { key: PERMISSIONS.aiCopilot.manageSettings, label: 'AI ayarlarini yonet' },
] as const
