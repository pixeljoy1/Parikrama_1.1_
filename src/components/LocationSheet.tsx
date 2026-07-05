/**
 * LocationSheet — where the traveler tells us where they are: re-detect via
 * GPS, pick a curated hub, or search ANY place in India by name (Kalpetta,
 * Ziro, Chettinad…) via OpenStreetMap geocoding. No permission, no GPS, or
 * planning from the couch — the app works either way.
 */

import { useMemo, useState } from 'react'
import { HUBS } from '../data/hubs'
import { GeoPlace, searchIndia } from '../geo/geocode'
import { useStore } from '../state/store'
import { haptic } from '../state/util'
import { Pill } from './Pill'
import { Sheet } from './Sheet'

type SearchState = 'idle' | 'searching' | 'done' | 'error'

export function LocationSheet() {
  const { locationOpen, openLocation, location } = useStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoPlace[]>([])
  const [search, setSearch] = useState<SearchState>('idle')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return HUBS
    return HUBS.filter((h) => `${h.name} ${h.state}`.toLowerCase().includes(q))
  }, [query])

  const runSearch = async () => {
    const q = query.trim()
    if (q.length < 2 || search === 'searching') return
    haptic.light()
    setSearch('searching')
    setResults([])
    try {
      setResults(await searchIndia(q))
      setSearch('done')
    } catch {
      setSearch('error')
    }
  }

  const pickPlace = (r: GeoPlace) => {
    haptic.medium()
    location.choosePlace(r.name, { lat: r.lat, lng: r.lng })
    setQuery('')
    setResults([])
    setSearch('idle')
    openLocation(false)
  }

  const statusLine =
    location.status === 'locating'
      ? 'listening for satellites…'
      : location.status === 'denied'
        ? 'location permission declined — allow it in your browser/app settings, or search below'
        : location.status === 'unavailable'
          ? 'no GPS fix (indoors?) — try again near a window, or search below'
          : location.status === 'live'
            ? 'live fix acquired'
            : 'choose how to place yourself'

  return (
    <Sheet open={locationOpen} onClose={() => openLocation(false)} title="Where are you?">
      <div className="mono-lg" style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
        <span className="status-dot" />
        <span>{statusLine}</span>
      </div>

      <Pill
        full
        onClick={() => {
          location.detect()
        }}
        style={{ marginBottom: 20 }}
      >
        {location.status === 'locating' ? 'Detecting…' : 'Use my location'}
      </Pill>

      <div className="sect" style={{ marginBottom: 12 }}>
        <span className="label">or type any place in India</span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          runSearch()
        }}
        style={{ display: 'flex', gap: 8, marginBottom: 14 }}
      >
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSearch('idle')
          }}
          placeholder="Kalpetta, Ziro, Orchha, Gokarna…"
          enterKeyHint="search"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '12px 16px',
            borderRadius: 14,
            border: '1px solid var(--hairline)',
            background: 'var(--chip)',
            fontSize: 15,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          className="quiet-btn"
          style={{ flexShrink: 0, color: query.trim().length >= 2 ? 'var(--accent)' : undefined }}
        >
          {search === 'searching' ? '…' : 'search'}
        </button>
      </form>

      {/* geocoded finds — anywhere in India */}
      {search === 'error' && (
        <p className="mono-lg" style={{ color: 'var(--danger)', margin: '0 0 14px' }}>
          search failed — check your connection and try again
        </p>
      )}
      {search === 'done' && results.length === 0 && (
        <p className="mono-lg" style={{ margin: '0 0 14px' }}>
          nothing found in India for “{query.trim()}” — try the town or district name
        </p>
      )}
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {results.map((r, i) => (
            <button
              key={`${r.lat},${r.lng},${i}`}
              onClick={() => pickPlace(r)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 12,
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: 14,
                border: '1px solid var(--accent-line)',
                background: 'var(--accent-soft)',
              }}
            >
              <span>
                <span style={{ fontSize: 16, fontWeight: 400 }}>{r.name}</span>
                <span className="mono" style={{ display: 'block', marginTop: 3, textTransform: 'none' }}>
                  {r.display}
                </span>
              </span>
              <span className="mono" style={{ flexShrink: 0, color: 'var(--accent)' }}>
                center here →
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="sect" style={{ marginBottom: 12 }}>
        <span className="label">curated hubs</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((h) => {
          const current = location.status === 'manual' && location.placeName === h.name
          return (
            <button
              key={h.id}
              onClick={() => {
                haptic.medium()
                location.chooseHub(h.id)
                openLocation(false)
              }}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 12,
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: 14,
                border: `1px solid ${current ? 'var(--accent-line)' : 'var(--hairline)'}`,
                background: current ? 'var(--accent-soft)' : 'transparent',
              }}
            >
              <span>
                <span style={{ fontSize: 16, fontWeight: 400 }}>{h.name}</span>
                <span className="mono" style={{ display: 'block', marginTop: 3 }}>
                  {h.line}
                </span>
              </span>
              <span className="mono" style={{ flexShrink: 0 }}>{h.state}</span>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="mono-lg" style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            no hub matches — use search above to find “{query.trim()}” anywhere in India
          </p>
        )}
      </div>
    </Sheet>
  )
}
