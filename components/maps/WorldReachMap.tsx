'use client'

import { OpenStreetMapReachMap } from './OpenStreetMapReachMap'
import type { ReachMapProps } from './reachMap.utils'

export function WorldReachMap(props: ReachMapProps) {
  return <OpenStreetMapReachMap {...props} scope="world" />
}
