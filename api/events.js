// api/events.js
// Frontend polls this to get current state + recent events

const CAPPI_SECRET = process.env.CAPPI_SECRET || 'changeme'

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20')

  const [state, events] = await Promise.all([
    blobGet('cappi-state'),
    blobGet('cappi-events')
  ])

  const limit = parseInt(req.query.limit) || 50

  return res.status(200).json({
    state: state || {
      botOnline: false,
      botJoinedAt: null,
      playerCount: 0,
      maxPlayers: 20,
      onlinePlayers: [],
      lastUpdated: null
    },
    events: (events || []).slice(0, limit)
  })
}
