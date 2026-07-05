/**
 * App store — Parikrama.
 * React context holding persisted prefs (localStorage ≙ Android DataStore),
 * the shared location state, and ephemeral navigation. One source of truth.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Interest, Pace } from '../data/types'
import { UseLocation, useLocation } from '../geo/useLocation'
import { DEFAULT_PERSISTED, Persisted, Screen, ThemeId } from './types'

const KEY = 'parikrama.persisted.v1'

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT_PERSISTED, ...(JSON.parse(raw) as Persisted) }
  } catch {
    /* fresh device */
  }
  return DEFAULT_PERSISTED
}

interface StoreShape {
  persisted: Persisted
  location: UseLocation
  // navigation
  screen: Screen
  go: (s: Screen) => void
  settingsOpen: boolean
  openSettings: (v: boolean) => void
  planOpen: boolean
  openPlan: (v: boolean) => void
  locationOpen: boolean
  openLocation: (v: boolean) => void
  /** currently inspected place id (detail sheet) */
  placeId: string | null
  openPlace: (id: string | null) => void
  // profile actions
  setInterests: (v: Interest[]) => void
  setPace: (v: Pace) => void
  setTheme: (v: ThemeId) => void
  completeOnboarding: () => void
  resetProfile: () => void
  toggleSaved: (id: string) => void
  toggleSeen: (id: string) => void
}

const Ctx = createContext<StoreShape | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [persisted, setPersisted] = useState<Persisted>(load)
  const [screen, setScreen] = useState<Screen>(persisted.onboardingComplete ? 'explore' : 'onboarding')
  const [settingsOpen, openSettings] = useState(false)
  const [planOpen, openPlan] = useState(false)
  const [locationOpen, openLocation] = useState(false)
  const [placeId, openPlace] = useState<string | null>(null)
  const location = useLocation()

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(persisted))
    } catch {
      /* private mode */
    }
  }, [persisted])

  const patch = useCallback((p: Partial<Persisted>) => setPersisted((s) => ({ ...s, ...p })), [])

  const toggleIn = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

  const value = useMemo<StoreShape>(
    () => ({
      persisted,
      location,
      screen,
      go: setScreen,
      settingsOpen,
      openSettings,
      planOpen,
      openPlan,
      locationOpen,
      openLocation,
      placeId,
      openPlace,
      setInterests: (interests) => patch({ interests }),
      setPace: (pace) => patch({ pace }),
      setTheme: (theme) => patch({ theme }),
      completeOnboarding: () => {
        patch({ onboardingComplete: true })
        setScreen('explore')
      },
      resetProfile: () => {
        openSettings(false)
        patch({ onboardingComplete: false })
        setScreen('onboarding')
      },
      toggleSaved: (id) => setPersisted((s) => ({ ...s, saved: toggleIn(s.saved, id) })),
      toggleSeen: (id) => setPersisted((s) => ({ ...s, seen: toggleIn(s.seen, id) })),
    }),
    [persisted, location, screen, settingsOpen, planOpen, locationOpen, placeId, patch],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore must be used within StoreProvider')
  return v
}
