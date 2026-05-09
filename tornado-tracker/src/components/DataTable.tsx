import { useEffect, useRef } from 'react'
import { useStore, selectSorted, selectTotalPages } from '../store'
import { exportFilteredCSV } from '../utils/export'
import type { SortableField } from '../types'
import { PAGE_SIZE } from '../utils/constants'

const COLS: { key: SortableField; label: string }[] = [
  { key: 'id', label: 'ID / Date' },
  { key: 'ef_scale', label: 'EF' },
  { key: 'state', label: 'State' },
  { key: 'county', label: 'County' },
  { key: 'length_miles', label: 'Length' },
  { key: 'fatalities', label: 'Fatal' },
  { key: 'damage_millions', label: 'Damage $M' },
]

function efClass(ef: number | null): string {
  if (ef === null) return 'ef-unknown'
  return `ef-${ef}`
}

export function DataTable() {
  const sorted = useStore(selectSorted)
  const totalPages = useStore(selectTotalPages)
  const page = useStore(s => s.currentPage)
  const sort = useStore(s => s.sort)
  const selectedIdx = useStore(s => s.selectedIdx)
  const allData = useStore(s => s.allData)
  const selectRow = useStore(s => s.selectRow)
  const setPage = useStore(s => s.setPage)
  const setSort = useStore(s => s.setSort)
  const toggleHeat = useStore(s => s.toggleHeatmap)
  const heatActive = useStore(s => s.heatmapActive)

  const selectedRowRef = useRef<HTMLTableRowElement>(null)

  const slice = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const count = sorted.length
  const start = count ? page * PAGE_SIZE + 1 : 0
  const end = Math.min((page + 1) * PAGE_SIZE, count)

  // ── CRITICAL FIX: Auto-jump to page containing selected row ─────────────
  useEffect(() => {
    if (selectedIdx === null) return

    // Find where the selected row is in the SORTED (filtered) array
    const sortedIndex = sorted.findIndex(d => d._idx === selectedIdx)
    if (sortedIndex === -1) return // Not in current filter

    const targetPage = Math.floor(sortedIndex / PAGE_SIZE)
    if (targetPage !== page) {
      setPage(targetPage)
    }
  }, [selectedIdx, sorted, page, setPage])

  // Scroll selected row into view
  useEffect(() => {
    // Small delay to ensure DOM update after page change
    const timer = setTimeout(() => {
      selectedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
    return () => clearTimeout(timer)
  }, [selectedIdx, page])

  return (
    <div className="panel event-log-panel" style={{ height: '100%' }}>
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-title-icon">⊞</span>
          Event Log
        </div>
        <div className="panel-count">{count.toLocaleString()} events</div>
      </div>

      <div className="panel-body" style={{ padding: 0, overflow: 'auto' }}>
        {!count ? (
          <div className="no-data">
            <span className="no-data-icon">⚡</span>
            <span className="label-caps">Awaiting Storm Data</span>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {COLS.map(col => (
                  <th key={col.key}
                    className={sort.col === col.key ? `sorted ${sort.dir}` : ''}
                    onClick={() => setSort(col.key)}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map(d => {
                const isSelected = selectedIdx === d._idx
                return (
                  <tr key={d._idx}
                    ref={isSelected ? selectedRowRef : null}
                    className={isSelected ? 'selected' : ''}
                    onClick={() => selectRow(d._idx)}>
                    <td>
                      <div className="data-tabular">{d.id}</div>
                      <div style={{ color: 'var(--v-on-surface-variant)', fontSize: 11, marginTop: 2 }}>{d.date}</div>
                    </td>
                    <td>
                      <span className={`ef-badge ${efClass(d.ef_scale)}`}>
                        {d.ef_scale !== null ? `EF${d.ef_scale}` : '?'}
                      </span>
                    </td>
                    <td className="data-tabular">{d.state || '—'}</td>
                    <td style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.county}>
                      {d.county || '—'}
                    </td>
                    <td className="data-tabular">{d.length_miles ? `${d.length_miles.toFixed(1)} mi` : '—'}</td>
                    <td className="data-tabular" style={{ color: d.fatalities > 0 ? 'var(--alert-critical)' : 'inherit' }}>
                      {d.fatalities || '—'}
                    </td>
                    <td className="data-tabular">{d.damage_millions ? `$${d.damage_millions.toFixed(2)}M` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination-bar">
          <button className="page-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
          <span className="page-info">{start}–{end} of {count.toLocaleString()}</span>
          <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>›</button>
        </div>
      )}

      <div className="export-bar">
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => exportFilteredCSV(sorted)}>↓ Export CSV</button>
        <button className="btn btn-ghost" onClick={() => (window as any).__fitMapToBounds?.()}>⊹ Fit Map</button>
        <button className={`btn${heatActive ? ' btn-active' : ' btn-ghost'}`} onClick={toggleHeat}>☾ Heatmap</button>
      </div>

      <div className="statusbar">
        <div className="statusbar-item">SYS: <span>{allData.length ? 'ACTIVE' : 'READY'}</span></div>
        <div className="statusbar-item" id="coord-display">LAT — LON —</div>
        <div className="statusbar-item">VER: <span>2.0.0</span></div>
      </div>
    </div>
  )
}