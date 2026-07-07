/**
 * Home — the traveler's hub. Where they land when they open the app or tap
 * the home mark. Four things visible at a glance:
 *
 *   1. A single primary action: 'Start exploring' — takes them into the
 *      Explore screen with a fresh, empty center.
 *   2. 'Continue where you left off' — if there is a remembered location.
 *   3. 'Your journeys' — Airbnb-style trip cards, each with a photo mosaic
 *      of its saved places. Tapping a trip opens its detail view; tapping
 *      the + card creates a new trip.
 *   4. A Wizard-signed footer, consistent with the SoundTherapy footer.
 */

import { useMemo, useState } from 'react'
import wizardLogo from '../assets/wizard-logo.png'
import { MakersPage } from '../components/MakersPage'
import { Pill } from '../components/Pill'
import { Reveal } from '../components/Reveal'
import { PhotoQuery } from '../data/photos'
import { poiById } from '../data/pois'
import { hubById } from '../data/hubs'
import { Trip } from '../state/types'
import { useStore } from '../state/store'
import { usePhotos } from '../state/usePhotos'
import { greeting, haptic, nextInvitation } from '../state/util'

export function Home() {
  const {
    persisted,
    go,
    location,
    openSettings,
    openLocation,
    openTrip,
    createTrip,
    setActiveTrip,
    totalSavedCount,
  } = useStore()
  const [invitation] = useState(nextInvitation)
  const [makersOpen, setMakersOpen] = useState(false)
  const [creatingTrip, setCreatingTrip] = useState(false)
  const [newTripName, setNewTripName] = useState('')

  const trips = persisted.trips
  const last = persisted.lastLocation

  // preload the first-4 photos across all trips so the mosaics feel instant
  const previewQueries: PhotoQuery[] = useMemo(() => {
    const seen = new Set<string>()
    const q: PhotoQuery[] = []
    for (const t of trips) {
      for (const id of t.placeIds.slice(0, 4)) {
        if (seen.has(id)) continue
        seen.add(id)
        const poi = poiById(id) ?? persisted.savedOsm[id]
        if (!poi) continue
        const hub = hubById(poi.hub)
        q.push({
          id: poi.id,
          name: poi.name,
          context: hub ? `${hub.name} ${hub.state}` : undefined,
          wikipedia: poi.wikipedia,
          wikidata: poi.wikidata,
        })
      }
    }
    return q
  }, [trips, persisted.savedOsm])
  const photos = usePhotos(previewQueries)

  const startExplore = (freshLocation: boolean) => {
    haptic.medium()
    if (freshLocation) openLocation(true)
    go('explore')
  }

  const continueExplore = () => {
    haptic.medium()
    if (last) {
      location.choosePlace(last.name, { lat: last.lat, lng: last.lng })
    }
    go('explore')
  }

  const commitNewTrip = () => {
    const name = newTripName.trim()
    if (!name) {
      setCreatingTrip(false)
      return
    }
    const id = createTrip(name)
    setNewTripName('')
    setCreatingTrip(false)
    openTrip(id)
  }

  return (
    <div className="screen" style={{ overflowY: 'auto' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'max(20px, env(safe-area-inset-top)) 22px 60px' }}>
        {/* ── top bar ── */}
        <header
          className="reveal d1"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="pulse-dot" />
            <span className="serif" style={{ fontSize: 21 }}>Parikrama</span>
          </div>
          <button className="quiet-btn" onClick={() => openSettings(true)} aria-label="Settings">
            ⚙
          </button>
        </header>

        {/* ── hero ── */}
        <section className="reveal d2" style={{ marginBottom: 30 }}>
          <div className="mono" style={{ marginBottom: 10 }}>
            {greeting()} · परिक्रमा · the sacred circle
          </div>
          <h1
            className="serif ink"
            style={{ fontSize: 'clamp(36px, 10vw, 56px)', lineHeight: 1.04, margin: '0 0 12px' }}
          >
            {invitation}
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-secondary)', margin: '0 0 26px', maxWidth: 460 }}>
            Wherever you stand in India, we plot what's absolutely worth it within 5, 10, 20, and
            30 km. Or return to a place you were exploring, or a trip you're building.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
            <Pill full onClick={() => startExplore(true)}>
              Start exploring — pick a place
            </Pill>
            {location.point && (
              <button className="quiet-btn" onClick={() => go('explore')}>
                back to the radar around {location.placeName ?? location.near?.hub.name ?? 'your fix'} ↗
              </button>
            )}
            {!location.point && last && (
              <button className="quiet-btn" onClick={continueExplore}>
                continue at {last.name} ↗
              </button>
            )}
          </div>
        </section>

        {/* ── your journeys ── */}
        <Reveal as="section" style={{ marginBottom: 44 }}>
          <div className="sect" style={{ marginBottom: 18 }}>
            <span className="label">
              your journeys {totalSavedCount > 0 ? `· ${totalSavedCount} place${totalSavedCount === 1 ? '' : 's'} saved` : ''}
            </span>
          </div>

          {trips.length === 0 && !creatingTrip ? (
            <div
              style={{
                border: '1px dashed var(--hairline)',
                borderRadius: 20,
                padding: '32px 24px',
                textAlign: 'center',
                background: 'var(--chip)',
              }}
            >
              <div className="serif-i" style={{ fontSize: 22, marginBottom: 8 }}>
                No journeys yet.
              </div>
              <p className="mono-lg" style={{ margin: '0 0 20px', lineHeight: 1.6 }}>
                as you explore, save places into named trips —
                <br />
                "Kerala backwaters", "Rajasthan classics", "Weekend around Blr"
              </p>
              <button
                className="quiet-btn"
                onClick={() => setCreatingTrip(true)}
                style={{ color: 'var(--accent)', borderColor: 'var(--accent-line)' }}
              >
                + start a new trip
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 14,
              }}
            >
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  photos={photos}
                  onOpen={() => {
                    haptic.medium()
                    setActiveTrip(trip.id)
                    openTrip(trip.id)
                  }}
                />
              ))}
              {creatingTrip ? (
                <div
                  style={{
                    aspectRatio: '3 / 4',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: 14,
                    borderRadius: 18,
                    border: '1.5px solid var(--accent-line)',
                    background: 'var(--accent-soft)',
                  }}
                >
                  <input
                    autoFocus
                    value={newTripName}
                    onChange={(e) => setNewTripName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitNewTrip()
                      if (e.key === 'Escape') {
                        setNewTripName('')
                        setCreatingTrip(false)
                      }
                    }}
                    placeholder="Name this trip…"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--hairline)',
                      background: 'var(--surface-raised)',
                      fontSize: 15,
                      outline: 'none',
                      marginBottom: 8,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="quiet-btn" onClick={commitNewTrip} style={{ flex: 1, color: 'var(--accent)' }}>
                      save
                    </button>
                    <button
                      className="quiet-btn"
                      onClick={() => {
                        setCreatingTrip(false)
                        setNewTripName('')
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreatingTrip(true)}
                  className="place-card"
                  style={{
                    aspectRatio: '3 / 4',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 18,
                    border: '1px dashed var(--hairline)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    gap: 6,
                  }}
                >
                  <span className="serif" style={{ fontSize: 32, color: 'var(--accent)', lineHeight: 1 }}>
                    +
                  </span>
                  <span className="mono">new trip</span>
                </button>
              )}
            </div>
          )}
        </Reveal>

        {/* ── the sub-footer explanation ── */}
        <Reveal as="section" style={{ marginBottom: 34 }}>
          <div className="sect" style={{ marginBottom: 14 }}>
            <span className="label">how it works</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
            }}
          >
            {[
              ['01', 'Set your center', 'GPS, or type any place in India — Kalpetta, Ziro, Orchha.'],
              ['02', 'Draw the circles', 'The radar plots what is worth it inside 5, 10, 20, 30 km.'],
              ['03', 'Save into a trip', 'Airbnb-style journeys — pick a trip, or make a new one.'],
              ['04', 'Return, refine, go', 'Every trip is a starting point you can explore from.'],
            ].map(([n, t, d]) => (
              <div key={n}>
                <div className="mono" style={{ marginBottom: 6 }}>
                  {n}
                </div>
                <div className="serif" style={{ fontSize: 19, lineHeight: 1.15, marginBottom: 6 }}>
                  {t}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{d}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ── wizard footer ── */}
        <div style={{ padding: '48px 0 20px', textAlign: 'center' }}>
          <div className="serif ink" style={{ fontSize: 'clamp(24px, 5vw, 36px)', lineHeight: 1.08, marginBottom: 10 }}>
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

      <MakersPage open={makersOpen} onClose={() => setMakersOpen(false)} />
    </div>
  )
}

