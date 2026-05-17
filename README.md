# Cappi Dashboard

Live monitor dashboard for the Cappi Minecraft bot on `ananta.mcsh.io`.

## Stack

- **Frontend**: React + Vite (deployed to Vercel)
- **Backend**: Vercel Serverless Functions (`/api/`)
- **Storage**: Vercel KV (Redis) — persists events & state
- **Bot**: Mineflayer bot running locally, POSTs events to the dashboard

---

## Setup

### 1. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# From the cappi-dashboard folder:
vercel
```

### 2. Add Vercel KV

In your Vercel project dashboard:
1. Go to **Storage** → **Create Database** → **KV**
2. Connect it to your project
3. Vercel auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` env vars

### 3. Set Environment Variables

In Vercel project settings → **Environment Variables**, add:

| Variable | Value |
|---|---|
| `CAPPI_SECRET` | any random string, e.g. `myS3cr3tKey` |

### 4. Configure the Bot

Set these env vars where you run the bot (e.g. in your `.env` or shell):

```bash
export CAPPI_DASHBOARD_URL=https://your-app.vercel.app
export CAPPI_SECRET=myS3cr3tKey   # must match Vercel env var
```

Then run the bot:
```bash
node index.js
```

---

## What Gets Tracked

| Event | Trigger |
|---|---|
| `bot_spawn` | Cappi connects to the server |
| `bot_disconnect` | Cappi disconnects |
| `player_join` | Any player joins while bot is on server |
| `player_leave` | Any player leaves while bot is on server |
| `chat` | Chat messages sent in-game |
| `server_poll` | Every 30s heartbeat (player count, etc.) |

## API Endpoints

- `POST /api/event` — Bot sends events here (requires `x-cappi-secret` header)
- `GET /api/events` — Frontend polls this for state + events

## Local Development

```bash
npm install
npm run dev   # starts Vite dev server

# In another terminal, run the local Vercel dev server for API:
vercel dev
```
