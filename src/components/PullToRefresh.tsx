/**
 * PullToRefresh — the classic slide-down-from-the-top gesture.
 *
 * v2: uses touch events (not pointer events) — mobile Safari fires touch
 * events reliably before scrollTop is updated by the compositor, so we can
 * intercept the browser's native pull-to-refresh cleanly. `overscroll-
 * behavior-y: contain` on the scroller does the rest.
 *
 * On desktop we listen to mouse-drag as well so the gesture works with a
 * cursor. The drag is only recognized when the user starts at scrollTop === 0
 * and pulls down. Cancels cleanly if they scroll the content up mid-drag.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { haptic, prefersReducedMotion } from '../state/util'

interface Props {
  onRefresh: () => void | Promise<void>
  children: React.ReactNode
  threshold?: number
}

export function PullToRefresh({ onRefresh, children, threshold = 72 }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number | null>(null)
  const currentPull = useRef(0)
  const dragging = useRef(false)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const reduce = prefersReducedMotion()

  const setPullV = (v: number) => {
    currentPull.current = v
    setPull(v)
  }

  const trigger = useCallback(async () => {
    haptic.doublePulse()
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      // hold the spinner ~500ms so a fast cache-hit refresh still feels
      // acknowledged; then release the shift.
      window.setTimeout(() => {
        setRefreshing(false)
        setPullV(0)
      }, 500)
    }
  }, [onRefresh])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return
      if (el.scrollTop > 0) return
      if (e.touches.length !== 1) return
      startY.current = e.touches[0].clientY
      dragging.current = true
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current || startY.current == null) return
      // if the compositor scrolled during the drag, abort — user is
      // trying to scroll the content, not pull the whole app
      if (el.scrollTop > 0) {
        dragging.current = false
        startY.current = null
        setPullV(0)
        return
      }
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) {
        setPullV(0)
        return
      }
      // rubber-band damping past threshold
      const capped = dy < threshold ? dy : threshold + (dy - threshold) * 0.32
      setPullV(Math.min(140, capped))
      // stop the browser's native pull-to-refresh + let vertical scroll pass
      // when we release below threshold
      e.preventDefault()
    }
    const onTouchEnd = () => {
      if (!dragging.current) return
      dragging.current = false
      const p = currentPull.current
      startY.current = null
      if (p >= threshold) trigger()
      else setPullV(0)
    }

    // Desktop parity: same logic on mouse drag from top
    let mouseDown = false
    const onMouseDown = (e: MouseEvent) => {
      if (refreshing || el.scrollTop > 0 || e.button !== 0) return
      startY.current = e.clientY
      dragging.current = true
      mouseDown = true
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!mouseDown || !dragging.current || startY.current == null) return
      if (el.scrollTop > 0) {
        dragging.current = false
        startY.current = null
        setPullV(0)
        return
      }
      const dy = e.clientY - startY.current
      if (dy <= 0) {
        setPullV(0)
        return
      }
      const capped = dy < threshold ? dy : threshold + (dy - threshold) * 0.32
      setPullV(Math.min(140, capped))
    }
    const onMouseUp = () => {
      if (!mouseDown) return
      mouseDown = false
      dragging.current = false
      const p = currentPull.current
      startY.current = null
      if (p >= threshold) trigger()
      else setPullV(0)
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    // touchmove MUST be non-passive so preventDefault stops native PTR
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [threshold, trigger, refreshing])

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
      }}
    >
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
            transition: !dragging.current && !refreshing ? 'opacity 260ms ease' : 'none',
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
              transition: !dragging.current && !refreshing ? 'transform 260ms ease' : 'none',
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
          transition: !dragging.current && !refreshing ? 'transform 260ms ease' : 'none',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
}
