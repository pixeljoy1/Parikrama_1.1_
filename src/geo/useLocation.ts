/**
 * useLocation — the app's single answer to "where is the traveler?"
 *
 * Detects via the Geolocation API (works anywhere in India; on Android the
 * Capacitor WebView surfaces the native permission dialog). Falls back to a
 * hand-picked hub when permission is denied, GPS is unavailable, or the fix
 * lands outside India (e.g. trying the app from abroad).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { LatLng, isInIndia } from './geo'
import { hubById, nearestHub } from '../data/hubs'
import { Hub } from '../data/types'

export type LocationStatus = 'idle' | 'locating' | 'live' | 'manual' | 'denied' | 'unavailable'

export interface LocationState {
  status: LocationStatus
  /** the point the explorer is centered on (live fix or chosen hub) */
  point: LatLng | null
  /** nearest hub for context ("near Jaipur"), and its distance */
  near: { hub: Hub; km: number } | null
  /** true when the raw fix was outside India and we kept it anyway */
  outsideIndia: boolean
}

export interface UseLocation extends LocationState {
  detect: () => void
  chooseHub: (hubId: string) => void
}

const MANUAL_KEY = 'parikrama.hub.v1'

export function useLocation(): UseLocation {
  const [state, setState] = useState<LocationState>(() => {
    // restore a previously chosen hub so returning travelers land instantly
    try {
      const saved = localStorage.getItem(MANUAL_KEY)
      const hub = saved ? hubById(saved) : undefined
      if (hub) {
        return { status: 'manual', point: hub, near: { hub, km: 0 }, outsideIndia: false }
      }
    } catch {
      /* fresh start */
    }
    return { status: 'idle', point: null, near: null, outsideIndia: false }
  })
  const watching = useRef(false)

  const applyFix = useCallback((p: LatLng) => {
    const inIndia = isInIndia(p)
    setState({ status: 'live', point: p, near: nearestHub(p), outsideIndia: !inIndia })
  }, [])

  const detect = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState((s) => ({ ...s, status: 'unavailable' }))
      return
    }
    setState((s) => ({ ...s, status: 'locating' }))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          localStorage.removeItem(MANUAL_KEY)
        } catch {
          /* ignore */
        }
        applyFix({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => {
        setState((s) => ({
          ...s,
          status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable',
        }))
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    )
  }, [applyFix])

  const chooseHub = useCallback((hubId: string) => {
    const hub = hubById(hubId)
    if (!hub) return
    try {
      localStorage.setItem(MANUAL_KEY, hubId)
    } catch {
      /* ignore */
    }
    setState({ status: 'manual', point: hub, near: { hub, km: 0 }, outsideIndia: false })
  }, [])

  // keep a live fix gently fresh while exploring (no battery-hungry watch)
  useEffect(() => {
    if (state.status !== 'live' || watching.current) return
    watching.current = true
    const t = window.setInterval(() => {
      navigator.geolocation?.getCurrentPosition(
        (pos) => applyFix({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => undefined,
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 },
      )
    }, 90_000)
    return () => {
      watching.current = false
      clearInterval(t)
    }
  }, [state.status, applyFix])

  return { ...state, detect, chooseHub }
}
