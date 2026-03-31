/**
 * analytics.js — Tornado Tracker Phase 2
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This module extends the core app (script.js) with six analytics features.
 * It reads from the global `filteredData` / `allData` arrays maintained by
 * script.js and exposes its own globals (prefixed `A2_`) to avoid collisions.
 *
 * Features implemented
 * ──────────────────────────────────────────────────────────────────────────
 * 1. Stats Dashboard Panel    — Charts for EF, month, state, damage trends
 * 2. Outbreak Detection        — Cluster events by date proximity (≥6 in ±48 h)
 * 3. Density Heatmap Layer     — Leaflet.heat toggled over the map
 * 4. Timeline Playback         — Animated chronological playback with controls
 * 5. Trend Analysis            — Year-over-year event/fatality/damage lines
 * 6. Comparison Mode           — Two independent filtered datasets side-by-side
 *
 * Dependencies (loaded in index.html before this file)
 * ──────────────────────────────────────────────────────────────────────────
 *   Chart.js    — https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js
 *   Leaflet.heat — https://unpkg.com/leaflet.heat/dist/leaflet-heat.js
 *
 * Integration points in index.html
 * ──────────────────────────────────────────────────────────────────────────
 *   #analytics-panel          — the collapsible side panel container
 *   #analyticsToggleBtn       — header button that shows/hides the panel
 *   #chart-ef                 — canvas for EF distribution bar chart
 *   #chart-month              — canvas for events-by-month bar chart
 *   #chart-state              — canvas for top-10 states bar chart
 *   #chart-trend              — canvas for year-over-year trend line
 *   #outbreak-list            — div where outbreak cards are injected
 *   #playback-bar             — the playback controls toolbar
 *   #playback-date-label      — current playback date readout
 *   #compare-panel            — the comparison mode panel
 *   #compare-snapshot-label   — label showing what snapshot A is
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ─── Module state ─────────────────────────────────────────────────────────────

const A2 = {
  // Chart instances (Chart.js) — kept so they can be destroyed on refresh
  charts: {},

  // Heatmap
  heatLayer: null,
  heatActive: false,

  // Playback
  playback: {
    active: false,
    timer: null,
    index: 0,        // current position in the sorted unique-date array
    dates: [],       // sorted unique date strings from filteredData
    speed: 1,        // multiplier: 1 = 400 ms/step, 2 = 200 ms, 0.5 = 800 ms
  },

  // Comparison mode
  compare: {
    active: false,
    snapshotData: [], // frozen copy of filteredData at the moment "snapshot" was taken
    snapshotLabel: '',
  },

  // Outbreak cache
  outbreaks: [],

  // Panel open state
  panelOpen: false,
  activeTab: 'charts', // 'charts' | 'outbreaks' | 'trends' | 'compare'
};

// ─── 1. PANEL TOGGLE ─────────────────────────────────────────────────────────

/**
 * Toggle the analytics side panel open/closed.
 * Called by #analyticsToggleBtn in the header.
 */
function A2_togglePanel() {
  A2.panelOpen = !A2.panelOpen;
  const panel = document.getElementById('analytics-panel');
  const btn   = document.getElementById('analyticsToggleBtn');
  if (A2.panelOpen) {
    panel.classList.add('open');
    btn.classList.add('active');
    A2_refreshAll();
  } else {
    panel.classList.remove('open');
    btn.classList.remove('active');
    A2_stopPlayback();
  }
}

/**
 * Switch between tabs inside the analytics panel.
 * @param {string} tab — 'charts' | 'outbreaks' | 'trends' | 'compare'
 */
function A2_switchTab(tab) {
  A2.activeTab = tab;
  document.querySelectorAll('.a2-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.querySelectorAll('.a2-tab-pane').forEach(p => {
    p.classList.toggle('active', p.dataset.tab === tab);
  });
  // Lazy-render the relevant section
  if (tab === 'charts')    A2_renderCharts();
  if (tab === 'outbreaks') A2_renderOutbreaks();
  if (tab === 'trends')    A2_renderTrends();
  if (tab === 'compare')   A2_renderCompare();
}

/**
 * Called by script.js after every applyFilters() so the analytics panel
 * stays in sync without requiring a manual refresh.
 */
