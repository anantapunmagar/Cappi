import React, { useMemo } from 'react'
import { Activity, Users, Zap, Clock } from 'lucide-react'
import { useLiveData } from './hooks/useLiveData'
import { formatElapsed } from './hooks/useTimer'
import { Header } from './components/Header'
import { BotStatus } from './components/BotStatus'
import { PlayerList } from './components/PlayerList'
import { EventLog } from './components/EventLog'
import { StatCard } from './components/StatCard'
import './App.css'

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-moon">🌙</div>
      <div className="loading-text">connecting to cappi...</div>
      <div className="loading-dots">
        <span /><span /><span />
      </div>
    </div>
  )
}

function ErrorScreen({ error, onRetry }) {
  return (
    <div className="loading-screen">
      <div className="loading-moon">⚠️</div>
      <div className="loading-text" style={{ color: 'var(--red)' }}>{error}</div>
      <button className="retry-btn" onClick={onRetry}>retry</button>
    </div>
  )
}

export default function App() {
  const { state, events, loading, error, lastFetched, refresh } = useLiveData()

  // Compute stats from events
  const stats = useMemo(() => {
    if (!events.length) return { joins: 0, leaves: 0, chatMessages: 0, uniquePlayers: 0 }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTs = today.getTime()
    const todayEvents = events.filter(e => e.timestamp >= todayTs)

    const joins = todayEvents.filter(e => e.type === 'player_join').length
    const leaves = todayEvents.filter(e => e.type === 'player_leave').length
    const chatMessages = todayEvents.filter(e => e.type === 'chat').length
    const uniquePlayers = new Set(
      events.filter(e => e.player).map(e => e.player)
    ).size

    return { joins, leaves, chatMessages, uniquePlayers }
  }, [events])

  if (loading) return <LoadingScreen />
  if (error) return <ErrorScreen error={error} onRetry={refresh} />

  const serverFill = state?.maxPlayers
    ? Math.round((state.playerCount / state.maxPlayers) * 100)
    : 0

  return (
    <div className="app">
      <Header lastFetched={lastFetched} onRefresh={refresh} />

      <main className="main">
        {/* Hero - Bot Status */}
        <section className="section-full fade-in-up" style={{ animationDelay: '0ms' }}>
          <BotStatus state={state} />
        </section>

        {/* Stats row */}
        <section className="stats-grid fade-in-up" style={{ animationDelay: '60ms' }}>
          <StatCard
            label="Players Online"
            value={`${state?.playerCount ?? 0}/${state?.maxPlayers ?? 20}`}
            sub={`${serverFill}% capacity`}
            accent={state?.playerCount > 0 ? 'green' : null}
            icon={Users}
          />
          <StatCard
            label="Joins Today"
            value={stats.joins}
            sub="player join events"
            accent="blue"
            icon={Activity}
          />
          <StatCard
            label="Leaves Today"
            value={stats.leaves}
            sub="player leave events"
            accent={stats.leaves > 0 ? 'red' : null}
            icon={Zap}
          />
          <StatCard
            label="Unique Players"
            value={stats.uniquePlayers}
            sub="all time (logged)"
            accent="purple"
            icon={Clock}
          />
        </section>

        {/* Bottom grid - Player list + Event log */}
        <section className="bottom-grid fade-in-up" style={{ animationDelay: '120ms' }}>
          <PlayerList state={state} />
          <EventLog events={events} />
        </section>

        {/* Footer */}
        <footer className="footer">
          <span className="footer-mono">🌙 cappi monitor</span>
          <span className="footer-sep">·</span>
          <span>polls every 15s</span>
          <span className="footer-sep">·</span>
          <span>bot polls every 30s</span>
        </footer>
      </main>
    </div>
  )
}
