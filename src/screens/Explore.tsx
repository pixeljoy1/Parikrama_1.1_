/**
 * Explore — the home surface. You at the center, the parikrama rings around
 * you, and beneath them the ranked truth: what is absolutely worth it inside
 * the circle you chose, then the horizon beyond it.
 */

import { useEffect, useMemo, useState } from 'react'
import wizardLogo from '../assets/wizard-logo.png'
import { MakersPage } from '../components/MakersPage'
import { PlaceCard } from '../components/PlaceCard'
import { PlaceSheet } from '../components/PlaceSheet'
import { PullToRefresh } from '../components/PullToRefresh'
import { Radar } from '../components/Radar'
import { Reveal } from '../components/Reveal'
import { RingDial } from '../components/RingDial'
import { discoverAround } from '../data/discover'
import { HUBS, horizonHubs, hubById } from '../data/hubs'
import { PhotoQuery } from '../data/photos'
import { POIS } from '../data/pois'
import { Poi, Ring } from '../data/types'
import { PACE_COUNT, dedupeDiscoveries, ringCounts, scoreAround, scorePois } from '../explorer/score'
import { bearingDeg, compass, fmtCoords, fmtKm } from '../geo/geo'
import { useStore } from '../state/store'
import { usePhotos } from '../state/usePhotos'
import { greeting, haptic, nextInvitation, prefersReducedMotion } from '../state/util'
import { Pill } from '../components/Pill'

type ScanState = 'idle' | 'scanning' | 'done' | 'error'

