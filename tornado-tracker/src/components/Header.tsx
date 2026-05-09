import { useStore, selectHeaderStats } from '../store'

export function Header() {
  const screen = useStore(s => s.screen)
  const theme = useStore(s => s.theme)
  const panelOpen = useStore(s => s.analyticsPanelOpen)
  const setTheme = useStore(s => s.setTheme)
  const togglePanel = useStore(s => s.toggleAnalyticsPanel)
  const resetApp = useStore(s => s.resetApp)
  const stats = useStore(selectHeaderStats)

  const dmgLabel = stats.damage > 1000
    ? `$${(stats.damage / 1000).toFixed(1)}B`
    : `$${stats.damage.toFixed(1)}M`

  return (
    <header className="top-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <div className="nav-brand" onClick={resetApp}>
          <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2C14 2,22 8,20 14C18 20,15 18,14 24C13 18,10 20,8 14C6 8,14 2,14 2Z" stroke="#00dce5" strokeWidth="1.5" fill="none"/>
            <path d="M9 9L19 9M8 13L20 13M10 17L18 17" stroke="#00dce5" strokeWidth="0.8" opacity="0.5"/>
            <circle cx="14" cy="14" r="2" fill="#00dce5" opacity="0.5"/>
          </svg>
          <span>Vortex Data</span>
        </div>

        {screen === 'dashboard' && (
          <nav className="nav-links">
            <button className="nav-link active">Radar</button>
            <button className="nav-link" onClick={togglePanel}>Analysis</button>
            <button className="nav-link" onClick={resetApp}>Datasets</button>
            <button className="nav-link">Alerts</button>
          </nav>
        )}
      </div>

      {screen === 'dashboard' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div className="label-caps" style={{ marginBottom: 4 }}>Events</div>
            <div className="data-tabular" style={{ color: 'var(--v-primary-fixed-dim)', fontSize: 16 }}>
              {stats.total.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="label-caps" style={{ marginBottom: 4 }}>Max EF</div>
            <div className="data-tabular" style={{ color: 'var(--v-primary-fixed-dim)', fontSize: 16 }}>
              {stats.maxEF >= 0 ? `EF${stats.maxEF}` : '—'}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="label-caps" style={{ marginBottom: 4 }}>Fatalities</div>
            <div className="data-tabular" style={{ color: 'var(--alert-critical)', fontSize: 16 }}>
              {stats.fatalities.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="label-caps" style={{ marginBottom: 4 }}>Damage</div>
            <div className="data-tabular" style={{ color: 'var(--v-on-surface)', fontSize: 16 }}>
              {dmgLabel}
            </div>
          </div>
        </div>
      )}

      <div className="nav-actions">
        {screen === 'dashboard' && (
          <>
            <button 
              className={`btn btn-ghost${panelOpen ? ' btn-active' : ''}`} 
              onClick={togglePanel}
            >
              <span style={{ fontSize: 10 }}>◼</span> Analytics
            </button>
            <button className="btn btn-primary" onClick={resetApp}>
              New File
            </button>
          </>
        )}
        {screen === 'drop' && (
          <button className="btn btn-primary">
            Analyze Dataset
          </button>
        )}
        <button 
          className="btn btn-ghost" 
          onClick={() => {
            const next = theme === 'dark' ? 'light' : 'dark'
            setTheme(next)
            document.body.classList.toggle('light', next === 'light')
          }}
          title="Toggle theme"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  )
}