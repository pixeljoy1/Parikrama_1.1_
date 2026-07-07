/**
 * SaveToast — a quiet Airbnb-style confirmation that pops after a save.
 *
 * Reads a single ephemeral message from the store's `toast` state and slides
 * up from the bottom, with an Undo action attached. Auto-dismisses after ~3s
 * unless the user hovers/touches it. No queue — a new save replaces the
 * previous toast (Airbnb's exact pattern).
 */

import { useEffect } from 'react'
import { useStore } from '../state/store'

export function SaveToast() {
  const { toast, dismissToast } = useStore()

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => dismissToast(), 3200)
    return () => window.clearTimeout(t)
  }, [toast, dismissToast])

  const shown = !!toast

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 24,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px',
        pointerEvents: shown ? 'auto' : 'none',
        zIndex: 90,
        transform: shown ? 'translateY(0)' : 'translateY(120%)',
        opacity: shown ? 1 : 0,
        transition: 'transform 340ms cubic-bezier(0.22,1,0.36,1), opacity 260ms ease',
      }}
    >
      {toast && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            maxWidth: 460,
            padding: '10px 14px 10px 18px',
            borderRadius: 100,
            background: 'var(--text-primary)',
            color: 'var(--surface)',
            boxShadow: '0 18px 40px -18px rgba(0,0,0,0.5)',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.3 }}>{toast.message}</span>
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick()
                dismissToast()
              }}
              className="mono"
              style={{
                color: 'var(--accent)',
                letterSpacing: 1.2,
                padding: '4px 10px',
                borderRadius: 100,
                background: 'rgba(255,255,255,0.08)',
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button
            onClick={dismissToast}
            aria-label="Dismiss"
            className="mono"
            style={{
              color: 'var(--text-ghost)',
              padding: '4px 8px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