export function Explore() {
  const { persisted, location, go, openSettings, openPlan, openLocation, placeId, openPlace, rememberLocation, totalSavedCount } = useStore()
  const [ring, setRing] = useState<Ring>(10)
  const [invitation] = useState(nextInvitation)
  const [makersOpen, setMakersOpen] = useState(false)
  const reduce = useMemo(prefersReducedMotion, [])

  const origin = location.point
  const profile = { interests: persisted.interests, pace: persisted.pace }

  // Persist the current center whenever it changes — powers "continue where
  // you left off" on Home. Prefer the human name of the place when we have
  // one, else the nearest hub.
  useEffect(() => {
    if (!origin) return
    const name = location.placeName ?? location.near?.hub.name
    if (!name) return
    rememberLocation(name, origin.lat, origin.lng)
  }, [origin?.lat, origin?.lng, location.placeName, location.near?.hub.id])

  // live discovery: scan OpenStreetMap around the center so the app works
  // anywhere in India — Kalpetta's waterfalls, not just the curated hubs
  const [discovered, setDiscovered] = useState<Poi[]>([])
  const [scan, setScan] = useState<ScanState>('idle')
  const [scanErr, setScanErr] = useState<string>('')
  const [rescan, setRescan] = useState(0)

  // slide-down-from-top gesture on the whole scroller. On refresh we bust the
  // day-long OSM cache for the current point and bump rescan so the effect
  // above re-fetches, then re-request a fresh GPS fix if we're on live.
  const refresh = async () => {
    if (origin) {
      const key = `parikrama.osm.v1.${origin.lat.toFixed(2)},${origin.lng.toFixed(2)}`
      try {
        localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    }
    setRescan((n) => n + 1)
    if (location.status === 'live' || location.status === 'denied') location.detect()
    // give the scan a moment to acknowledge before releasing the spinner
    await new Promise((r) => setTimeout(r, 800))
  }
  useEffect(() => {
    if (!origin) return
    let cancelled = false
    setScan('scanning')
    setDiscovered([])
    setScanErr('')
    discoverAround(origin, 30)
      .then((pois) => {
        if (cancelled) return
        setDiscovered(dedupeDiscoveries(pois, POIS))
        setScan('done')
      })
      .catch((e) => {
        if (cancelled) return
        setScanErr((e as Error).message)
        setScan('error')
      })
    return () => {
      cancelled = true
    }
  }, [origin?.lat, origin?.lng, rescan])

  // score the whole atlas once per location/profile; slices derive from it
  const scoredAll = useMemo(
    () => (origin ? scoreAround(origin, profile, 1e9) : []),
    [origin?.lat, origin?.lng, persisted.interests.join(','), persisted.pace],
  )
  const within30 = useMemo(() => {
    if (!origin) return []
    const curated = scoredAll.filter((s) => s.km <= 30)
    const found = scorePois(discovered, origin, profile, 30)
    return [...curated, ...found].sort((a, b) => b.match - a.match)
  }, [scoredAll, discovered, origin?.lat, origin?.lng, persisted.interests.join(','), persisted.pace])
  const counts = useMemo(() => ringCounts(within30), [within30])
  const list = useMemo(
    () => within30.filter((s) => s.km <= ring).slice(0, PACE_COUNT[persisted.pace] * 2),
    [within30, ring, persisted.pace],
  )
  const horizon = useMemo(() => (origin ? horizonHubs(origin, 30, 4) : []), [origin?.lat, origin?.lng])
  const selected = useMemo(() => {
    if (!placeId || !origin) return null
    const hit = within30.find((s) => s.poi.id === placeId) ?? scoredAll.find((s) => s.poi.id === placeId)
    if (hit) return hit
    // a saved OSM discovery from a previous location — score its snapshot
    const snap = persisted.savedOsm[placeId]
    return snap ? (scorePois([snap], origin, profile, 1e9)[0] ?? null) : null
  }, [within30, scoredAll, placeId, origin?.lat, origin?.lng, persisted.savedOsm])

  const osmCount = useMemo(() => within30.filter((s) => s.poi.osm).length, [within30])

  // fetch Wikimedia photos for the visible shortlist + the top few beyond it
  // (12-place cap keeps the network cost bounded — Wikipedia loves us if we
  // don't hammer their opensearch, and the cache keeps repeat visits free)
  const photoQueries: PhotoQuery[] = useMemo(() => {
    const chosen = within30.slice(0, 12)
    return chosen.map((s) => {
      const hub = hubById(s.poi.hub)
      return {
        id: s.poi.id,
        name: s.poi.name,
        context: hub ? `${hub.name} ${hub.state}` : undefined,
        wikipedia: s.poi.wikipedia,
        wikidata: s.poi.wikidata,
      }
    })
  }, [within30])
  const photos = usePhotos(photoQueries)

  const locLabel = !origin
    ? 'no location yet'
    : location.placeName
      ? location.placeName
      : location.near && location.near.km > 2
        ? `${fmtKm(location.near.km)} from ${location.near.hub.name}`
        : location.near
          ? location.near.hub.name
          : 'your fix'

  return (
    <PullToRefresh onRefresh={refresh}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 'max(20px, env(safe-area-inset-top)) 22px 60px' }}>
        {/* ── top bar ── */}
        <header
          className="reveal d1"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}
        >
          <button
            onClick={() => {
              haptic.light()
              go('home')
            }}
            aria-label="Back to home"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '4px 12px 4px 4px',
              borderRadius: 100,
              background: 'transparent',
            }}
          >
            <span className="pulse-dot" />
            <span className="serif" style={{ fontSize: 21 }}>
              Parikrama
            </span>
            <span className="mono" style={{ color: 'var(--text-ghost)', marginLeft: 2 }}>⌂</span>
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="quiet-btn"
              onClick={() => openPlan(true)}
              aria-label={`Open trips (${totalSavedCount})`}
              style={totalSavedCount > 0 ? { color: 'var(--accent)', borderColor: 'var(--accent-line)' } : undefined}
            >
              ♡ {totalSavedCount > 0 ? `Trips · ${totalSavedCount}` : 'Trips'}
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
                photos={photos}
              />
              <p className="mono" style={{ textAlign: 'center', margin: '4px 0 10px' }}>
                {scan === 'scanning' && (
                  <span>
                    <span className="status-dot" style={{ marginRight: 8 }} />
                    scanning the open map around you…
                  </span>
                )}
                {scan !== 'scanning' &&
                  (within30.length > 0
                    ? `${within30.length} worthwhile place${within30.length === 1 ? '' : 's'} inside 30 km${
                        osmCount > 0 ? ` · ${osmCount} discovered live` : ''
                      } · tap any to open`
                    : scan === 'error'
                      ? 'the atlas is quiet here and the map scan failed — check your connection'
                      : 'quiet circles — see the horizon below')}
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
                <div
                  style={{
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 18,
                    padding: '20px 22px',
                  }}
                >
                  <p className="serif-i" style={{ color: 'var(--text-secondary)', fontSize: 17, margin: '0 0 14px' }}>
                    {scan === 'scanning'
                      ? 'Still scanning the open map around you…'
                      : scan === 'error'
                        ? 'The live discovery scan couldn’t reach OpenStreetMap.'
                        : ring < 30
                          ? 'Nothing worthwhile inside this circle yet — widen the ring.'
                          : 'The atlas is quiet at this exact spot.'}
                  </p>
                  {scan === 'error' && (
                    <p className="mono-lg" style={{ color: 'var(--text-secondary)', margin: '0 0 14px' }}>
                      {scanErr || 'both mirrors failed'} — retry, or use the horizon below.
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {scan === 'error' && (
                      <button className="quiet-btn" onClick={() => setRescan((n) => n + 1)}>
                        ↻ Retry live discovery
                      </button>
                    )}
                    {ring < 30 && (
                      <button className="quiet-btn" onClick={() => setRing(30)}>
                        Widen to 30 km
                      </button>
                    )}
                    <button className="quiet-btn" onClick={() => openLocation(true)}>
                      Try another place
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {list.map((s, i) => (
                    <Reveal key={s.poi.id} delay={Math.min(i, 5) * 60}>
                      <PlaceCard
                        s={s}
                        saved={persisted.trips.some((t) => t.placeIds.includes(s.poi.id))}
                        onOpen={() => openPlace(s.poi.id)}
                        photo={photos[s.poi.id] ?? 'loading'}
                      />
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

        {/* ── editorial footer with the Wizard Communications mark ── */}
        <div style={{ padding: '48px 0 20px', textAlign: 'center' }}>
          <div
            className="serif ink"
            style={{ fontSize: 'clamp(28px, 6vw, 46px)', lineHeight: 1.08, marginBottom: 10 }}
          >
            Travel closer. Feel further.
          </div>
          <p className="mono" style={{ margin: '0 0 26px' }}>
            curated atlas · 260 places across 40 hubs · live discovery via OpenStreetMap
          </p>
          <button
            onClick={() => setMakersOpen(true)}
            aria-label="About the makers, Wizard Communications"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              margin: '22px auto 0',
            }}
          >
            <img
              src={wizardLogo}
              alt="Wizard Communications"
              style={{
                height: 20,
                filter: persisted.theme === 'midnight' ? 'brightness(0) invert(1)' : 'brightness(0.18)',
                opacity: 0.85,
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-secondary)',
                letterSpacing: 0.6,
              }}
            >
              CRAFTED IN KOLKATA →
            </span>
          </button>
        </div>
      </div>

      <PlaceSheet scored={selected} onClose={() => openPlace(null)} />
      <MakersPage open={makersOpen} onClose={() => setMakersOpen(false)} />
    </PullToRefresh>
  )
}
