/**
 * PlaceSheet — the detail bottom sheet for one place: hero photo band, up to
 * five gallery photos, the story, the insider tip, practicals, save-to-plan,
 * and a Maps deep link for actual navigation. Photos come from Wikimedia and
 * carry attribution back to their Wikipedia source.
 */

import { useEffect, useRef, useState } from 'react'
import { hubById } from '../data/hubs'
import { interestById } from '../data/interests'
import { INTERESTS } from '../data/interests'
import { ScoredPoi } from '../explorer/score'
import { fmtKm, mapsUrl } from '../geo/geo'
import { useStore } from '../state/store'
import { fmtMinutes, haptic } from '../state/util'
import { usePhoto } from '../state/usePhotos'
import { Lightbox } from './Lightbox'
import { Pill } from './Pill'
import { Sheet } from './Sheet'
import { StarRating } from './StarRating'

/** Same renown mapping as PlaceCard — kept local to avoid a shared helper file
 * for a single 8-line function. */
function renownForSheet(wow: number): { label: string; color: string } {
  if (wow >= 9.5) return { label: 'Iconic destination', color: 'var(--accent)' }
  if (wow >= 8.5) return { label: 'Very popular', color: 'var(--accent)' }
  if (wow >= 7) return { label: 'Popular', color: 'var(--accent-2)' }
  if (wow >= 5.5) return { label: 'Well-known', color: 'var(--accent-2)' }
  return { label: 'Hidden gem', color: 'var(--text-secondary)' }
}

interface Props {
  scored: ScoredPoi | null
  onClose: () => void
}

