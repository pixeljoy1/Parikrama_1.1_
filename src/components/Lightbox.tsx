/**
 * Lightbox — full-viewport photo modal.
 *
 * Opens on hero tap. Closes on:
 *   • × button (top right)
 *   • click the dim backdrop outside the image
 *   • press Escape
 * Advances between photos via:
 *   • ← / → arrow keys
 *   • swipe left/right on touch
 *   • the arrow buttons on the sides
 *   • the thumbnail strip along the bottom
 *
 * Higher z-index than sheets (50) and MakersPage (80) so it always sits on top.
 */

import { useEffect, useRef, useState } from 'react'
import { haptic } from '../state/util'

interface Props {
  open: boolean
  photos: string[]
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
  /** small caption printed above the thumbnails ("Amber Fort · 2 / 5") */
  caption?: string
  /** optional attribution / source link */
  sourceUrl?: string
}

const SWIPE_THRESHOLD = 48

export function Lightbox({ open, photos, index, onIndexChange, onClose, caption, sourceUrl }: Props) {
  const [render, setRender] = useState(open)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (open) {
      setRender(true)
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(r)
    }
    setShown(false)
    const t = window.setTimeout(() => setRender(false), 260)
    return () => clearTimeout(t)
  }, [open])

  // arrow keys, escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      } else if (e.key === 'ArrowRight') {
        onIndexChange((index + 1) % photos.length)
      } else if (e.key === 'ArrowLeft') {
        onIndexChange((index - 1 + photos.length) % photos.length)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, index, photos.length, onIndexChange, onClose])

  // swipe left / right
  const startX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return
    const dx = e.changedTouches[0].clientX - startX.current
    startX.current = null
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    haptic.light()
    if (dx > 0) onIndexChange((index - 1 + photos.length) % photos.length)
    else onIndexChange((index + 1) % photos.length)
  }

  if (!render) return null

  const src = photos[Math.min(index, photos.length - 1)] ?? photos[0]
  const hasMany = photos.length > 1

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 100,
        background: shown ? 'rgba(10,7,4,0.94)' : 'rgba(10,7,4,0)',
        backdropFilter: shown ? 'blur(4px)' : 'blur(0px)',
        transition: 'background 260ms ease, backdrop-filter 260ms ease',
        opacity: shown ? 1 : 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 18px',
          gap: 12,
          color: 'rgba(255,255,255,0.88)',
        }}
      >
        <span className="mono" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {caption}
          {caption && hasMany ? ' · ' : ''}
          {hasMany ? `${index + 1} / ${photos.length}` : ''}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          aria-label="Close"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 100,
            background: 'rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.9)',
            fontSize: 20,
            lineHeight: 1,
            border: '1px solid rgba(255,255,255,0.14)',
            backdropFilter: 'blur(4px)',
          }}
        >
          ✕
        </button>
      </div>

      {/* image area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt=""
          onClick={onClose}
          style={{
            maxWidth: 'min(94vw, 1200px)',
            maxHeight: '82%',
            objectFit: 'contain',
            display: 'block',
            transform: shown ? 'scale(1)' : 'scale(0.96)',
            transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)',
            cursor: 'zoom-out',
          }}
        />

        {hasMany && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onIndexChange((index - 1 + photos.length) % photos.length)
              }}
              aria-label="Previous photo"
              style={arrowBtn('left')}
            >
              ‹
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onIndexChange((index + 1) % photos.length)
              }}
              aria-label="Next photo"
              style={arrowBtn('right')}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* thumbnail strip */}
      {hasMany && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '10px 18px 12px',
            justifyContent: photos.length <= 5 ? 'center' : 'flex-start',
          }}
        >
          {photos.map((u, i) => {
            const active = i === index
            return (
              <button
                key={u}
                onClick={() => {
                  haptic.light()
                  onIndexChange(i)
                }}
                style={{
                  width: 64,
                  height: 44,
                  flexShrink: 0,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: active ? '2px solid #E8813F' : '1px solid rgba(255,255,255,0.20)',
                  padding: 0,
                  opacity: active ? 1 : 0.65,
                  transform: active ? 'scale(1)' : 'scale(0.94)',
                  transition: 'all 200ms ease',
                }}
              >
                <img
                  src={u}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </button>
            )
          })}
        </div>
      )}

      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mono"
          style={{
            position: 'absolute',
            bottom: 10,
            right: 12,
            color: 'rgba(255,255,255,0.55)',
            textDecoration: 'none',
            fontSize: 10,
            letterSpacing: 1.2,
          }}
        >
          photo · wikimedia ↗
        </a>
      )}
    </div>
  )
}

function arrowBtn(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    [side]: 16,
    width: 44,
    height: 44,
    borderRadius: 100,
    background: 'rgba(255,255,255,0.10)',
    color: 'rgba(255,255,255,0.9)',
    fontSize: 28,
    lineHeight: 1,
    border: '1px solid rgba(255,255,255,0.14)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties
}
