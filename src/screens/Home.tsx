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

import { useEffect, useMemo, useRef, useState } from 'react'
import wizardLogo from '../assets/wizard-logo.png'
import { LegalSection, LegalSheet } from '../components/LegalSheet'
import { MakersPage } from '../components/MakersPage'
import { VersionPill } from '../components/VersionPill'
import { Pill } from '../components/Pill'
import { Reveal } from '../components/Reveal'
import { discoverAround } from '../data/discover'
import { PhotoQuery } from '../data/photos'
import { poiById } from '../data/pois'
import { hubById } from '../data/hubs'
import { LatLng } from '../geo/geo'
import { Trip } from '../state/types'
import { useStore } from '../state/store'
import { usePhotos } from '../state/usePhotos'
import { greeting, haptic, nextInvitation } from '../state/util'

/** Average lat/lng of a trip's places — the "middle of the trip" we
 * recenter the radar on when the user taps a card. Null-safe on OSM. */
function tripCentroidLatLng(trip: Trip, savedOsm: Record<string, any>): LatLng | null {
  const places = trip.placeIds
    .map((id) => poiById(id) ?? savedOsm[id])
    .filter((p: any): p is { lat: number; lng: number } => !!p && typeof p.lat === 'number' && typeof p.lng === 'number')
  if (places.length === 0) return null
  return {
    lat: places.reduce((s, p) => s + p.lat, 0) / places.length,
    lng: places.reduce((s, p) => s + p.lng, 0) / places.length,
  }
}

export function Home() {
  const {
    persisted,
    go,
    location,
    openSettings,
    openLocation,
    openTrip,
    openPlan: openPlanSheet,
    createTrip,
    setActiveTrip,
    selectOnRadar,
    totalSavedCount,
  } = useStore()
  const [invitation] = useState(nextInvitation)
  const [makersOpen, setMakersOpen] = useState(false)
  const [legal, setLegal] = useState<LegalSection | null>(null)
  const [creatingTrip, setCreatingTrip] = useState(false)
  const [newTripName, setNewTripName] = useState('')

  const trips = persisted.trips
  const last = persisted.lastLocation

  // Warm the OSM discovery cache for every trip centroid, so tapping a trip
  // card takes the user to a radar that populates instantly with surrounding
  // places instead of showing an empty ring while the Overpass scan runs.
  // discoverAround self-caches per ~1 km grid cell for a day; this is a
  // fire-and-forget primer.
  useEffect(() => {
    for (const trip of trips) {
      const c = tripCentroidLatLng(trip, persisted.savedOsm)
      if (!c) continue
      discoverAround(c, 30).catch(() => {
        /* silent — Explore will retry with a visible spinner */
      })
    }
  }, [trips, persisted.savedOsm])

  // preload photos for every place in every trip so the swipe carousel on
  // each card feels instant. usePhotos dedupes + caches, so trips that share
  // a place only pay for it once.
  const previewQueries: PhotoQuery[] = useMemo(() => {
    const seen = new Set<string>()
    const q: PhotoQuery[] = []
    for (const t of trips) {
      for (const id of t.placeIds) {
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
          lat: poi.lat,
          lng: poi.lng,
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
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: 'max(20px, env(safe-area-inset-top)) 28px 60px' }}>
        {/* ── top bar ── */}
        <header
          className="reveal d1"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="pulse-dot" />
            <span className="serif" style={{ fontSize: 21 }}>Parikrama</span>
            <VersionPill />
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
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 18,
              }}
            >
              {trips.map((trip) => {
                // Precompute per-tile { id, name, url } here so TripCard can
                // render a graceful monogram placeholder when a Wikimedia
                // photo hasn't returned (or the POI has no wiki link).
                const enrichedTiles = trip.placeIds.map((id) => {
                  const poi = poiById(id) ?? persisted.savedOsm[id]
                  const p = photos[id]
                  const url = p && typeof p === 'object' && (p as { hero?: string }).hero
                    ? (p as { hero: string }).hero
                    : null
                  return { id, name: poi?.name ?? '', url }
                })
                return (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  tiles={enrichedTiles}
                  onOpenPoi={(id) => {
                    // Decoupled from the whole-trip view: recenter the radar
                    // on THIS specific POI and highlight it, so the user lands
                    // concentrated on the destination they tapped, with the
                    // surrounding places within 30 km around it.
                    const poi = poiById(id) ?? persisted.savedOsm[id]
                    if (!poi) return
                    haptic.medium()
                    setActiveTrip(trip.id)
                    location.choosePlace(poi.name, { lat: poi.lat, lng: poi.lng })
                    selectOnRadar(id)
                    go('explore')
                  }}
                  onSeeList={() => {
                    haptic.light()
                    setActiveTrip(trip.id)
                    openTrip(trip.id)
                    openPlanSheet(true)
                  }}
                />
                )
              })}
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

          {/* legal footer links — open the swipe-down sheet */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginTop: 22,
            }}
          >
            {(
              [
                ['terms', 'Terms'],
                ['privacy', 'Privacy'],
                ['disclaimers', 'Disclaimers'],
              ] as const
            ).map(([k, label], i) => (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && (
                  <span className="mono" style={{ color: 'var(--text-ghost)' }}>
                    ·
                  </span>
                )}
                <button
                  onClick={() => setLegal(k)}
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--text-secondary)',
                    letterSpacing: 0.6,
                    background: 'transparent',
                    padding: '4px 6px',
                  }}
                >
                  {label}
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <MakersPage open={makersOpen} onClose={() => setMakersOpen(false)} />
      <LegalSheet open={legal !== null} section={legal ?? 'terms'} onClose={() => setLegal(null)} />
    </div>
  )
}