function A2_onFilterChange() {
  if (!A2.panelOpen) return;
  A2_refreshAll();
  // Rebuild heatmap if it's on
  if (A2.heatActive) A2_buildHeatLayer();
}

/** Refresh whichever tab is currently visible. */
function A2_refreshAll() {
  A2_renderCharts();
  A2_renderOutbreaks();
  A2_renderTrends();
  A2_renderCompare();
}

// ─── 2. STATS DASHBOARD CHARTS ───────────────────────────────────────────────

/**
 * Render four bar/line charts using the current filteredData.
 * Destroys and recreates Chart.js instances each time to avoid stale data.
 */
function A2_renderCharts() {
  if (A2.activeTab !== 'charts') return;
  const data = (typeof filteredData !== 'undefined') ? filteredData : [];

  // ── 2a. EF Distribution ──────────────────────────────────────────────────
  {
    const counts = [0,1,2,3,4,5].map(ef => data.filter(d => d.ef_scale === ef).length);
    const unknown = data.filter(d => d.ef_scale === null).length;
    A2_makeBar('chart-ef', {
      labels: ['EF0','EF1','EF2','EF3','EF4','EF5','EF?'],
      datasets: [{
        label: 'Events',
        data: [...counts, unknown],
        backgroundColor: ['#4caf50','#80ecf1','#eeff00','#f4a836','#b02727','#fa01d0','#7a9ab8'],
        borderWidth: 0,
      }]
    }, { title: 'Events by EF Scale' });
  }

  // ── 2b. Events by Month ──────────────────────────────────────────────────
  {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const counts = months.map((_, i) => data.filter(d => d.mo === i + 1).length);
    A2_makeBar('chart-month', {
      labels: months,
      datasets: [{
        label: 'Events',
        data: counts,
        backgroundColor: 'rgba(147,147,147,0.55)',
        borderColor: 'rgba(147,147,147,0.9)',
        borderWidth: 1,
      }]
    }, { title: 'Events by Month' });
  }

  // ── 2c. Top 10 States ────────────────────────────────────────────────────
  {
    const stateMap = {};
    data.forEach(d => { if (d.state) stateMap[d.state] = (stateMap[d.state] || 0) + 1; });
    const sorted = Object.entries(stateMap).sort((a,b) => b[1]-a[1]).slice(0,10);
    A2_makeBar('chart-state', {
      labels: sorted.map(s => s[0]),
      datasets: [{
        label: 'Events',
        data: sorted.map(s => s[1]),
        backgroundColor: 'rgba(147,147,147,0.55)',
        borderColor: 'rgba(147,147,147,0.9)',
        borderWidth: 1,
      }]
    }, { title: 'Top 10 States', horizontal: true });
  }

  // ── 2d. Fatalities by EF ─────────────────────────────────────────────────
  {
    const fat = [0,1,2,3,4,5].map(ef =>
      data.filter(d => d.ef_scale === ef).reduce((s,d) => s + d.fatalities, 0)
    );
    A2_makeBar('chart-fat', {
      labels: ['EF0','EF1','EF2','EF3','EF4','EF5'],
      datasets: [{
        label: 'Fatalities',
        data: fat,
        backgroundColor: ['#4caf50','#80ecf1','#eeff00','#f4a836','#b02727','#fa01d0'],
        borderWidth: 0,
      }]
    }, { title: 'Fatalities by EF Scale' });
  }
}

/**
 * Helper: create or replace a Chart.js bar chart.
 * @param {string} canvasId
 * @param {object} chartData — Chart.js data object
 * @param {object} opts      — { title, horizontal }
 */
function A2_makeBar(canvasId, chartData, opts = {}) {
  // Destroy existing instance if any
  if (A2.charts[canvasId]) {
    A2.charts[canvasId].destroy();
    delete A2.charts[canvasId];
  }
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const isDark = !document.body.classList.contains('light');
  const textColor  = isDark ? '#919191' : '#5a5a5a';
  const gridColor  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  A2.charts[canvasId] = new Chart(canvas, {
    type: opts.horizontal ? 'bar' : 'bar',
    data: chartData,
    options: {
      indexAxis: opts.horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: opts.title || '',
          color: textColor,
          font: { family: "'Share Tech Mono', monospace", size: 11 },
          padding: { bottom: 6 },
        },
      },
      scales: {
        x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
        y: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
      },
    }
  });
}

