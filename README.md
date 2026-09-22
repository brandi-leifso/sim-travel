# Evio Airlines · Check-In Kiosk

A self-guided iPad activation built to feel like an airport check-in counter, not a
game. A guest taps through three screens on a single iPad:

1. **Home** — "EVIO AIRLINES · NOW BOARDING." One button: **Check In**.
2. **Passport Selection** — pick one of three passports.
3. **Destination Reveal** — "CHECK-IN COMPLETE / NEXT STOP: `[destination]`" —
   a random destination from a curated pool. **Continue** loops back to Home for
   the next guest.

> **Standalone.** This app touches no live Evio systems. It's a self-contained
> brand moment — a physical boarding pass is handed to the guest separately,
> outside this app.

Black, white, bold editorial type, generous negative space — designed to sit
visually alongside the physical boarding pass handed out after.

---

## Architecture

```
golden-egg-handoff/
  web/      ← Vite + React SPA (the entire kiosk experience)
    src/
      lib/          constants.js (destination pool) · hooks.js (wake lock)
      components/    Plane · EvioMark
      screens/       Kiosk.jsx (Home → Select → Reveal, all client-side)
      styles/        kiosk.css
  server/   ← tiny static file host for web/dist (no state, no API)
    index.js
```

**Single device, no sync.** Everything runs in one browser tab on one iPad —
there's no second "operator" device and no server round-trip for gameplay. The
destination is picked with `Math.random()` on the iPad itself the moment a
passport is tapped. The Node server's only job is to serve the built files (and
answer `/healthz` for Render) — it holds no state and there's nothing to keep in
sync.

**Kiosk loop.** `Kiosk.jsx` is a small local state machine (`home → select →
reveal → home`). Tapping **Check In** also attempts to enter fullscreen (a
browser requires a user gesture for this, so it's tied to that tap). The page
keeps the screen awake via the Wake Lock API so the iPad doesn't sleep between
guests.

**Destinations.** The pool of ~20 destinations lives in
`web/src/lib/constants.js` as a flat list — edit it directly, no other code
changes needed.

---

## Local development

Two terminals:

```bash
# 1) the server (serves web/dist once built)
cd server && npm install && node index.js   # → :8080

# 2) the web app in dev mode (hot reload)
cd web && npm install && npm run dev          # → :5173
```

Or build once and let the server serve everything from one origin:

```bash
cd web && npm run build      # outputs web/dist
cd ../server && node index.js   # serves the kiosk on :8080
```

---

## Production deploy (Render)

One small static web service. Create it in the Render dashboard:

- **Type:** Web Service · **Runtime:** Node · **Root Directory:** *(blank — this
  folder is the repo root)*
- **Build Command:** `cd web && npm install && npm run build && cd ../server && npm install`
- **Start Command:** `node server/index.js`
- **Health Check Path:** `/healthz`

The server listens on `process.env.PORT` (Render sets this automatically).

> Render's free tier idles after inactivity; the first request after idle takes
> a few seconds to wake. Use a paid instance for a live activation, or hit the
> URL a minute before doors.

---

## Running the activation

1. Open the iPad to the deployed URL and tap **Check In** once to enter
   fullscreen (repeat if the browser chrome reappears after a reload).
2. For true kiosk lockdown, add the page to the Home Screen and use iOS
   **Guided Access** (Settings → Accessibility → Guided Access) so a guest can't
   swipe away to the home screen or another app.
3. Reset between guests happens automatically — **Continue** on the reveal
   screen returns straight to Home.

---

## Customizing

- **Destinations:** edit the `DESTINATIONS` array in
  `web/src/lib/constants.js`.
- **Copy:** all guest-facing text lives in `web/src/screens/Kiosk.jsx`.
- **Look:** colors, type, and spacing are all in `web/src/styles/kiosk.css`
  (black/white only, by design — no accent color).
- **Logo:** `web/src/components/EvioMark.jsx` renders "EVIO™" as styled text
  rather than an image, so it stays crisp at any size. Swap in the literal logo
  asset there if you'd rather use the exact brand file.
