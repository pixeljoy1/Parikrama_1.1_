/**
 * TripsSheet — a two-mode wishlist sheet.
 *
 * Overview mode (viewingTripId === null): a compact list of the traveler's
 * trips, each showing name + place count. Tap any to drill in.
 *
 * Detail mode (viewingTripId set): the classic wishlist view scoped to one
 * trip — photo thumbnails, "explore from here", maps deep link, remove.
 * The header shows the trip name with rename + delete affordances, and a
 * breadcrumb back to Trips.
 *
 * Both modes keep the "Exploring …" context banner and "keep exploring"
 * escape hatch so the sheet never feels like a dead end.
 */

import { useMemo, useState } from 'react'
import { hubById } from '../data/hubs'
import { PhotoQuery } from '../data/photos'
import { poiById } from '../data/pois'
import { bearingDeg, compass, distanceKm, fmtKm, mapsUrl } from '../geo/geo'
import { useStore } from '../state/store'
import { usePhotos } from '../state/usePhotos'
import { haptic } from '../state/util'
import { Sheet } from './Sheet'

export function TripsSheet() {
  const {
    planOpen,
    openPlan,
    persisted,
    location,
    viewingTripId,
    openTrip,
    createTrip,
    renameTrip,
    deleteTrip,
    setActiveTrip,
    go,
  } = useStore()

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameName, setRenameName] = useState('')

  const trip = viewingTripId ? persisted.trips.find((t) => t.id === viewingTripId) ?? null : null
  const contextLabel =
    location.status === 'live'
      ? `Exploring ${location.near?.hub.name ?? 'your fix'}`
      : location.placeName
        ? `Exploring ${location.placeName}`
        : location.near
          ? `Exploring ${location.near.hub.name}`
          : 'No location set'

  const close = () => {
    openPlan(false)
    openTrip(null)
    setCreating(false)
    setNewName('')
    setRenaming(false)
    setRenameName('')
  }

  const commitNewTrip = () => {
    const name = newName.trim()
    if (!name) {
      setCreating(false)
      return
    }
    haptic.medium()
    const id = createTrip(name)
    setActiveTrip(id)
    setNewName('')
    setCreating(false)
    openTrip(id)
  }

  const commitRename = () => {
    const name = renameName.trim()
    if (name && trip) renameTrip(trip.id, name)
    setRenaming(false)
    setRenameName('')
  }

  const gotoHome = () => {
    close()
    go('home')
  }

  return (
    <Sheet open={planOpen} onClose={close} title={trip ? '' : 'Your journeys'}>
      {/* Persistent header — context banner + back to explore */}
      <div
        className="mono-lg"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 12,
          background: 'var(--chip)',
          border: '1px solid var(--hairline)',
          marginBottom: 18,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="status-dot" />
          {contextLabel}
        </span>
        <button
          className="mono"
          onClick={() => openPlan(false)}
          style={{ color: 'var(--accent)', letterSpacing: 1.4 }}
        >
          keep exploring ↗
        </button>
      </div>

      {trip ? (
        <TripDetail
          tripId={trip.id}
          onBack={() => openTrip(null)}
          onRename={() => {
            setRenameName(trip.name)
            setRenaming(true)
          }}
          renaming={renaming}
          renameName={renameName}
          onRenameChange={setRenameName}
          commitRename={commitRename}
          cancelRename={() => {
            setRenaming(false)
            setRenameName('')
          }}
          onDelete={() => {
            if (confirm(`Delete "${trip.name}"? Places stay in any other trip.`)) {
              deleteTrip(trip.id)
              openTrip(null)
            }
          }}
        />
      ) : (
        <TripsOverview
          creating={creating}
          newName={newName}
          setNewName={setNewName}
          onStartCreate={() => {
            haptic.light()
            setCreating(true)
          }}
          onCancelCreate={() => {
            setCreating(false)
            setNewName('')
          }}
          commitNewTrip={commitNewTrip}
          gotoHome={gotoHome}
        />
      )}
    </Sheet>
  )
}

