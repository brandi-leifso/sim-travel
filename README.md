# VClub · Golden Egg Rebuy

A live, in-room poker promo. Two synchronized screens:

- **Public Display** (`/display`) — the big screen the room watches: a board of 50
  numbered eggs (5 golden), a staged dramatic reveal, and a golden fanfare that
  "refunds" the player's $590 buy-in.
- **Floor Control / Admin** (`/admin`) — the operator's phone: enter the number the
  player called out, **arm** it on the Display, then **reveal**.

> **Standalone & display-only.** This app touches **no live VClub data**. Outcomes
> are for show; the floor awards the actual refund manually at the cage. It runs as
> its own service, separate from the mobile app and backend.

It is a faithful, pixel-for-pixel rebuild of the design prototype in
`design_handoff_golden_egg_rebuy/`, recreated as a real Vite + React app with a tiny
WebSocket relay so the two screens can live on **different devices**.

---

## Architecture

```
golden-egg/
  web/      ← Vite + React SPA (the two screens)
    src/
      lib/          constants.js · sound.js · hooks.js · bus.js (WebSocket sync)
      components/    Egg · Foil · Confetti · CoinShower · Rays · VClubMark
      screens/       Display.jsx · Admin.jsx · Home.jsx
      styles/        rebuy.css (display) · admin.css · tokens.css
  server/   ← Node WebSocket relay + static host for web/dist
    index.js
```

**Sync.** The prototype used `BroadcastChannel`/`localStorage` (same browser only).
The **relay (`server/index.js`) is the single source of truth.** It owns the whole
game — the board, which eggs are golden, what's been opened, the current phase, and
the reveal timeline — and broadcasts a full `{t:"state", …}` snapshot to every
connected client. **Every Display is a pure renderer:** it connects, instantly
receives the current state, and renders it. So **any number of Display machines stay
perfectly in sync** (same golden eggs, same opened history, same reveal at the same
moment), a Display opened mid-event **catches up instantly**, and the Admin's
"Display connected" reflects whether a Display is actually open.

| Direction | Transport | Messages |
|-----------|-----------|----------|
| Admin → relay | **HTTP POST `/cmd`** | `{t:"arm",n}` · `{t:"reveal",n,force}` · `{t:"close"}` · `{t:"reset"}` · `{t:"sound",on}` |
| relay → all clients | WebSocket | `{t:"state", …}` (full authoritative snapshot, on every change + on connect) |

The operator's **commands go over HTTP POST**, not the WebSocket. A long-lived mobile
WebSocket can go *half-open* (one direction silently dies) — which once let an armed
egg's `reveal` vanish even though the Admin looked connected. Each POST is a fresh
request that's immune to that and reports delivery. The WebSocket carries only the
relay → clients state stream (which needs server push). Clients tag their role
(`?role=display|admin`) so the relay can report how many Displays are open. The relay
runs the reveal timeline (≈3.15s suspense → result → auto-return) and decides each
outcome once, so all Displays show the identical result. Board state is persisted to
a temp file so it survives a process restart within a deploy.

