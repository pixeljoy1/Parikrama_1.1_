/**
 * PlaceSheet — the detail bottom sheet for one place: the story, the insider
 * tip, practicals, save-to-plan, and a Maps deep link for actual navigation.
 */

import { interestById } from '../data/interests'
import { INTERESTS } from '../data/interests'
import { ScoredPoi } from '../explorer/score'
import { fmtKm, mapsUrl } from '../geo/geo'
import { useStore } from '../state/store'
import { fmtMinutes, haptic } from '../state/util'
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

  return (
    <Sheet open={!!s} onClose={onClose}>
      {s && (
        <div>
          <div className="mono" style={{ color: 'var(--accent-2)', marginBottom: 8 }}>
            {fmtKm(s.km)} {s.dir} of you · {Math.round(s.match * 100)}% your kind of place
          </div>
          <h2 className="serif" style={{ fontSize: 30, lineHeight: 1.1, margin: '0 0 12px' }}>
            {s.poi.name}
          </h2>

          <p style={{ fontSize: 15, lineHeight: 1.6, margin: '0 0 16px', color: 'var(--text-primary)' }}>
            {s.poi.blurb}
          </p>

          {/* insider tip — the marigold margin note */}
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
                toggleSaved(s.poi.id)
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
