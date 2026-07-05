/**
 * Onboarding — the traveler profile, built in four unhurried steps:
 * welcome → lenses (what you explore for) → pace → location.
 * Keeps the Attune pacing: one question per screen, soft rises, no rush.
 */

import { useState } from 'react'
import { Pill } from '../components/Pill'
import { StatusLine } from '../components/Reveal'
import { INTERESTS } from '../data/interests'
import { Interest, Pace } from '../data/types'
import { useStore } from '../state/store'
import { haptic } from '../state/util'

type Step = 'welcome' | 'lenses' | 'pace' | 'locate'

const PACES: Array<{ id: Pace; title: string; line: string }> = [
  { id: 'relaxed', title: 'Unhurried', line: 'A few places, fully felt. Long chai breaks.' },
  { id: 'balanced', title: 'Balanced', line: 'The essentials, plus one good detour.' },
  { id: 'packed', title: 'Full throttle', line: 'Dawn starts. See everything. Sleep later.' },
]

export function Onboarding() {
  const { setInterests, setPace, persisted, completeOnboarding, location, openLocation } = useStore()
  const [step, setStep] = useState<Step>('welcome')
  const [picked, setPicked] = useState<Interest[]>(persisted.interests)

  const next = (s: Step) => {
    haptic.medium()
    setStep(s)
  }

  const togglePick = (id: Interest) => {
    haptic.light()
    setPicked((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]))
  }

  const frame: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    padding: 'max(28px, env(safe-area-inset-top)) 24px 40px',
    maxWidth: 560,
    margin: '0 auto',
  }

  if (step === 'welcome') {
    return (
      <div className="screen" style={frame} key="welcome">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="mono reveal d1" style={{ marginBottom: 18 }}>
            परिक्रमा · the sacred circle
          </div>
          <h1 className="serif ink reveal d2" style={{ fontSize: 'clamp(44px, 11vw, 64px)', lineHeight: 1.02, margin: '0 0 18px' }}>
            Parikrama
          </h1>
          <p className="reveal d3" style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--text-secondary)', margin: '0 0 26px', maxWidth: 400 }}>
            India, in circles around you. Wherever you stand, we plot what is{' '}
            <em className="serif-i" style={{ color: 'var(--accent)' }}>absolutely worth it</em> within 5, 10, 20, and
            30 kilometres — matched to how you like to travel.
          </p>
          <div className="reveal d4" style={{ marginBottom: 34 }}>
            <StatusLine
              steps={['loading the curated atlas', 'indexing 190 worthwhile places', 'calibrating your lenses']}
              doneLabel="ready when you are"
            />
          </div>
          <div className="reveal d5">
            <Pill full onClick={() => next('lenses')}>
              Begin
            </Pill>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'lenses') {
    return (
      <div className="screen" style={frame} key="lenses">
        <div className="mono reveal d1" style={{ margin: '18px 0 10px' }}>
          01 / 03 — your lenses
        </div>
        <h2 className="serif reveal d2" style={{ fontSize: 34, lineHeight: 1.1, margin: '0 0 8px' }}>
          What do you explore for?
        </h2>
        <p className="reveal d2" style={{ color: 'var(--text-secondary)', fontSize: 14.5, margin: '0 0 22px' }}>
          Pick as many as are true. This decides what rises to the top.
        </p>
        <div className="matrix reveal d3" style={{ marginBottom: 26 }}>
          {INTERESTS.map((i) => {
            const on = picked.includes(i.id)
            return (
              <button key={i.id} className={`matrix-cell${on ? ' on' : ''}`} onClick={() => togglePick(i.id)}>
                <span className="serif" style={{ fontSize: 26, color: on ? 'var(--accent)' : 'var(--text-ghost)' }}>
                  {i.glyph}
                </span>
                <span>
                  <span style={{ display: 'block', fontSize: 14.5, fontWeight: 400 }}>{i.title}</span>
                  <span className="mono" style={{ display: 'block', marginTop: 4, textTransform: 'none', letterSpacing: 0.3 }}>
                    {i.line}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <Pill
          full
          onClick={() => {
            if (picked.length === 0) return
            setInterests(picked)
            next('pace')
          }}
          style={picked.length === 0 ? { opacity: 0.4 } : undefined}
        >
          {picked.length === 0 ? 'Pick at least one' : `Continue with ${picked.length} lens${picked.length > 1 ? 'es' : ''}`}
        </Pill>
      </div>
    )
  }

  if (step === 'pace') {
    return (
      <div className="screen" style={frame} key="pace">
        <div className="mono reveal d1" style={{ margin: '18px 0 10px' }}>
          02 / 03 — your pace
        </div>
        <h2 className="serif reveal d2" style={{ fontSize: 34, lineHeight: 1.1, margin: '0 0 22px' }}>
          How full should a day be?
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 26 }}>
          {PACES.map((p, idx) => (
            <button
              key={p.id}
              className={`place-card reveal d${idx + 3}`}
              onClick={() => {
                haptic.medium()
                setPace(p.id)
                next('locate')
              }}
              style={{
                textAlign: 'left',
                padding: '18px 20px',
                borderRadius: 18,
                border: '1px solid var(--hairline)',
                background: 'var(--surface-raised)',
              }}
            >
              <span className="serif" style={{ fontSize: 22 }}>{p.title}</span>
              <span style={{ display: 'block', marginTop: 5, fontSize: 13.5, color: 'var(--text-secondary)' }}>
                {p.line}
              </span>
            </button>
          ))}
        </div>
        <button className="quiet-btn" onClick={() => next('lenses')} style={{ alignSelf: 'flex-start' }}>
          ← back
        </button>
      </div>
    )
  }

  // locate
  const located = !!location.point
  return (
    <div className="screen" style={frame} key="locate">
      <div className="mono reveal d1" style={{ margin: '18px 0 10px' }}>
        03 / 03 — your center
      </div>
      <h2 className="serif reveal d2" style={{ fontSize: 34, lineHeight: 1.1, margin: '0 0 8px' }}>
        Where shall we draw the circles?
      </h2>
      <p className="reveal d2" style={{ color: 'var(--text-secondary)', fontSize: 14.5, margin: '0 0 26px' }}>
        Your location never leaves this device — the atlas is onboard.
      </p>

      <div className="reveal d3" style={{ marginBottom: 14 }}>
        <StatusLine
          steps={
            location.status === 'locating'
              ? ['requesting permission', 'listening for satellites']
              : ['gps module standing by']
          }
          doneLabel={
            located
              ? `centered ${location.near ? `near ${location.near.hub.name}` : 'on your fix'}`
              : location.status === 'denied'
                ? 'permission declined — choose a city below'
                : location.status === 'unavailable'
                  ? 'no fix — choose a city below'
                  : 'awaiting your signal'
          }
        />
      </div>

      <div className="reveal d4" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 26 }}>
        {!located && (
          <Pill full onClick={location.detect}>
            {location.status === 'locating' ? 'Detecting…' : 'Detect my location'}
          </Pill>
        )}
        <Pill full variant={located ? 'accent' : 'ghost'} onClick={() => (located ? completeOnboarding() : openLocation(true))}>
          {located ? 'Draw my circles →' : 'Choose a city instead'}
        </Pill>
        {located && (
          <button className="quiet-btn" onClick={() => openLocation(true)} style={{ alignSelf: 'center' }}>
            not here? choose a city
          </button>
        )}
      </div>
      <button className="quiet-btn" onClick={() => next('pace')} style={{ alignSelf: 'flex-start' }}>
        ← back
      </button>
    </div>
  )
}
