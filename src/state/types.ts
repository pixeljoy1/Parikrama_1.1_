/** Persisted + navigation types for Parikrama. */

import { Interest, Pace } from '../data/types'

export type Screen = 'onboarding' | 'explore'
export type ThemeId = 'ivory' | 'midnight'

export interface Persisted {
  onboardingComplete: boolean
  interests: Interest[]
  pace: Pace
  /** saved place ids — the traveler's running plan */
  saved: string[]
  /** place ids already visited/checked off */
  seen: string[]
  theme: ThemeId
}

export const DEFAULT_PERSISTED: Persisted = {
  onboardingComplete: false,
  interests: [],
  pace: 'balanced',
  saved: [],
  seen: [],
  theme: 'ivory',
}