export function PlaceSheet({ scored, onClose }: Props) {
  const { persisted, toggleSeen, openPlan, openSavePicker, addPlaceToTrip, showToast } = useStore()
  const s = scored
  // "saved" = a member of at least one trip
  const savedTripIds = s ? persisted.trips.filter((t) => t.placeIds.includes(s.poi.id)).map((t) => t.id) : []
  const saved = savedTripIds.length > 0
  const seen = !!s && persisted.seen.includes(s.poi.id)

  // fetch a full gallery lazily on open — cheap thanks to the shared cache
  const hub = s ? hubById(s.poi.hub) : null
  const photoState = usePhoto(
    s
      ? {
          id: s.poi.id,
          name: s.poi.name,
          context: hub ? `${hub.name} ${hub.state}` : undefined,
          wikipedia: s.poi.wikipedia,
          wikidata: s.poi.wikidata,
        }
      : null,
  )
  const photo = typeof photoState === 'object' ? photoState : null
  const hasGallery = photo && photo.gallery.length > 0
  const gallery = photo?.gallery ?? []

  // Which photo the hero band is currently showing. The carousel below
  // drives this — tap any thumb and the hero swaps to that photo.
  const [heroIdx, setHeroIdx] = useState(0)
  // Reset to the first photo when the sheet opens on a different place,
  // OR when a new gallery arrives for the same place. Guard on both
  // otherwise heroIdx can point past the end.
  useEffect(() => {
    setHeroIdx(0)
  }, [s?.poi.id, gallery.length])

  // Left/right arrow keys advance through the gallery on desktop.
  useEffect(() => {
    if (!s || gallery.length < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setHeroIdx((i) => (i + 1) % gallery.length)
      else if (e.key === 'ArrowLeft') setHeroIdx((i) => (i - 1 + gallery.length) % gallery.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s?.poi.id, gallery.length])

  const heroSrc = gallery[Math.min(heroIdx, gallery.length - 1)] ?? null

  // Lightbox open state + horizontal-swipe detection on the hero. If the
  // user drags more than ~40px sideways it's a swipe (advance the gallery,
  // don't open the lightbox); if they release under that threshold it was
  // a tap and we open the lightbox.
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const dragStartX = useRef<number | null>(null)
  const dragged = useRef(false)
  const onHeroPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX
    dragged.current = false
  }
  const onHeroPointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current == null) return
    if (Math.abs(e.clientX - dragStartX.current) > 12) dragged.current = true
  }
  const onHeroPointerUp = (e: React.PointerEvent) => {
    if (dragStartX.current == null) return
    const dx = e.clientX - dragStartX.current
    dragStartX.current = null
    if (Math.abs(dx) < 40) {
      // treat as tap → open lightbox
      if (gallery.length > 0) {
        haptic.light()
        setLightboxOpen(true)
      }
    } else if (gallery.length > 1) {
      haptic.light()
      if (dx > 0) setHeroIdx((i) => (i - 1 + gallery.length) % gallery.length)
      else setHeroIdx((i) => (i + 1) % gallery.length)
    }
  }
  // Rating: our editorial wow (1–10) converted to Google-Maps-style 0–5.
  const rating = s ? Math.max(0, Math.min(5, s.poi.wow / 2)) : 0

  return (
    <Sheet open={!!s} onClose={onClose}>
      {s && (
        <div>
          {/* hero band — full-bleed above the sheet padding; tap to open the
              lightbox, drag horizontally to advance the gallery */}
          {(hasGallery || photoState === 'loading') && (
            <div
              onPointerDown={hasGallery ? onHeroPointerDown : undefined}
              onPointerMove={hasGallery ? onHeroPointerMove : undefined}
              onPointerUp={hasGallery ? onHeroPointerUp : undefined}
              onPointerCancel={() => {
                dragStartX.current = null
                dragged.current = false
              }}
              style={{
                position: 'relative',
                width: 'calc(100% + 48px)',
                margin: '-14px -24px 20px',
                aspectRatio: '16 / 9',
                background: photoState === 'loading'
                  ? 'linear-gradient(90deg, var(--chip) 0%, var(--surface-raised) 50%, var(--chip) 100%)'
                  : 'var(--chip)',
                backgroundSize: '200% 100%',
                animation: photoState === 'loading' ? 'shimmer 1.6s linear infinite' : undefined,
                overflow: 'hidden',
                cursor: hasGallery ? 'zoom-in' : undefined,
                touchAction: 'pan-y',
                userSelect: 'none',
              }}
            >
              {hasGallery && heroSrc && (
                <>
                  {/* Render every gallery image stacked, cross-fade between
                     them via opacity so a tap on the carousel below never
                     shows a blank frame while the new image loads. */}
                  {gallery.map((url, i) => (
                    <img
                      key={url}
                      src={url}
                      alt=""
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: i === Math.min(heroIdx, gallery.length - 1) ? 1 : 0,
                        transition: 'opacity 320ms cubic-bezier(0.4,0,0.2,1)',
                        display: 'block',
                      }}
                    />
                  ))}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 'auto 0 0 0',
                      height: 70,
                      background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.35))',
                      pointerEvents: 'none',
                    }}
                  />
                  {/* photo index pill (top-left) */}
                  {gallery.length > 1 && (
                    <span
                      className="mono"
                      style={{
                        position: 'absolute',
                        left: 10,
                        top: 10,
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: 10,
                        letterSpacing: 1.2,
                        background: 'rgba(0,0,0,0.35)',
                        padding: '3px 9px',
                        borderRadius: 100,
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {Math.min(heroIdx, gallery.length - 1) + 1} / {gallery.length}
                    </span>
                  )}
                  {photo?.source && (
                    <a
                      href={photo.source}
                      target="_blank"
                      rel="noreferrer"
                      className="mono"
                      style={{
                        position: 'absolute',
                        right: 10,
                        bottom: 8,
                        color: 'rgba(255,255,255,0.85)',
                        textDecoration: 'none',
                        fontSize: 9,
                        letterSpacing: 1.2,
                        background: 'rgba(0,0,0,0.35)',
                        padding: '3px 8px',
                        borderRadius: 100,
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      photo · wikimedia
                    </a>
                  )}
                </>
              )}
            </div>
          )}

          <div className="mono" style={{ color: 'var(--accent-2)', marginBottom: 8 }}>
            {fmtKm(s.km)} {s.dir} of you · {Math.round(s.match * 100)}% your kind of place
          </div>
          <h2 className="serif" style={{ fontSize: 30, lineHeight: 1.1, margin: '0 0 10px' }}>
            {s.poi.name}
          </h2>

          {/* rating strip — Google-Maps-style big stars, honest source label.
              The renown label ("Iconic" / "Popular" / "Hidden gem") makes the
              number read as the familiar popularity signal it is. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 0 14px',
              marginBottom: 12,
              borderBottom: '1px solid var(--hairline)',
              flexWrap: 'wrap',
            }}
          >
            <StarRating value={rating} size="large" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
              <span
                className="mono"
                style={{
                  color: renownForSheet(s.poi.wow).color,
                  textTransform: 'uppercase',
                  fontSize: 11,
                  letterSpacing: 1.5,
                }}
              >
                {renownForSheet(s.poi.wow).label}
              </span>
              <span className="mono" style={{ color: 'var(--text-secondary)', fontSize: 10, textTransform: 'none', letterSpacing: 0.4 }}>
                How worth going, out of 5 — our editors' score, not user reviews
              </span>
            </div>
          </div>

          <p style={{ fontSize: 15, lineHeight: 1.6, margin: '0 0 16px', color: 'var(--text-primary)' }}>
            {s.poi.blurb}
          </p>

          {/* gallery — all photos, tap any to swap the hero above */}
          {gallery.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                margin: '0 -24px 20px',
                padding: '0 24px 4px',
              }}
            >
              {gallery.map((url, i) => {
                const active = i === Math.min(heroIdx, gallery.length - 1)
                return (
                  <button
                    key={`${url}-${i}`}
                    onClick={() => {
                      haptic.light()
                      setHeroIdx(i)
                    }}
                    aria-label={`Show photo ${i + 1} of ${gallery.length}`}
                    aria-current={active}
                    style={{
                      width: 140,
                      height: 90,
                      borderRadius: 12,
                      flexShrink: 0,
                      overflow: 'hidden',
                      border: active ? '2px solid var(--accent)' : '1px solid var(--hairline)',
                      padding: 0,
                      background: 'var(--chip)',
                      transform: active ? 'scale(1)' : 'scale(0.97)',
                      opacity: active ? 1 : 0.75,
                      transition: 'transform 200ms ease, opacity 200ms ease, border-color 200ms ease',
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </button>
                )
              })}
            </div>
          )}

          {/* insider tip — the marigold margin note (curated places only) */}
          {s.poi.tip && (
            <div
              style={{
                borderLeft: '2px solid var(--accent)',
                background: 'var(--accent-soft)',
                borderRadius: '0 12px 12px 0',
                padding: '12px 16px',
                marginBottom: 18,
              }}
            >
              <div className="mono" style={{ color: 'var(--accent)', marginBottom: 4 }}>
                like a local
              </div>
              <p className="serif-i" style={{ margin: 0, fontSize: 15.5, lineHeight: 1.5 }}>
                {s.poi.tip}
              </p>
            </div>
          )}
          {s.poi.osm && (
            <p className="mono-lg" style={{ margin: '0 0 18px', color: 'var(--accent-2)' }}>
              ◈ live discovery from OpenStreetMap — timings and entry aren’t verified; the Maps
              link below has current details
            </p>
          )}

          {/* practicals strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              borderTop: '1px solid var(--hairline)',
              borderBottom: '1px solid var(--hairline)',
              marginBottom: 16,
            }}
          >
            {[
              ['give it', fmtMinutes(s.poi.minutes)],
              ['entry', s.poi.fee === 'free' ? 'free' : s.poi.fee === '₹' ? 'modest' : 'ticketed'],
              ['best at', s.poi.best],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '12px 8px', textAlign: 'center' }}>
                <div className="mono" style={{ fontSize: 10 }}>{k}</div>
                <div style={{ fontSize: 15, fontWeight: 400, marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* which lenses it serves */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
            {INTERESTS.filter((i) => (s.poi.cats[i.id] ?? 0) >= 0.6).map((i) => (
              <span key={i.id} className="mono" style={{ color: i.id === s.topInterest ? 'var(--accent)' : undefined }}>
                {i.glyph} {i.title}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <Pill
              full
              variant={saved ? 'ghost' : 'accent'}
              onClick={() => {
                haptic.doublePulse()
                // Airbnb-style: one-tap save.
                //   • No trips yet → open picker so user names their first trip
                //   • Already saved → open picker so they can edit membership
                //   • Otherwise (single-tap save) → drop into the active trip
                //     and pop a toast with an "Undo" and a "Change trip" action
                if (persisted.trips.length === 0 || saved) {
                  openSavePicker(s.poi)
                  return
                }
                const active =
                  persisted.trips.find((t) => t.id === persisted.activeTripId) ??
                  persisted.trips[0]
                addPlaceToTrip(active.id, s.poi.id, s.poi)
                showToast(`Saved to ${active.name}`, {
                  label: 'change trip',
                  onClick: () => openSavePicker(s.poi),
                })
              }}
            >
              {saved
                ? `♡ In ${savedTripIds.length} trip${savedTripIds.length === 1 ? '' : 's'} — edit`
                : persisted.trips.length === 0
                  ? '♡ Save to a trip'
                  : `♡ Save to ${
                      persisted.trips.find((t) => t.id === persisted.activeTripId)?.name ??
                      persisted.trips[0]?.name
                    }`}
            </Pill>
          </div>
          {/* Small always-visible line so the "which trip" is unambiguous —
              this is the Airbnb move: a heart, plus a tiny caption. */}
          {persisted.trips.length > 0 && (
            <button
              onClick={() => openSavePicker(s.poi)}
              className="mono"
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                padding: '4px 0 10px',
                marginBottom: 8,
                color: saved ? 'var(--accent-2)' : 'var(--text-secondary)',
                letterSpacing: 1.2,
                fontSize: 10,
                textTransform: 'none',
              }}
            >
              {saved
                ? `in ${savedTripIds
                    .map((id) => persisted.trips.find((t) => t.id === id)?.name)
                    .filter(Boolean)
                    .join(' · ')} — tap to change`
                : `↑ goes to “${
                    persisted.trips.find((t) => t.id === persisted.activeTripId)?.name ??
                    persisted.trips[0]?.name
                  }” — tap to pick a different trip`}
            </button>
          )}
          {saved && (
            <button
              onClick={() => {
                onClose()
                openPlan(true)
              }}
              className="mono"
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                padding: '10px 0',
                marginBottom: 8,
                color: 'var(--accent)',
                letterSpacing: 1.4,
              }}
            >
              view my trips →
            </button>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
            <a
              className="quiet-btn"
              href={mapsUrl(s.poi, s.poi.name)}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: 'none' }}
            >
              Navigate → Maps
            </a>
            <button className="quiet-btn" onClick={() => toggleSeen(s.poi.id)}>
              {seen ? '✓ been here' : 'mark as been'}
            </button>
          </div>
          {s.topInterest && (
            <p className="mono" style={{ marginTop: 20, marginBottom: 0 }}>
              surfaced for your {interestById(s.topInterest).title.toLowerCase()} lens — {interestById(s.topInterest).voice}
            </p>
          )}
        </div>
      )}
      {s && (
        <Lightbox
          open={lightboxOpen}
          photos={gallery}
          index={Math.min(heroIdx, Math.max(0, gallery.length - 1))}
          onIndexChange={setHeroIdx}
          onClose={() => setLightboxOpen(false)}
          caption={s.poi.name}
          sourceUrl={photo?.source}
        />
      )}
    </Sheet>
  )
}
