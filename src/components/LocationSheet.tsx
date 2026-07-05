/**
 * LocationSheet — where the traveler tells us where they are: re-detect via
 * GPS, or pick any tourism hub by hand (no permission, no GPS, or planning
 * a trip from the couch — the app works either way).
 */

import { useMemo, useState } from 'react'
import { HUBS } from '../data/hubs'
import { useStore } from '../state/store'
import { haptic } from '../state/util'
import { Pill } from './Pill'
import { Sheet } from './Sheet'

export function LocationSheet() {
  const { locationOpen, openLocation, location } = useStore()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return HUBS
    return HUBS.filter((h) => `${h.name} ${h.state}`.toLowerCase().includes(q))
  }, [query])

  const statusLine =
    location.status === 'locating'
      ? 'listening for satellites…'
      : location.status === 'denied'
        ? 'location permission declined — pick a city instead'
        : location.status === 'unavailable'
          ? 'no GPS fix — pick a city instead'
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
        <span className="label">or drop into a city</span>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search 29 hubs — Jaipur, Kochi, Leh…"
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: 14,
          border: '1px solid var(--hairline)',
          background: 'var(--chip)',
          fontSize: 15,
          outline: 'none',
          marginBottom: 14,
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((h) => {
          const current = location.status === 'manual' && location.near?.hub.id === h.id
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
          <p className="mono-lg" style={{ textAlign: 'center', padding: 20 }}>
            nothing matches — try a state name
          </p>
        )}
      </div>
    </Sheet>
  )
}
