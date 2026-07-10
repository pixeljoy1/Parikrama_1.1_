/**
 * LegalSheet — the "read the small print" bottom sheet, reached from the
 * footer links (Terms, Privacy, Disclaimers). Reuses the shared Sheet so it
 * inherits the house swipe-down-to-dismiss gesture, Escape-to-close, and
 * backdrop tap. Three sections in one scroll; whichever link opened it
 * scrolls to that section on open.
 */

import { useEffect, useRef } from 'react'
import { Sheet } from './Sheet'

export type LegalSection = 'terms' | 'privacy' | 'disclaimers'

interface Props {
  open: boolean
  section: LegalSection
  onClose: () => void
}

export function LegalSheet({ open, section, onClose }: Props) {
  const termsRef = useRef<HTMLDivElement>(null)
  const privacyRef = useRef<HTMLDivElement>(null)
  const disclaimersRef = useRef<HTMLDivElement>(null)

  // Scroll to the requested section a beat after the sheet finishes opening.
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      const target =
        section === 'terms' ? termsRef.current : section === 'privacy' ? privacyRef.current : disclaimersRef.current
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 380)
    return () => clearTimeout(t)
  }, [open, section])

  return (
    <Sheet open={open} onClose={onClose} title="The small print">
      {/* section nav — quick jumps within the sheet */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
        {(
          [
            ['terms', 'Terms', termsRef],
            ['privacy', 'Privacy', privacyRef],
            ['disclaimers', 'Disclaimers', disclaimersRef],
          ] as const
        ).map(([k, label, ref]) => (
          <button
            key={k}
            onClick={() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="mono"
            style={{
              padding: '6px 12px',
              borderRadius: 100,
              border: `1px solid ${k === section ? 'var(--accent-line)' : 'var(--hairline)'}`,
              background: k === section ? 'var(--accent-soft)' : 'transparent',
              color: k === section ? 'var(--accent)' : 'var(--text-secondary)',
              letterSpacing: 1.2,
              fontSize: 11,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Terms */}
      <section ref={termsRef} style={{ marginBottom: 28, scrollMarginTop: 12 }}>
        <h3 className="serif" style={{ fontSize: 22, margin: '0 0 12px' }}>
          Terms of use
        </h3>
        <Prose>
          <p>
            Parikrama is offered as a free, no-account travel companion. By using it you agree to
            explore in good faith — the app is for personal, non-commercial route planning and
            discovery in India.
          </p>
          <p>
            Content is editorial and, where noted, sourced from open-mapping projects. You may
            reference and share information from the app but may not scrape, resell, or wholesale
            re-publish it without written permission from Wizard Communications.
          </p>
          <p>
            The service is provided <em>as is</em>, without warranty of any kind. We do our best to
            keep the atlas useful and current, but do not guarantee availability, accuracy, or
            fitness for any particular purpose.
          </p>
        </Prose>
      </section>

      {/* Privacy */}
      <section ref={privacyRef} style={{ marginBottom: 28, scrollMarginTop: 12 }}>
        <h3 className="serif" style={{ fontSize: 22, margin: '0 0 12px' }}>
          Privacy
        </h3>
        <Prose>
          <p>
            Parikrama runs entirely in your browser. We do not create an account for you, do not
            store your identity, and do not send your location, saves, or activity to our servers.
          </p>
          <p>
            <strong>Your location</strong> is requested only when you tap “Detect my location”, is
            used to draw your circles, and is never transmitted off your device.
          </p>
          <p>
            <strong>Trips, saves, and settings</strong> live in your browser's localStorage and
            leave only if you clear it. We store nothing in the cloud.
          </p>
          <p>
            The app fetches photos and place data from Wikipedia and OpenStreetMap. Those
            providers see standard web requests (IP address, browser), governed by their own
            privacy policies. We do not add trackers, analytics, or advertising.
          </p>
        </Prose>
      </section>

      {/* Disclaimers */}
      <section ref={disclaimersRef} style={{ marginBottom: 12, scrollMarginTop: 12 }}>
        <h3 className="serif" style={{ fontSize: 22, margin: '0 0 12px' }}>
          Disclaimers
        </h3>
        <Prose>
          <p>
            Distances and directions are calculated from the point you set as your center. The
            world is round; roads are not — always cross-check with a live navigation app before
            you set out.
          </p>
          <p>
            Places surfaced via live discovery come from OpenStreetMap and may be volunteer-tagged
            or unverified. Wow scores are an editorial guess, not a guarantee of a great day. Some
            places charge fees, close on certain days, or require permits — confirm locally.
          </p>
          <p>
            Travel involves risk. Roads, weather, wildlife, altitude, and remote terrain can all
            surprise. Use good judgement, respect local customs and closures, and know that
            Parikrama and Wizard Communications are not responsible for the outcomes of any trip
            you plan or take.
          </p>
          <p style={{ color: 'var(--text-ghost)' }}>
            © {new Date().getFullYear()} Wizard Communications. Crafted in Kolkata.
          </p>
        </Prose>
      </section>
    </Sheet>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 14.5,
        lineHeight: 1.65,
        color: 'var(--text-secondary)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {children}
    </div>
  )
}