/** Matches a CSS media query and re-renders when it flips. Used so trip cards
 * can render a static mosaic on desktop (where swipe is unnatural with a
 * mouse) and a swipe carousel on mobile — no CSS acrobatics, one honest
 * layout per platform. */
function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatches(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return matches
}

/** A single trip card. On mobile: horizontal swipe carousel with dots. On
 * desktop: a 2×2 photo mosaic with a "+N more" overlay on the 4th tile
 * when there are more than four saves — because swiping with a mouse is a
 * chore. Both layouts share the "tap a tile → open THAT POI on the radar"
 * decoupling from the whole-trip view. */
function TripCard({
  trip,
  tiles,
  onOpenPoi,
  onSeeList,
}: {
  trip: Trip
  tiles: Array<{ id: string; name: string; url: string | null }>
  onOpenPoi: (id: string) => void
  onSeeList: () => void
}) {
  const isDesktop = useMedia('(min-width: 720px)')
  const withPhotos = tiles.filter((t) => !!t.url)
  const placeCount = trip.placeIds.length
  const [active, setActive] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)

  const onScroll = () => {
    const el = scrollerRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1))
    if (idx !== active) setActive(idx)
  }

  const jumpTo = (i: number) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div
      className="place-card"
      style={{
        position: 'relative',
        aspectRatio: '3 / 4',
        borderRadius: 18,
        border: '1px solid var(--hairline)',
        background: 'var(--surface-raised)',
        overflow: 'hidden',
      }}
    >
      {tiles.length === 0 ? (
        <button
          onClick={onSeeList}
          aria-label={`Open ${trip.name} — no places yet`}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--chip)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-ghost)',
            fontSize: 44,
            fontFamily: 'var(--serif)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {trip.name.charAt(0).toUpperCase()}
        </button>
      ) : isDesktop ? (
        /* Desktop mosaic — up to 4 tiles as a 2×2 grid. Photo-having tiles
           are promoted so the mosaic reads as photos, not blanks. The 4th
           tile carries a "+N more" overlay when the trip has more saves. */
        (() => {
          // promote photo tiles first, then fill with blanks so the visible
          // face of the card leads with pictures instead of chip placeholders
          const ordered = [...withPhotos, ...tiles.filter((t) => !t.url)]
          const shown = ordered.slice(0, 4)
          const cols = shown.length <= 1 ? '1fr' : '1fr 1fr'
          const rows = shown.length <= 2 ? '1fr' : '1fr 1fr'
          const remainder = tiles.length - shown.length
          return (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                gridTemplateColumns: cols,
                gridTemplateRows: rows,
                gap: 1,
                background: 'var(--hairline)',
              }}
            >
              {shown.map((t, i) => {
                const isLast = i === shown.length - 1 && remainder > 0
                // 3-tile mosaic: first tile spans both rows
                const gridRow = shown.length === 3 && i === 0 ? '1 / -1' : undefined
                return (
                  <button
                    key={t.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      // clicking the "+N more" overlay opens the trip list;
                      // any other tile opens THAT specific POI on the radar
                      if (isLast) onSeeList()
                      else onOpenPoi(t.id)
                    }}
                    aria-label={
                      isLast ? `See all ${tiles.length} places` : `Open ${t.name} on the radar`
                    }
                    style={{
                      position: 'relative',
                      gridRow,
                      background: t.url ? `url(${t.url}) center/cover` : 'var(--chip)',
                      backgroundColor: 'var(--chip)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      overflow: 'hidden',
                    }}
                  >
                    {/* soft monogram for tiles without a photo — reads as an
                        intentional editorial mark rather than a broken tile */}
                    {!t.url && !isLast && (
                      <span
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--serif)',
                          fontSize: 40,
                          color: 'var(--text-ghost)',
                          background:
                            'radial-gradient(closest-side, var(--chip), var(--surface-raised))',
                        }}
                      >
                        {(t.name || '·').charAt(0).toUpperCase()}
                      </span>
                    )}
                    {isLast && (
                      <span
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: t.url ? 'rgba(0,0,0,0.55)' : 'var(--chip)',
                          color: t.url ? '#fff' : 'var(--text-primary)',
                          fontFamily: 'var(--serif)',
                          fontSize: 24,
                          letterSpacing: 0.5,
                        }}
                      >
                        +{remainder} more
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })()
      ) : (
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollSnapType: 'x mandatory',
            // touch swipe hint — matches Airbnb's card carousel
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {tiles.map((t) => (
            <button
              key={t.id}
              onClick={(e) => {
                e.stopPropagation()
                onOpenPoi(t.id)
              }}
              aria-label={`Open ${t.name} on the radar`}
              style={{
                position: 'relative',
                flex: '0 0 100%',
                scrollSnapAlign: 'start',
                background: t.url ? `url(${t.url}) center/cover` : 'var(--chip)',
                backgroundColor: 'var(--chip)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              {!t.url && (
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--serif)',
                    fontSize: 60,
                    color: 'var(--text-ghost)',
                    background:
                      'radial-gradient(closest-side, var(--chip), var(--surface-raised))',
                  }}
                >
                  {(t.name || '·').charAt(0).toUpperCase()}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* progress dots — carousel only (mosaic layout speaks for itself) */}
      {!isDesktop && tiles.length > 1 && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 0,
            right: 0,
            display: 'flex',
            gap: 5,
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {tiles.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation()
                jumpTo(i)
              }}
              aria-label={`Go to place ${i + 1}`}
              style={{
                pointerEvents: 'auto',
                width: i === active ? 14 : 5,
                height: 5,
                borderRadius: 100,
                background: i === active ? '#fff' : 'rgba(255,255,255,0.55)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
                border: 'none',
                padding: 0,
                transition: 'width 200ms ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}

      {/* bottom gradient + name + list pill — pointer-events off so mid-card
          swipes go to the scroller; the pill re-enables its own hits */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '40px 16px 14px',
          background:
            withPhotos.length > 0
              ? 'linear-gradient(180deg, transparent, rgba(0,0,0,0.60))'
              : 'linear-gradient(180deg, transparent, rgba(0,0,0,0.30))',
          color: withPhotos.length > 0 ? '#fff' : 'var(--text-primary)',
          pointerEvents: 'none',
        }}
      >
        <div
          className="serif"
          style={{
            fontSize: 22,
            lineHeight: 1.15,
            marginBottom: 6,
            textShadow: withPhotos.length > 0 ? '0 2px 10px rgba(0,0,0,0.7)' : 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {trip.name}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSeeList()
          }}
          className="mono"
          style={{
            pointerEvents: 'auto',
            color: withPhotos.length > 0 ? 'rgba(255,255,255,0.95)' : 'var(--text-secondary)',
            fontSize: 10,
            padding: '4px 10px',
            borderRadius: 100,
            background: withPhotos.length > 0 ? 'rgba(0,0,0,0.32)' : 'var(--chip)',
            backdropFilter: withPhotos.length > 0 ? 'blur(6px)' : undefined,
            textTransform: 'none',
            letterSpacing: 0.6,
          }}
        >
          {placeCount} place{placeCount === 1 ? '' : 's'} · see list
          {!isDesktop && tiles.length > 1 ? `  ·  ${active + 1} / ${tiles.length}` : ''}
        </button>
      </div>
    </div>
  )
}
