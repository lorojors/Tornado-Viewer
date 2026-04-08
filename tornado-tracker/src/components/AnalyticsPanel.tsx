import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { useStore, selectFiltered } from '../store'
import { detectOutbreaks } from '../utils/outbreak'
import { EF_COLORS, MONTHS } from '../utils/constants'
import type { AnalyticsTab, TornadoEvent } from '../types'
import { usePlayback } from '../hooks/usePlayback'

Chart.register(...registerables)

// ─── Chart theme helpers ──────────────────────────────────────────────────────
function isDark() { return !document.body.classList.contains('light') }
function tc() { return isDark() ? '#919191' : '#5a5a5a' }
function gc() { return isDark() ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }
function barOpts(title: string, horizontal = false) {
  return {
    indexAxis: (horizontal ? 'y' : 'x') as 'x' | 'y',
    responsive: true, maintainAspectRatio: false, animation: { duration: 200 },
    plugins: { legend: { display: false }, title: { display: true, text: title, color: tc(), font: { family: "'Share Tech Mono',monospace", size: 11 }, padding: { bottom: 6 } } },
    scales: { x: { ticks: { color: tc(), font: { size: 10 } }, grid: { color: gc() } }, y: { ticks: { color: tc(), font: { size: 10 } }, grid: { color: gc() }, beginAtZero: true } },
  }
}
function lineOpts(title: string) {
  return {
    responsive: true, maintainAspectRatio: false, animation: { duration: 200 },
    plugins: { legend: { display: false }, title: { display: true, text: title, color: tc(), font: { family: "'Share Tech Mono',monospace", size: 11 }, padding: { bottom: 6 } } },
    scales: { x: { ticks: { color: tc(), font: { size: 9 }, maxRotation: 45 }, grid: { color: gc() } }, y: { ticks: { color: tc(), font: { size: 9 } }, grid: { color: gc() }, beginAtZero: true } },
  }
}

// Per-canvas chart ref hook
function useChartRef(id: string) {
  const ref = useRef<Chart | null>(null)
  function render(type: 'bar' | 'line', data: object, options: object) {
    if (ref.current) { ref.current.destroy(); ref.current = null }
    const canvas = document.getElementById(id) as HTMLCanvasElement | null
    if (!canvas) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ref.current = new Chart(canvas, { type, data, options } as any)
  }
  useEffect(() => () => { ref.current?.destroy() }, [])
  return render
}

