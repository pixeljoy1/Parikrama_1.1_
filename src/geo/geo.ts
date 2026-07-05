/**
 * geo — great-circle math for the explorer.
 * Everything works on plain { lat, lng } degrees; distances in km.
 */

export interface LatLng {
  lat: number
  lng: number
}

const R = 6371 // earth radius, km
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** Haversine distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Initial bearing from a → b, degrees clockwise from true north (0–360). */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const φ1 = rad(a.lat)
  const φ2 = rad(b.lat)
  const Δλ = rad(b.lng - a.lng)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (deg(Math.atan2(y, x)) + 360) % 360
}

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

/** Compass point for a bearing — "NE", "SW"… */
export function compass(bearing: number): string {
  return POINTS[Math.round(bearing / 45) % 8]
}

/** "1.2 km" under 10, "14 km" above — reads like a signpost. */
export function fmtKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
}

/** "N 28.6139° · E 77.2090°" — the quiet mono coordinate line. */
export function fmtCoords(p: LatLng): string {
  const ns = p.lat >= 0 ? 'N' : 'S'
  const ew = p.lng >= 0 ? 'E' : 'W'
  return `${ns} ${Math.abs(p.lat).toFixed(4)}° · ${ew} ${Math.abs(p.lng).toFixed(4)}°`
}

/** Rough India bounding box — to sanity-check a detected fix. */
export function isInIndia(p: LatLng): boolean {
  return p.lat >= 6.4 && p.lat <= 37.3 && p.lng >= 68.0 && p.lng <= 97.5
}

/** Google Maps deep link — opens the native app on device, web elsewhere. */
export function mapsUrl(p: LatLng, name?: string): string {
  const q = name ? encodeURIComponent(name) : `${p.lat},${p.lng}`
  return `https://www.google.com/maps/search/?api=1&query=${q}&center=${p.lat},${p.lng}`
}
