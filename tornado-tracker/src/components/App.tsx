import { useStore } from '../store'
import { Header } from './Header'
import { DropZone } from './DropZone'
import { MapView } from './MapView'
import { AnalyticsPanel } from './AnalyticsPanel'
import { FilterPanel } from './FilterPanel'
import { DataTable } from './DataTable'

export function App() {
  const screen = useStore(s => s.screen)

  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        {screen === 'dashboard' && <Sidebar />}
        <main className="app-main">
          {screen === 'drop' && <DropZone />}
          {screen === 'dashboard' && <Dashboard />}
        </main>
      </div>
      <Footer />
    </div>
  )
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-tool active" title="Reflectivity">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </div>
      <div className="sidebar-tool" title="Velocity">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>
      <div className="sidebar-tool" title="Dual-Pol">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>
      <div className="sidebar-tool" title="Hydrometeor">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 16.2A4.5 4.5 0 0017.5 8h-1.8c-.7-2.3-2.9-4-5.7-4a6 6 0 00-6 6c0 1 .2 2 .6 2.8A4.5 4.5 0 005 21h13a4.5 4.5 0 002-4.8z" />
        </svg>
      </div>
      <div className="sidebar-tool" title="Historical">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <div style={{ flex: 1 }} />
      <div className="sidebar-tool" title="Documentation">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
    </aside>
  )
}

function Dashboard() {
  return (
    <div className="dashboard-grid">
      <FilterPanel />
      <MapView />
      <DataTable />
      <AnalyticsPanel />
    </div>
  )
}

function Footer() {
  const screen = useStore(s => s.screen)
  if (screen !== 'dashboard') return null
  return (
    <footer className="app-footer">
      <div className="app-footer-left">
        <span className="app-footer-brand">Vortex Data</span>
        <span>© 2024 VORTEX DATA INTELLIGENCE. PRECISE. URGENT. AUTHORITATIVE.</span>
      </div>
      <div className="app-footer-links">
        <a href="#">Terms of Service</a>
        <a href="#">Privacy Policy</a>
        <a href="#">NWS Data Source</a>
        <a href="#">API Status</a>
      </div>
    </footer>
  )
}