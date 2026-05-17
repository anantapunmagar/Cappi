import React from 'react'
import { Users } from 'lucide-react'
import { useTimer, formatElapsed } from '../hooks/useTimer'
import './PlayerList.css'

function PlayerRow({ player }) {
  const elapsed = useTimer(player.joinedAt)

  return (
    <div className="player-row fade-in-up">
      <div className="player-avatar">
        <img
          src={`https://crafatar.com/avatars/${player.name}?size=32&overlay`}
          alt={player.name}
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
        />
        <div className="player-avatar-fallback" style={{ display: 'none' }}>
          {player.name[0].toUpperCase()}
        </div>
      </div>
      <div className="player-info">
        <span className="player-name">{player.name}</span>
        <span className="player-since">online {formatElapsed(elapsed)}</span>
      </div>
      <div className="player-badge">
        <span className="player-dot" />
        online
      </div>
    </div>
  )
}

export function PlayerList({ state }) {
  const players = state?.onlinePlayers || []

  return (
    <div className="player-list-card">
      <div className="section-header">
        <div className="section-title">
          <Users size={14} />
          <span>Online Players</span>
        </div>
        <span className="section-count">{players.length}/{state?.maxPlayers ?? 20}</span>
      </div>

      {players.length === 0 ? (
        <div className="player-empty">
          <span className="player-empty-icon">🏜️</span>
          <span>Server is empty</span>
        </div>
      ) : (
        <div className="player-rows">
          {players.map(p => (
            <PlayerRow key={p.name} player={p} />
          ))}
        </div>
      )}
    </div>
  )
}
