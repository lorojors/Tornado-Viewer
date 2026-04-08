/**
 * FilterPanel.tsx
 * All filter controls: search, state/county, month/year, date range, EF buttons.
 * Reads from and writes to the Zustand store only — no local state needed.
 */
import { useStore, selectUniqueStates, selectUniqueCounties, selectUniqueMonths, selectUniqueYears } from '../store'
import { MONTHS } from '../utils/constants'
import type { EfFilter } from '../types'

const EF_BTNS: EfFilter[] = ['ALL', '0', '1', '2', '3', '4', '5']

export function FilterPanel() {
  const filters    = useStore(s => s.filters)
  const setFilter  = useStore(s => s.setFilter)
  const setEf      = useStore(s => s.setEfFilter)
  const clearDates = useStore(s => s.clearDateRange)
  const states     = useStore(selectUniqueStates)
  const counties   = useStore(s => selectUniqueCounties(s, filters.state))
  const months     = useStore(selectUniqueMonths)
  const years      = useStore(selectUniqueYears)

  return (
    <div className="filters">
      <input
        className="filter-input"
        placeholder="Search state, ID, date, county…"
        value={filters.search}
        onChange={e => setFilter('search', e.target.value)}
      />

      <div className="filter-row">
        <select className="filter-select" value={filters.state}
          onChange={e => { setFilter('state', e.target.value); setFilter('county', '') }}>
          <option value="">All States</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={filters.county}
          onChange={e => setFilter('county', e.target.value)}>
          <option value="">All Counties</option>
          {counties.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="filter-row">
        <select className="filter-select" value={filters.month}
          onChange={e => setFilter('month', e.target.value)}>
          <option value="">All Months</option>
          {months.map(m => <option key={m} value={String(m)}>{MONTHS[m - 1]}</option>)}
        </select>
        <select className="filter-select" value={filters.year}
          onChange={e => setFilter('year', e.target.value)}>
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </div>

      <div className="date-range-row">
        <div className="date-range-label">// Date Range</div>
        <div className="date-range-inputs">
          <input
            className="filter-input date-input" type="date"
            value={filters.dateFrom}
            onChange={e => setFilter('dateFrom', e.target.value)}
          />
          <span className="date-sep">→</span>
          <input
            className="filter-input date-input" type="date"
            value={filters.dateTo}
            onChange={e => setFilter('dateTo', e.target.value)}
          />
          <button className="date-clear-btn" onClick={clearDates}>✕</button>
        </div>
      </div>

      <div className="ef-filter-btns">
        {EF_BTNS.map(ef => (
          <button
            key={ef}
            className={`ef-btn${filters.ef === ef ? ' active' : ''}`}
            data-ef={ef}
            onClick={() => setEf(ef)}
          >
            {ef === 'ALL' ? 'ALL' : `EF${ef}`}
          </button>
        ))}
      </div>
    </div>
  )
}