**Audio.** All SFX are synthesized at runtime via WebAudio (no asset files). Each
Display plays sound + runs the staged suspense animation locally off the state
transitions it observes (the sound must come from the screen on the room's speakers).
Because a Display is driven remotely it never receives its own user gesture, so it opens on
a **"Tap to go live"** attract gate — that one tap unlocks the AudioContext so every
later remotely-triggered reveal plays through the room. To swap in real SFX files,
keep the same one-gesture-unlock pattern (`web/src/lib/sound.js`).

**Reduced motion.** All decorative animation is gated behind
`@media (prefers-reduced-motion: no-preference)`; the staged reveal is transition-
based so it never freezes mid-frame.

---

## Local development

Two terminals:

```bash
# 1) the WebSocket relay (serves /ws; also serves web/dist if you've built it)
cd golden-egg/server && npm install && node index.js   # → :8080

# 2) the web app in dev mode (hot reload)
cd golden-egg/web && npm install && npm run dev          # → :5173
```

In dev, point the web app at the relay with a query param (the Vite dev server has no
`/ws` of its own):

- Display: `http://localhost:5173/display?relay=localhost:8080`
- Admin:   `http://localhost:5173/admin?relay=localhost:8080`

Or just build once and let the relay serve everything from one origin (no `?relay`
needed):

```bash
cd golden-egg/web && npm run build      # outputs web/dist
cd ../server && node index.js           # serves /display, /admin, and /ws on :8080
```

The `relay` override also accepts a full URL (`?relay=wss://your-host`). Without it,
the app connects to `/ws` on whatever host served the page — which is the normal
production case.

---

## Production deploy (Render)

One small web service hosts the built SPA **and** the WS relay (single origin, so no
CORS or cross-host config). Create it in the Render dashboard:

- **Type:** Web Service · **Runtime:** Node · **Root Directory:** `golden-egg`
- **Build Command:** `cd web && npm install && npm run build && cd ../server && npm install`
- **Start Command:** `node server/index.js`
- **Health Check Path:** `/healthz`

The server listens on `process.env.PORT` (Render sets this automatically). WebSockets
work over the same port — no extra config.

> This is **not** in the repo's `render.yaml` (which is intentionally cron-only). Create
> the service manually, or add it to a Blueprint yourself if you prefer.

At the venue, once deployed at e.g. `https://golden-egg.onrender.com`:

1. Open **`/display`** on the big screen and tap **"Tap to go live"** — that one tap
   enables sound **and enters full screen** (both require a user gesture). Press **F**
   any time to toggle full screen, or use the subtle ⛶ button in the bottom-right of
   the board. (`Esc` exits full screen, per the browser.)
2. Open **`/admin`** on the operator's phone — the chip turns green when the Display
   is connected.

> Note: Render's free tier idles after inactivity; the first request after idle takes
> a few seconds to wake. Use a paid instance for a live event, or hit the URL a minute
> before showtime.

---

## Operating the promo

1. The player busts during the rebuy period and calls a number out loud.
2. On **Admin**, tap that egg (or type 1–2 digits) → it **arms** on the Display
   ("Locked in · Egg #N").
3. Confirm with the table, then press **Reveal egg #N**. The Display runs the staged
   suspense (~3.15s) and shows the outcome.
4. **Golden** → full fanfare + $590 count-up. **Miss** → "Not this time."
5. Award the actual refund manually at the cage.

**Keyboard (Admin, physical keyboard):** type digits → **Enter** to arm → **Enter**
again to reveal · **Esc** clears · **Backspace** edits.

**Outcome control.** The `Auto / Force golden / Force miss` segmented control overrides
the result (for comps, pre-arranged moments, or testing). Auto never exceeds the 5
golden eggs unless you force it. **Reset board** reseeds 50 eggs with 5 new random
golden positions.

---

## Notes & assumptions

- **Multiple Displays.** Open `/display` on as many machines as you like — the relay
  is the single source of truth, so they all share one board and stay in sync, and a
  Display opened mid-event catches up instantly. (Sub-100ms animation differences
  across separate screens are imperceptible in a room.)
- **State lives in the relay.** A *deploy* reseeds the board (fresh 5 golden); a plain
  process restart resumes it from a temp file. Use **Reset board** to start clean.
- **Logo.** Uses the brand's canonical `VClub` logomark (ported from
  `VClubMobile/assets/images/vclub-logo.svg`).
- **Fonts.** Playfair Display + JetBrains Mono load from Google Fonts (matches the
  prototype). Self-host them if you need fully offline operation.
- **Buy-in / counts.** `BUYIN` ($590), `TOTAL_EGGS` (50), `GOLDEN_COUNT` (5) live in
  `web/src/lib/constants.js`.