// ─── 3. OUTBREAK DETECTION ────────────────────────────────────────────────────

/**
 * An outbreak is defined as 6 or more tornadoes whose start dates fall
 * within a 48-hour window.  We use a sliding-window pass over the
 * date-sorted dataset.
 *
 * Algorithm:
 *   Sort events by date string (ISO yyyy-mm-dd or similar).
 *   For each event i, expand a window forward while date[j] - date[i] ≤ 2 days.
 *   If window size ≥ 6, record it as an outbreak, then advance i past it.
 *
 * Returns array of outbreak objects:
 *   { id, startDate, endDate, events[], maxEF, totalFat, totalInj, states[] }
 */
function A2_detectOutbreaks(data) {
  if (!data || !data.length) return [];

  // Only use events that have a parseable date
  const dated = data
    .filter(d => d.date)
    .map(d => ({ ...d, _ts: A2_parseDate(d.date) }))
    .filter(d => d._ts !== null)
    .sort((a, b) => a._ts - b._ts);

  const MS_48H = 48 * 60 * 60 * 1000;
  const outbreaks = [];
  let i = 0;

  while (i < dated.length) {
    // Expand window
    let j = i + 1;
    while (j < dated.length && (dated[j]._ts - dated[i]._ts) <= MS_48H) j++;

    const window = dated.slice(i, j);
    if (window.length >= 6) {
      const maxEF   = Math.max(...window.map(d => d.ef_scale ?? -1));
      const totalFat = window.reduce((s, d) => s + d.fatalities, 0);
      const totalInj = window.reduce((s, d) => s + d.injuries, 0);
      const totalDmg = window.reduce((s, d) => s + d.damage_millions, 0);
      const states  = [...new Set(window.map(d => d.state).filter(Boolean))].sort();

      outbreaks.push({
        id: outbreaks.length + 1,
        startDate: dated[i].date,
        endDate:   dated[j-1].date,
        events:    window,
        count:     window.length,
        maxEF,
        totalFat,
        totalInj,
        totalDmg,
        states,
      });
      // Skip all events in this window to avoid double-counting
      i = j;
    } else {
      i++;
    }
  }

  return outbreaks;
}

/**
 * Parse a date string into a Unix timestamp (ms).
 * Handles yyyy-mm-dd, m/d/yyyy, yyyymmdd.
 * Returns null if unparseable.
 */
function A2_parseDate(str) {
  if (!str) return null;
  str = String(str).trim();
  // ISO: yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str.substring(0, 10));
    return isNaN(d) ? null : d.getTime();
  }
  // Compact: yyyymmdd
  if (/^\d{8}$/.test(str)) {
    const d = new Date(`${str.slice(0,4)}-${str.slice(4,6)}-${str.slice(6,8)}`);
    return isNaN(d) ? null : d.getTime();
  }
  // m/d/yyyy or mm/dd/yyyy
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const d = new Date(str);
    return isNaN(d) ? null : d.getTime();
  }
  return null;
}

