import React, { useRef, useEffect, useState } from 'react'
import { Terminal, ChevronDown } from 'lucide-react'
import { formatTime, formatDate } from '../hooks/useTimer'
import './EventLog.css'

const EVENT_STYLES = {
  player_join:     { color: 'green',  symbol: '→', label: 'JOIN' },
  player_leave:    { color: 'red',    symbol: '←', label: 'LEAVE' },
  bot_spawn:       { color: 'purple', symbol: '⬡', label: 'BOT' },
  bot_disconnect:  { color: 'yellow', symbol: '⬡', label: 'BOT' },
  chat:            { color: 'blue',   symbol: '◆', label: 'CHAT' },
  server_poll:     { color: 'dim',    symbol: '·', label: 'POLL' },
}

function EventRow({ event, isNew }) {
  const style = EVENT_STYLES[event.type] || { color: 'dim', symbol: '·', label: '??' }

  return (
    <div className={`event-row event-row--${style.color} ${isNew ? 'event-row--new' : ''}`}>
      <span className="event-time">{formatTime(event.timestamp)}</span>
      <span className={`event-tag event-tag--${style.color}`}>{style.label}</span>
      <span className="event-symbol">{style.symbol}</span>
      <span className="event-msg">{event.message}</span>
    </div>
  )
}

export function EventLog({ events }) {
  const listRef = useRef(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [newIds, setNewIds] = useState(new Set())
  const prevCountRef = useRef(events.length)

  // Track new events for animation
  useEffect(() => {
    if (events.length > prevCountRef.current) {
      const newEvents = events.slice(0, events.length - prevCountRef.current)
      setNewIds(new Set(newEvents.map(e => e.id)))
      setTimeout(() => setNewIds(new Set()), 1500)
    }
    prevCountRef.current = events.length
  }, [events])

  // Auto-scroll to top (newest = top)
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [events, autoScroll])

  const handleScroll = () => {
    if (!listRef.current) return
    setAutoScroll(listRef.current.scrollTop < 40)
  }

  return (
    <div className="event-log-card">
      <div className="section-header">
        <div className="section-title">
          <Terminal size={14} />
          <span>Event Log</span>
        </div>
        <div className="event-log-controls">
          <span className="section-count">{events.length} events</span>
          {!autoScroll && (
            <button
              className="scroll-btn"
              onClick={() => { setAutoScroll(true); listRef.current && (listRef.current.scrollTop = 0) }}
            >
              <ChevronDown size={12} />
              newest
            </button>
          )}
        </div>
      </div>

      <div className="event-list" ref={listRef} onScroll={handleScroll}>
        {events.length === 0 ? (
          <div className="event-empty">
            <span className="event-empty-icon">📡</span>
            <span>Waiting for events...</span>
          </div>
        ) : (
          events.map(event => (
            <EventRow key={event.id} event={event} isNew={newIds.has(event.id)} />
          ))
        )}
      </div>
    </div>
  )
}