/** ── Overview mode ── */
function TripsOverview({
  creating,
  newName,
  setNewName,
  onStartCreate,
  onCancelCreate,
  commitNewTrip,
  gotoHome,
}: {
  creating: boolean
  newName: string
  setNewName: (v: string) => void
  onStartCreate: () => void
  onCancelCreate: () => void
  commitNewTrip: () => void
  gotoHome: () => void
}) {
  const { persisted, openTrip, setActiveTrip, totalSavedCount } = useStore()

  if (persisted.trips.length === 0 && !creating) {
    return (
      <div style={{ textAlign: 'center', padding: '28px 0 12px' }}>
        <div className="serif-i" style={{ fontSize: 22, marginBottom: 10 }}>
          No trips yet.
        </div>
        <p className="mono-lg" style={{ margin: '0 0 20px', lineHeight: 1.7 }}>
          save any place → we ask which trip it belongs to
          <br />
          you can also start a trip fresh
        </p>
        <button
          className="quiet-btn"
          onClick={onStartCreate}
          style={{ color: 'var(--accent)', borderColor: 'var(--accent-line)' }}
        >
          + start a new trip
        </button>
        <div style={{ marginTop: 20 }}>
          <button className="mono" onClick={gotoHome} style={{ color: 'var(--text-secondary)' }}>
            or visit your home ↗
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <p className="mono" style={{ margin: '0 0 14px' }}>
        {totalSavedCount} place{totalSavedCount === 1 ? '' : 's'} across {persisted.trips.length} trip
        {persisted.trips.length === 1 ? '' : 's'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {persisted.trips.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              haptic.light()
              setActiveTrip(t.id)
              openTrip(t.id)
            }}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              textAlign: 'left',
              padding: '14px 16px',
              borderRadius: 14,
              border: `1px solid ${persisted.activeTripId === t.id ? 'var(--accent-line)' : 'var(--hairline)'}`,
              background: persisted.activeTripId === t.id ? 'var(--accent-soft)' : 'var(--chip)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="serif" style={{ fontSize: 20, lineHeight: 1.15 }}>{t.name}</div>
              <div className="mono" style={{ marginTop: 4 }}>
                {t.placeIds.length} place{t.placeIds.length === 1 ? '' : 's'}
                {persisted.activeTripId === t.id ? ' · active' : ''}
              </div>
            </div>
            <span className="mono" style={{ color: 'var(--text-ghost)', flexShrink: 0 }}>›</span>
          </button>
        ))}
      </div>

      {creating ? (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 14,
            padding: 12,
            borderRadius: 14,
            border: '1.5px solid var(--accent-line)',
            background: 'var(--accent-soft)',
          }}
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitNewTrip()
              if (e.key === 'Escape') onCancelCreate()
            }}
            placeholder="Name this trip…"
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--hairline)',
              background: 'var(--surface-raised)',
              fontSize: 15,
              outline: 'none',
            }}
          />
          <button className="quiet-btn" onClick={commitNewTrip} style={{ color: 'var(--accent)' }}>
            save
          </button>
          <button className="quiet-btn" onClick={onCancelCreate}>
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={onStartCreate}
          className="quiet-btn"
          style={{ width: '100%', justifyContent: 'center', color: 'var(--accent)', marginTop: 14 }}
        >
          + create new trip
        </button>
      )}
    </>
  )
}

/** ── Detail mode ── */
/** Average lat/lng of a trip's saved places — the "center of gravity"
 * we recenter the radar on when the user taps "Explore this trip". */
function tripCentroid(placeIds: string[], savedOsm: Record<string, any>) {
  const places = placeIds
    .map((id) => poiById(id) ?? savedOsm[id])
    .filter((p: any): p is { lat: number; lng: number } => !!p && typeof p.lat === 'number' && typeof p.lng === 'number')
  if (places.length === 0) return null
  const lat = places.reduce((s, p) => s + p.lat, 0) / places.length
  const lng = places.reduce((s, p) => s + p.lng, 0) / places.length
  return { lat, lng }
}

