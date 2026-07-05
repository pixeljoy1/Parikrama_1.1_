/**
 * useLocation — the app's single answer to "where is the traveler?"
 *
 * Detects via the Geolocation API in two stages (precise GPS first, then a
 * patient network-level fallback — phones indoors often time out on the
 * first). Manual placement accepts a curated hub OR any geocoded point in
 * India ("Kalpetta" works, not just the 29 hubs). Falls back gracefully when
 * permission is denied, GPS is unavailable, or the fix lands outside India.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { LatLng, isInIndia } from './geo'
import { hubById, nearestHub } from '../data/hubs'
import { Hub } from '../data/types'

export type LocationStatus = 'idle' | 'locating' | 'live' | 'manual' | 'denied' | 'unavailable'

export interface LocationState {
  status: LocationStatus
  /** the point the explorer is centered on (live fix or chosen place) */
  point: LatLng | null
  /** what to call this place — hub name, geocoded name, or null for a raw fix */
  placeName: string | null
  /** nearest hub for context and the horizon, and its distance */
  near: { hub: Hub; km: number } | null
  /** true when the raw fix was outside India and we kept it anyway */
  outsideIndia: boolean
}

export interface UseLocation extends LocationState {
  detect: () => void
  chooseHub: (hubId: string) => void
  /** center on any point in India — from the free-text place search */
  choosePlace: (name: string, point: LatLng) => void
}

const HUB_KEY = 'parikrama.hub.v1'
const PLACE_KEY = 'parikrama.place.v1'

const clearManual = () => {
  try {
    localStorage.removeItem(HUB_KEY)
    localStorage.removeItem(PLACE_KEY)
  } catch {
    /* ignore */
  }
}

export function useLocation(): UseLocation {
  const [state, setState] = useState<LocationState>(() => {
    // restore a previously chosen place/hub so returning travelers land instantly
    try {
      const place = localStorage.getItem(PLACE_KEY)
      if (place) {
        const p = JSON.parse(place) as { name: string; lat: number; lng: number }
        return { status: 'manual', point: p, placeName: p.name, near: nearestHub(p), outsideIndia: false }
      }
      const saved = localStorage.getItem(HUB_KEY)
      const hub = saved ? hubById(saved) : undefined
      if (hub) {
        return { status: 'manual', point: hub, placeName: hub.name, near: { hub, km: 0 }, outsideIndia: false }
      }
    } catch {
      /* fresh start */
    }
    return { status: 'idle', point: null, placeName: null, near: null, outsideIndia: false }
  })
  const watching = useRef(false)

  const applyFix = useCallback((p: LatLng) => {
    const inIndia = isInIndia(p)
    setState({ status: 'live', point: p, placeName: null, near: nearestHub(p), outsideIndia: !inIndia })
  }, [])

  const detect = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState((s) => ({ ...s, status: 'unavailable' }))
      return
    }
    setState((s) => ({ ...s, status: 'locating' }))
    const succeed = (pos: GeolocationPosition) => {
      clearManual()
      applyFix({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    }
    const fail = (err: GeolocationPositionError) => {
      setState((s) => ({
        ...s,
        status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable',
      }))
    }
    // stage 1: precise GPS. stage 2 (on timeout/unavailable): patient,
    // network-level fix — indoors this is usually the one that lands.
    navigator.geolocation.getCurrentPosition(
      succeed,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) return fail(err)
        navigator.geolocation.getCurrentPosition(succeed, fail, {
          enableHighAccuracy: false,
          timeout: 20_000,
          maximumAge: 600_000,
        })
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }, [applyFix])

  const chooseHub = useCallback((hubId: string) => {
    const hub = hubById(hubId)
    if (!hub) return
    clearManual()
    try {
      localStorage.setItem(HUB_KEY, hubId)
    } catch {
      /* ignore */
    }
    setState({ status: 'manual', point: hub, placeName: hub.name, near: { hub, km: 0 }, outsideIndia: false })
  }, [])

  const choosePlace = useCallback((name: string, point: LatLng) => {
    clearManual()
    try {
      localStorage.setItem(PLACE_KEY, JSON.stringify({ name, lat: point.lat, lng: point.lng }))
    } catch {
      /* ignore */
    }
    setState({ status: 'manual', point, placeName: name, near: nearestHub(point), outsideIndia: !isInIndia(point) })
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

  return { ...state, detect, chooseHub, choosePlace }
}
