/**
 * PlaceCard — one worthwhile place in the ranked list. Distance + direction
 * read like a signpost; the match bar shows how strongly it fits the profile.
 */

import { interestById } from '../data/interests'
import { ScoredPoi } from '../explorer/score'
import { fmtKm } from '../geo/geo'
import { fmtMinutes, haptic } from '../state/util'
import { radius } from '../theme/tokens'

interface Props {
  s: ScoredPoi
  saved: boolean
  onOpen: () => void
}

export function PlaceCard({ s, saved, onOpen }: Props) {
  const lens = s.topInterest ? interestById(s.topInterest) : null
  return (
    <button
      className="place-card"
      onClick={() => {
        haptic.light()
        onOpen()
      }}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'var(--surface-raised)',
        border: '1px solid var(--hairline)',
        borderRadius: radius.card,
        padding: '16px 18px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <span className="mono" style={{ color: 'var(--accent-2)' }}>
          {fmtKm(s.km)} {s.dir}
        </span>
        <span className="mono" style={{ color: saved ? 'var(--accent)' : 'var(--text-ghost)' }}>
          {saved ? '● in plan' : `${Math.round(s.match * 100)}%`}
        </span>
      </div>
      <div className="serif" style={{ fontSize: 22, lineHeight: 1.15, margin: '8px 0 6px' }}>
        {s.poi.name}
      </div>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{s.poi.blurb}</p>
      <div style={{ display: 'flex', gap: 14, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {lens && (
          <span className="mono" style={{ color: 'var(--accent)' }}>
            {lens.glyph} {lens.title}
          </span>
        )}
        <span className="mono">{fmtMinutes(s.poi.minutes)}</span>
        {!s.poi.osm && <span className="mono">{s.poi.fee === 'free' ? 'free' : s.poi.fee}</span>}
        {s.poi.best !== 'any' && <span className="mono">best · {s.poi.best}</span>}
        {s.poi.osm && (
          <span className="mono" style={{ color: 'var(--accent-2)' }}>
            ◈ discovered
          </span>
        )}
      </div>
      {/* match bar — quiet, hairline-thin */}
      <div style={{ height: 2, background: 'var(--chip)', borderRadius: 1, marginTop: 12 }}>
        <div
          style={{
            height: '100%',
            width: `${Math.round(s.match * 100)}%`,
            background: 'linear-gradient(90deg, var(--accent-2), var(--accent))',
            borderRadius: 1,
            transition: 'width 600ms cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </div>
    </button>
  )
}
