/**
 * App — top-level shell & navigation.
 * Onboarding → Home → Explore, with the house cross-fade between screens
 * and the global sheets (location / settings / trips / save picker) mounted
 * once at the shell level so they are reachable from anywhere.
 */

import { useEffect, useState } from 'react'
import { LocationSheet } from './components/LocationSheet'
import { PlanSheet } from './components/PlanSheet'
import { SettingsSheet } from './components/SettingsSheet'
import { TripPickerSheet } from './components/TripPickerSheet'
import { Explore } from './screens/Explore'
import { Home } from './screens/Home'
import { Onboarding } from './screens/Onboarding'
import { useStore } from './state/store'

export default function App() {
  const { screen, persisted } = useStore()

  // theme switches app-wide via the CSS variable root
  useEffect(() => {
    document.documentElement.dataset.theme = persisted.theme
  }, [persisted.theme])

  const { display, visible } = useScreenFade(screen)

  return (
    <div className="app-frame">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: visible ? 1 : 0,
          transition: 'opacity 260ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {display === 'onboarding' && <Onboarding />}
        {display === 'home' && <Home />}
        {display === 'explore' && <Explore />}
      </div>

      <LocationSheet />
      <SettingsSheet />
      <PlanSheet />
      <TripPickerSheet />
    </div>
  )
}

/**
 * useScreenFade — cross-fade screens. Keeps the outgoing screen mounted while
 * it fades to 0, then swaps in the new screen and fades it back to 1.
 */
function useScreenFade(screen: string) {
  const [display, setDisplay] = useState(screen)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (screen === display) return
    setVisible(false)
    const t = window.setTimeout(() => {
      setDisplay(screen)
      setVisible(true)
    }, 240)
    return () => clearTimeout(t)
  }, [screen, display])
  return { display, visible }
}
