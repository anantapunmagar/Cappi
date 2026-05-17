// api/event.js
// Bot calls this endpoint to report player joins/leaves and bot state changes
// Requires: CAPPI_SECRET env var for auth, KV_REST_API_URL + KV_REST_API_TOKEN for Vercel KV

const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN
const CAPPI_SECRET = process.env.CAPPI_SECRET || 'changeme'

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  })
  const data = await res.json()
  return data.result ? JSON.parse(data.result) : null
}

async function kvSet(key, value, exSeconds) {
  const body = exSeconds
    ? JSON.stringify(['SET', key, JSON.stringify(value), 'EX', exSeconds])
    : JSON.stringify(['SET', key, JSON.stringify(value)])

  await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth check
  const auth = req.headers['x-cappi-secret']
  if (auth !== CAPPI_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { type, player, timestamp, botStatus, playerCount, maxPlayers } = req.body

  if (!type) return res.status(400).json({ error: 'Missing type' })

  const now = timestamp || Date.now()

  // Load existing state
  let state = (await kvGet('cappi:state')) || {
    botOnline: false,
    botJoinedAt: null,
    playerCount: 0,
    maxPlayers: 20,
    onlinePlayers: [],
    lastUpdated: now
  }

  let events = (await kvGet('cappi:events')) || []

  // Handle event types
  switch (type) {
    case 'bot_spawn':
      state.botOnline = true
      state.botJoinedAt = now
      events.unshift({ id: now, type, timestamp: now, message: 'Cappi connected to the server' })
      break

    case 'bot_disconnect':
      state.botOnline = false
      state.botJoinedAt = null
      events.unshift({ id: now, type, timestamp: now, message: 'Cappi disconnected from the server' })
      break

    case 'player_join':
      if (player && !state.onlinePlayers.find(p => p.name === player)) {
        state.onlinePlayers.push({ name: player, joinedAt: now })
      }
      events.unshift({ id: now, type, timestamp: now, player, message: `${player} joined the server` })
      break

    case 'player_leave':
      state.onlinePlayers = state.onlinePlayers.filter(p => p.name !== player)
      events.unshift({ id: now, type, timestamp: now, player, message: `${player} left the server` })
      break

    case 'server_poll':
      // Regular heartbeat from bot with server status
      state.playerCount = playerCount ?? state.playerCount
      state.maxPlayers = maxPlayers ?? state.maxPlayers
      if (typeof botStatus === 'boolean') state.botOnline = botStatus
      break

    case 'chat':
      const { username, message } = req.body
      events.unshift({ id: now, type, timestamp: now, player: username, message: `${username}: ${message}` })
      break

    default:
      return res.status(400).json({ error: `Unknown event type: ${type}` })
  }

  state.lastUpdated = now
  if (playerCount !== undefined) state.playerCount = playerCount
  if (maxPlayers !== undefined) state.maxPlayers = maxPlayers

  // Keep last 200 events
  events = events.slice(0, 200)

  // Save
  await Promise.all([
    kvSet('cappi:state', state),
    kvSet('cappi:events', events)
  ])

  return res.status(200).json({ ok: true })
}
