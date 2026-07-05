/**
 * PlanSheet — the traveler's running plan: everything saved, ordered by
 * distance from here, with been-there strikethroughs.
 */

import { useMemo } from 'react'
import { poiById } from '../data/pois'
import { bearingDeg, compass, distanceKm, fmtKm, mapsUrl } from '../geo/geo'
import { useStore } from '../state/store'
import { haptic } from '../state/util'
import { Sheet } from './Sheet'

export function PlanSheet() {
  const { planOpen, openPlan, persisted, toggleSaved, location, openPlace } = useStore()
  const origin = location.point

  const items = useMemo(() => {
    const list = persisted.saved
      // curated atlas first, then the persisted snapshot for OSM discoveries
      .map((id) => poiById(id) ?? persisted.savedOsm[id])
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({
        p,
        km: origin ? distanceKm(origin, p) : null,
        dir: origin ? compass(bearingDeg(origin, p)) : null,
      }))
    return list.sort((a, b) => (a.km ?? 0) - (b.km ?? 0))
  }, [persisted.saved, persisted.savedOsm, origin])

  return (
    <Sheet open={planOpen} onClose={() => openPlan(false)} title="My plan">
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0 12px' }}>
          <div className="serif-i" style={{ fontSize: 20, marginBottom: 8 }}>
            Nothing circled yet.
          </div>
          <p className="mono-lg" style={{ margin: 0 }}>
            tap a place → “add to my plan”
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(({ p, km, dir }) => {
            const seen = persisted.seen.includes(p.id)
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: '1px solid var(--hairline)',
                  background: 'var(--chip)',
                  opacity: seen ? 0.55 : 1,
                }}
              >
                <button
                  style={{ flex: 1, textAlign: 'left' }}
                  onClick={() => {
                    openPlan(false)
                    openPlace(p.id)
                  }}
                >
                  <span
                    style={{
                      fontSize: 15.5,
                      fontWeight: 400,
                      textDecoration: seen ? 'line-through' : 'none',
                    }}
                  >
                    {p.name}
                  </span>
                  <span className="mono" style={{ display: 'block', marginTop: 3 }}>
                    {km != null ? `${fmtKm(km)} ${dir}` : p.hub}
                    {seen ? ' · been' : ''}
                  </span>
                </button>
                <a
                  className="mono"
                  href={mapsUrl(p, p.name)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--accent-2)', textDecoration: 'none', flexShrink: 0 }}
                >
                  maps ↗
                </a>
                <button
                  className="mono"
                  onClick={() => {
                    haptic.light()
                    toggleSaved(p.id)
                  }}
                  style={{ color: 'var(--text-ghost)', flexShrink: 0 }}
                  aria-label={`Remove ${p.name}`}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}
