/**
 * PullToRefresh — the classic slide-down-from-the-top gesture.
 *
 * Wrap a scrolling container with this and:
 *   • when the user is at scrollTop === 0 and drags down > threshold,
 *     the onRefresh callback fires
 *   • a rubber-band-damped indicator sits under the header, growing as
 *     the user pulls; it snaps back if released short of the threshold
 *   • while onRefresh's promise resolves, a spinning ring is shown; the
 *     content is pushed down ~40 px so the spinner has room
 *   • honors prefers-reduced-motion (no spin, no bounce)
 *
 * All gesture logic uses pointer events so a mouse-drag from the top on
 * desktop triggers the same UX as a phone touch.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { haptic, prefersReducedMotion } from '../state/util'

interface Props {
  onRefresh: () => void | Promise<void>
  /** the scroll container — usually the same element the gesture attaches to */
  children: React.ReactNode
  /** pixels of vertical drag required to trigger a refresh */
  threshold?: number
  /** true = disable the gesture (e.g. while a sheet is open above) */
  disabled?: boolean
}

export function PullToRefresh({ onRefresh, children, threshold = 72, disabled = false }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number | null>(null)
  const activePointer = useRef<number | null>(null)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const reduce = prefersReducedMotion()

  const trigger = useCallback(async () => {
    haptic.doublePulse()
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      // hold the spinner ~500ms so the refresh feels acknowledged even if the
      // underlying work resolves instantly (e.g. from a warm cache)
      window.setTimeout(() => {
        setRefreshing(false)
        setPull(0)
      }, 500)
    }
  }, [onRefresh])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const onPointerDown = (e: PointerEvent) => {
      if (disabled || refreshing) return
      // only start tracking when scroll is at the very top
      if (el.scrollTop > 0) return
      // ignore secondary buttons; ignore mouse hover-without-drag
      if (e.pointerType === 'mouse' && e.buttons !== 1) return
      startY.current = e.clientY
      activePointer.current = e.pointerId
    }

    const onPointerMove = (e: PointerEvent) => {
      if (startY.current == null || e.pointerId !== activePointer.current) return
      if (el.scrollTop > 0) {
        // user scrolled the content up — cancel the pull attempt
        startY.current = null
        activePointer.current = null
        setPull(0)
        return
      }
      const dy = e.clientY - startY.current
      if (dy <= 0) {
        setPull(0)
        return
      }
      // rubber-band curve: linear until threshold, then diminishing returns
      const capped = dy < threshold ? dy : threshold + (dy - threshold) * 0.35
      setPull(Math.min(140, capped))
      // block the native pull-to-refresh & vertical scroll while we handle it
      e.preventDefault()
    }

    const onPointerEnd = () => {
      if (startY.current == null) return
      const finalPull = pull
      startY.current = null
      activePointer.current = null
      if (finalPull >= threshold) trigger()
      else setPull(0)
    }

    el.addEventListener('pointerdown', onPointerDown)
    // moves must be non-passive so preventDefault stops native pull-to-refresh
    el.addEventListener('pointermove', onPointerMove, { passive: false })
    el.addEventListener('pointerup', onPointerEnd)
    el.addEventListener('pointercancel', onPointerEnd)
    el.addEventListener('pointerleave', onPointerEnd)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerEnd)
      el.removeEventListener('pointercancel', onPointerEnd)
      el.removeEventListener('pointerleave', onPointerEnd)
    }
  }, [pull, refreshing, threshold, trigger, disabled])

  const shift = refreshing ? 44 : pull
  const progress = Math.min(1, pull / threshold)
  const ready = pull >= threshold
  const showIndicator = pull > 4 || refreshing

  return (
    <div
      ref={scrollerRef}
      className="screen"
      style={{
        position: 'absolute',
        inset: 0,
        overflowY: 'auto',
        overscrollBehaviorY: 'contain',
        touchAction: 'pan-y',
      }}
    >
      {/* the drag indicator floats above the content, in the space we open up */}
      <div
        aria-hidden={!showIndicator}
        style={{
          position: 'sticky',
          top: 0,
          height: 0,
          zIndex: 5,
          pointerEvents: 'none',
          transform: `translateY(${Math.max(0, shift - 44)}px)`,
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 44,
            opacity: showIndicator ? 1 : 0,
            transition: startY.current == null && !refreshing ? 'opacity 260ms ease' : 'none',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 100,
              background: 'var(--panel)',
              border: '1px solid var(--hairline)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: ready || refreshing ? 'var(--accent)' : 'var(--text-secondary)',
              transform: refreshing || reduce ? undefined : `rotate(${progress * 240}deg)`,
              transition: startY.current == null && !refreshing ? 'transform 260ms ease' : 'none',
              boxShadow: '0 4px 14px -6px rgba(0,0,0,0.18)',
              fontSize: 18,
              lineHeight: 1,
              animation: refreshing && !reduce ? 'radarSweep 1.2s linear infinite' : undefined,
            }}
          >
            ↻
          </div>
        </div>
      </div>

      <div
        style={{
          transform: shift > 0 ? `translateY(${shift}px)` : undefined,
          transition: startY.current == null && !refreshing ? 'transform 260ms ease' : 'none',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
}
