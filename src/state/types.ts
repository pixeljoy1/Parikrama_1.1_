/** Persisted + navigation types for Parikrama. */

import { Interest, Pace, Poi } from '../data/types'

export type Screen = 'onboarding' | 'explore'
export type ThemeId = 'ivory' | 'midnight'

export interface Persisted {
  onboardingComplete: boolean
  interests: Interest[]
  pace: Pace
  /** saved place ids — the traveler's running plan */
  saved: string[]
  /** snapshots of saved OSM discoveries (live finds aren't in the atlas,
   * so the plan keeps its own copy to survive reloads) */
  savedOsm: Record<string, Poi>
  /** place ids already visited/checked off */
  seen: string[]
  theme: ThemeId
}

export const DEFAULT_PERSISTED: Persisted = {
  onboardingComplete: false,
  interests: [],
  pace: 'balanced',
  saved: [],
  savedOsm: {},
  seen: [],
  theme: 'ivory',
}
