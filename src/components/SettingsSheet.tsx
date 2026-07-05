/**
 * SettingsSheet — tune the lenses, pace, and mood without re-onboarding;
 * or start over entirely.
 */

import { INTERESTS } from '../data/interests'
import { Pace } from '../data/types'
import { useStore } from '../state/store'
import { haptic } from '../state/util'
import { Sheet } from './Sheet'

const PACES: Array<{ id: Pace; title: string; line: string }> = [
  { id: 'relaxed', title: 'Unhurried', line: 'a few places, fully felt' },
  { id: 'balanced', title: 'Balanced', line: 'the classics plus a detour' },
  { id: 'packed', title: 'Full throttle', line: 'see everything, sleep later' },
]

export function SettingsSheet() {
  const { settingsOpen, openSettings, persisted, setInterests, setPace, setTheme, resetProfile } = useStore()

  const toggle = (id: (typeof INTERESTS)[number]['id']) => {
    haptic.light()
    const on = persisted.interests.includes(id)
    if (on && persisted.interests.length === 1) return // always keep one lens
    setInterests(on ? persisted.interests.filter((x) => x !== id) : [...persisted.interests, id])
  }

  return (
    <Sheet open={settingsOpen} onClose={() => openSettings(false)} title="Your lenses">
      <div className="sect" style={{ marginBottom: 12 }}>
        <span className="label">what you explore for</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 26 }}>
        {INTERESTS.map((i) => {
          const on = persisted.interests.includes(i.id)
          return (
            <button
              key={i.id}
              onClick={() => toggle(i.id)}
              style={{
                padding: '9px 15px',
                borderRadius: 100,
                border: `1px solid ${on ? 'var(--accent-line)' : 'var(--hairline)'}`,
                background: on ? 'var(--accent-soft)' : 'var(--chip)',
                color: on ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 13.5,
                transition: 'all 240ms ease',
              }}
            >
              {i.glyph} {i.title}
            </button>
          )
        })}
      </div>

      <div className="sect" style={{ marginBottom: 12 }}>
        <span className="label">pace</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 26 }}>
        {PACES.map((p) => {
          const on = persisted.pace === p.id
          return (
            <button
              key={p.id}
              onClick={() => {
                haptic.light()
                setPace(p.id)
              }}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '12px 16px',
                borderRadius: 14,
                border: `1px solid ${on ? 'var(--accent-line)' : 'var(--hairline)'}`,
                background: on ? 'var(--accent-soft)' : 'transparent',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 15.5 }}>{p.title}</span>
              <span className="mono">{p.line}</span>
            </button>
          )
        })}
      </div>

      <div className="sect" style={{ marginBottom: 12 }}>
        <span className="label">mood</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 30 }}>
        {(['ivory', 'midnight'] as const).map((t) => {
          const on = persisted.theme === t
          return (
            <button
              key={t}
              onClick={() => {
                haptic.light()
                setTheme(t)
              }}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 14,
                border: `1px solid ${on ? 'var(--accent-line)' : 'var(--hairline)'}`,
                background: on ? 'var(--accent-soft)' : 'var(--chip)',
                color: on ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 14.5,
              }}
            >
              {t === 'ivory' ? '☀ Ivory' : '☾ Midnight'}
            </button>
          )
        })}
      </div>

      <button className="quiet-btn" onClick={resetProfile} style={{ width: '100%', justifyContent: 'center' }}>
        start over — new traveler
      </button>
    </Sheet>
  )
}
