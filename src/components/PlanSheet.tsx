/**
 * WishlistSheet — the traveler's saved places.
 *
 * Two things it does that the old "plan" sheet didn't:
 *   1. Names the current context ("You're exploring: Jaipur") so users
 *      always know where they are when they open their wishlist.
 *   2. Every item has an "Explore from here →" action that recenters the
 *      map on that place, so a wishlist item can become the next
 *      exploration center in one tap. Answers "how do I jump between my
 *      saved places and browsing?" directly.
 *
 * Also adds a photo thumbnail per item, a stronger visual affordance for
 * scanning the list, and a filter chip for hiding places you've been.
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

type Filter = 'all' | 'unseen'

export function WishlistSheet() {
  const { planOpen, openPlan, persisted, toggleSaved, location, openPlace } = useStore()
  const origin = location.point
  const [filter, setFilter] = useState<Filter>('all')

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

  const shown = filter === 'unseen' ? items.filter(({ p }) => !persisted.seen.includes(p.id)) : items
  const unseenCount = items.filter(({ p }) => !persisted.seen.includes(p.id)).length
  const seenCount = items.length - unseenCount

  const photoQueries: PhotoQuery[] = useMemo(
    () =>
      shown.map(({ p }) => {
        const hub = hubById(p.hub)
        return {
          id: p.id,
          name: p.name,
          context: hub ? `${hub.name} ${hub.state}` : undefined,
          wikipedia: p.wikipedia,
          wikidata: p.wikidata,
        }
      }),
    [shown],
  )
  const photos = usePhotos(photoQueries)

  const contextLabel =
    location.status === 'live'
      ? `Exploring ${location.near?.hub.name ?? 'your fix'}`
      : location.placeName
        ? `Exploring ${location.placeName}`
        : location.near
          ? `Exploring ${location.near.hub.name}`
          : 'No location set'

  return (
    <Sheet open={planOpen} onClose={() => openPlan(false)} title="My wishlist">
      {/* current context — so users always know where they are when they land in the wishlist */}
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

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0 12px' }}>
          <div className="serif-i" style={{ fontSize: 22, marginBottom: 10 }}>
            Nothing saved yet.
          </div>
          <p className="mono-lg" style={{ margin: 0, lineHeight: 1.7 }}>
            tap any place → <span style={{ color: 'var(--accent)' }}>♡ Save to wishlist</span>
            <br />
            everything you save lives here — across trips
          </p>
        </div>
      ) : (
        <>
          {/* filter chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {(['all', 'unseen'] as const).map((f) => {
              const on = filter === f
              const label = f === 'all' ? `All · ${items.length}` : `To visit · ${unseenCount}`
              return (
                <button
                  key={f}
                  onClick={() => {
                    haptic.light()
                    setFilter(f)
                  }}
                  className="mono"
                  style={{
                    padding: '7px 14px',
                    borderRadius: 100,
                    border: `1px solid ${on ? 'var(--accent-line)' : 'var(--hairline)'}`,
                    background: on ? 'var(--accent-soft)' : 'var(--chip)',
                    color: on ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {label}
                </button>
              )
            })}
            {seenCount > 0 && (
              <span className="mono" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                {seenCount} been
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {shown.map(({ p, km, dir }) => {
              const seen = persisted.seen.includes(p.id)
              const photo = photos[p.id]
              const hasPhoto = photo && typeof photo === 'object' && photo.hero
              const hub = hubById(p.hub)
              const contextName = km != null && dir ? `${fmtKm(km)} ${dir}` : hub?.name ?? p.hub
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0,
                    padding: 12,
                    borderRadius: 14,
                    border: '1px solid var(--hairline)',
                    background: 'var(--surface-raised)',
                    opacity: seen ? 0.6 : 1,
                  }}
                >
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      textAlign: 'left',
                      padding: 0,
                    }}
                    onClick={() => {
                      openPlan(false)
                      openPlace(p.id)
                    }}
                  >
                    {/* photo thumb */}
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
                    <span className="mono" style={{ color: 'var(--text-ghost)', flexShrink: 0 }}>
                      ›
                    </span>
                  </button>

                  {/* row of quick actions */}
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
                      style={{
                        flex: 1,
                        color: 'var(--accent)',
                        padding: '6px 4px',
                        letterSpacing: 1.2,
                      }}
                    >
                      explore from here →
                    </button>
                    <a
                      className="mono"
                      href={mapsUrl(p, p.name)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: 'var(--accent-2)',
                        textDecoration: 'none',
                        padding: '6px 10px',
                        letterSpacing: 1.2,
                      }}
                    >
                      maps ↗
                    </a>
                    <button
                      className="mono"
                      onClick={() => {
                        haptic.light()
                        toggleSaved(p.id)
                      }}
                      style={{
                        color: 'var(--text-ghost)',
                        padding: '6px 10px',
                      }}
                      aria-label={`Remove ${p.name} from wishlist`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* footer nudge back to browsing */}
          <div
            style={{
              marginTop: 22,
              padding: '14px 16px',
              borderRadius: 12,
              border: '1px dashed var(--hairline)',
              background: 'transparent',
              textAlign: 'center',
            }}
          >
            <p className="mono-lg" style={{ margin: '0 0 6px' }}>
              your wishlist survives everywhere you explore
            </p>
            <button
              className="mono"
              onClick={() => openPlan(false)}
              style={{ color: 'var(--accent)', letterSpacing: 1.4 }}
            >
              back to the radar ↗
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}

// Named export kept as the old symbol so no import changes; the file is
// still called PlanSheet.tsx for git-history sake.
export { WishlistSheet as PlanSheet }