/** Render the outbreak list cards into #outbreak-list. */
function A2_renderOutbreaks() {
  if (A2.activeTab !== 'outbreaks') return;
  const container = document.getElementById('outbreak-list');
  if (!container) return;

  const data = (typeof filteredData !== 'undefined') ? filteredData : [];
  const outbreaks = A2_detectOutbreaks(data);
  A2.outbreaks = outbreaks;

  if (!outbreaks.length) {
    container.innerHTML = `<div class="a2-empty">No outbreaks detected in current filter.<br>
      <span class="a2-empty-sub">An outbreak requires ≥6 tornadoes within 48 hours.</span></div>`;
    return;
  }

  // Sort by count descending so biggest outbreaks appear first
  const sorted = [...outbreaks].sort((a,b) => b.count - a.count);

  container.innerHTML = sorted.map(ob => {
    const efColor = ob.maxEF >= 0
      ? ({'0':'#4caf50','1':'#80ecf1','2':'#eeff00','3':'#f4a836','4':'#b02727','5':'#fa01d0'}[ob.maxEF] || '#7a9ab8')
      : '#7a9ab8';
    const sameDayLabel = ob.startDate === ob.endDate ? ob.startDate : `${ob.startDate} → ${ob.endDate}`;
    const dmgLabel = ob.totalDmg > 1000
      ? `$${(ob.totalDmg/1000).toFixed(1)}B`
      : `$${ob.totalDmg.toFixed(1)}M`;

    return `
    <div class="a2-outbreak-card" onclick="A2_highlightOutbreak(${ob.id - 1})">
      <div class="a2-ob-header">
        <span class="a2-ob-badge" style="background:${efColor}">MAX EF${ob.maxEF >= 0 ? ob.maxEF : '?'}</span>
        <span class="a2-ob-count">${ob.count} tornadoes</span>
        <span class="a2-ob-date">${sameDayLabel}</span>
      </div>
      <div class="a2-ob-stats">
        <div class="a2-ob-stat"><span class="a2-ob-stat-val">${ob.totalFat}</span><span class="a2-ob-stat-lbl">fatalities</span></div>
        <div class="a2-ob-stat"><span class="a2-ob-stat-val">${ob.totalInj}</span><span class="a2-ob-stat-lbl">injuries</span></div>
        <div class="a2-ob-stat"><span class="a2-ob-stat-val">${dmgLabel}</span><span class="a2-ob-stat-lbl">damage</span></div>
      </div>
      <div class="a2-ob-states">${ob.states.slice(0,8).join(' · ')}${ob.states.length > 8 ? ` +${ob.states.length - 8} more` : ''}</div>
    </div>`;
  }).join('');
}

/**
 * When a user clicks an outbreak card, filter the main table to those events
 * and fit the map to the outbreak footprint.
 * @param {number} idx — index in A2.outbreaks[]
 */
function A2_highlightOutbreak(idx) {
  const ob = A2.outbreaks[idx];
  if (!ob) return;
  const ids = new Set(ob.events.map(d => d._idx));
  // Temporarily override filteredData in the main module
  if (typeof filteredData !== 'undefined') {
    filteredData.length = 0;
    ob.events.forEach(e => filteredData.push(e));
    if (typeof renderTable === 'function') renderTable();
    if (typeof updateMapVisibility === 'function') updateMapVisibility();
    if (typeof fitMapToBounds === 'function') fitMapToBounds();
  }
}

// ─── 4. DENSITY HEATMAP ───────────────────────────────────────────────────────

/**
 * Toggle the Leaflet.heat heatmap layer on/off.
 * Weight = EF scale (0–5) so stronger tornadoes glow more intensely.
 * Falls back gracefully if Leaflet.heat isn't loaded.
 */
function A2_toggleHeatmap() {
  if (typeof L === 'undefined' || typeof L.heatLayer === 'undefined') {
    alert('Leaflet.heat is not loaded. Add its script tag to index.html.');
    return;
  }
  if (!map) return; // map not initialised yet (script.js global)

  A2.heatActive = !A2.heatActive;
  const btn = document.getElementById('heatmapToggleBtn');

  if (A2.heatActive) {
    A2_buildHeatLayer();
    if (btn) btn.classList.add('active');
  } else {
    if (A2.heatLayer) { map.removeLayer(A2.heatLayer); A2.heatLayer = null; }
    if (btn) btn.classList.remove('active');
  }
}

/** Build or rebuild the heat layer from current filteredData. */
function A2_buildHeatLayer() {
  if (!A2.heatActive) return;
  if (typeof L === 'undefined' || typeof L.heatLayer === 'undefined') return;
  if (!map) return;

  if (A2.heatLayer) map.removeLayer(A2.heatLayer);

  const data = (typeof filteredData !== 'undefined') ? filteredData : [];
  // Points: [lat, lng, intensity]  — intensity scaled 0–1 from EF (0–5)
  const points = data
    .filter(d => !isNaN(d.start_lat) && !isNaN(d.start_lon))
    .map(d => [d.start_lat, d.start_lon, (d.ef_scale ?? 0) / 5]);

  A2.heatLayer = L.heatLayer(points, {
    radius:  22,
    blur:    16,
    maxZoom: 12,
    max:     1.0,
    gradient: { 0.2: '#4caf50', 0.4: '#eeff00', 0.6: '#f4a836', 0.8: '#b02727', 1.0: '#fa01d0' },
  }).addTo(map);
}

