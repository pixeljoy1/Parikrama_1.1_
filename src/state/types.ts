/** Persisted + navigation types for Parikrama. */

import { Interest, Pace, Poi } from '../data/types'

export type Screen = 'onboarding' | 'home' | 'explore'
export type ThemeId = 'ivory' | 'midnight'

/**
 * A trip — a named collection of saved places (Airbnb-style). Users can have
 * many trips: "Kerala backwaters", "Rajasthan week", "Weekend around Blr"…
 * Every saved place belongs to at least one trip. Deleting a trip removes
 * its membership but doesn't touch other trips a place also belongs to.
 */
export interface Trip {
  id: string
  name: string
  createdAt: number
  placeIds: string[]
}

export interface Persisted {
  onboardingComplete: boolean
  interests: Interest[]
  pace: Pace
  /** legacy flat list — kept for back-compat/migration; not written to on new saves */
  saved: string[]
  /** snapshots of saved OSM discoveries (live finds aren't in the atlas,
   * so trips keep their own copy to survive reloads) */
  savedOsm: Record<string, Poi>
  /** place ids already visited/checked off */
  seen: string[]
  theme: ThemeId
  /** the traveler's trips — most recent first */
  trips: Trip[]
  /** which trip a quick-save goes to; falls back to first trip if unset */
  activeTripId: string
  /** the most recent location the user was exploring — for "continue where you left off" */
  lastLocation?: { name: string; lat: number; lng: number }
}

export const DEFAULT_PERSISTED: Persisted = {
  onboardingComplete: false,
  interests: [],
  pace: 'balanced',
  saved: [],
  savedOsm: {},
  seen: [],
  theme: 'ivory',
  trips: [],
  activeTripId: '',
}
