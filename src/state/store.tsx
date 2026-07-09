/**
 * App store — Parikrama.
 * React context holding persisted prefs (localStorage ≙ Android DataStore),
 * the shared location state, and ephemeral navigation. One source of truth.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Poi, Interest, Pace } from '../data/types'
import { UseLocation, useLocation } from '../geo/useLocation'
import { DEFAULT_PERSISTED, Persisted, Screen, ThemeId, Trip } from './types'

const KEY = 'parikrama.persisted.v1'

function migrate(p: Persisted): Persisted {
  // If a legacy user has flat `saved[]` but no trips yet, seed a default trip
  // called "Someday" so their existing wishlist survives the trips upgrade.
  if ((p.trips?.length ?? 0) === 0 && p.saved.length > 0) {
    const trip: Trip = {
      id: 'someday',
      name: 'Someday',
      createdAt: Date.now(),
      placeIds: [...p.saved],
    }
    return { ...p, trips: [trip], activeTripId: trip.id }
  }
  // Set the activeTripId when trips exist but the active pointer got stale
  if (p.trips?.length > 0 && !p.trips.some((t) => t.id === p.activeTripId)) {
    return { ...p, activeTripId: p.trips[0].id }
  }
  return p
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return migrate({ ...DEFAULT_PERSISTED, ...(JSON.parse(raw) as Persisted) })
  } catch {
    /* fresh device */
  }
  return DEFAULT_PERSISTED
}

const uid = () => Math.random().toString(36).slice(2, 10)

/** True if a place is a member of any trip (i.e. saved). */
export const placeSavedIn = (trips: Trip[], placeId: string): string[] =>
  trips.filter((t) => t.placeIds.includes(placeId)).map((t) => t.id)

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
  /** the place highlighted on the radar (drives SelectedPlacePreview + dot glow) */
  placeId: string | null
  /** the place whose full bottom-sheet is open (may be null while a radar
   * selection is present — the two are decoupled) */
  sheetPlaceId: string | null
  /** open a place: highlights on the radar AND opens the detail sheet */
  openPlace: (id: string | null) => void
  /** highlight on the radar only (no sheet). Used when navigating in from Home
   * so the user lands on the radar concentrated on that POI, not buried under
   * a bottom sheet. */
  selectOnRadar: (id: string | null) => void
  /** close the detail sheet, keeping the radar selection intact */
  closeSheet: () => void
  /** the place currently open in the "save to trip" picker */
  savingPlace: Poi | null
  openSavePicker: (poi: Poi | null) => void
  /** which trip's places are being viewed (null = trips overview) */
  viewingTripId: string | null
  openTrip: (id: string | null) => void
  /** ephemeral toast: Airbnb-style bottom banner with an optional action */
  toast: { message: string; action?: { label: string; onClick: () => void } } | null
  showToast: (message: string, action?: { label: string; onClick: () => void }) => void
  dismissToast: () => void
  // profile actions
  setInterests: (v: Interest[]) => void
  setPace: (v: Pace) => void
  setTheme: (v: ThemeId) => void
  completeOnboarding: () => void
  resetProfile: () => void
  // trip actions
  createTrip: (name: string) => string
  renameTrip: (id: string, name: string) => void
  deleteTrip: (id: string) => void
  setActiveTrip: (id: string) => void
  /** save a place to a specific trip (creating a snapshot for OSM finds) */
  addPlaceToTrip: (tripId: string, placeId: string, poi?: Poi) => void
  removePlaceFromTrip: (tripId: string, placeId: string) => void
  /** count of unique saved places across all trips */
  totalSavedCount: number
  toggleSeen: (id: string) => void
  /** remember where the user was exploring, for "continue" on Home */
  rememberLocation: (name: string, lat: number, lng: number) => void
}