// ─── 5. TIMELINE PLAYBACK ─────────────────────────────────────────────────────

/**
 * Start animated chronological playback.
 * Each "step" advances by one unique date, showing only events up to that date.
 * Speed is controlled by A2.playback.speed (set via A2_setPlaybackSpeed).
 */
function A2_startPlayback() {
  const data = (typeof allData !== 'undefined') ? allData : [];
  const dates = [...new Set(data.map(d => d.date).filter(Boolean))].sort();
  if (!dates.length) return;

  A2.playback.dates  = dates;
  A2.playback.index  = 0;
  A2.playback.active = true;

  const startBtn = document.getElementById('playback-start');
  const stopBtn  = document.getElementById('playback-stop');
  if (startBtn) startBtn.disabled = true;
  if (stopBtn)  stopBtn.disabled  = false;

  A2_playStep();
}

function A2_playStep() {
  if (!A2.playback.active) return;
  const { dates, index, speed } = A2.playback;

  if (index >= dates.length) {
    A2_stopPlayback();
    return;
  }

  // Show all events up to and including this date
  const upTo = dates[index];
  const label = document.getElementById('playback-date-label');
  if (label) label.textContent = upTo;

  // Inject into filteredData temporarily (non-destructive to allData)
  const data = (typeof allData !== 'undefined') ? allData : [];
  if (typeof filteredData !== 'undefined') {
    filteredData.length = 0;
    data.filter(d => d.date && d.date <= upTo).forEach(e => filteredData.push(e));
    if (typeof updateMapVisibility === 'function') updateMapVisibility();
  }

  A2.playback.index++;
  const interval = Math.round(400 / speed);
  A2.playback.timer = setTimeout(A2_playStep, interval);
}

/** Stop playback and restore filtered state. */
function A2_stopPlayback() {
  A2.playback.active = false;
  clearTimeout(A2.playback.timer);

  const startBtn = document.getElementById('playback-start');
  const stopBtn  = document.getElementById('playback-stop');
  if (startBtn) startBtn.disabled = false;
  if (stopBtn)  stopBtn.disabled  = true;

  // Restore filteredData by re-running filters (delegates back to script.js)
  if (typeof applyFilters === 'function') applyFilters();
}

/**
 * Set playback speed multiplier.
 * @param {number} speed — 0.5 = slow, 1 = normal, 2 = fast, 4 = very fast
 */
function A2_setPlaybackSpeed(speed) {
  A2.playback.speed = speed;
  document.querySelectorAll('.a2-speed-btn').forEach(b => {
    b.classList.toggle('active', parseFloat(b.dataset.speed) === speed);
  });
}

// ─── 6. TREND ANALYSIS ───────────────────────────────────────────────────────

/**
 * Render year-over-year trend lines using allData (not filteredData)
 * so the trend represents the full loaded dataset rather than any active filter.
 * Three series: event count, total fatalities, total damage ($M).
 */
function A2_renderTrends() {
  if (A2.activeTab !== 'trends') return;

  const data = (typeof allData !== 'undefined') ? allData : [];
  const yearMap = {};

  data.forEach(d => {
    if (!d.yr) return;
    if (!yearMap[d.yr]) yearMap[d.yr] = { count: 0, fat: 0, dmg: 0, inj: 0 };
    yearMap[d.yr].count++;
    yearMap[d.yr].fat += d.fatalities;
    yearMap[d.yr].dmg += d.damage_millions;
    yearMap[d.yr].inj += d.injuries;
  });

  const years = Object.keys(yearMap).sort();
  if (!years.length) {
    const c = document.getElementById('chart-trend');
    if (c) { const ctx = c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); }
    return;
  }

  const isDark = !document.body.classList.contains('light');
  const textColor = isDark ? '#919191' : '#5a5a5a';
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  // ── 6a. Event count trend ─────────────────────────────────────────────────
  A2_makeLine('chart-trend', {
    labels: years,
    datasets: [
      {
        label: 'Events',
        data: years.map(y => yearMap[y].count),
        borderColor: '#919191',
        backgroundColor: 'rgba(145,145,145,0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: years.length > 40 ? 0 : 3,
      },
    ]
  }, { title: 'Events per Year', textColor, gridColor });

  // ── 6b. Fatality trend ────────────────────────────────────────────────────
  A2_makeLine('chart-trend-fat', {
    labels: years,
    datasets: [
      {
        label: 'Fatalities',
        data: years.map(y => yearMap[y].fat),
        borderColor: '#b02727',
        backgroundColor: 'rgba(176,39,39,0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: years.length > 40 ? 0 : 3,
      },
    ]
  }, { title: 'Fatalities per Year', textColor, gridColor });

  // ── 6c. Damage trend ($M) ─────────────────────────────────────────────────
  A2_makeLine('chart-trend-dmg', {
    labels: years,
    datasets: [
      {
        label: 'Damage ($M)',
        data: years.map(y => yearMap[y].dmg),
        borderColor: '#f4a836',
        backgroundColor: 'rgba(244,168,54,0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: years.length > 40 ? 0 : 3,
      },
    ]
  }, { title: 'Property Damage per Year ($M)', textColor, gridColor });
}

