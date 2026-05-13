'use client'

import { OpenStreetMapReachMap } from './OpenStreetMapReachMap'
import type { ReachMapProps } from './reachMap.utils'

export function TurkeyReachMap(props: ReachMapProps) {
  return <OpenStreetMapReachMap {...props} scope="turkey" />
}
