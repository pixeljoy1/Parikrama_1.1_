/**
 * Interest lenses — the traveler-research layer.
 *
 * Grounded in how Indian tourism is actually studied and sold: the Ministry of
 * Tourism's niche categories (heritage, pilgrimage, wildlife/eco, adventure,
 * culinary, wellness, rural/crafts) and the classic inbound/domestic traveler
 * segments (culture seekers, pilgrims, nature escapists, foodies, backpackers,
 * photographers, slow travelers). Each lens carries the voice of its traveler.
 */

import { Interest } from './types'

export interface InterestDef {
  id: Interest
  title: string
  glyph: string // single-character mark, not an emoji zoo — quiet and typographic
  line: string // the whisper under the title
  voice: string // how results address this traveler
}

export const INTERESTS: InterestDef[] = [
  {
    id: 'heritage',
    title: 'Heritage & History',
    glyph: '॥',
    line: 'Forts, palaces, stepwells, empires in stone',
    voice: 'centuries within reach',
  },
  {
    id: 'spiritual',
    title: 'Sacred & Spiritual',
    glyph: 'ॐ',
    line: 'Temples, ghats, dargahs, living rituals',
    voice: 'places that hum',
  },
  {
    id: 'nature',
    title: 'Nature & Wildlife',
    glyph: '❀',
    line: 'Lakes, ridges, sanctuaries, botanical calm',
    voice: 'green within the grey',
  },
  {
    id: 'food',
    title: 'Food & Bazaars',
    glyph: '✦',
    line: 'Street legends, old cafés, spice markets',
    voice: 'follow your appetite',
  },
  {
    id: 'art',
    title: 'Art & Craft',
    glyph: '✳',
    line: 'Museums, galleries, weavers, performances',
    voice: 'made by hand, still',
  },
  {
    id: 'adventure',
    title: 'Adventure',
    glyph: '△',
    line: 'Treks, rapids, dunes, cycling at dawn',
    voice: 'earn the view',
  },
  {
    id: 'photo',
    title: 'Photography',
    glyph: '◉',
    line: 'Golden-hour frames, symmetry, street life',
    voice: 'light worth chasing',
  },
  {
    id: 'slow',
    title: 'Slow & Serene',
    glyph: '∼',
    line: 'Gardens, sunset points, chai and quiet',
    voice: 'nowhere to be',
  },
]

export const interestById = (id: Interest) => INTERESTS.find((i) => i.id === id)!