const Ctx = createContext<StoreShape | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [persisted, setPersisted] = useState<Persisted>(load)
  const [screen, setScreen] = useState<Screen>(
    persisted.onboardingComplete ? 'home' : 'onboarding',
  )
  const [settingsOpen, openSettings] = useState(false)
  const [planOpen, openPlan] = useState(false)
  const [locationOpen, openLocation] = useState(false)
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [sheetPlaceId, setSheetPlaceId] = useState<string | null>(null)
  const [savingPlace, openSavePicker] = useState<Poi | null>(null)
  const [viewingTripId, openTrip] = useState<string | null>(null)
  const [toast, setToast] = useState<StoreShape['toast']>(null)
  const location = useLocation()

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(persisted))
    } catch {
      /* private mode */
    }
  }, [persisted])

  const patch = useCallback((p: Partial<Persisted>) => setPersisted((s) => ({ ...s, ...p })), [])

  const totalSavedCount = useMemo(() => {
    const set = new Set<string>()
    for (const t of persisted.trips) for (const id of t.placeIds) set.add(id)
    return set.size
  }, [persisted.trips])

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
      sheetPlaceId,
      openPlace: (id) => {
        setPlaceId(id)
        setSheetPlaceId(id)
      },
      selectOnRadar: (id) => setPlaceId(id),
      closeSheet: () => setSheetPlaceId(null),
      savingPlace,
      openSavePicker,
      viewingTripId,
      openTrip,
      toast,
      showToast: (message, action) => setToast({ message, action }),
      dismissToast: () => setToast(null),
      totalSavedCount,
      setInterests: (interests) => patch({ interests }),
      setPace: (pace) => patch({ pace }),
      setTheme: (theme) => patch({ theme }),
      completeOnboarding: () => {
        patch({ onboardingComplete: true })
        setScreen('home')
      },
      resetProfile: () => {
        openSettings(false)
        patch({ onboardingComplete: false })
        setScreen('onboarding')
      },
      createTrip: (name) => {
        const trip: Trip = { id: uid(), name: name.trim() || 'New trip', createdAt: Date.now(), placeIds: [] }
        setPersisted((s) => ({ ...s, trips: [trip, ...s.trips], activeTripId: trip.id }))
        return trip.id
      },
      renameTrip: (id, name) =>
        setPersisted((s) => ({
          ...s,
          trips: s.trips.map((t) => (t.id === id ? { ...t, name: name.trim() || t.name } : t)),
        })),
      deleteTrip: (id) =>
        setPersisted((s) => {
          const trips = s.trips.filter((t) => t.id !== id)
          const activeTripId = s.activeTripId === id ? trips[0]?.id ?? '' : s.activeTripId
          return { ...s, trips, activeTripId }
        }),
      setActiveTrip: (id) => patch({ activeTripId: id }),
      addPlaceToTrip: (tripId, placeId, poi) =>
        setPersisted((s) => {
          const trips = s.trips.map((t) =>
            t.id === tripId && !t.placeIds.includes(placeId)
              ? { ...t, placeIds: [placeId, ...t.placeIds] }
              : t,
          )
          const savedOsm = poi?.osm ? { ...s.savedOsm, [placeId]: poi } : s.savedOsm
          // legacy list kept in sync so anything still reading `saved` still works
          const saved = s.saved.includes(placeId) ? s.saved : [...s.saved, placeId]
          return { ...s, trips, savedOsm, saved }
        }),
      removePlaceFromTrip: (tripId, placeId) =>
        setPersisted((s) => {
          const trips = s.trips.map((t) =>
            t.id === tripId ? { ...t, placeIds: t.placeIds.filter((p) => p !== placeId) } : t,
          )
          const stillMember = trips.some((t) => t.placeIds.includes(placeId))
          const saved = stillMember ? s.saved : s.saved.filter((p) => p !== placeId)
          const savedOsm = { ...s.savedOsm }
          if (!stillMember) delete savedOsm[placeId]
          return { ...s, trips, saved, savedOsm }
        }),
      toggleSeen: (id) => setPersisted((s) => ({ ...s, seen: toggleIn(s.seen, id) })),
      rememberLocation: (name, lat, lng) => patch({ lastLocation: { name, lat, lng } }),
    }),
    [persisted, location, screen, settingsOpen, planOpen, locationOpen, placeId, sheetPlaceId, savingPlace, viewingTripId, toast, totalSavedCount, patch],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore must be used within StoreProvider')
  return v
}
