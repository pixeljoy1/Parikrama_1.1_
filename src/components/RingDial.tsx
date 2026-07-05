/**
 * RingDial — the 5/10/20/30 km selector. A segmented pill row where each
 * segment carries the live count of worthwhile places inside that circle.
 */

import { Ring, RINGS } from '../data/types'
import { haptic } from '../state/util'

interface Props {
  active: Ring
  counts: Record<Ring, number>
  onChange: (r: Ring) => void
}

export function RingDial({ active, counts, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Exploration radius"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1,
        background: 'var(--hairline)',
        border: '1px solid var(--hairline)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {RINGS.map((r) => {
        const on = r === active
        return (
          <button
            key={r}
            role="tab"
            aria-selected={on}
            onClick={() => {
              haptic.light()
              onChange(r)
            }}
            style={{
              padding: '12px 4px 10px',
              background: on ? 'var(--accent-soft)' : 'var(--surface-raised)',
              color: on ? 'var(--accent)' : 'var(--text-secondary)',
              transition: 'background 300ms ease, color 300ms ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span style={{ fontSize: 17, fontWeight: 500, color: on ? 'var(--accent)' : 'var(--text-primary)' }}>
              {r}
              <span style={{ fontSize: 11, fontWeight: 300 }}> km</span>
            </span>
            <span className="mono" style={{ fontSize: 10, color: on ? 'var(--accent)' : 'var(--text-ghost)' }}>
              {counts[r]} place{counts[r] === 1 ? '' : 's'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
