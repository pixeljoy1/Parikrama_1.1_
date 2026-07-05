/**
 * Radar — the signature surface. An ego-centric polar map: you are the
 * center, the 5/10/20/30 km parikrama rings breathe outward, and every
 * worthwhile place is plotted at its true bearing and distance. A slow
 * sweep line keeps it feeling alive; tapping a dot opens the place.
 *
 * Radial scale is square-root so the inner rings (where you can walk)
 * get room and the 30 km ring doesn't crush them.
 */

import { useMemo } from 'react'
import { Ring, RINGS } from '../data/types'
import { ScoredPoi } from '../explorer/score'
import { haptic } from '../state/util'

interface Props {
  scored: ScoredPoi[]
  activeRing: Ring
  selectedId?: string | null
  onPick: (id: string) => void
  reduceMotion?: boolean
}

const SIZE = 340
const C = SIZE / 2
const MAX_R = C - 26

const rOf = (km: number) => MAX_R * Math.sqrt(Math.min(km, 30) / 30)

export function Radar({ scored, activeRing, selectedId, onPick, reduceMotion }: Props) {
  const dots = useMemo(
    () =>
      scored.map((s) => {
        const r = rOf(s.km)
        const a = ((s.bearing - 90) * Math.PI) / 180
        return { s, x: C + r * Math.cos(a), y: C + r * Math.sin(a) }
      }),
    [scored],
  )

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ width: '100%', height: 'auto', display: 'block', maxWidth: 420, margin: '0 auto' }}
      role="img"
      aria-label="Places around you, plotted by direction and distance"
    >
      <defs>
        <radialGradient id="sweepFade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* rings */}
      {RINGS.map((ring) => {
        const active = ring === activeRing
        return (
          <g key={ring}>
            <circle
              cx={C}
              cy={C}
              r={rOf(ring)}
              fill={active ? 'var(--accent-soft)' : 'none'}
              stroke={active ? 'var(--accent-line)' : 'var(--hairline)'}
              strokeWidth={active ? 1.5 : 1}
              strokeDasharray={active ? undefined : '3 5'}
              style={{ transition: 'stroke 400ms ease, fill 400ms ease' }}
            />
            <text
              x={C + 4}
              y={C - rOf(ring) + 13}
              fontSize={10}
              fill={active ? 'var(--accent)' : 'var(--text-ghost)'}
              fontFamily="var(--mono)"
              letterSpacing={1}
            >
              {ring} km
            </text>
          </g>
        )
      })}

      {/* compass ticks */}
      {(['N', 'E', 'S', 'W'] as const).map((d, i) => {
        const a = (i * 90 - 90) * (Math.PI / 180)
        const x = C + (MAX_R + 14) * Math.cos(a)
        const y = C + (MAX_R + 14) * Math.sin(a)
        return (
          <text
            key={d}
            x={x}
            y={y + 4}
            fontSize={11}
            textAnchor="middle"
            fill={d === 'N' ? 'var(--accent-2)' : 'var(--text-ghost)'}
            fontFamily="var(--mono)"
          >
            {d}
          </text>
        )
      })}

      {/* sweep */}
      {!reduceMotion && (
        <g className="radar-sweep" style={{ transformOrigin: `${C}px ${C}px` }}>
          <path
            d={`M ${C} ${C} L ${C} ${C - MAX_R} A ${MAX_R} ${MAX_R} 0 0 1 ${C + MAX_R * 0.5} ${C - MAX_R * 0.866} Z`}
            fill="url(#sweepFade)"
          />
          <line x1={C} y1={C} x2={C} y2={C - MAX_R} stroke="var(--accent-line)" strokeWidth={0.8} />
        </g>
      )}

      {/* places */}
      {dots.map(({ s, x, y }) => {
        const inRing = s.km <= activeRing
        const selected = s.poi.id === selectedId
        const r = selected ? 8 : 3.5 + s.match * 4
        return (
          <g key={s.poi.id} opacity={inRing ? 1 : 0.22} style={{ transition: 'opacity 400ms ease' }}>
            {selected && (
              <circle cx={x} cy={y} r={r + 6} fill="none" stroke="var(--accent)" strokeWidth={1} opacity={0.5} />
            )}
            {/* curated = solid teal; live OSM discovery = hollow ring */}
            <circle
              className="radar-dot"
              cx={x}
              cy={y}
              r={r}
              fill={selected ? 'var(--accent)' : s.poi.osm ? 'var(--surface-raised)' : 'var(--accent-2)'}
              stroke={selected ? 'var(--surface-raised)' : s.poi.osm ? 'var(--accent-2)' : 'var(--surface-raised)'}
              strokeWidth={1.2}
              onClick={() => {
                haptic.light()
                onPick(s.poi.id)
              }}
            >
              <title>{s.poi.name}</title>
            </circle>
          </g>
        )
      })}

      {/* you */}
      <circle cx={C} cy={C} r={5} fill="var(--accent)" />
      <circle cx={C} cy={C} r={10} fill="none" stroke="var(--accent)" strokeWidth={1} opacity={0.4}>
        {!reduceMotion && (
          <>
            <animate attributeName="r" values="6;16" dur="2.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0" dur="2.8s" repeatCount="indefinite" />
          </>
        )}
      </circle>
    </svg>
  )
}
