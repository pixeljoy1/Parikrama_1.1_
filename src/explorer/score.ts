/**
 * The explorer's brain — turns (location, traveler profile, ring) into a
 * ranked answer to one question: what here is absolutely worth your time?
 *
 * match = editorial wow × interest affinity, softened so a 10/10 place still
 * surfaces for everyone (the Taj is the Taj, whatever your lens), while the
 * profile decides ordering and the "for you" framing.
 */

import { LatLng, bearingDeg, compass, distanceKm } from '../geo/geo'
import { POIS } from '../data/pois'
import { Interest, Pace, Poi, Ring, RINGS, TravelerProfile } from '../data/types'

export interface ScoredPoi {
  poi: Poi
  km: number
  bearing: number
  dir: string
  /** which ring it falls inside (smallest that contains it) */
  ring: Ring | null
  /** 0–1 personal match */
  match: number
  /** the trait lens that carried the match, for the "why" line */
  topInterest: Interest | null
}

/** How many places each pace wants to see per ring band. */
export const PACE_COUNT: Record<Pace, number> = { relaxed: 3, balanced: 5, packed: 8 }

/** Interest affinity in 0–1: the best overlap between profile and place. */
function affinity(poi: Poi, interests: Interest[]): { a: number; top: Interest | null } {
  if (interests.length === 0) return { a: 0.5, top: null }
  let best = 0
  let top: Interest | null = null
  let sum = 0
  for (const i of interests) {
    const v = poi.cats[i] ?? 0
    sum += v
    if (v > best) {
      best = v
      top = v > 0 ? i : null
    }
  }
  // blend peak with breadth so multi-lens places edge out one-trick ones
  const a = best * 0.75 + Math.min(1, sum / interests.length) * 0.25
  return { a, top }
}

export function ringFor(km: number): Ring | null {
  for (const r of RINGS) if (km <= r) return r
  return null
}

/** Score every POI within `maxKm` of `origin` for this profile. */
export function scoreAround(origin: LatLng, profile: TravelerProfile, maxKm = 30): ScoredPoi[] {
  return scorePois(POIS, origin, profile, maxKm)
}

/** Score any set of places (curated atlas, live OSM discoveries, or both). */
export function scorePois(pois: Poi[], origin: LatLng, profile: TravelerProfile, maxKm = 30): ScoredPoi[] {
  const out: ScoredPoi[] = []
  for (const poi of pois) {
    const km = distanceKm(origin, poi)
    if (km > maxKm) continue
    const { a, top } = affinity(poi, profile.interests)
    // wow floor: a world-class place never scores below ~0.55 of its weight
    const match = (poi.wow / 10) * (0.55 + 0.45 * a)
    const bearing = bearingDeg(origin, poi)
    out.push({ poi, km, bearing, dir: compass(bearing), ring: ringFor(km), match, topInterest: top })
  }
  return out.sort((x, y) => y.match - x.match)
}

/** Drop discoveries that duplicate a curated place (same spot on the map). */
export function dedupeDiscoveries(discovered: Poi[], curated: Poi[]): Poi[] {
  return discovered.filter((d) => !curated.some((c) => distanceKm(d, c) < 0.3))
}

/** The ranked shortlist inside the active ring, sized to the traveler's pace. */
export function shortlist(scored: ScoredPoi[], ring: Ring, pace: Pace): ScoredPoi[] {
  return scored.filter((s) => s.km <= ring).slice(0, PACE_COUNT[pace] * 2)
}

/** Count of places inside each ring — feeds the ring dial labels. */
export function ringCounts(scored: ScoredPoi[]): Record<Ring, number> {
  const counts = { 5: 0, 10: 0, 20: 0, 30: 0 } as Record<Ring, number>
  for (const s of scored) for (const r of RINGS) if (s.km <= r) counts[r]++
  return counts
}

/** A one-line human "why" for a scored place. */
export function whyLine(s: ScoredPoi): string {
  const pct = Math.round(s.match * 100)
  return `${pct}% you · ${s.dir} · ${s.poi.best === 'any' ? 'anytime' : `best at ${s.poi.best}`}`
}
