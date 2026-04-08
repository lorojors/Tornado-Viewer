import { useEffect, useRef } from 'react'
import { useStore, selectSorted, selectTotalPages } from '../store'
import { getEfColor } from '../utils/constants'
import { exportFilteredCSV } from '../utils/export'
import type { SortableField } from '../types'
import { PAGE_SIZE } from '../utils/constants'

const COLS: { key: SortableField; label: string }[] = [
  { key: 'id',              label: 'ID / Date'  },
  { key: 'ef_scale',        label: 'EF'         },
  { key: 'state',           label: 'State'      },
  { key: 'county',          label: 'County'     },
  { key: 'length_miles',    label: 'Length'     },
  { key: 'fatalities',      label: 'Fatal'      },
  { key: 'damage_millions', label: 'Damage $M'  },
]

export function DataTable() {
  const sorted        = useStore(selectSorted)
  const totalPages    = useStore(selectTotalPages)
  const page          = useStore(s => s.currentPage)
  const sort          = useStore(s => s.sort)
  const selectedIdx   = useStore(s => s.selectedIdx)
  const allData       = useStore(s => s.allData)
  const selectRow     = useStore(s => s.selectRow)
  const setPage       = useStore(s => s.setPage)
  const setSort       = useStore(s => s.setSort)
  const toggleCluster = useStore(s => s.toggleClustering)
  const useClustering = useStore(s => s.useClustering)
  const toggleHeat    = useStore(s => s.toggleHeatmap)
  const heatActive    = useStore(s => s.heatmapActive)

  const selectedRowRef = useRef<HTMLTableRowElement>(null)

  const slice = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const count = sorted.length
  const start = count ? page * PAGE_SIZE + 1 : 0
  const end   = Math.min((page + 1) * PAGE_SIZE, count)

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedIdx])

  return (
    <>
      <div className="panel-header">
        <div className="panel-title">Storm Events</div>
        <div className="panel-count">{count.toLocaleString()} event{count !== 1 ? 's' : ''}</div>
      </div>

      <div className="table-wrap">
        {!count ? (
          <div className="no-data"><span>⚡</span><span>AWAITING STORM DATA</span></div>
        ) : (
          <table>
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
                const color = getEfColor(d.ef_scale)
                const isSelected = selectedIdx === d._idx
                return (
                  <tr key={d._idx}
                    ref={isSelected ? selectedRowRef : null}
                    className={isSelected ? 'selected' : ''}
                    onClick={() => selectRow(d._idx)}>
                    <td className="td-id">
                      {d.id}<br />
                      <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>{d.date}</span>
                    </td>
                    <td>
                      <span className="ef-badge" style={{ background: color, color: d.ef_scale === 1 ? '#111' : '#000' }}>
                        {d.ef_scale !== null ? `EF${d.ef_scale}` : '?'}
                      </span>
                    </td>
                    <td>{d.state || '—'}</td>
                    <td style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.county}>
                      {d.county || '—'}
                    </td>
                    <td>{d.length_miles ? `${d.length_miles.toFixed(1)} mi` : '—'}</td>
                    <td style={{ color: d.fatalities > 0 ? '#f44336' : 'inherit' }}>
                      {d.fatalities || '—'}
                    </td>
                    <td>{d.damage_millions ? `$${d.damage_millions.toFixed(2)}M` : '—'}</td>
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
        <button className="btn" style={{ flex: 1 }} onClick={() => exportFilteredCSV(sorted)}>↓ Export CSV</button>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <button className="btn" onClick={() => (window as any).__fitMapToBounds?.()}>⊹ Fit Map</button>
        <button className={`btn${heatActive ? ' btn-active' : ''}`} onClick={toggleHeat}>☾ Heatmap</button>
        <button className={`btn${useClustering ? ' btn-active' : ''}`} onClick={toggleCluster}>■ Cluster</button>
      </div>

      <div className="statusbar">
        <div className="statusbar-item">SYS: <span>{allData.length ? 'ACTIVE' : 'READY'}</span></div>
        <div className="statusbar-item" id="coord-display">LAT — LON —</div>
        <div className="statusbar-item">VER: <span>2.0.0</span></div>
      </div>
    </>
  )
}
