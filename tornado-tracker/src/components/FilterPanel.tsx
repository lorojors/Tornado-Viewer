import { useStore } from '../store'
import { MONTHS } from '../utils/constants'

export function FilterPanel() {
  const filters = useStore(s => s.filters)
  const setFilter = useStore(s => s.setFilter)
  const setFilters = useStore(s => s.setFilters)
  const resetFilters = useStore(s => s.resetApp) // resetApp clears everything
  const allData = useStore(s => s.allData)
  const setEfFilter = useStore(s => s.setEfFilter)

  const states = [...new Set(allData.map(d => d.state).filter(Boolean))].sort()

  const efToggles = [0, 1, 2, 3, 4, 5]
  const activeEF = filters.ef

  return (
    <div className="panel" style={{ height: '100%' }}>
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-title-icon">▽</span>
          Parameters
        </div>
      </div>

      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Temporal Range */}
        <div>
          <div className="label-caps" style={{ marginBottom: 10 }}>Temporal Range</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="date"
              className="input"
              value={filters.dateFrom || ''}
              onChange={e => setFilters({ dateFrom: e.target.value })}
              style={{ flex: 1 }}
            />
            <span style={{ color: 'var(--v-on-surface-variant)' }}>→</span>
            <input
              type="date"
              className="input"
              value={filters.dateTo || ''}
              onChange={e => setFilters({ dateTo: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>
        </div>

        {/* EF Scale Intensity */}
        <div>
          <div className="label-caps" style={{ marginBottom: 10 }}>EF Scale Intensity</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              className={`btn ${activeEF === 'ALL' ? 'btn-active' : 'btn-ghost'}`}
              onClick={() => setEfFilter('ALL')}
              style={{ minWidth: 44, padding: '8px 12px' }}
            >
              ALL
            </button>
            {efToggles.map(ef => (
              <button
                key={ef}
                className={`btn ${activeEF === String(ef) ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setEfFilter(String(ef) as any)}
                style={{ minWidth: 44, padding: '8px 12px' }}
              >
                EF{ef}
              </button>
            ))}
          </div>
        </div>

        {/* Geographic Region */}
        <div>
          <div className="label-caps" style={{ marginBottom: 10 }}>Geographic Region</div>
          <select
            className="input"
            value={filters.state || ''}
            onChange={e => setFilter('state', e.target.value || '')}
            style={{ width: '100%' }}
          >
            <option value="">All Regions</option>
            {states.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Month filter */}
        <div>
          <div className="label-caps" style={{ marginBottom: 10 }}>Month</div>
          <select
            className="input"
            value={filters.month || ''}
            onChange={e => setFilter('month', e.target.value || '')}
            style={{ width: '100%' }}
          >
            <option value="">All Months</option>
            {MONTHS.map((m, i) => (
              <option key={i} value={String(i + 1)}>{m}</option>
            ))}
          </select>
        </div>

        {/* Year filter */}
        <div>
          <div className="label-caps" style={{ marginBottom: 10 }}>Year</div>
          <input
            type="text"
            className="input"
            placeholder="e.g. 2011"
            value={filters.year || ''}
            onChange={e => setFilter('year', e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* Search */}
        <div>
          <div className="label-caps" style={{ marginBottom: 10 }}>Search</div>
          <input
            type="text"
            className="input"
            placeholder="ID, state, county..."
            value={filters.search || ''}
            onChange={e => setFilter('search', e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <button className="btn btn-ghost" onClick={resetFilters} style={{ marginTop: 'auto' }}>
          ↺ Reset Filters
        </button>
      </div>
    </div>
  )
}