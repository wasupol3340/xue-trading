# Phase 3 — Connect the live dashboard (kinthiew.com → VPS bot)

After Phase 2, the website can show **real** data (account, positions, the current
technique, and live technique scores from the Learning AI). This guide connects
the two: run the API on the VPS, expose it over HTTPS with a Cloudflare Tunnel,
and point the Netlify site at it.

```
kinthiew.com (Netlify)  ──HTTPS──►  Cloudflare Tunnel  ──►  VPS: uvicorn app.main (trading + API + WebSocket)  ──►  MT5
```

---

## 1. Update the code on the VPS
Download the latest project ZIP from GitHub again (Code → Download ZIP) and
replace the old `backend` folder, **or** just replace the changed files. The new
backend runs the trading engine **and** serves the dashboard API from one process.

## 2. Install the extra packages (one-time)
Open the Command Prompt in the `backend` folder and run:
```
pip install "uvicorn[standard]" "python-jose[cryptography]"
```
(You already have MetaTrader5, fastapi, pydantic — these two add the web server + JWT.)

## 3. Set a dashboard password in `.env`
Add these to `backend\.env` (change the password!):
```
DASHBOARD_USER=master@xuetrading.ai
DASHBOARD_PASSWORD=your-strong-password
SECRET_KEY=some-long-random-string
```

## 4. Run the API + trading engine (replaces `app.worker`)
Stop the old worker (Ctrl+C), then:
```
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
This connects to MT5, arms the autonomous engine (because `AUTO_TRADING_ENABLED=true`),
and serves the API at `http://localhost:8000` (`/docs` to browse it).

## 5. Expose it over HTTPS with Cloudflare Tunnel (free, no account needed)
Download `cloudflared` for Windows from Cloudflare, then in a **second** Command Prompt:
```
cloudflared tunnel --url http://localhost:8000
```
It prints a public HTTPS URL like `https://random-words.trycloudflare.com`.
Keep this window open — that URL is your API address.

> The quick-tunnel URL changes each time you restart it. For a permanent address,
> set up a named tunnel with a Cloudflare account later — the quick tunnel is fine
> to test end-to-end first.

## 6. Point the website at the API (Netlify)
Netlify → your XUE site → **Project configuration → Environment variables** → add:
```
NEXT_PUBLIC_API_URL = https://random-words.trycloudflare.com
NEXT_PUBLIC_WS_URL  = wss://random-words.trycloudflare.com/ws
```
(use `wss://` for the WS one). Then **Deploys → Trigger deploy → Clear cache and deploy**.

## 7. Allow the website in CORS
In `backend\.env` add your site so the browser is allowed to call the API:
```
CORS_ORIGINS=["https://kinthiew.com","https://www.kinthiew.com"]
```
Restart uvicorn.

---

## Done — what you'll see
Open **kinthiew.com** → it now asks you to **log in** (the DASHBOARD_USER / DASHBOARD_PASSWORD).
After login the dashboard shows:
- **Real balance / equity / open positions** from your Vantage cent account
- **Active Technique** the AI is trading right now (top of the dashboard)
- **Strategy Center** — live scores, win-rate, profit factor per technique, with a
  **● TRADING NOW** badge on the active one — updating as real trades close
- **Meeting Room** — the agents' real votes for the latest decision
- **System Logs** — every real order the engine places, streamed live

If the API/tunnel is offline, the site automatically falls back to sample data so it
never looks broken.

## Security notes
- Change `DASHBOARD_PASSWORD` and set a long random `SECRET_KEY`.
- The account/positions/status endpoints require login (JWT). Keep your password private.
- The tunnel URL is public but useless without the password.
