export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto'

export interface TourStep {
  id: string
  target: string
  fallbackTarget?: string | string[]
  title: string
  description: string
  placement?: TourPlacement
  path?: string
  navigateOnNext?: string
  clickOnNext?: string | string[]
  spotlightPadding?: number
}

export interface TourTargetRect {
  top: number
  left: number
  width: number
  height: number
}
