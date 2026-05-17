import React from 'react'
import './StatCard.css'

export function StatCard({ label, value, sub, accent, icon: Icon, large }) {
  return (
    <div className={`stat-card ${accent ? `stat-card--${accent}` : ''} ${large ? 'stat-card--large' : ''}`}>
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        {Icon && <Icon size={14} className="stat-icon" />}
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
