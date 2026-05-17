// api/events.js
// Frontend polls this to get current state + recent events

const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  })
  const data = await res.json()
  return data.result ? JSON.parse(data.result) : null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Cache headers - allow short caching since bot polls every 30s
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20')

  const [state, events] = await Promise.all([
    kvGet('cappi:state'),
    kvGet('cappi:events')
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
