/**
 * MakersPage — a graceful, Apple-minimalist "about the makers" page for
 * Wizard Communications (Kolkata, India), reached discreetly from the
 * footer. Sibling to the SoundTherapy MakersPage; retuned to Parikrama's
 * ivory/midnight identity and its "circle of India" voice.
 *
 * Closes on Escape as well as the Back button.
 */

import { useEffect, useState } from 'react'
import wizardLogo from '../assets/wizard-footer-logo.png'
import { useStore } from '../state/store'

export function MakersPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { persisted } = useStore()
  const midnight = persisted.theme === 'midnight'
  const [render, setRender] = useState(open)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (open) {
      setRender(true)
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(r)
    }
    setShown(false)
    const t = window.setTimeout(() => setRender(false), 480)
    return () => clearTimeout(t)
  }, [open])

  // Esc-to-close on desktop
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!render) return null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 80,
        overflowY: 'auto',
        // Ivory: warm marigold halo over paper; Midnight: peacock halo over ink
        background: midnight
          ? 'radial-gradient(120% 70% at 50% 8%, rgba(63,179,172,0.14), transparent 55%), linear-gradient(180deg, #16130f 0%, #12100d 100%)'
          : 'radial-gradient(120% 70% at 50% 8%, rgba(194,87,27,0.10), transparent 55%), linear-gradient(180deg, #f9f5eb 0%, #f6f1e7 100%)',
        opacity: shown ? 1 : 0,
        transition: 'opacity 480ms ease',
      }}
    >
      <button onClick={onClose} aria-label="Back" style={backBtn}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>←</span>
        <span>Back</span>
      </button>

      <div
        style={{
          maxWidth: 620,
          margin: '0 auto',
          padding: '96px 28px 64px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          transform: shown ? 'translateY(0)' : 'translateY(12px)',
          transition: 'transform 600ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* logo — transparent monochrome wordmark, tinted to the mood */}
        <div style={{ position: 'relative', marginBottom: 40 }}>
          <div
            style={{
              position: 'absolute',
              inset: '-40px -60px',
              background: midnight
                ? 'radial-gradient(closest-side, rgba(63,179,172,0.18), transparent)'
                : 'radial-gradient(closest-side, rgba(194,87,27,0.14), transparent)',
              filter: 'blur(6px)',
            }}
          />
          <img
            src={wizardLogo}
            alt="Wizard Communications"
            style={{
              position: 'relative',
              width: 240,
              maxWidth: '72vw',
              filter: midnight ? 'brightness(0) invert(1)' : 'brightness(0.18)',
              opacity: 0.96,
            }}
          />
        </div>

        <div className="label" style={{ color: 'var(--text-secondary)', marginBottom: 18 }}>
          The Makers
        </div>

        <h1 className="serif" style={{ fontSize: 40, lineHeight: 1.12, margin: '0 0 28px' }}>
          Designed in Kolkata.
          <br />
          For the world.
        </h1>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            color: 'var(--text-secondary)',
            fontSize: 16,
            lineHeight: 1.7,
            maxWidth: 520,
          }}
        >
          <p style={{ margin: 0 }}>
            Parikrama was imagined and built by{' '}
            <strong style={{ color: 'var(--text-primary)', fontWeight: 400 }}>Wizard Communications</strong> — a
            studio on the banks of the Hooghly, where for over twenty years we have made technology
            feel quietly human.
          </p>
          <p style={{ margin: 0 }}>
            We believe great software, like a great journey, should ask nothing of you. We refine,
            and remove, until only the feeling of arrival remains.
          </p>
          <p style={{ margin: 0 }}>
            From a city of poets, filmmakers and mathematicians, we craft for the world — one calm,
            considered detail at a time.
          </p>
        </div>

        <div style={{ width: 40, height: 1, background: 'var(--hairline)', margin: '40px 0 24px' }} />

        <div
          style={{
            fontSize: 12,
            color: 'var(--text-ghost)',
            letterSpacing: 0.4,
            marginBottom: 28,
          }}
        >
          EST. 2004 · KOLKATA, INDIA
        </div>

        <a
          href="https://www.wizardcomm.net"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            minHeight: 46,
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0 24px',
            borderRadius: 100,
            border: '1px solid var(--hairline)',
            color: 'var(--text-primary)',
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          wizardcomm.net&nbsp;&nbsp;↗
        </a>

        <p className="serif" style={{ fontSize: 18, color: 'var(--text-secondary)', marginTop: 44 }}>
          Travel well.
        </p>
      </div>
    </div>
  )
}

const backBtn: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 20,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 40,
  padding: '0 16px',
  borderRadius: 100,
  background: 'var(--panel)',
  backdropFilter: 'blur(10px)',
  border: '1px solid var(--hairline)',
  fontSize: 15,
  color: 'var(--text-primary)',
  zIndex: 5,
}
