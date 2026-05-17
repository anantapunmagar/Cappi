// api/event.js
// Bot calls this endpoint to report player joins/leaves and bot state changes
// Requires: CAPPI_SECRET env var for auth, BLOB_READ_WRITE_TOKEN for Vercel Blob

import { put } from '@vercel/blob'

const CAPPI_SECRET = process.env.CAPPI_SECRET || 'changeme'

// ===================== BLOB HELPERS =====================
async function blobGet(key) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN
    const listRes = await fetch(
      `https://blob.vercel-storage.com?prefix=${key}.json&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const listData = await listRes.json()
    if (!listData.blobs || listData.blobs.length === 0) return null

    const blobUrl = listData.blobs[0].url
    const res = await fetch(`${blobUrl}?t=${Date.now()}`)
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error(`blobGet(${key}) error:`, err.message)
    return null
  }
}

async function blobSet(key, value) {
  await put(`${key}.json`, JSON.stringify(value), {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 0
  })
}

// ===================== HANDLER =====================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = req.headers['x-cappi-secret']
  if (auth !== CAPPI_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { type, player, timestamp, botStatus, playerCount, maxPlayers } = req.body

  if (!type) return res.status(400).json({ error: 'Missing type' })

  const now = timestamp || Date.now()

  const [state, events] = await Promise.all([
    blobGet('cappi-state'),
    blobGet('cappi-events')
  ])

  const currentState = state || {
    botOnline: false,
    botJoinedAt: null,
    playerCount: 0,
    maxPlayers: 20,
    onlinePlayers: [],
    lastUpdated: now
  }

  let currentEvents = events || []

  switch (type) {
    case 'bot_spawn':
      currentState.botOnline = true
      currentState.botJoinedAt = now
      currentEvents.unshift({ id: now, type, timestamp: now, message: 'Cappi connected to the server' })
      break

    case 'bot_disconnect':
      currentState.botOnline = false
      currentState.botJoinedAt = null
      currentEvents.unshift({ id: now, type, timestamp: now, message: 'Cappi disconnected from the server' })
      break

    case 'player_join':
      if (player && !currentState.onlinePlayers.find(p => p.name === player)) {
        currentState.onlinePlayers.push({ name: player, joinedAt: now })
      }
      currentEvents.unshift({ id: now, type, timestamp: now, player, message: `${player} joined the server` })
      break

    case 'player_leave':
      currentState.onlinePlayers = currentState.onlinePlayers.filter(p => p.name !== player)
      currentEvents.unshift({ id: now, type, timestamp: now, player, message: `${player} left the server` })
      break

    case 'server_poll':
      currentState.playerCount = playerCount ?? currentState.playerCount
      currentState.maxPlayers = maxPlayers ?? currentState.maxPlayers
      if (typeof botStatus === 'boolean') currentState.botOnline = botStatus
      break

    case 'chat': {
      const { username, message } = req.body
      currentEvents.unshift({ id: now, type, timestamp: now, player: username, message: `${username}: ${message}` })
      break
    }

    default:
      return res.status(400).json({ error: `Unknown event type: ${type}` })
  }

  currentState.lastUpdated = now
  if (playerCount !== undefined) currentState.playerCount = playerCount
  if (maxPlayers !== undefined) currentState.maxPlayers = maxPlayers

  currentEvents = currentEvents.slice(0, 200)

  await Promise.all([
    blobSet('cappi-state', currentState),
    blobSet('cappi-events', currentEvents)
  ])

  return res.status(200).json({ ok: true })
}
