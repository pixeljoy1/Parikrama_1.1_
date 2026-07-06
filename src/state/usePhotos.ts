/**
 * usePhotos — batch photo lookups for a set of places, with per-item state.
 * Each id resolves independently and re-renders the caller as photos arrive,
 * so the radar can show places as photo thumbs without blocking on the
 * slowest fetch.
 */

import { useEffect, useState } from 'react'
import { PhotoQuery, PhotoSet, photosFor } from '../data/photos'

export type PhotoState = PhotoSet | 'loading' | 'none'

export function usePhotos(queries: PhotoQuery[]): Record<string, PhotoState> {
  const [state, setState] = useState<Record<string, PhotoState>>({})
  // stable dependency: comma-joined ids. Photos never change for a given id
  // in a single session, so identity of query objects doesn't matter.
  const key = queries.map((q) => q.id).join('|')

  useEffect(() => {
    let cancelled = false
    // mark unknown ids as loading, keep previously-resolved ones as-is
    setState((prev) => {
      const next = { ...prev }
      for (const q of queries) if (!(q.id in next)) next[q.id] = 'loading'
      return next
    })

    for (const q of queries) {
      photosFor(q)
        .then((photos) => {
          if (cancelled) return
          setState((prev) => ({ ...prev, [q.id]: photos.hero ? photos : 'none' }))
        })
        .catch(() => {
          if (!cancelled) setState((prev) => ({ ...prev, [q.id]: 'none' }))
        })
    }
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}

/** Convenience: single-place hook. */
export function usePhoto(q: PhotoQuery | null): PhotoState {
  const [state, setState] = useState<PhotoState>('loading')
  useEffect(() => {
    if (!q) {
      setState('none')
      return
    }
    let cancelled = false
    setState('loading')
    photosFor(q)
      .then((photos) => !cancelled && setState(photos.hero ? photos : 'none'))
      .catch(() => !cancelled && setState('none'))
    return () => {
      cancelled = true
    }
  }, [q?.id])
  return state
}
