import { useState, useEffect } from 'react'

export function useTimer(startTs) {
  const [elapsed, setElapsed] = useState(startTs ? Date.now() - startTs : 0)

  useEffect(() => {
    if (!startTs) { setElapsed(0); return }
    const tick = () => setElapsed(Date.now() - startTs)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startTs])

  return elapsed
}

export function formatElapsed(ms) {
  if (!ms || ms < 0) return '0s'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

export function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
}
