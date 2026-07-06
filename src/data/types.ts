/** Core domain types for the Parikrama explorer. */

import { LatLng } from '../geo/geo'

/**
 * Interest lenses — distilled from how Indian tourism actually segments
 * (Ministry of Tourism niche-tourism categories + inbound/domestic traveler
 * research): heritage, pilgrimage/spiritual, nature & wildlife, culinary,
 * arts & crafts, adventure, photography, and wellness/slow travel.
 */
export type Interest =
  | 'heritage'
  | 'spiritual'
  | 'nature'
  | 'food'
  | 'art'
  | 'adventure'
  | 'photo'
  | 'slow'

/** How densely the traveler likes their day packed. */
export type Pace = 'relaxed' | 'balanced' | 'packed'

/** The four exploration rings, km. */
export const RINGS = [5, 10, 20, 30] as const
export type Ring = (typeof RINGS)[number]

export type Fee = 'free' | '₹' | '₹₹'
export type BestTime = 'sunrise' | 'morning' | 'afternoon' | 'sunset' | 'evening' | 'any'

/** A worthwhile place — curated, or discovered live from OpenStreetMap. */
export interface Poi extends LatLng {
  id: string
  hub: string // hub id this place clusters under ('_osm' for discoveries)
  /** true when this came from live OpenStreetMap discovery, not the atlas */
  osm?: boolean
  name: string
  /** interest affinities, 0–1 — how strongly the place delivers each lens */
  cats: Partial<Record<Interest, number>>
  /** editorial "absolutely worthwhile" score, 1–10 */
  wow: number
  /** minutes a visit deserves */
  minutes: number
  fee: Fee
  best: BestTime
  /** one-breath story — why this place matters */
  blurb: string
  /** insider tip — the thing a good local friend would tell you */
  tip: string
  /** OSM wikipedia tag ("en:Article Title") — a direct pointer for photos */
  wikipedia?: string
  /** OSM wikidata QID — the fallback pointer when wikipedia isn't tagged */
  wikidata?: string
}

/** A tourism hub — anchors the manual picker and the "beyond the rings" horizon. */
export interface Hub extends LatLng {
  id: string
  name: string
  state: string
  /** one-line identity of the place */
  line: string
}

export interface TravelerProfile {
  interests: Interest[]
  pace: Pace
}