/**
 * Helper: create or replace a Chart.js line chart.
 */
function A2_makeLine(canvasId, chartData, opts = {}) {
  if (A2.charts[canvasId]) {
    A2.charts[canvasId].destroy();
    delete A2.charts[canvasId];
  }
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  A2.charts[canvasId] = new Chart(canvas, {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: opts.title || '',
          color: opts.textColor || '#919191',
          font: { family: "'Share Tech Mono', monospace", size: 11 },
          padding: { bottom: 6 },
        },
      },
      scales: {
        x: {
          ticks: { color: opts.textColor || '#919191', font: { size: 9 }, maxRotation: 45 },
          grid:  { color: opts.gridColor || 'rgba(255,255,255,0.07)' },
        },
        y: {
          ticks: { color: opts.textColor || '#919191', font: { size: 9 } },
          grid:  { color: opts.gridColor || 'rgba(255,255,255,0.07)' },
          beginAtZero: true,
        },
      },
    }
  });
}

// ─── 7. COMPARISON MODE ──────────────────────────────────────────────────────

/**
 * Take a frozen snapshot of the current filteredData as "Dataset A".
 * The user then adjusts filters to produce "Dataset B" (live filteredData).
 * Both are displayed side-by-side in the compare tab.
 */
function A2_takeSnapshot() {
  const data = (typeof filteredData !== 'undefined') ? filteredData : [];
  A2.compare.snapshotData = [...data]; // shallow copy is fine — objects are immutable during session

  // Build a label describing the snapshot
  const count = data.length;
  const states = [...new Set(data.map(d => d.state).filter(Boolean))].sort();
  const years  = [...new Set(data.map(d => d.yr).filter(Boolean))].sort();
  A2.compare.snapshotLabel =
    `${count.toLocaleString()} events · ${states.slice(0,3).join(', ')}${states.length > 3 ? '…' : ''}`
    + (years.length ? ` · ${years[0]}–${years[years.length-1]}` : '');

  const label = document.getElementById('compare-snapshot-label');
  if (label) label.textContent = A2.compare.snapshotLabel;

  A2.compare.active = true;
  A2_renderCompare();
}

/** Clear the snapshot and exit comparison mode. */
function A2_clearSnapshot() {
  A2.compare.snapshotData = [];
  A2.compare.snapshotLabel = '';
  A2.compare.active = false;
  const label = document.getElementById('compare-snapshot-label');
  if (label) label.textContent = '— none —';
  A2_renderCompare();
}

/**
 * Render comparison statistics between snapshot (A) and live filteredData (B).
 * Shows counts, max EF, fatalities, injuries, damage for each dataset.
 */
