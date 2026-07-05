# Parikrama — India, in circles around you

> *Wherever you stand in India, we plot what's absolutely worth it within
> 5, 10, 20, and 30 km — matched to how you like to travel.*

An exploratory pivot of the SoundTherapy 1.1 codebase: the entire UI is new,
and only the **interaction nuances** were kept — the bottom sheets with
swipe-to-dismiss, the scroll-driven reveals, the haptic pill buttons, the
mono micro-copy and status lines, the paper-grain texture, the unhurried
one-question-per-screen onboarding. Everything they now carry is a **tourism
explorer for India**.

The name: a *parikrama* is the sacred circumambulation of a shrine — the
app's 5/10/20/30 km circles around the traveler are exactly that.

---

## What it does

1. **Traveler profile** — onboarding builds a profile from the lenses Indian
   tourism research actually segments by (Ministry of Tourism niche
   categories + classic inbound/domestic personas): heritage, spiritual,
   nature & wildlife, food & bazaars, art & craft, adventure, photography,
   slow travel — plus a pace (unhurried / balanced / full throttle).
2. **Location, anywhere in India** — the Geolocation API detects you (native
   permission dialog under Capacitor on Android); a 29-hub manual picker
   covers denied permission, no GPS, or armchair planning. A fix outside
   India is detected and routed to the picker.
3. **The radar** — the signature surface: an ego-centric polar map with the
   four parikrama rings, every worthwhile place plotted at its true bearing and
   distance (square-root radial scale so the walkable inner rings breathe),
   a slow sweep, and tap-to-open dots.
4. **The shortlist** — a curated atlas of **190 places across 29 hubs**
   (UNESCO sites, ASI monuments, living rituals, food streets, craft
   quarters, golden-hour vantage points), each scored `wow × profile
   affinity` and ranked inside the chosen ring, with distance + compass
   direction like a signpost.
5. **Place sheets** — the story, a "like a local" insider tip, practicals
   (time it deserves, entry, best hour), save-to-plan, mark-as-been, and a
   Google Maps deep link for actual navigation.
6. **The horizon** — when the rings run quiet (or even when they don't),
   the nearest other hubs beyond 30 km, one tap to re-center on any of them.

Privacy: the atlas ships with the app; the location fix never leaves the
device.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production bundle → dist/
npm run preview    # serve the built bundle on :4190
npm run icon       # regenerate icon + splash assets from SVG
```

> Tip: in dev-tools device mode, use the sensors panel to spoof a location
> (try 26.9124, 75.7873 — Jaipur) or just pick a hub from the location sheet.

## Architecture (web → Android map)

```
src/
├── theme/        Ivory + midnight tokens                → Theme.kt / Color.kt
├── geo/          Haversine, bearings, useLocation hook  → FusedLocationProvider
├── data/         Interest lenses · 29 hubs · 190-place curated atlas
├── explorer/     Scoring engine (wow × affinity, rings, pace)
├── components/   Radar, place cards/sheets, ring dial, house Sheet/Pill/Reveal
├── screens/      Onboarding · Explore
└── state/        Store (localStorage ≙ DataStore) + helpers
```

CI: `deploy.yml` publishes to GitHub Pages on `main`; `android.yml`
(manual / `android-v*` tag) wraps `dist/` with Capacitor, injects location
permissions into the manifest, and releases a sideloadable APK.