// ─── Charts tab ───────────────────────────────────────────────────────────────
function ChartsTab() {
  const data   = useStore(selectFiltered)
  const theme  = useStore(s => s.theme)
  const renderEF  = useChartRef('chart-ef')
  const renderMon = useChartRef('chart-month')
  const renderSt  = useChartRef('chart-state')
  const renderFat = useChartRef('chart-fat')

  useEffect(() => {
    const efCounts = [0,1,2,3,4,5].map(ef => data.filter(d => d.ef_scale === ef).length)
    const unknown  = data.filter(d => d.ef_scale === null).length
    renderEF('bar', { labels: ['EF0','EF1','EF2','EF3','EF4','EF5','EF?'], datasets: [{ label: 'Events', data: [...efCounts, unknown], backgroundColor: ['#4caf50','#80ecf1','#eeff00','#f4a836','#b02727','#fa01d0','#7a9ab8'], borderWidth: 0 }] }, barOpts('Events by EF Scale'))
    renderMon('bar', { labels: MONTHS, datasets: [{ label: 'Events', data: Array.from({ length: 12 }, (_, i) => data.filter(d => d.mo === i + 1).length), backgroundColor: 'rgba(147,147,147,.55)', borderColor: 'rgba(147,147,147,.9)', borderWidth: 1 }] }, barOpts('Events by Month'))
    const stMap: Record<string, number> = {}
    data.forEach(d => { if (d.state) stMap[d.state] = (stMap[d.state] || 0) + 1 })
    const top10 = Object.entries(stMap).sort((a,b) => b[1]-a[1]).slice(0,10)
    renderSt('bar', { labels: top10.map(s => s[0]), datasets: [{ label: 'Events', data: top10.map(s => s[1]), backgroundColor: 'rgba(147,147,147,.55)', borderColor: 'rgba(147,147,147,.9)', borderWidth: 1 }] }, barOpts('Top 10 States', true))
    renderFat('bar', { labels: ['EF0','EF1','EF2','EF3','EF4','EF5'], datasets: [{ label: 'Fatalities', data: [0,1,2,3,4,5].map(ef => data.filter(d => d.ef_scale === ef).reduce((s,d) => s + d.fatalities, 0)), backgroundColor: ['#4caf50','#80ecf1','#eeff00','#f4a836','#b02727','#fa01d0'], borderWidth: 0 }] }, barOpts('Fatalities by EF Scale'))
  // theme dependency re-runs charts when dark/light changes so colours update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, theme])

  usePlayback()
  const allData       = useStore(s => s.allData)
  const playbackActive  = useStore(s => s.playbackActive)
  const playbackDateIdx = useStore(s => s.playbackDateIdx)
  const playbackDates   = useStore(s => s.playbackDates)
  const playbackSpeed   = useStore(s => s.playbackSpeed)
  const startPlayback   = useStore(s => s.startPlayback)
  const stopPlayback    = useStore(s => s.stopPlayback)
  const setSpeed        = useStore(s => s.setPlaybackSpeed)

  return (
    <>
      <div className="a2-chart-wrap"><canvas id="chart-ef" /></div>
      <div className="a2-chart-wrap"><canvas id="chart-month" /></div>
      <div className="a2-chart-wrap tall"><canvas id="chart-state" /></div>
      <div className="a2-chart-wrap"><canvas id="chart-fat" /></div>
      <div className="a2-playback-section">
        <div className="a2-playback-label">// Timeline Playback</div>
        <div className="a2-playback-date">{playbackDates[playbackDateIdx] ?? '—'}</div>
        <div className="a2-playback-controls">
          <button className="btn" disabled={playbackActive}
            onClick={() => startPlayback([...new Set(allData.map(d => d.date).filter(Boolean))].sort())}>
            ▶ Play
          </button>
          <button className="btn" disabled={!playbackActive} onClick={stopPlayback}>■ Stop</button>
          {[1,2,4,8].map(s => (
            <button key={s} className={`a2-speed-btn${playbackSpeed === s ? ' active' : ''}`}
              onClick={() => setSpeed(s)}>{s}×</button>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Outbreaks tab ────────────────────────────────────────────────────────────
function OutbreaksTab() {
  const data      = useStore(selectFiltered)
  const outbreaks = detectOutbreaks(data).sort((a,b) => b.count - a.count)
  // For highlight: temporarily override filteredData via store
  const setFilters = useStore(s => s.setFilters)

  if (!outbreaks.length) return (
    <div className="a2-empty">
      No outbreaks in current filter.
      <span className="a2-empty-sub">An outbreak requires ≥6 tornadoes within 48 hours.</span>
    </div>
  )
  return (
    <>
      {outbreaks.map(ob => {
        const color = EF_COLORS[ob.maxEF] ?? '#7a9ab8'
        const dmg = ob.totalDmg > 1000 ? `$${(ob.totalDmg/1000).toFixed(1)}B` : `$${ob.totalDmg.toFixed(1)}M`
        const dateLabel = ob.startDate === ob.endDate ? ob.startDate : `${ob.startDate} → ${ob.endDate}`
        return (
          <div key={ob.id} className="a2-outbreak-card"
            onClick={() => setFilters({ dateFrom: ob.startDate, dateTo: ob.endDate })}>
            <div className="a2-ob-header">
              <span className="a2-ob-badge" style={{ background: color }}>MAX EF{ob.maxEF >= 0 ? ob.maxEF : '?'}</span>
              <span className="a2-ob-count">{ob.count} tornadoes</span>
              <span className="a2-ob-date">{dateLabel}</span>
            </div>
            <div className="a2-ob-stats">
              <div className="a2-ob-stat"><span className="a2-ob-stat-val">{ob.totalFat}</span><span className="a2-ob-stat-lbl">fatalities</span></div>
              <div className="a2-ob-stat"><span className="a2-ob-stat-val">{ob.totalInj}</span><span className="a2-ob-stat-lbl">injuries</span></div>
              <div className="a2-ob-stat"><span className="a2-ob-stat-val">{dmg}</span><span className="a2-ob-stat-lbl">damage</span></div>
            </div>
            <div className="a2-ob-states">
              {ob.states.slice(0,8).join(' · ')}{ob.states.length > 8 ? ` +${ob.states.length-8} more` : ''}
            </div>
          </div>
        )
      })}
    </>
  )
}

// ─── Trends tab ───────────────────────────────────────────────────────────────
function TrendsTab() {
  const allData  = useStore(s => s.allData)
  const theme    = useStore(s => s.theme)
  const renderCount = useChartRef('chart-trend')
  const renderFat   = useChartRef('chart-trend-fat')
  const renderDmg   = useChartRef('chart-trend-dmg')

  useEffect(() => {
    const ym: Record<string, { count: number; fat: number; dmg: number }> = {}
    allData.forEach(d => {
      if (!d.yr) return
      const k = String(d.yr)
      if (!ym[k]) ym[k] = { count: 0, fat: 0, dmg: 0 }
      ym[k].count++; ym[k].fat += d.fatalities; ym[k].dmg += d.damage_millions
    })
    const years = Object.keys(ym).sort(); if (!years.length) return
    const pts = years.length > 40 ? 0 : 3
    const mk = (key: 'count'|'fat'|'dmg', color: string, bg: string) => ({
      label: key, data: years.map(y => ym[y][key]),
      borderColor: color, backgroundColor: bg, tension: .3, fill: true, pointRadius: pts,
    })
    renderCount('line', { labels: years, datasets: [mk('count','#919191','rgba(145,145,145,.1)')] }, lineOpts('Events per Year'))
    renderFat('line',   { labels: years, datasets: [mk('fat','#b02727','rgba(176,39,39,.1)')] },   lineOpts('Fatalities per Year'))
    renderDmg('line',   { labels: years, datasets: [mk('dmg','#f4a836','rgba(244,168,54,.1)')] },  lineOpts('Damage per Year ($M)'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allData, theme])

  return (
    <>
      <div className="a2-section-label">Events per year</div>
      <div className="a2-chart-wrap tall"><canvas id="chart-trend" /></div>
      <div className="a2-section-label">Fatalities per year</div>
      <div className="a2-chart-wrap tall"><canvas id="chart-trend-fat" /></div>
      <div className="a2-section-label">Damage per year ($M)</div>
      <div className="a2-chart-wrap tall"><canvas id="chart-trend-dmg" /></div>
    </>
  )
}

// ─── Compare tab ──────────────────────────────────────────────────────────────
function CompareTab() {
  const filtered  = useStore(selectFiltered)
  const snapshot  = useStore(s => s.compareSnapshot)
  const take      = useStore(s => s.takeSnapshot)
  const clear     = useStore(s => s.clearSnapshot)
  const theme     = useStore(s => s.theme)
  const renderCmp = useChartRef('chart-compare')

  const A = snapshot?.data ?? []
  const B = filtered

  function stats(arr: TornadoEvent[]) {
    return {
      count: arr.length,
      maxEF: arr.length ? Math.max(...arr.map(d => d.ef_scale ?? -1)) : -1,
      fat:   arr.reduce((s,d) => s+d.fatalities, 0),
      inj:   arr.reduce((s,d) => s+d.injuries, 0),
      dmg:   arr.reduce((s,d) => s+d.damage_millions, 0),
      avgLen: arr.length ? arr.reduce((s,d) => s+d.length_miles, 0) / arr.length : 0,
    }
  }

  useEffect(() => {
    if (!A.length) return
    const efA = [0,1,2,3,4,5].map(ef => A.filter(d => d.ef_scale === ef).length)
    const efB = [0,1,2,3,4,5].map(ef => B.filter(d => d.ef_scale === ef).length)
    renderCmp('bar', {
      labels: ['EF0','EF1','EF2','EF3','EF4','EF5'],
      datasets: [
        { label: 'Dataset A', data: efA, backgroundColor: 'rgba(145,145,145,.6)', borderWidth: 0 },
        { label: 'Dataset B', data: efB, backgroundColor: 'rgba(176,39,39,.6)',   borderWidth: 0 },
      ],
    }, { ...barOpts('EF Distribution Comparison'), plugins: { ...barOpts('EF Distribution Comparison').plugins, legend: { display: true, labels: { color: tc(), font: { size: 10 } } } } })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [A, B, theme])

  const sa = stats(A), sb = stats(B)
  const fmtN   = (v: number) => v.toLocaleString()
  const fmtEF  = (v: number) => v >= 0 ? `EF${v}` : '—'
  const fmtDmg = (v: number) => v > 1000 ? `$${(v/1000).toFixed(1)}B` : `$${v.toFixed(1)}M`
  const fmtLen = (v: number) => `${v.toFixed(2)} mi`

  function Row({ label, va, vb, fmt }: { label: string; va: number; vb: number; fmt: (v:number)=>string }) {
    const d = vb - va
    return (
      <tr>
        <td className="a2-cmp-label">{label}</td>
        <td className="a2-cmp-a">{fmt(va)}</td>
        <td className="a2-cmp-b">{fmt(vb)}</td>
        <td><span className={`a2-diff${d > 0 ? ' pos' : d < 0 ? ' neg' : ''}`}>{d > 0 ? '+' : ''}{fmt(d)}</span></td>
      </tr>
    )
  }

  return (
    <>
      <div className="a2-compare-actions">
        <button className="btn btn-primary" onClick={() => take(filtered)}>▶ Snapshot A</button>
        <button className="btn" onClick={clear}>Clear</button>
      </div>
      <div className="a2-snapshot-info">
        <strong>Dataset A:</strong> {snapshot?.label ?? '— none —'}
      </div>
      {A.length ? (
        <table className="a2-cmp-table">
          <thead><tr>
            <th></th>
            <th style={{ color: 'var(--text-secondary)' }}>A</th>
            <th style={{ color: 'var(--text-primary)' }}>B (live)</th>
            <th>Δ</th>
          </tr></thead>
          <tbody>
            <Row label="Events"     va={sa.count}  vb={sb.count}  fmt={fmtN} />
            <Row label="Max EF"     va={sa.maxEF}  vb={sb.maxEF}  fmt={fmtEF} />
            <Row label="Fatalities" va={sa.fat}    vb={sb.fat}    fmt={fmtN} />
            <Row label="Injuries"   va={sa.inj}    vb={sb.inj}    fmt={fmtN} />
            <Row label="Damage"     va={sa.dmg}    vb={sb.dmg}    fmt={fmtDmg} />
            <Row label="Avg length" va={sa.avgLen} vb={sb.avgLen} fmt={fmtLen} />
          </tbody>
        </table>
      ) : (
        <div className="a2-empty">Apply filters, then click Snapshot A.<br />Adjust filters for Dataset B.</div>
      )}
      <div className="a2-chart-wrap tall"><canvas id="chart-compare" /></div>
    </>
  )
}

// ─── Root panel ───────────────────────────────────────────────────────────────
const TABS: { key: AnalyticsTab; label: string }[] = [
  { key: 'charts',    label: 'Charts'    },
  { key: 'outbreaks', label: 'Outbreaks' },
  { key: 'trends',    label: 'Trends'    },
  { key: 'compare',   label: 'Compare'   },
]

export function AnalyticsPanel() {
  const open     = useStore(s => s.analyticsPanelOpen)
  const tab      = useStore(s => s.analyticsTab)
  const setTab   = useStore(s => s.setAnalyticsTab)
  const toggle   = useStore(s => s.toggleAnalyticsPanel)

  return (
    <div className={`analytics-panel${open ? ' open' : ''}`}>
      <div className="a2-panel-header">
        <div className="a2-panel-title">// Analytics</div>
        <button className="a2-panel-close" onClick={toggle}>✕</button>
      </div>
      <div className="a2-tabs">
        {TABS.map(t => (
          <button key={t.key}
            className={`a2-tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>
      <div className={`a2-tab-pane${tab === 'charts'    ? ' active' : ''}`}><ChartsTab /></div>
      <div className={`a2-tab-pane${tab === 'outbreaks' ? ' active' : ''}`}><OutbreaksTab /></div>
      <div className={`a2-tab-pane${tab === 'trends'    ? ' active' : ''}`}><TrendsTab /></div>
      <div className={`a2-tab-pane${tab === 'compare'   ? ' active' : ''}`}><CompareTab /></div>
    </div>
  )
}
