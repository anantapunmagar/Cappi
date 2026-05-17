import React from 'react'
import { RefreshCw } from 'lucide-react'
import './Header.css'

export function Header({ lastFetched, onRefresh }) {
  return (
    <header className="header">
      <div className="header-left">
        <span className="header-moon">🌙</span>
        <div>
          <h1 className="header-title">Cappi</h1>
          <p className="header-sub">ananta.mcsh.io · live monitor</p>
        </div>
      </div>
      <div className="header-right">
        {lastFetched && (
          <span className="header-updated">
            updated {new Date(lastFetched).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
        <button className="refresh-btn" onClick={onRefresh} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>
    </header>
  )
}
