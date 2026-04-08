import { useRef, useState } from 'react'
import { useStore } from '../store'
import { useCSVLoader } from '../hooks/useCSVLoader'
import { parseRows } from '../utils/parse'
import type { ColumnMapping } from '../types'

const MAPPER_FIELDS = [
  { key: 'start_lat', label: 'Start Latitude', req: true },
  { key: 'start_lon', label: 'Start Longitude', req: true },
  { key: 'id', label: 'Tornado ID' }, { key: 'date', label: 'Date' },
  { key: 'state', label: 'State' }, { key: 'county', label: 'County' },
  { key: 'yr', label: 'Year' }, { key: 'mo', label: 'Month' },
  { key: 'ef_scale', label: 'EF/F Scale' }, { key: 'end_lat', label: 'End Latitude' },
  { key: 'end_lon', label: 'End Longitude' }, { key: 'length_miles', label: 'Length (mi)' },
  { key: 'width_yards', label: 'Width (yd)' }, { key: 'injuries', label: 'Injuries' },
  { key: 'fatalities', label: 'Fatalities' }, { key: 'damage_millions', label: 'Damage ($M)' },
]

const EF_DOTS = [
  { color: '#4caf50', label: 'EF0' }, { color: '#80ecf1', label: 'EF1' },
  { color: '#eeff00', label: 'EF2' }, { color: '#f4a836', label: 'EF3' },
  { color: '#b02727', label: 'EF4' }, { color: '#fa01d0', label: 'EF5' },
]

export function DropZone() {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { loading, loadingText, parseFiles } = useCSVLoader()
  const storeLoad = useStore(s => s.loadData)

  const [mapperOpen, setMapperOpen] = useState(false)
  const [mapperHeaders, setMapperHeaders] = useState<string[]>([])
  const [mapperMapping, setMapperMapping] = useState<ColumnMapping>({})
  const [pendingRows, setPendingRows] = useState<Record<string, string>[]>([])
  // Controlled selects
  const [selectValues, setSelectValues] = useState<Record<string, string>>({})

  async function handleFiles(files: File[]) {
    const result = await parseFiles(files)
    if (!result) return
    if (result.needsMapper) {
      setMapperHeaders(result.headers)
      setMapperMapping(result.mapping)
      setPendingRows(result.rows)
      // Pre-fill select values from detected mapping
      const vals: Record<string, string> = {}
      MAPPER_FIELDS.forEach(f => { vals[f.key] = result.mapping[f.key] ?? '' })
      setSelectValues(vals)
      setMapperOpen(true)
    } else {
      storeLoad(result.data, result.headers, result.rows, result.mapping)
    }
  }

  function applyMapping() {
    const updated: ColumnMapping = {}
    MAPPER_FIELDS.forEach(f => { if (selectValues[f.key]) updated[f.key] = selectValues[f.key] })
    const data = parseRows(pendingRows, updated)
    storeLoad(data, mapperHeaders, pendingRows, updated)
    setMapperOpen(false)
  }

  return (
    <>
      {loading && (
        <div className="loading-overlay show">
          <div className="spinner" />
          <div className="loading-text">{loadingText}</div>
        </div>
      )}

      {mapperOpen && (
        <div className="mapper-overlay show">
          <div className="mapper-card">
            <div className="mapper-title">⚡ Column Mapping</div>
            <div className="mapper-sub">Map your CSV headers to required fields. Latitude &amp; Longitude are required.</div>
            {MAPPER_FIELDS.map(f => (
              <div className="mapper-row" key={f.key}>
                <div className={`mapper-label${f.req ? '' : ' opt'}`}>{f.req ? '* ' : ''}{f.label}</div>
                <select
                  className="mapper-select"
                  value={selectValues[f.key] ?? ''}
                  onChange={e => setSelectValues(v => ({ ...v, [f.key]: e.target.value }))}
                >
                  <option value="">— skip —</option>
                  {mapperHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={applyMapping}>
                Apply &amp; Visualize
              </button>
              <button className="btn" onClick={() => setMapperOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="drop-overlay" >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 6, color: 'var(--accent)', textTransform: 'uppercase' }}>
          NOAA Storm Intelligence Platform
        </div>
        <div
          className={`drop-zone${dragOver ? ' drag-over' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false)
            handleFiles([...e.dataTransfer.files].filter(f => f.name.endsWith('.csv')))
          }}
        >
          <div className="corner tl" /><div className="corner tr" />
          <div className="corner bl" /><div className="corner br" />
          <div style={{ fontSize: 48 }}>🌪️</div>
          <div className="drop-title">Drop CSV File Here</div>
          <div className="drop-sub">Drag &amp; drop your tornado data file<br />or click to browse</div>
          <div className="drop-tags">
            {['NOAA SPC', 'Storm Events DB', 'Custom CSV'].map(t => (
              <span key={t} className="drop-tag">{t}</span>
            ))}
          </div>
        </div>
        <input
          ref={fileInputRef} type="file" accept=".csv" multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles([...e.target.files!].filter(f => f.name.endsWith('.csv')))}
        />
        <div className="multi-file-hint">
          Hold <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> to select multiple CSV files
        </div>
        <div className="intro-legend">
          {EF_DOTS.map(({ color, label }) => (
            <div key={label} className="ef-dot">
              <div className="ef-dot-c" style={{ background: color }} />{label}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
