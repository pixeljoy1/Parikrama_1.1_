/**
 * SelectedPlacePreview — the big attractive header that appears between the
 * radar and the ring dial when the user selects a place (by tapping a dot
 * or a card). Shows the place name in serif display type, the star rating,
 * distance + direction, and a colored popularity badge:
 *   • MUST SEE  (wow ≥ 9)
 *   • GOOD TO SEE (wow ≥ 7.5)
 *   • OK TO SEE (wow ≥ 6)
 *   • QUIET GEM (below)
 *
 * Tap the whole preview to open the full place sheet.
 */

import { ScoredPoi } from '../explorer/score'
import { fmtKm } from '../geo/geo'
import { haptic } from '../state/util'
import { PhotoState } from '../state/usePhotos'
import { StarRating } from './StarRating'

type BadgeColor = 'must' | 'good' | 'ok' | 'quiet'

function badge(wow: number): { label: string; kind: BadgeColor } {
  if (wow >= 9) return { label: 'Must see', kind: 'must' }
  if (wow >= 7.5) return { label: 'Good to see', kind: 'good' }
  if (wow >= 6) return { label: 'OK to see', kind: 'ok' }
  return { label: 'Quiet gem', kind: 'quiet' }
}

function badgeStyle(kind: BadgeColor): React.CSSProperties {
  switch (kind) {
    case 'must':
      return {
        color: 'var(--on-accent)',
        background: 'var(--accent)',
        border: '1px solid var(--accent)',
      }
    case 'good':
      return {
        color: 'var(--accent)',
        background: 'var(--accent-soft)',
        border: '1px solid var(--accent-line)',
      }
    case 'ok':
      return {
        color: 'var(--accent-2)',
        background: 'var(--accent2-soft)',
        border: '1px solid var(--accent-2)',
      }
    case 'quiet':
      return {
        color: 'var(--text-secondary)',
        background: 'var(--chip)',
        border: '1px solid var(--hairline)',
      }
  }
}

export function SelectedPlacePreview({
  scored,
  onOpen,
  onDismiss,
  photo,
}: {
  scored: ScoredPoi
  onOpen: () => void
  onDismiss: () => void
  photo: PhotoState
}) {
  const b = badge(scored.poi.wow)
  const bs = badgeStyle(b.kind)
  const hasPhoto = photo && typeof photo === 'object' && photo.hero

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        haptic.medium()
        onOpen()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen()
      }}
      className="reveal soft-panel"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'stretch',
        gap: 14,
        padding: 12,
        borderRadius: 20,
        border: '1.5px solid var(--accent-line)',
        background: 'var(--surface-raised)',
        cursor: 'pointer',
        marginBottom: 14,
      }}
    >
      {/* thumbnail */}
      <div
        style={{
          width: 76,
          height: 76,
          flexShrink: 0,
          borderRadius: 14,
          overflow: 'hidden',
          background: 'var(--chip)',
          border: '1px solid var(--hairline)',
          position: 'relative',
        }}
      >
        {hasPhoto && (
          <img
            src={(photo as { hero: string }).hero}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
        {!hasPhoto && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--serif)',
              fontSize: 32,
              color: 'var(--text-ghost)',
            }}
          >
            {scored.poi.name.charAt(0)}
          </span>
        )}
      </div>

      {/* text column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 10px',
              borderRadius: 100,
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              lineHeight: 1,
              marginBottom: 6,
              ...bs,
            }}
          >
            {b.label}
          </div>
          <div
            className="serif"
            style={{
              fontSize: 20,
              lineHeight: 1.15,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'var(--text-primary)',
            }}
          >
            {scored.poi.name}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <StarRating value={scored.poi.wow / 2} size="compact" />
          <span className="mono" style={{ color: 'var(--accent-2)' }}>
            {fmtKm(scored.km)} {scored.dir}
          </span>
        </div>
      </div>

      {/* dismiss × */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDismiss()
        }}
        aria-label="Dismiss selection"
        className="mono"
        style={{
          position: 'absolute',
          top: 8,
          right: 10,
          color: 'var(--text-ghost)',
          padding: '4px 8px',
          fontSize: 12,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  )
}
