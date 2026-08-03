# Deploying XUE Trading — Netlify (frontend) + backend host

## What can go where

| Part of the app | Netlify? | Where it should run |
|-----------------|:--------:|---------------------|
| Next.js frontend (the UI) | ✅ yes | **Netlify** |
| FastAPI backend (REST API) | ❌ no | Render / Railway / Fly.io / a VPS |
| PostgreSQL database | ❌ no | Neon / Supabase / Render Postgres |
| WebSocket stream (`/ws`) | ❌ no | same host as the backend |
| MT5 auto-trading engine | ❌ no | **Windows VPS** (see MT5_SETUP.md) |

Netlify is serverless — it can't keep a Python process, a database, a WebSocket
server, or the trading loop running 24/7. So Netlify hosts the **frontend**, and
the backend lives on a host that supports long-running services.

The frontend renders fully on realistic **mock data** even with no backend, so a
Netlify-only deploy already gives you the complete UI to show off.

---

## Part 1 — Deploy the frontend to Netlify

### Option A · Git import (recommended)

1. Push this project to a GitHub/GitLab repo.
2. Netlify → **Add new site → Import an existing project** → pick the repo.
3. Netlify reads `netlify.toml` automatically, so the settings are prefilled:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/.next`
   - Next.js runtime plugin: auto-installed
4. (Optional) **Site settings → Environment variables** — add these only when
   your backend is live:
   ```
   NEXT_PUBLIC_API_URL = https://your-backend.onrender.com
   NEXT_PUBLIC_WS_URL  = wss://your-backend.onrender.com/ws
   ```
   Leave them unset to run on mock data.
5. **Deploy site.** First build takes ~2–3 min. You get a `*.netlify.app` URL.

### Option B · Netlify CLI

```bash
npm install -g netlify-cli
cd frontend
netlify init         # link/create a site
netlify deploy --build --prod
```

> Tip: don't use the plain drag-and-drop of a folder for this app — Next.js needs
> the runtime plugin, which the Git import / CLI build path sets up for you.

---

## Part 2 — Deploy the backend (so the AI/data is real)

Netlify can't host it. The quickest managed option is **Render**:

1. Push the repo; on Render choose **New → Web Service**, root = `backend`.
2. Environment: Python 3.11.
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. **New → PostgreSQL**, then set `DATABASE_URL` on the web service
   (use the `postgresql+asyncpg://…` form).
4. Set `SECRET_KEY`, and `CORS_ORIGINS=["https://your-site.netlify.app"]`.
5. Copy the service URL into Netlify's `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL`
   and redeploy the frontend.

Railway and Fly.io work the same way; a plain VPS + `docker compose up` also works
(the repo ships a compose file).

> **Important:** the backend on Render/Railway/Fly runs the **simulated** broker —
> it is not Windows and has no MT5 terminal. Real order execution must run on a
> **Windows VPS** as described in `docs/MT5_SETUP.md` (run the whole backend there,
> or just `python -m app.worker`). Point the frontend at whichever backend you want
> the dashboard to read from.

---

## Recommended production shape

```
Netlify            →  frontend (public dashboard)
Render/Railway     →  FastAPI API + Postgres  (data, auth, meetings — simulated broker)
Windows VPS        →  app.worker + MT5 terminal  (the real autonomous trading)
```

CORS: whitelist your Netlify domain in the backend `CORS_ORIGINS`, and make sure
the frontend uses `https://` / `wss://` (not `http`/`ws`) once deployed.
