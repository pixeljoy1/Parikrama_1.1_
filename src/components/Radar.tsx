/**
 * Radar — the signature surface. An ego-centric polar map: you are the
 * center, the 5/10/20/30 km parikrama rings breathe outward, and every
 * worthwhile place is plotted at its true bearing and distance. A slow
 * sweep line keeps it feeling alive; tapping a dot opens the place.
 *
 * Radial scale is square-root so the inner rings (where you can walk)
 * get room and the 30 km ring doesn't crush them.
 *
 * Places with a resolved Wikipedia hero photo render as small circular
 * thumbnails — a strong visual affordance that there's something to open,
 * without abandoning the polar-map metaphor. Places without a photo (or
 * still loading) stay as classic dots (teal solid = curated, hollow ring
 * = live OSM discovery). The name of the currently selected place floats
 * above it on the plot.
 */

import { useMemo } from 'react'
import { Ring, RINGS } from '../data/types'
import { ScoredPoi } from '../explorer/score'
import { haptic } from '../state/util'
import { PhotoState } from '../state/usePhotos'

interface Props {
  scored: ScoredPoi[]
  activeRing: Ring
  selectedId?: string | null
  onPick: (id: string) => void
  reduceMotion?: boolean
  photos: Record<string, PhotoState>
}

const SIZE = 340
const C = SIZE / 2
const MAX_R = C - 26

const rOf = (km: number) => MAX_R * Math.sqrt(Math.min(km, 30) / 30)

export function Radar({ scored, activeRing, selectedId, onPick, reduceMotion, photos }: Props) {
  const dots = useMemo(
    () =>
      scored.map((s) => {
        const r = rOf(s.km)
        const a = ((s.bearing - 90) * Math.PI) / 180
        return { s, x: C + r * Math.cos(a), y: C + r * Math.sin(a) }
      }),
    [scored],
  )

  // Split into two z-layers so photo thumbs always render over plain dots
  // (higher match wins overlaps). The selected place renders last of all.
  const withPhotos = dots.filter((d) => {
    const p = photos[d.s.poi.id]
    return p && typeof p === 'object' && p.hero
  })
  const withoutPhotos = dots.filter((d) => {
    const p = photos[d.s.poi.id]
    return !(p && typeof p === 'object' && p.hero)
  })
  const selectedDot = dots.find((d) => d.s.poi.id === selectedId)

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
        {withPhotos.map(({ s }) => (
          <clipPath key={`clip-${s.poi.id}`} id={`clip-${s.poi.id}`}>
            <circle cx={0} cy={0} r={16} />
          </clipPath>
        ))}
        {selectedDot && (
          <clipPath id="clip-selected">
            <circle cx={0} cy={0} r={22} />
          </clipPath>
        )}
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

      {/* Layer 1 — plain dots (photoless or loading) */}
      {withoutPhotos.map(({ s, x, y }) => {
        const inRing = s.km <= activeRing
        const selected = s.poi.id === selectedId
        if (selected) return null // rendered above
        const r = 3.5 + s.match * 4
        const loading = photos[s.poi.id] === 'loading'
        return (
          <g key={s.poi.id} opacity={inRing ? 1 : 0.22} style={{ transition: 'opacity 400ms ease' }}>
            <circle
              className="radar-dot"
              cx={x}
              cy={y}
              r={r}
              fill={s.poi.osm ? 'var(--surface-raised)' : 'var(--accent-2)'}
              stroke="var(--accent-2)"
              strokeWidth={1.2}
              opacity={loading ? 0.6 : 1}
              onClick={() => {
                haptic.light()
                onPick(s.poi.id)
              }}
              style={{ cursor: 'pointer' }}
            >
              <title>{s.poi.name}</title>
            </circle>
          </g>
        )
      })}

      {/* Layer 2 — photo thumbs */}
      {withPhotos.map(({ s, x, y }) => {
        const inRing = s.km <= activeRing
        const selected = s.poi.id === selectedId
        if (selected) return null // rendered above
        const p = photos[s.poi.id] as { hero: string }
        return (
          <g
            key={s.poi.id}
            opacity={inRing ? 1 : 0.35}
            style={{ transition: 'opacity 400ms ease', cursor: 'pointer' }}
            onClick={() => {
              haptic.light()
              onPick(s.poi.id)
            }}
          >
            <circle
              cx={x}
              cy={y}
              r={17.5}
              fill="var(--surface-raised)"
              stroke={s.poi.osm ? 'var(--accent-2)' : 'var(--accent-line)'}
              strokeWidth={1.5}
            />
            <g transform={`translate(${x}, ${y})`}>
              <image
                href={p.hero}
                x={-16}
                y={-16}
                width={32}
                height={32}
                clipPath={`url(#clip-${s.poi.id})`}
                preserveAspectRatio="xMidYMid slice"
                style={{ pointerEvents: 'none' }}
              />
            </g>
            <circle cx={x} cy={y} r={17.5} fill="transparent">
              <title>{s.poi.name}</title>
            </circle>
          </g>
        )
      })}

      {/* Selected — enlarged, haloed, with floating label above */}
      {selectedDot && (() => {
        const { s, x, y } = selectedDot
        const p = photos[s.poi.id]
        const hasPhoto = p && typeof p === 'object' && p.hero
        return (
          <g style={{ cursor: 'pointer' }} onClick={() => onPick(s.poi.id)}>
            <circle cx={x} cy={y} r={30} fill="none" stroke="var(--accent)" strokeWidth={1.2} opacity={0.55}>
              {!reduceMotion && (
                <>
                  <animate attributeName="r" values="24;34" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.55;0" dur="2.4s" repeatCount="indefinite" />
                </>
              )}
            </circle>
            {hasPhoto ? (
              <>
                <circle cx={x} cy={y} r={24} fill="var(--surface-raised)" stroke="var(--accent)" strokeWidth={2} />
                <g transform={`translate(${x}, ${y})`}>
                  <image
                    href={(p as { hero: string }).hero}
                    x={-22}
                    y={-22}
                    width={44}
                    height={44}
                    clipPath="url(#clip-selected)"
                    preserveAspectRatio="xMidYMid slice"
                    style={{ pointerEvents: 'none' }}
                  />
                </g>
              </>
            ) : (
              <>
                <circle cx={x} cy={y} r={11} fill="var(--accent)" stroke="var(--surface-raised)" strokeWidth={1.5} />
              </>
            )}
            {/* floating name label */}
            <g transform={`translate(${x}, ${y - (hasPhoto ? 32 : 20)})`}>
              <rect
                x={-Math.min(90, s.poi.name.length * 3.6 + 10)}
                y={-13}
                width={Math.min(180, s.poi.name.length * 7.2 + 20)}
                height={18}
                rx={9}
                fill="var(--surface-raised)"
                stroke="var(--accent-line)"
                strokeWidth={0.8}
              />
              <text
                y={-1}
                fontSize={10}
                fill="var(--accent)"
                fontFamily="var(--sans)"
                textAnchor="middle"
                fontWeight={500}
              >
                {s.poi.name.length > 22 ? s.poi.name.slice(0, 21) + '…' : s.poi.name}
              </text>
            </g>
          </g>
        )
      })()}

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