function A2_renderCompare() {
  if (A2.activeTab !== 'compare') return;
  const container = document.getElementById('compare-stats');
  if (!container) return;

  const B = (typeof filteredData !== 'undefined') ? filteredData : [];
  const A = A2.compare.snapshotData;

  if (!A.length) {
    container.innerHTML = `<div class="a2-empty">Apply filters, then click <strong>Snapshot A</strong><br>
      to capture Dataset A. Adjust filters for Dataset B.</div>`;
    return;
  }

  const stats = (arr) => ({
    count: arr.length,
    maxEF: Math.max(...arr.map(d => d.ef_scale ?? -1)),
    fat:   arr.reduce((s,d) => s+d.fatalities, 0),
    inj:   arr.reduce((s,d) => s+d.injuries, 0),
    dmg:   arr.reduce((s,d) => s+d.damage_millions, 0),
    avgLen:arr.length ? (arr.reduce((s,d) => s+d.length_miles, 0) / arr.length) : 0,
  });

  const sa = stats(A);
  const sb = stats(B);

  const row = (label, va, vb, fmt = v => v.toLocaleString()) => {
    const diff = typeof va === 'number' && typeof vb === 'number' ? vb - va : null;
    const diffStr = diff !== null
      ? `<span class="a2-diff ${diff > 0 ? 'pos' : diff < 0 ? 'neg' : ''}">${diff > 0 ? '+' : ''}${fmt(diff)}</span>`
      : '';
    return `<tr>
      <td class="a2-cmp-label">${label}</td>
      <td class="a2-cmp-a">${fmt(va)}</td>
      <td class="a2-cmp-b">${fmt(vb)}</td>
      <td class="a2-cmp-diff">${diffStr}</td>
    </tr>`;
  };

  const fmtEF  = v => v >= 0 ? `EF${v}` : '—';
  const fmtDmg = v => v > 1000 ? `$${(v/1000).toFixed(1)}B` : `$${v.toFixed(1)}M`;
  const fmtLen = v => `${v.toFixed(2)} mi`;

  container.innerHTML = `
    <table class="a2-cmp-table">
      <thead><tr>
        <th></th>
        <th class="a2-cmp-head-a">Dataset A</th>
        <th class="a2-cmp-head-b">Dataset B (live)</th>
        <th>Δ</th>
      </tr></thead>
      <tbody>
        ${row('Events',     sa.count,  sb.count)}
        ${row('Max EF',     sa.maxEF,  sb.maxEF,  fmtEF)}
        ${row('Fatalities', sa.fat,    sb.fat)}
        ${row('Injuries',   sa.inj,    sb.inj)}
        ${row('Damage',     sa.dmg,    sb.dmg,    fmtDmg)}
        ${row('Avg length', sa.avgLen, sb.avgLen, fmtLen)}
      </tbody>
    </table>`;

  // Also render a mini-chart comparing EF distribution
  const efLabels = ['EF0','EF1','EF2','EF3','EF4','EF5'];
  const efA = [0,1,2,3,4,5].map(ef => A.filter(d => d.ef_scale === ef).length);
  const efB = [0,1,2,3,4,5].map(ef => B.filter(d => d.ef_scale === ef).length);

  if (A2.charts['chart-compare']) {
    A2.charts['chart-compare'].destroy();
    delete A2.charts['chart-compare'];
  }
  const canvas = document.getElementById('chart-compare');
  if (canvas) {
    const isDark = !document.body.classList.contains('light');
    const textColor = isDark ? '#919191' : '#5a5a5a';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    A2.charts['chart-compare'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: efLabels,
        datasets: [
          { label: 'Dataset A', data: efA, backgroundColor: 'rgba(145,145,145,0.6)', borderWidth: 0 },
          { label: 'Dataset B', data: efB, backgroundColor: 'rgba(176,39,39,0.6)',   borderWidth: 0 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 200 },
        plugins: {
          legend: { display: true, labels: { color: textColor, font: { size: 10 } } },
          title: {
            display: true, text: 'EF Distribution Comparison',
            color: textColor, font: { family: "'Share Tech Mono', monospace", size: 11 },
          },
        },
        scales: {
          x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
          y: { ticks: { color: textColor, font: { size: 9  } }, grid: { color: gridColor }, beginAtZero: true },
        },
      }
    });
  }
}

// ─── Hook into script.js filter pipeline ─────────────────────────────────────
//
// We patch applyFilters() to also call A2_onFilterChange() after it runs.
// This runs once when analytics.js is first loaded.
//
(function patchFilterPipeline() {
  // Wait for DOM + script.js to be ready
  document.addEventListener('DOMContentLoaded', () => {
    const orig = window.applyFilters;
    if (typeof orig === 'function') {
      window.applyFilters = function(...args) {
        orig.apply(this, args);
        A2_onFilterChange();
      };
    }
  });
})();
