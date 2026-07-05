/**
 * discover — live nearby finds from OpenStreetMap (Overpass API), so the app
 * is useful ANYWHERE in India, not only near the curated hubs. Around
 * Kalpetta this surfaces the Wayanad waterfalls, Banasura Sagar dam, Edakkal
 * caves — places no hand-curated atlas of 29 hubs could cover.
 *
 * Results are mapped into the same Poi shape (marked `osm: true`), scored a
 * notch below curated places (curation still outranks a bare map tag), and
 * cached per ~1 km grid cell for a day.
 */

import { LatLng } from '../geo/geo'
import { Interest, Poi } from './types'

type Cats = Partial<Record<Interest, number>>

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

/** tag → lens affinities, editorial label, visit-length guess, best hour */
const KINDS: Array<{
  match: (t: Record<string, string>) => boolean
  label: string
  cats: Cats
  minutes: number
  best: Poi['best']
}> = [
  { match: (t) => t.waterway === 'waterfall' || t.natural === 'waterfall', label: 'Waterfall', cats: { nature: 0.9, photo: 0.7, adventure: 0.4 }, minutes: 90, best: 'morning' },
  { match: (t) => t.man_made === 'dam' || t.landuse === 'reservoir', label: 'Dam & reservoir', cats: { nature: 0.6, photo: 0.6, slow: 0.6 }, minutes: 75, best: 'sunset' },
  { match: (t) => t.tourism === 'viewpoint', label: 'Viewpoint', cats: { photo: 0.9, nature: 0.6, slow: 0.5 }, minutes: 45, best: 'sunset' },
  { match: (t) => t.natural === 'peak', label: 'Peak', cats: { adventure: 0.8, nature: 0.8, photo: 0.7 }, minutes: 180, best: 'sunrise' },
  { match: (t) => t.natural === 'beach', label: 'Beach', cats: { nature: 0.7, slow: 0.8, photo: 0.5 }, minutes: 120, best: 'sunset' },
  { match: (t) => t.tourism === 'museum' || t.tourism === 'gallery', label: 'Museum', cats: { art: 0.9, heritage: 0.5 }, minutes: 90, best: 'any' },
  { match: (t) => ['fort', 'castle', 'palace'].includes(t.historic ?? ''), label: 'Fort & palace', cats: { heritage: 0.9, photo: 0.6 }, minutes: 120, best: 'morning' },
  { match: (t) => ['ruins', 'archaeological_site', 'monument', 'memorial', 'tomb'].includes(t.historic ?? ''), label: 'Historic site', cats: { heritage: 0.8, photo: 0.5 }, minutes: 75, best: 'morning' },
  { match: (t) => t.historic === 'temple' || (t.tourism === 'attraction' && t.amenity === 'place_of_worship'), label: 'Sacred place', cats: { spiritual: 0.8, heritage: 0.5 }, minutes: 60, best: 'morning' },
  { match: (t) => t.leisure === 'nature_reserve' || t.boundary === 'national_park', label: 'Nature reserve', cats: { nature: 1, adventure: 0.5, photo: 0.5 }, minutes: 180, best: 'morning' },
  { match: (t) => t.tourism === 'zoo' || t.tourism === 'theme_park', label: 'Park & wildlife', cats: { nature: 0.5, slow: 0.5 }, minutes: 150, best: 'morning' },
  { match: (t) => t.tourism === 'attraction', label: 'Attraction', cats: { heritage: 0.4, photo: 0.5, slow: 0.4, nature: 0.3 }, minutes: 60, best: 'any' },
]

const QUERY = (lat: number, lng: number, rMeters: number) => `
[out:json][timeout:20];
(
  nwr["tourism"~"^(attraction|viewpoint|museum|gallery|zoo|theme_park)$"]["name"](around:${rMeters},${lat},${lng});
  nwr["historic"~"^(fort|castle|palace|monument|ruins|archaeological_site|tomb|memorial|temple)$"]["name"](around:${rMeters},${lat},${lng});
  nwr["waterway"="waterfall"]["name"](around:${rMeters},${lat},${lng});
  nwr["natural"="waterfall"]["name"](around:${rMeters},${lat},${lng});
  nwr["man_made"="dam"]["name"](around:${rMeters},${lat},${lng});
  nwr["leisure"="nature_reserve"]["name"](around:${rMeters},${lat},${lng});
  nwr["boundary"="national_park"]["name"](around:${rMeters},${lat},${lng});
  nwr["natural"~"^(peak|beach)$"]["name"]["wikidata"](around:${rMeters},${lat},${lng});
);
out center tags 200;`

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const CACHE_TTL = 24 * 3600 * 1000
const cacheKey = (p: LatLng) => `parikrama.osm.v1.${p.lat.toFixed(2)},${p.lng.toFixed(2)}`

function toPoi(el: OverpassElement): Poi | null {
  const tags = el.tags ?? {}
  const name = tags.name
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  if (!name || lat == null || lng == null) return null
  const kind = KINDS.find((k) => k.match(tags))
  if (!kind) return null

  // notability heuristic: a wiki link means travelers already write about it
  let wow = 5
  if (tags.wikidata) wow += 1.5
  if (tags.wikipedia) wow += 1
  if (tags.heritage) wow += 0.5
  wow = Math.min(8.5, wow)

  return {
    id: `osm-${el.type}-${el.id}`,
    hub: '_osm',
    osm: true,
    name,
    lat,
    lng,
    cats: kind.cats,
    wow,
    minutes: kind.minutes,
    fee: tags.fee === 'yes' ? '₹' : 'free',
    best: kind.best,
    blurb: `${kind.label} — found live on the open map of this area${tags.wikipedia || tags.wikidata ? '; notable enough to have its own wiki entry' : ''}.`,
    tip: '',
  }
}

/** Fetch worthwhile places around a point from OSM, with a day-long cache. */
export async function discoverAround(p: LatLng, radiusKm = 30): Promise<Poi[]> {
  const key = cacheKey(p)
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const { ts, pois } = JSON.parse(raw) as { ts: number; pois: Poi[] }
      if (Date.now() - ts < CACHE_TTL) return pois
    }
  } catch {
    /* cache miss */
  }

  // Overpass' Apache is picky about POST + Content-Type; a plain-body POST with
  // no encoding declaration reliably returns 200 across mirrors + browser fetches.
  const query = QUERY(p.lat, p.lng, radiusKm * 1000)
  let json: { elements: OverpassElement[] } | null = null
  let lastErr = 'unknown'
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: query,
        signal: AbortSignal.timeout(30_000),
      })
      if (!res.ok) {
        lastErr = `${url.split('/')[2]} → HTTP ${res.status}`
        continue
      }
      json = await res.json()
      break
    } catch (e) {
      lastErr = `${url.split('/')[2]} → ${(e as Error).name || 'fetch failed'}`
    }
  }
  if (!json) throw new Error(lastErr)

  // dedupe by name (a fort mapped as node + way should appear once)
  const seen = new Set<string>()
  const pois: Poi[] = []
  for (const el of json.elements) {
    const poi = toPoi(el)
    if (!poi) continue
    const nameKey = poi.name.toLowerCase()
    if (seen.has(nameKey)) continue
    seen.add(nameKey)
    pois.push(poi)
  }
  // keep the most notable first, cap so the radar stays legible
  pois.sort((a, b) => b.wow - a.wow)
  const capped = pois.slice(0, 80)

  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), pois: capped }))
  } catch {
    /* storage full — fine, it's a cache */
  }
  return capped
}
