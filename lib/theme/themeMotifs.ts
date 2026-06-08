import type { ThemeConceptId, ThemeMotifStyle } from '@/components/design-lab/themeConcepts'

export interface EdenThemeMotifDefinition {
  themeKey: ThemeConceptId
  style: ThemeMotifStyle
  pagePlacement: 'corner' | 'full' | 'edge'
  contentPlacement: 'corner' | 'watermark' | 'edge'
  description: string
}

export const EDEN_THEME_MOTIFS: Record<ThemeConceptId, EdenThemeMotifDefinition> = {
  hikmet: { themeKey: 'hikmet', style: 'medrese_geometry', pagePlacement: 'full', contentPlacement: 'corner', description: 'Medrese geometry, star lattice and arch linework.' },
  bozkir: { themeKey: 'bozkir', style: 'steppe_horizon', pagePlacement: 'edge', contentPlacement: 'watermark', description: 'Steppe horizon, sun disk and topographic lines.' },
  esitlik: { themeKey: 'esitlik', style: 'equality_rings', pagePlacement: 'full', contentPlacement: 'watermark', description: 'Solidarity rings and fluid connective lines.' },
  tabiat: { themeKey: 'tabiat', style: 'botanical_line', pagePlacement: 'corner', contentPlacement: 'corner', description: 'Botanical branch and leaf contour linework.' },
  atlas: { themeKey: 'atlas', style: 'atlas_deco', pagePlacement: 'full', contentPlacement: 'edge', description: 'Art Deco skyline, wave bands and architectural beams.' },
  avangard: { themeKey: 'avangard', style: 'avant_grid', pagePlacement: 'full', contentPlacement: 'watermark', description: 'Broken grid, diagonal blocks and graphic accents.' },
}

export function getThemeMotif(themeKey: ThemeConceptId) {
  return EDEN_THEME_MOTIFS[themeKey]
}
