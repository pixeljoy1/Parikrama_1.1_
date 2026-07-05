/** Primary pill button — full-width accent, haptic press, scale-settle. */

import { haptic } from '../state/util'
import { radius } from '../theme/tokens'

interface Props {
  children: React.ReactNode
  onClick: () => void
  variant?: 'accent' | 'ghost'
  full?: boolean
  style?: React.CSSProperties
}

export function Pill({ children, onClick, variant = 'accent', full, style }: Props) {
  const accent = variant === 'accent'
  return (
    <button
      onClick={() => {
        haptic.medium()
        onClick()
      }}
      style={{
        minHeight: 52,
        width: full ? '100%' : undefined,
        padding: '0 28px',
        borderRadius: radius.pill,
        background: accent ? 'var(--accent)' : 'var(--chip)',
        border: accent ? 'none' : '1px solid var(--hairline)',
        color: accent ? 'var(--on-accent)' : 'var(--text-primary)',
        fontSize: 16,
        fontWeight: 500,
        letterSpacing: 0.2,
        transition: 'transform 80ms ease, filter 200ms ease',
        ...style,
      }}
      onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {children}
    </button>
  )
}
