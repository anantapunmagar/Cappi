import { useState, useEffect, useRef, useCallback } from 'react'

const POLL_MS = 15000 // Poll every 15s (bot updates every 30s, so we catch it fast)

export function useLiveData() {
  const [state, setState] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)
  const timerRef = useRef(null)

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch('/api/events?limit=100')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setState(data.state)
      setEvents(data.events || [])
      setLastFetched(Date.now())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch_()
    timerRef.current = setInterval(fetch_, POLL_MS)
    return () => clearInterval(timerRef.current)
  }, [fetch_])

  const refresh = useCallback(() => {
    fetch_()
  }, [fetch_])

  return { state, events, loading, error, lastFetched, refresh }
}
