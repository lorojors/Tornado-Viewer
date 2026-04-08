import { useStore, selectHeaderStats } from '../store'

export function Header() {
  const screen       = useStore(s => s.screen)
  const theme        = useStore(s => s.theme)
  const panelOpen    = useStore(s => s.analyticsPanelOpen)
  const setTheme     = useStore(s => s.setTheme)
  const togglePanel  = useStore(s => s.toggleAnalyticsPanel)
  const resetApp     = useStore(s => s.resetApp)
  const stats        = useStore(selectHeaderStats)

  const dmgLabel = stats.damage > 1000
    ? `$${(stats.damage / 1000).toFixed(1)}B`
    : `$${stats.damage.toFixed(1)}M`

  return (
    <header className="app-header">
      <div className="logo">
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2C14 2,22 8,20 14C18 20,15 18,14 24C13 18,10 20,8 14C6 8,14 2,14 2Z" stroke="#00e5ff" strokeWidth="1.5" fill="none"/>
          <path d="M9 9L19 9M8 13L20 13M10 17L18 17" stroke="#00e5ff" strokeWidth="0.8" opacity="0.5"/>
          <circle cx="14" cy="14" r="2" fill="#00e5ff" opacity="0.5"/>
        </svg>
        <div>
          <div className="logo-text">Tornado Tracker</div>
          <div className="logo-sub">Storm Intelligence System</div>
        </div>
      </div>

      {screen === 'dashboard' && (
        <div className="header-stats">
          <div className="hstat"><div className="hstat-val">{stats.total.toLocaleString()}</div><div className="hstat-label">Events</div></div>
          <div className="hstat"><div className="hstat-val">{stats.maxEF >= 0 ? `EF${stats.maxEF}` : '—'}</div><div className="hstat-label">Max EF</div></div>
          <div className="hstat"><div className="hstat-val">{stats.fatalities.toLocaleString()}</div><div className="hstat-label">Fatalities</div></div>
          <div className="hstat"><div className="hstat-val">{stats.injuries.toLocaleString()}</div><div className="hstat-label">Injuries</div></div>
          <div className="hstat"><div className="hstat-val">{dmgLabel}</div><div className="hstat-label">Damage</div></div>
        </div>
      )}

      <div className="header-right">
        <div className="status-dot" />
        <button className="theme-toggle" onClick={() => {
          const next = theme === 'dark' ? 'light' : 'dark'
          setTheme(next)
          document.body.classList.toggle('light', next === 'light')
        }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {screen === 'dashboard' && (
          <button className={`btn ${panelOpen ? 'btn-active' : ''}`} onClick={togglePanel}>
            ◼ Analytics
          </button>
        )}
        <button className="btn" onClick={resetApp}>New File</button>
      </div>
    </header>
  )
}
