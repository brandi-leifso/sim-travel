# Golden Egg Rebuy — Handoff Package

You're getting a complete, working live-poker promo app: two synced screens (a
public "big screen" board and an operator's phone control) plus the tiny server
that keeps them in sync. It was built and used at a real VClub series main event.

This package is **fully self-contained** — no accounts, database, or company
systems required to run it. It does not touch any of VClub's own data; it's a
standalone toy that just needs somewhere to live on the internet.

Read [`README.md`](README.md) first for what the app actually does and how it's
built (architecture, sync design, audio, known gotchas). **This file is only
about getting from a blank folder to a live, hosted instance** — assuming you're
starting completely from scratch.

If you have your own Claude Code session, the fastest path is: open this folder
in it and paste the prompt at the bottom of this file. Everything below is what
Claude Code will walk you through (or what you can do by hand).

---

## What you need before starting

1. **Node.js 18 or newer** installed locally (to test before deploying). Check with:
   ```bash
   node -v
   ```
2. **A GitHub account** (free) — Render deploys from a git repo, and you can't use
   VClub's private repo, so you'll push this folder to your own new repo.
3. **A Render account** (free) at [render.com](https://render.com) — sign up with
   your GitHub account to make the next step a one-click connection.

Nothing else. No API keys, no environment variables, no database.

---

## Step 1 — Put this folder under version control

From inside this folder:

```bash
git init
git add -A
git commit -m "Golden Egg Rebuy — initial import"
```

Then create a **new, empty** repository on GitHub (public or private, doesn't
matter) — e.g. via `gh repo create golden-egg --source=. --push` if you have the
GitHub CLI, or manually on github.com and then:

```bash
git remote add origin <your-new-repo-url>
git branch -M main
git push -u origin main
```

## Step 2 — Try it locally first

Two terminals:

```bash
# terminal 1 — the relay (serves the built app + WebSocket sync)
cd server && npm install && npm run build 2>/dev/null; node index.js   # → :8080

# terminal 2 — build the web app once
cd web && npm install && npm run build
```

Once both have run, open **http://localhost:8080/display** and
**http://localhost:8080/admin** in two browser tabs/windows and try arming +
revealing an egg — you should see them sync live. (See `README.md` for the
hot-reload dev-mode alternative.)

## Step 3 — Deploy to Render

**Easiest: use the included Blueprint.**

1. In the Render dashboard: **New +** → **Blueprint**.
2. Connect the GitHub repo you created in Step 1.
3. Render reads `render.yaml` in this folder automatically and pre-fills
   everything (build command, start command, health check). Confirm the plan
   (Starter is recommended — see the note below on the free tier) and click
   **Apply**.
4. Wait for the first build to finish (a few minutes) — Render gives you a URL
   like `https://golden-egg-xxxx.onrender.com`.

**Or configure it by hand** (New + → Web Service, connect the repo, then set):

| Setting | Value |
|---|---|
| Runtime | Node |
| Root Directory | *(leave blank — this folder IS the repo root)* |
| Build Command | `cd web && npm install && npm run build && cd ../server && npm install` |
| Start Command | `node server/index.js` |
| Health Check Path | `/healthz` |

No environment variables are needed — the app only uses `PORT`, which Render
sets automatically.

> **Free tier note:** Render's free web services spin down after inactivity and
> take ~30-60s to wake on the first request. Fine for testing; for an actual live
> event, either upgrade to a paid instance for the day, or hit the URL a couple
> minutes before doors so it's already warm.

### Your two links

Once deployed at `https://<your-app>.onrender.com`:

- **Public Display** (the room's TV): `https://<your-app>.onrender.com/display`
- **Floor Control** (operator's phone): `https://<your-app>.onrender.com/admin`

Bookmark both. Open Display first, tap "Tap to go live" (unlocks sound + full
screen), then open Admin on the phone — its header shows "Display connected"
once it sees the Display.

## Step 4 — Customize it for your event (optional)

Everything below lives in `web/src/lib/constants.js`:

```js
export const BUYIN = 590;        // refund amount shown on a golden egg
export const TOTAL_EGGS = 50;    // board size
export const GOLDEN_COUNT = 5;   // how many golden eggs are seeded
```

Change these, commit, push to `main` — Render auto-deploys the new build. The
event name/kicker text ("Spring Series · Main Event Day 1B") is hardcoded in
`web/src/screens/Display.jsx` and `Home.jsx` if you want to relabel it.

## Step 5 — Run it on the night

See the **"Operating the promo"** section of `README.md` for the full operator
flow (arm → confirm → reveal, force golden/miss, reset board, keyboard
shortcuts). Short version: player calls a number, tap it on Admin to arm, confirm
with the table, hit Reveal.

---

## Prompt to paste into your own Claude Code session

If whoever you're handing this to has Claude Code but no context on any of this,
they can open this folder and paste:

> This folder is a self-contained "Golden Egg Rebuy" live poker promo app (two
> synced screens: a public display board and an operator control page, with a
> tiny Node/WebSocket relay keeping them in sync). Read HANDOFF.md and README.md
> in this folder, then walk me through: initializing git and pushing this to a
> new GitHub repo of mine, testing it locally, and deploying it to Render from
> scratch (I don't have a Render account yet). Stop and tell me exactly what to
> click whenever something needs to happen in a browser (GitHub repo creation,
> Render signup/OAuth) rather than guessing — everything else you can run
> directly.
