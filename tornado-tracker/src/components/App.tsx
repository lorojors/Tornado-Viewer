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
    <>
      <Header />
      <div className="main">
        {screen === 'drop' &&  <DropZone />}
        {screen === 'dashboard' && (
          <>
            <MapView />
            <AnalyticsPanel />
            <div className="data-panel">
              <FilterPanel />
              <DataTable />
            </div>
          </>
        )}
      </div>
    </>
  )
}
