import React from 'react'
import { Wifi, WifiOff, Clock } from 'lucide-react'
import { useTimer, formatElapsed, formatTime } from '../hooks/useTimer'
import './BotStatus.css'

export function BotStatus({ state }) {
  const online = state?.botOnline ?? false
  const elapsed = useTimer(online ? state?.botJoinedAt : null)

  return (
    <div className={`bot-status ${online ? 'bot-status--online' : 'bot-status--offline'}`}>
      <div className="bot-status-left">
        <div className="bot-status-indicator">
          <span className={`dot ${online ? 'dot--green' : 'dot--red'}`} />
          <span className="bot-status-label">{online ? 'CONNECTED' : 'DISCONNECTED'}</span>
        </div>
        <div className="bot-status-name">Cappi</div>
        <div className="bot-status-server">ananta.mcsh.io</div>
      </div>
      <div className="bot-status-right">
        {online ? (
          <>
            <div className="bot-uptime-label">
              <Clock size={12} />
              uptime
            </div>
            <div className="bot-uptime">{formatElapsed(elapsed)}</div>
            {state?.botJoinedAt && (
              <div className="bot-joined">since {formatTime(state.botJoinedAt)}</div>
            )}
          </>
        ) : (
          <div className="bot-offline-text">
            <WifiOff size={20} />
            <span>Not on server</span>
          </div>
        )}
      </div>
      {online && <div className="bot-scan-line" />}
    </div>
  )
}
