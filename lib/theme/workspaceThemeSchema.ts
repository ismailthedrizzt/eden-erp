import { z } from 'zod'

const safeString = z.string().max(500).refine(value => !/(<script|<\/|javascript:|@import|expression\(|<iframe|on\w+=)/i.test(value), {
  message: 'Script, HTML, external executable or CSS injection content is not allowed.',
})

const colorValue = z.string().regex(/^(#(?:[0-9a-fA-F]{3,8})|rgba?\([^)]+\)|hsla?\([^)]+\)|var\(--eden-[a-z0-9-]+\))$/, 'Invalid color token.')
const opacity = z.coerce.number().min(0).max(1)
const dimension = z.union([z.coerce.number(), z.string().regex(/^\d+(\.\d+)?(px|rem|em|%)$/)])

export const workspaceThemeAssetSchema = z.object({
  assetId: safeString,
  assetName: safeString,
  assetType: safeString.default('illustration'),
  assetCategory: safeString,
  sourceType: z.enum(['upload', 'internal-library', 'url-reference']),
  src: safeString.optional(),
  path: safeString.optional(),
  reference: safeString.optional(),
  lightVariant: safeString.optional(),
  darkVariant: safeString.optional(),
  focalPointX: z.coerce.number().min(0).max(100).default(50),
  focalPointY: z.coerce.number().min(0).max(100).default(50),
  fit: z.enum(['cover', 'contain', 'fill']).default('cover'),
  opacity: opacity.default(1),
  overlayColor: colorValue.optional(),
  overlayOpacity: opacity.default(0),
  borderRadius: dimension.optional(),
  visibleOn: z.array(z.enum(['banner', 'list', 'form', 'wizard', 'login', 'dashboard'])).default([]),
  enabled: z.boolean().default(true),
})

export const workspaceThemeJsonSchema = z.object({
  meta: z.object({
    id: safeString,
    name: safeString,
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,80}$/),
    version: safeString.default('0.1.0'),
    mode: z.enum(['light', 'dark', 'system']).default('system'),
    status: z.enum(['draft', 'review', 'approved', 'active', 'archived']).default('draft'),
    scope: z.literal('system'),
    description: safeString.default(''),
  }),
  colors: z.record(z.string(), colorValue).default({}),
  background: z.record(z.string(), z.unknown()).default({}),
  illustrations: z.object({
    pageBanner: z.record(z.string(), workspaceThemeAssetSchema).default({}),
    listArea: z.record(z.string(), workspaceThemeAssetSchema).default({}),
    formArea: z.record(z.string(), workspaceThemeAssetSchema).default({}),
    wizardArea: z.record(z.string(), workspaceThemeAssetSchema).default({}),
    loginArea: z.record(z.string(), workspaceThemeAssetSchema).default({}),
    dashboardArea: z.record(z.string(), workspaceThemeAssetSchema).default({}),
  }).default({}),
  typography: z.record(z.string(), z.unknown()).default({}),
  shape: z.record(z.string(), z.unknown()).default({}),
  spacing: z.record(z.string(), z.unknown()).default({}),
  shadow: z.record(z.string(), z.unknown()).default({}),
  components: z.record(z.string(), z.unknown()).default({}),
  states: z.record(z.string(), z.unknown()).default({}),
  motion: z.record(z.string(), z.unknown()).default({}),
  charts: z.record(z.string(), z.unknown()).default({}),
  figmaTokens: z.record(z.string(), z.unknown()).default({}),
  customCssVariables: z.record(z.string().regex(/^--eden-[a-z0-9-]+$/), safeString).default({}),
}).strict()

export type WorkspaceThemeJson = z.infer<typeof workspaceThemeJsonSchema>
export type WorkspaceThemeAsset = z.infer<typeof workspaceThemeAssetSchema>

export function validateWorkspaceThemeJson(value: unknown) {
  return workspaceThemeJsonSchema.safeParse(value)
}

export const defaultWorkspaceThemeJson: WorkspaceThemeJson = {
  meta: {
    id: 'eden-system-theme',
    name: 'Eden Sistem Teması',
    slug: 'eden-system-theme',
    version: '0.1.0',
    mode: 'system',
    status: 'draft',
    scope: 'system',
    description: 'Eden ERP sistem teması için varsayılan JSON şablonu.',
  },
  colors: {},
  background: {},
  illustrations: {
    pageBanner: {},
    listArea: {},
    formArea: {},
    wizardArea: {},
    loginArea: {},
    dashboardArea: {},
  },
  typography: {},
  shape: {},
  spacing: {},
  shadow: {},
  components: {},
  states: {},
  motion: {},
  charts: {},
  figmaTokens: {},
  customCssVariables: {},
}
