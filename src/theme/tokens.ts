/**
 * Design tokens — Parikrama.
 * Web mirror of what would be `Theme.kt` / `Color.kt` in Compose.
 * Two moods: ivory (default — warm paper, ink, marigold) and midnight.
 * styles/global.css re-exports these as CSS vars; keep the two in sync.
 */

// Ivory — the daylight identity: warm paper, ink text, marigold + peacock.
export const ivory = {
  surface: '#F6F1E7',
  surfaceRaised: '#FDFAF3',
  textPrimary: '#221E19',
  textSecondary: '#75705F',
  textGhost: '#C3BCA9',
  accent: '#C2571B', // marigold-saffron — the single warm accent
  accent2: '#0F6B66', // peacock teal — the counterpoint
  danger: '#C23B2E',
} as const

// Midnight — the after-dark identity: ink, embered marigold.
export const midnight = {
  surface: '#12100D',
  surfaceRaised: '#1C1915',
  textPrimary: '#F1EBDD',
  textSecondary: '#9C9484',
  textGhost: '#4A453B',
  accent: '#E8813F',
  accent2: '#3FB3AC',
  danger: '#E06052',
} as const

// Spacing scale (dp → px 1:1 for prototype)
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const

// Corner radius
export const radius = {
  card: 20,
  pill: 100,
  sheet: 28, // top corners only
  button: 16,
} as const

// Easing tokens — the interaction nuances carried over from Attune.
export const ease = {
  spring: 'cubic-bezier(0.22, 1, 0.36, 1)', // stiff, snappy — default UI
  gentle: 'cubic-bezier(0.34, 1.2, 0.4, 1)', // cards, sheets (slight overshoot)
  float: 'cubic-bezier(0.4, 0, 0.1, 1)', // large surfaces, overlays
  fade: 'cubic-bezier(0.4, 0, 0.2, 1)', // opacity only
} as const

// Duration guidelines (ms)
export const duration = {
  press: 80,
  cardExpand: 280,
  sheet: 340,
  screen: 440,
} as const
