/**
 * Reveal — scroll-driven entrance. Adds `.in` once the element enters the
 * viewport, so sections rise softly as the reader arrives at them (not all at
 * mount). One IntersectionObserver per element; disconnects after firing.
 */

import { useEffect, useRef, useState } from 'react'

export function Reveal({
  children,
  delay = 0,
  style,
  as: Tag = 'div',
  id,
  className,
  ...rest
}: {
  children: React.ReactNode
  delay?: number
  style?: React.CSSProperties
  as?: 'div' | 'section'
  id?: string
  className?: string
} & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as any}
      id={id}
      className={`io${inView ? ' in' : ''}${className ? ` ${className}` : ''}`}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/**
 * StatusLine — a quiet terminal heartbeat: steps type through in sequence,
 * then settle on the final state with a live dot.
 */
export function StatusLine({ steps, doneLabel }: { steps: string[]; doneLabel: string }) {
  const [i, setI] = useState(0)
  const ref = useRef<HTMLDivElement | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStarted(true)
          io.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!started || i >= steps.length) return
    const t = window.setTimeout(() => setI((n) => n + 1), 620)
    return () => clearTimeout(t)
  }, [started, i, steps.length])

  const done = i >= steps.length
  return (
    <div ref={ref} className="mono-lg" style={{ display: 'flex', alignItems: 'center', gap: 9, minHeight: 20 }}>
      <span className="status-dot" style={done ? { animation: 'none' } : undefined} />
      <span style={{ color: done ? 'var(--accent)' : 'var(--text-secondary)' }}>
        {done ? doneLabel : `${steps[Math.min(i, steps.length - 1)]}…`}
      </span>
    </div>
  )
}
