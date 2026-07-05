/**
 * Explore — the home surface. You at the center, the parikrama rings around
 * you, and beneath them the ranked truth: what is absolutely worth it inside
 * the circle you chose, then the horizon beyond it.
 */

import { useMemo, useState } from 'react'
import { PlaceCard } from '../components/PlaceCard'
import { PlaceSheet } from '../components/PlaceSheet'
import { Radar } from '../components/Radar'
import { Reveal } from '../components/Reveal'
import { RingDial } from '../components/RingDial'
import { HUBS, horizonHubs } from '../data/hubs'
import { Ring } from '../data/types'
import { PACE_COUNT, ringCounts, scoreAround } from '../explorer/score'
import { bearingDeg, compass, fmtCoords, fmtKm } from '../geo/geo'
import { useStore } from '../state/store'
import { greeting, haptic, nextInvitation, prefersReducedMotion } from '../state/util'
import { Pill } from '../components/Pill'

export function Explore() {
  const { persisted, location, openSettings, openPlan, openLocation, placeId, openPlace } = useStore()
  const [ring, setRing] = useState<Ring>(10)
  const [invitation] = useState(nextInvitation)
  const reduce = useMemo(prefersReducedMotion, [])

  const origin = location.point
  const profile = { interests: persisted.interests, pace: persisted.pace }

  // score the whole atlas once per location/profile; slices derive from it
  const scoredAll = useMemo(
    () => (origin ? scoreAround(origin, profile, 1e9) : []),
    [origin?.lat, origin?.lng, persisted.interests.join(','), persisted.pace],
  )
  const within30 = useMemo(() => scoredAll.filter((s) => s.km <= 30), [scoredAll])
  const counts = useMemo(() => ringCounts(within30), [within30])
  const list = useMemo(
    () => within30.filter((s) => s.km <= ring).slice(0, PACE_COUNT[persisted.pace] * 2),
    [within30, ring, persisted.pace],
  )
  const horizon = useMemo(() => (origin ? horizonHubs(origin, 30, 4) : []), [origin?.lat, origin?.lng])
  const selected = useMemo(() => scoredAll.find((s) => s.poi.id === placeId) ?? null, [scoredAll, placeId])

  const locLabel = !origin
    ? 'no location yet'
    : location.near && location.near.km > 2
      ? `${fmtKm(location.near.km)} from ${location.near.hub.name}`
      : location.near
        ? location.near.hub.name
        : 'your fix'

  return (
    <div className="screen" style={{ overflowY: 'auto' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 'max(20px, env(safe-area-inset-top)) 22px 60px' }}>
        {/* ── top bar ── */}
        <header
          className="reveal d1"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="pulse-dot" />
            <span className="serif" style={{ fontSize: 21 }}>Parikrama</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="quiet-btn" onClick={() => openPlan(true)}>
              plan{persisted.saved.length > 0 ? ` · ${persisted.saved.length}` : ''}
            </button>
            <button className="quiet-btn" onClick={() => openSettings(true)} aria-label="Settings">
              ⚙
            </button>
          </div>
        </header>

        {/* ── hero ── */}
        <section className="reveal d2" style={{ marginBottom: 22 }}>
          <div className="mono" style={{ marginBottom: 10 }}>
            {greeting()} · {origin ? fmtCoords(origin) : 'coordinates pending'}
          </div>
          <h1 className="serif ink" style={{ fontSize: 'clamp(32px, 8vw, 44px)', lineHeight: 1.08, margin: '0 0 10px' }}>
            {invitation}
          </h1>
          <button
            onClick={() => {
              haptic.light()
              openLocation(true)
            }}
            className="mono-lg"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent-2)' }}
          >
            <span className="status-dot" style={{ background: 'var(--accent-2)' }} />
            {location.status === 'live' ? 'live · ' : location.status === 'manual' ? 'set · ' : ''}
            {locLabel} — change ↓
          </button>
          {location.outsideIndia && (
            <p className="mono-lg" style={{ marginTop: 8, color: 'var(--danger)' }}>
              your fix is outside India — pick a hub to explore from
            </p>
          )}
        </section>

        {!origin ? (
          /* ── no-location state ── */
          <section className="reveal d3 soft-panel" style={{ background: 'var(--surface-raised)', border: '1px solid var(--hairline)', borderRadius: 22, padding: '30px 24px', textAlign: 'center' }}>
            <div className="serif-i" style={{ fontSize: 22, marginBottom: 10 }}>
              The circles need a center.
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14.5, margin: '0 0 20px' }}>
              Detect your location, or drop into any of {HUBS.length} hubs across India.
            </p>
            <Pill full onClick={location.detect} style={{ marginBottom: 10 }}>
              {location.status === 'locating' ? 'Detecting…' : 'Detect my location'}
            </Pill>
            <Pill full variant="ghost" onClick={() => openLocation(true)}>
              Choose a city
            </Pill>
          </section>
        ) : (
          <>
            {/* ── radar ── */}
            <Reveal
              className="soft-panel"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--hairline)',
                borderRadius: 24,
                padding: '18px 14px 8px',
                marginBottom: 14,
              }}
            >
              <Radar
                scored={within30}
                activeRing={ring}
                selectedId={placeId}
                onPick={openPlace}
                reduceMotion={reduce}
              />
              <p className="mono" style={{ textAlign: 'center', margin: '4px 0 10px' }}>
                {within30.length > 0
                  ? `${within30.length} worthwhile place${within30.length === 1 ? '' : 's'} inside 30 km`
                  : 'the atlas is quiet here — see the horizon below'}
              </p>
            </Reveal>

            {/* ── ring dial ── */}
            <Reveal style={{ marginBottom: 30 }}>
              <RingDial active={ring} counts={counts} onChange={setRing} />
            </Reveal>

            {/* ── the shortlist ── */}
            <Reveal as="section" style={{ marginBottom: 38 }}>
              <div className="sect" style={{ marginBottom: 16 }}>
                <span className="label">absolutely worth it · within {ring} km</span>
              </div>
              {list.length === 0 ? (
                <p className="serif-i" style={{ color: 'var(--text-secondary)', fontSize: 17 }}>
                  Nothing curated inside this circle — widen the ring, or ride toward the horizon.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {list.map((s, i) => (
                    <Reveal key={s.poi.id} delay={Math.min(i, 5) * 60}>
                      <PlaceCard s={s} saved={persisted.saved.includes(s.poi.id)} onOpen={() => openPlace(s.poi.id)} />
                    </Reveal>
                  ))}
                </div>
              )}
            </Reveal>

            {/* ── the horizon ── */}
            {horizon.length > 0 && (
              <Reveal as="section" style={{ marginBottom: 38 }}>
                <div className="sect" style={{ marginBottom: 16 }}>
                  <span className="label">the horizon · beyond the rings</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                  {horizon.map(({ hub, km }) => (
                    <button
                      key={hub.id}
                      className="place-card"
                      onClick={() => {
                        haptic.medium()
                        location.chooseHub(hub.id)
                        window.scrollTo?.(0, 0)
                      }}
                      style={{
                        textAlign: 'left',
                        padding: '16px 18px',
                        borderRadius: 18,
                        border: '1px solid var(--hairline)',
                        background: 'var(--surface-raised)',
                      }}
                    >
                      <span className="mono" style={{ color: 'var(--accent-2)' }}>
                        {fmtKm(km)} {origin ? compass(bearingDeg(origin, hub)) : ''}
                      </span>
                      <span className="serif" style={{ display: 'block', fontSize: 20, margin: '6px 0 4px' }}>
                        {hub.name}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{hub.line}</span>
                      <span className="mono" style={{ display: 'block', marginTop: 8, color: 'var(--accent)' }}>
                        explore from here →
                      </span>
                    </button>
                  ))}
                </div>
              </Reveal>
            )}
          </>
        )}

        {/* ── ribbon ── */}
        <div className="marquee reveal d5" aria-hidden style={{ marginBottom: 26 }}>
          <div>
            {[0, 1].map((k) => (
              <span key={k}>
                {HUBS.slice(0, 12).map((h) => (
                  <span key={h.id}>
                    {h.name} <em>·</em>{' '}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <footer className="mono" style={{ textAlign: 'center' }}>
          curated atlas · 190 places · your location stays on-device
        </footer>
      </div>

      <PlaceSheet scored={selected} onClose={() => openPlace(null)} />
    </div>
  )
}
