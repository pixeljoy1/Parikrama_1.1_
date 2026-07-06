/**
 * Sheet — bottom sheet with 28px top corners and a frosted surface.
 * Springs up on open, slides down on close, and can be dismissed by swiping it
 * down (drag from the top of the sheet past a threshold). Carried over from
 * the Attune interaction layer unchanged — it is the house gesture.
 */

import { useEffect, useRef, useState } from 'react'
import { radius } from '../theme/tokens'

interface Props {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

const DISMISS = 110

export function Sheet({ open, onClose, children, title }: Props) {
  const [render, setRender] = useState(open)
  const [shown, setShown] = useState(false)
  const [drag, setDrag] = useState(0)

  const cardRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef(0)
  const dragging = useRef(false)
  const startY = useRef(0)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const setDragV = (v: number) => {
    dragRef.current = v
    setDrag(v)
  }

  useEffect(() => {
    if (open) {
      setRender(true)
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(r)
    } else {
      setShown(false)
      const t = window.setTimeout(() => setRender(false), 360)
      return () => clearTimeout(t)
    }
  }, [open])

  // Escape closes the sheet on desktop — every bottom sheet inherits this
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // swipe-down-to-dismiss
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const onStart = (e: TouchEvent) => {
      if (el.scrollTop <= 0) {
        startY.current = e.touches[0].clientY
        dragging.current = true
      }
    }
    const onMove = (e: TouchEvent) => {
      if (!dragging.current) return
      const dy = e.touches[0].clientY - startY.current
      if (dy > 0 && el.scrollTop <= 0) {
        e.preventDefault()
        setDragV(dy)
      } else if (dy <= 0) {
        setDragV(0)
      }
    }
    const onEnd = () => {
      if (!dragging.current) return
      dragging.current = false
      if (dragRef.current > DISMISS) onCloseRef.current()
      setDragV(0)
    }
    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [render])

  if (!render) return null

  const translate = shown ? `translateY(${drag}px)` : 'translateY(100%)'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        background: shown ? 'rgba(20,14,8,0.45)' : 'rgba(20,14,8,0)',
        backdropFilter: shown ? 'blur(2px)' : 'blur(0px)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 50,
        transition: 'background 320ms ease, backdrop-filter 320ms ease',
      }}
    >
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '88%',
          overflowY: 'auto',
          background: 'var(--surface-raised)',
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          padding: '14px 24px 32px',
          transform: translate,
          transition: dragging.current ? 'none' : 'transform 360ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* grab handle */}
        <div
          style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--text-ghost)', margin: '4px auto 16px' }}
        />
        {title && (
          <h2 className="serif" style={{ fontSize: 28, margin: '0 0 16px' }}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  )
}
