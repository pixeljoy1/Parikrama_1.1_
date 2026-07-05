/** Shared helpers — greetings, haptics, formatting. */

/** Greeting adapts to time of day — the traveler's clock, not the app's. */
export function greeting(now = new Date()): string {
  const h = now.getHours()
  if (h < 5) return 'Out early'
  if (h < 11) return 'Good morning'
  if (h < 16) return 'Good afternoon'
  if (h < 20) return 'Golden hour soon'
  return 'Good evening'
}

/** Rotating invitation lines — a fresh one each visit. */
const INVITATIONS = [
  'What will you circle today?',
  'The worthwhile is closer than you think.',
  'Every direction hides something.',
  'Walk out the door — we’ll point.',
  'Wonder, within walking distance.',
  'India rewards the curious.',
  'Somewhere nearby, light is falling perfectly.',
  'The best guide is a good radius.',
]

export function nextInvitation(): string {
  let i = 0
  try {
    i = parseInt(localStorage.getItem('parikrama.invite.idx') || '0', 10) || 0
    localStorage.setItem('parikrama.invite.idx', String((i + 1) % INVITATIONS.length))
  } catch {
    i = Math.floor(Math.random() * INVITATIONS.length)
  }
  return INVITATIONS[i % INVITATIONS.length]
}

/** Haptic language — best-effort; no-op where unsupported. */
export const haptic = {
  light: () => navigator.vibrate?.(8),
  medium: () => navigator.vibrate?.(18),
  doublePulse: () => navigator.vibrate?.([14, 80, 14]),
}

/** Honor system reduced-motion. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** "2 hr" / "45 min" for visit durations. */
export function fmtMinutes(m: number): string {
  if (m < 60) return `${m} min`
  const h = m / 60
  return Number.isInteger(h) ? `${h} hr` : `${h.toFixed(1)} hr`
}