/** A single trip card with a 2×2 photo mosaic from its first four places. */
function TripCard({
  trip,
  photos,
  onOpen,
}: {
  trip: Trip
  photos: Record<string, any>
  onOpen: () => void
}) {
  const first4 = trip.placeIds.slice(0, 4)
  // resolve up to 4 photo urls for the mosaic; fall back to fewer / none
  const urls = first4
    .map((id) => {
      const p = photos[id]
      return p && typeof p === 'object' && p.hero ? p.hero : null
    })
    .filter((u): u is string => !!u)
  const placeCount = trip.placeIds.length
  const missingPlaces = first4.length - urls.length
  return (
    <button
      className="place-card"
      onClick={onOpen}
      style={{
        display: 'block',
        width: '100%',
        aspectRatio: '3 / 4',
        borderRadius: 18,
        border: '1px solid var(--hairline)',
        background: 'var(--surface-raised)',
        overflow: 'hidden',
        padding: 0,
        textAlign: 'left',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: 1,
          background: 'var(--hairline)',
        }}
      >
        {urls.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              gridRow: '1 / -1',
              background: 'var(--chip)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-ghost)',
              fontSize: 32,
              fontFamily: 'var(--serif)',
            }}
          >
            {trip.name.charAt(0).toUpperCase()}
          </div>
        )}
        {urls.length === 1 && (
          <div style={{ gridColumn: '1 / -1', gridRow: '1 / -1', background: `url(${urls[0]}) center/cover`, backgroundColor: 'var(--chip)' }} />
        )}
        {urls.length === 2 && (
          <>
            <div style={{ gridRow: '1 / -1', background: `url(${urls[0]}) center/cover`, backgroundColor: 'var(--chip)' }} />
            <div style={{ gridRow: '1 / -1', background: `url(${urls[1]}) center/cover`, backgroundColor: 'var(--chip)' }} />
          </>
        )}
        {urls.length === 3 && (
          <>
            <div style={{ gridRow: '1 / -1', background: `url(${urls[0]}) center/cover`, backgroundColor: 'var(--chip)' }} />
            <div style={{ background: `url(${urls[1]}) center/cover`, backgroundColor: 'var(--chip)' }} />
            <div style={{ background: `url(${urls[2]}) center/cover`, backgroundColor: 'var(--chip)' }} />
          </>
        )}
        {urls.length >= 4 && urls.slice(0, 4).map((u, i) => (
          <div key={i} style={{ background: `url(${u}) center/cover`, backgroundColor: 'var(--chip)' }} />
        ))}
      </div>

      {/* text overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            urls.length > 0
              ? 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.55) 100%)'
              : 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.30) 100%)',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          color: urls.length > 0 ? '#fff' : 'var(--text-primary)',
        }}
      >
        <div
          className="serif"
          style={{
            fontSize: 20,
            lineHeight: 1.15,
            marginBottom: 4,
            textShadow: urls.length > 0 ? '0 2px 8px rgba(0,0,0,0.6)' : 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {trip.name}
        </div>
        <div
          className="mono"
          style={{
            color: urls.length > 0 ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)',
            fontSize: 10,
          }}
        >
          {placeCount} place{placeCount === 1 ? '' : 's'}
          {missingPlaces > 0 && placeCount > 0 ? ' · loading' : ''}
        </div>
      </div>
    </button>
  )
}
