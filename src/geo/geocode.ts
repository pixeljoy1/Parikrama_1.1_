/**
 * geocode — free-text "where am I / where to?" for all of India, via the
 * OpenStreetMap Nominatim service (no key). Rate-etiquette: searches fire on
 * explicit user action only, never per keystroke.
 */

import { LatLng } from './geo'

export interface GeoPlace extends LatLng {
  name: string
  /** fuller context line — "Kalpetta, Wayanad, Kerala" */
  display: string
}

export async function searchIndia(query: string): Promise<GeoPlace[]> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=in&q=' +
    encodeURIComponent(query.trim())
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  })
  if (!res.ok) throw new Error(`geocode ${res.status}`)
  const rows = (await res.json()) as Array<{
    name?: string
    display_name: string
    lat: string
    lon: string
  }>
  return rows
    .map((r) => ({
      name: r.name || r.display_name.split(',')[0],
      // trim the display down to the three most local parts, dropping pincode/country
      display: r.display_name
        .split(',')
        .map((s) => s.trim())
        .filter((s) => !/^\d+$/.test(s) && s !== 'India')
        .slice(0, 3)
        .join(', '),
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
}
