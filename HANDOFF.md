# Evio Airlines Check-In Kiosk — Handoff Package

You're getting a complete, working iPad activation: a single self-guided
check-in flow (Home → pick a passport → destination reveal) plus the tiny
server that serves it.

This package is **fully self-contained** — no accounts, database, or company
systems required to run it. It does not touch any live Evio data; it's a
standalone kiosk experience that just needs somewhere to live on the internet.

Read [`README.md`](README.md) first for what the app actually does and how
it's built. **This file is only about getting from a blank folder to a live,
hosted instance.**

---

## What you need before starting

1. **Node.js 18 or newer** installed locally (to test before deploying). Check with:
   ```bash
   node -v
   ```
2. **A GitHub account** (free) — Render deploys from a git repo.
3. **A Render account** (free) at [render.com](https://render.com) — sign up
   with your GitHub account to make the next step a one-click connection.

Nothing else. No API keys, no environment variables, no database.

---

## Step 1 — Put this folder under version control

```bash
git init
git add -A
git commit -m "Evio Airlines check-in kiosk — initial import"
```

Then create a **new, empty** repository on GitHub and:

```bash
git remote add origin <your-new-repo-url>
git branch -M main
git push -u origin main
```

## Step 2 — Try it locally first

Two terminals:

```bash
# terminal 1 — the server (serves the built app)
cd server && npm install && node index.js   # → :8080

# terminal 2 — build the web app once
cd web && npm install && npm run build
```

Once both have run, open **http://localhost:8080** and tap through **Check
In → a passport → Continue**. (See `README.md` for the hot-reload dev-mode
alternative.)

## Step 3 — Deploy to Render

**Easiest: use the included Blueprint.**

1. In the Render dashboard: **New +** → **Blueprint**.
2. Connect the GitHub repo you created in Step 1.
3. Render reads `render.yaml` in this folder automatically and pre-fills
   everything. Confirm the plan and click **Apply**.
4. Wait for the first build to finish — Render gives you a URL like
   `https://<your-app>.onrender.com`.

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
> take ~30-60s to wake on the first request. Fine for testing; for an actual
> live activation, either upgrade to a paid instance for the day, or hit the
> URL a couple minutes beforehand so it's already warm.

### Your link

Once deployed at `https://<your-app>.onrender.com`, that single URL **is** the
kiosk — open it on the iPad and tap **Check In**.

## Step 4 — Customize it

- **Destinations:** edit the `DESTINATIONS` array in
  `web/src/lib/constants.js`.
- **Copy:** all guest-facing text lives in `web/src/screens/Kiosk.jsx`.

Change these, commit, push to `main` — Render auto-deploys the new build.

## Step 5 — Run it on the day

1. Open the deployed URL on the iPad and tap **Check In** once (this also
   attempts fullscreen — a browser gesture requirement).
2. For a real lockdown so guests can't back out to the home screen, add the
   page to the iPad's Home Screen and turn on **Guided Access**
   (Settings → Accessibility → Guided Access), then triple-click the side
   button to start it.
3. Nothing needs resetting between guests — **Continue** on the reveal screen
   returns straight to Home automatically.
