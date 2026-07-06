/**
 * PlaceSheet — the detail bottom sheet for one place: hero photo band, up to
 * five gallery photos, the story, the insider tip, practicals, save-to-plan,
 * and a Maps deep link for actual navigation. Photos come from Wikimedia and
 * carry attribution back to their Wikipedia source.
 */

import { hubById } from '../data/hubs'
import { interestById } from '../data/interests'
import { INTERESTS } from '../data/interests'
import { ScoredPoi } from '../explorer/score'
import { fmtKm, mapsUrl } from '../geo/geo'
import { useStore } from '../state/store'
import { fmtMinutes, haptic } from '../state/util'
import { usePhoto } from '../state/usePhotos'
import { Pill } from './Pill'
import { Sheet } from './Sheet'

interface Props {
  scored: ScoredPoi | null
  onClose: () => void
}

export function PlaceSheet({ scored, onClose }: Props) {
  const { persisted, toggleSaved, toggleSeen } = useStore()
  const s = scored
  const saved = !!s && persisted.saved.includes(s.poi.id)
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
  const restOfGallery = gallery.slice(1)

  return (
    <Sheet open={!!s} onClose={onClose}>
      {s && (
        <div>
          {/* hero band — full-bleed above the sheet padding */}
          {(hasGallery || photoState === 'loading') && (
            <div
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
              }}
            >
              {hasGallery && (
                <>
                  <img
                    src={gallery[0]}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 'auto 0 0 0',
                      height: 70,
                      background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.35))',
                      pointerEvents: 'none',
                    }}
                  />
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
          <h2 className="serif" style={{ fontSize: 30, lineHeight: 1.1, margin: '0 0 12px' }}>
            {s.poi.name}
          </h2>

          <p style={{ fontSize: 15, lineHeight: 1.6, margin: '0 0 16px', color: 'var(--text-primary)' }}>
            {s.poi.blurb}
          </p>

          {/* gallery — 2nd through 5th photos, horizontally scrollable */}
          {restOfGallery.length > 0 && (
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
              {restOfGallery.map((url, i) => (
                <img
                  key={`${url}-${i}`}
                  src={url}
                  alt=""
                  loading="lazy"
                  style={{
                    width: 140,
                    height: 90,
                    objectFit: 'cover',
                    borderRadius: 12,
                    flexShrink: 0,
                    border: '1px solid var(--hairline)',
                  }}
                />
              ))}
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

          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <Pill
              full
              variant={saved ? 'ghost' : 'accent'}
              onClick={() => {
                haptic.doublePulse()
                toggleSaved(s.poi.id, s.poi)
              }}
            >
              {saved ? 'Remove from plan' : 'Add to my plan'}
            </Pill>
          </div>
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
    </Sheet>
  )
}
