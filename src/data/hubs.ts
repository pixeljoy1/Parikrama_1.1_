/**
 * Tourism hubs — the anchors of the curated map.
 * Used for: the manual location picker (no GPS / outside India), snapping a
 * detected fix to its nearest hub for context, and the "beyond the rings"
 * horizon that points at the nearest other wonders.
 */

import { LatLng, distanceKm } from '../geo/geo'
import { Hub } from './types'

export const HUBS: Hub[] = [
  { id: 'delhi', name: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, line: 'Seven cities stacked on one another' },
  { id: 'agra', name: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081, line: 'The Mughal high noon' },
  { id: 'jaipur', name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, line: 'The pink geometry of Rajputana' },
  { id: 'udaipur', name: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lng: 73.7125, line: 'White palaces adrift on lakes' },
  { id: 'jodhpur', name: 'Jodhpur', state: 'Rajasthan', lat: 26.2389, lng: 73.0243, line: 'The blue city under Mehrangarh' },
  { id: 'jaisalmer', name: 'Jaisalmer', state: 'Rajasthan', lat: 26.9157, lng: 70.9083, line: 'A sandstone fort that is still alive' },
  { id: 'pushkar', name: 'Pushkar', state: 'Rajasthan', lat: 26.4897, lng: 74.5511, line: 'A sacred lake ringed by ghats' },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777, line: 'Maximum city, sea-facing' },
  { id: 'goa', name: 'Goa (Panaji)', state: 'Goa', lat: 15.4909, lng: 73.8278, line: 'Indo-Portuguese ease by the Arabian Sea' },
  { id: 'varanasi', name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739, line: 'The oldest living city, facing the Ganga' },
  { id: 'amritsar', name: 'Amritsar', state: 'Punjab', lat: 31.634, lng: 74.8723, line: 'Gold, langar, and an open door' },
  { id: 'rishikesh', name: 'Rishikesh', state: 'Uttarakhand', lat: 30.0869, lng: 78.2676, line: 'Where the Ganga leaves the mountains' },
  { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, line: 'India’s cultural conscience' },
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, line: 'Temple gopurams and Marina winds' },
  { id: 'madurai', name: 'Madurai', state: 'Tamil Nadu', lat: 9.9252, lng: 78.1198, line: 'A 2,500-year-old temple city' },
  { id: 'hampi', name: 'Hampi', state: 'Karnataka', lat: 15.335, lng: 76.46, line: 'A fallen empire among the boulders' },
  { id: 'mysuru', name: 'Mysuru', state: 'Karnataka', lat: 12.2958, lng: 76.6394, line: 'Palaces, sandalwood, and jasmine' },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, line: 'Garden city with a future habit' },
  { id: 'kochi', name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, line: 'Spice-port layers: Dutch, Jewish, Portuguese' },
  { id: 'munnar', name: 'Munnar', state: 'Kerala', lat: 10.0889, lng: 77.0595, line: 'Tea to the horizon' },
  { id: 'leh', name: 'Leh', state: 'Ladakh', lat: 34.1526, lng: 77.5771, line: 'High-altitude silence and gompas' },
  { id: 'shimla', name: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734, line: 'A colonial ridge in the cedars' },
  { id: 'darjeeling', name: 'Darjeeling', state: 'West Bengal', lat: 27.036, lng: 88.2627, line: 'Kanchenjunga over the tea gardens' },
  { id: 'khajuraho', name: 'Khajuraho', state: 'Madhya Pradesh', lat: 24.8318, lng: 79.9199, line: 'Stone carved into life itself' },
  { id: 'aurangabad', name: 'Aurangabad', state: 'Maharashtra', lat: 19.8762, lng: 75.3433, line: 'Gateway to Ellora and Ajanta' },
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867, line: 'Nizami grace and biryani smoke' },
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, line: 'India’s first World Heritage city' },
  { id: 'bhubaneswar', name: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245, line: 'A thousand temples in laterite' },
  { id: 'pondicherry', name: 'Puducherry', state: 'Puducherry', lat: 11.9416, lng: 79.8083, line: 'A French grid by the Bay of Bengal' },
]

export const hubById = (id: string) => HUBS.find((h) => h.id === id)

/** Nearest hub to a point, with its distance. */
export function nearestHub(p: LatLng): { hub: Hub; km: number } {
  let best = HUBS[0]
  let bestKm = Infinity
  for (const h of HUBS) {
    const d = distanceKm(p, h)
    if (d < bestKm) {
      bestKm = d
      best = h
    }
  }
  return { hub: best, km: bestKm }
}

/** Hubs sorted by distance from a point, excluding ones within `excludeKm`. */
export function horizonHubs(p: LatLng, excludeKm = 30, count = 4): Array<{ hub: Hub; km: number }> {
  return HUBS.map((hub) => ({ hub, km: distanceKm(p, hub) }))
    .filter((e) => e.km > excludeKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, count)
}