function TripDetail({
  tripId,
  onBack,
  onRename,
  renaming,
  renameName,
  onRenameChange,
  commitRename,
  cancelRename,
  onDelete,
}: {
  tripId: string
  onBack: () => void
  onRename: () => void
  renaming: boolean
  renameName: string
  onRenameChange: (v: string) => void
  commitRename: () => void
  cancelRename: () => void
  onDelete: () => void
}) {
  const { persisted, location, openPlace, openPlan, openTrip, removePlaceFromTrip, go } = useStore()
  const trip = persisted.trips.find((t) => t.id === tripId)
  const origin = location.point
  const centroid = useMemo(
    () => (trip ? tripCentroid(trip.placeIds, persisted.savedOsm) : null),
    [trip, persisted.savedOsm],
  )
  const exploreThisTrip = () => {
    if (!trip || !centroid) return
    haptic.medium()
    // Recenter the radar on the trip's center of gravity and jump to Explore.
    // The location "name" carries the trip label so the header reads sensibly.
    location.choosePlace(`Trip · ${trip.name}`, centroid)
    openPlan(false)
    openTrip(null)
    go('explore')
  }

  const items = useMemo(() => {
    if (!trip) return []
    return trip.placeIds
      .map((id) => poiById(id) ?? persisted.savedOsm[id])
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({
        p,
        km: origin ? distanceKm(origin, p) : null,
        dir: origin ? compass(bearingDeg(origin, p)) : null,
      }))
      .sort((a, b) => (a.km ?? 0) - (b.km ?? 0))
  }, [trip, persisted.savedOsm, origin])

  const photoQueries: PhotoQuery[] = useMemo(
    () =>
      items.map(({ p }) => {
        const hub = hubById(p.hub)
        return {
          id: p.id,
          name: p.name,
          context: hub ? `${hub.name} ${hub.state}` : undefined,
          wikipedia: p.wikipedia,
          wikidata: p.wikidata,
          lat: p.lat,
          lng: p.lng,
        }
      }),
    [items],
  )
  const photos = usePhotos(photoQueries)

  if (!trip) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <button className="mono" onClick={onBack} style={{ color: 'var(--accent-2)', letterSpacing: 1.2 }}>
          ‹ trips
        </button>
      </div>

      {renaming ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            autoFocus
            value={renameName}
            onChange={(e) => onRenameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') cancelRename()
            }}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 10,
              border: '1.5px solid var(--accent-line)',
              background: 'var(--accent-soft)',
              fontSize: 22,
              fontFamily: 'var(--serif)',
              outline: 'none',
            }}
          />
          <button className="quiet-btn" onClick={commitRename} style={{ color: 'var(--accent)' }}>
            save
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 6,
          }}
        >
          <h2 className="serif" style={{ fontSize: 30, lineHeight: 1.1, margin: 0 }}>
            {trip.name}
          </h2>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button className="mono" onClick={onRename} style={{ color: 'var(--text-secondary)' }}>
              rename
            </button>
            <button className="mono" onClick={onDelete} style={{ color: 'var(--danger)' }}>
              delete
            </button>
          </div>
        </div>
      )}
      <p className="mono" style={{ margin: '0 0 14px' }}>
        {items.length} place{items.length === 1 ? '' : 's'}
      </p>

      {/* Primary CTA — recenter the radar on this trip's centroid and jump
          to Explore. The trip's saved places light up around the new center,
          so the user can add more to the same trip in one flow. */}
      {items.length > 0 && centroid && (
        <button
          onClick={exploreThisTrip}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: 12,
            padding: '14px 18px',
            borderRadius: 14,
            border: '1.5px solid var(--accent-line)',
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            marginBottom: 18,
            textAlign: 'left',
          }}
        >
          <span>
            <span style={{ fontSize: 15, fontWeight: 500, display: 'block' }}>
              Explore this trip on the radar
            </span>
            <span className="mono" style={{ display: 'block', marginTop: 3, textTransform: 'none' }}>
              recenter the map on {trip.name}
            </span>
          </span>
          <span style={{ fontSize: 22, lineHeight: 1 }}>→</span>
        </button>
      )}

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '18px 0 12px' }}>
          <div className="serif-i" style={{ fontSize: 20, marginBottom: 8 }}>
            This trip is empty.
          </div>
          <p className="mono-lg" style={{ margin: 0 }}>
            explore, then tap the heart to save into this trip
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(({ p, km, dir }) => {
            const seen = persisted.seen.includes(p.id)
            const photo = photos[p.id]
            const hasPhoto = photo && typeof photo === 'object' && photo.hero
            const hub = hubById(p.hub)
            const contextName = km != null && dir ? `${fmtKm(km)} ${dir}` : hub?.name ?? p.hub
            return (
              <div
                key={p.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: '1px solid var(--hairline)',
                  background: 'var(--surface-raised)',
                  opacity: seen ? 0.6 : 1,
                }}
              >
                <button
                  onClick={() => {
                    openPlan(false)
                    openPlace(p.id)
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%' }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      background: 'var(--chip)',
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: '1px solid var(--hairline)',
                    }}
                  >
                    {hasPhoto && (
                      <img
                        src={(photo as { hero: string }).hero}
                        alt=""
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15.5,
                        fontWeight: 400,
                        textDecoration: seen ? 'line-through' : 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.name}
                    </div>
                    <div className="mono" style={{ marginTop: 4 }}>
                      {contextName}
                      {seen ? ' · been' : ''}
                      {p.osm ? ' · ◈' : ''}
                    </div>
                  </div>
                  <span className="mono" style={{ color: 'var(--text-ghost)', flexShrink: 0 }}>›</span>
                </button>
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid var(--hairline)',
                  }}
                >
                  <button
                    className="mono"
                    onClick={() => {
                      haptic.medium()
                      location.choosePlace(p.name, { lat: p.lat, lng: p.lng })
                      openPlan(false)
                    }}
                    style={{ flex: 1, color: 'var(--accent)', padding: '6px 4px', letterSpacing: 1.2 }}
                  >
                    explore from here →
                  </button>
                  <a
                    className="mono"
                    href={mapsUrl(p, p.name)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--accent-2)', textDecoration: 'none', padding: '6px 10px', letterSpacing: 1.2 }}
                  >
                    maps ↗
                  </a>
                  <button
                    className="mono"
                    onClick={() => {
                      haptic.light()
                      removePlaceFromTrip(trip.id, p.id)
                    }}
                    style={{ color: 'var(--text-ghost)', padding: '6px 10px' }}
                    aria-label={`Remove ${p.name} from ${trip.name}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Keep the old name as an alias so imports don't churn
export { TripsSheet as PlanSheet }
