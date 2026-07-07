/**
 * TripPickerSheet — Airbnb-style "Save to which trip?" picker. Opens when
 * the user taps the heart on a place. Shows every trip with a checkbox
 * (a place can live in multiple trips), plus a quiet inline row to create
 * a new trip on the spot.
 *
 * Closes automatically once the user is done — no explicit "confirm"
 * button, because every checkbox toggle immediately updates persistence
 * (Airbnb's exact pattern).
 */

import { useState } from 'react'
import { useStore } from '../state/store'
import { haptic } from '../state/util'
import { Sheet } from './Sheet'

export function TripPickerSheet() {
  const {
    savingPlace,
    openSavePicker,
    persisted,
    createTrip,
    setActiveTrip,
    addPlaceToTrip,
    removePlaceFromTrip,
  } = useStore()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const poi = savingPlace
  const trips = persisted.trips
  const inTripIds = poi ? trips.filter((t) => t.placeIds.includes(poi.id)).map((t) => t.id) : []

  const close = () => {
    openSavePicker(null)
    setCreating(false)
    setNewName('')
  }

  const commitNewTrip = () => {
    const name = newName.trim()
    if (!name) {
      setCreating(false)
      return
    }
    haptic.medium()
    const id = createTrip(name)
    if (poi) addPlaceToTrip(id, poi.id, poi)
    setNewName('')
    setCreating(false)
  }

  return (
    <Sheet open={!!savingPlace} onClose={close} title={poi ? `Save to…` : ''}>
      {poi && (
        <>
          <div className="mono" style={{ marginBottom: 18, color: 'var(--accent)' }}>
            {poi.name}
          </div>

          {trips.length === 0 && !creating && (
            <div style={{ textAlign: 'center', padding: '18px 0 24px' }}>
              <div className="serif-i" style={{ fontSize: 20, marginBottom: 8 }}>
                Your first trip.
              </div>
              <p className="mono-lg" style={{ margin: '0 0 16px', lineHeight: 1.6 }}>
                give it a name — you can rename later
              </p>
              <button
                className="quiet-btn"
                onClick={() => setCreating(true)}
                style={{ color: 'var(--accent)', borderColor: 'var(--accent-line)' }}
              >
                + name your first trip
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {trips.map((t) => {
              const inThis = inTripIds.includes(t.id)
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    haptic.light()
                    if (inThis) removePlaceFromTrip(t.id, poi.id)
                    else {
                      addPlaceToTrip(t.id, poi.id, poi)
                      setActiveTrip(t.id)
                    }
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: `1px solid ${inThis ? 'var(--accent-line)' : 'var(--hairline)'}`,
                    background: inThis ? 'var(--accent-soft)' : 'var(--chip)',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 400, color: inThis ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {t.name}
                    </div>
                    <div className="mono" style={{ marginTop: 4 }}>
                      {t.placeIds.length} place{t.placeIds.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 100,
                      border: `1.5px solid ${inThis ? 'var(--accent)' : 'var(--text-ghost)'}`,
                      background: inThis ? 'var(--accent)' : 'transparent',
                      color: 'var(--on-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {inThis ? '✓' : ''}
                  </span>
                </button>
              )
            })}
          </div>

          {/* create-new row */}
          <div style={{ marginTop: trips.length > 0 ? 14 : 0 }}>
            {creating ? (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: 12,
                  borderRadius: 14,
                  border: '1.5px solid var(--accent-line)',
                  background: 'var(--accent-soft)',
                }}
              >
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitNewTrip()
                    if (e.key === 'Escape') {
                      setCreating(false)
                      setNewName('')
                    }
                  }}
                  placeholder="Kerala backwaters, Rajasthan classics…"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--hairline)',
                    background: 'var(--surface-raised)',
                    fontSize: 15,
                    outline: 'none',
                  }}
                />
                <button className="quiet-btn" onClick={commitNewTrip} style={{ color: 'var(--accent)' }}>
                  save
                </button>
                <button
                  className="quiet-btn"
                  onClick={() => {
                    setCreating(false)
                    setNewName('')
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              trips.length > 0 && (
                <button
                  onClick={() => {
                    haptic.light()
                    setCreating(true)
                  }}
                  className="quiet-btn"
                  style={{ width: '100%', justifyContent: 'center', color: 'var(--accent)' }}
                >
                  + create new trip
                </button>
              )
            )}
          </div>

          <div style={{ marginTop: 22, textAlign: 'center' }}>
            <button className="mono" onClick={close} style={{ color: 'var(--text-secondary)' }}>
              done — keep exploring ↗
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
