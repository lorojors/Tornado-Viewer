import { useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import 'leaflet.heat'
import { useStore, selectFiltered } from '../store'
import { getEfColor, MONTHS } from '../utils/constants'
import type { TornadoEvent } from '../types'

const TILES = {
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
}

function popupHTML(d: TornadoEvent) {
  const color = getEfColor(d.ef_scale)
  const mn = d.mo ? MONTHS[d.mo - 1] : '—'
  return `<div style="min-width:220px">
    <div class="popup-title" style="color:${color}">EF${d.ef_scale ?? '?'} — ${d.state || 'Unknown'}</div>
    <div class="popup-grid">
      <div class="popup-item"><label>ID</label><span>${d.id}</span></div>
      <div class="popup-item"><label>Date</label><span>${d.date || '—'}</span></div>
      <div class="popup-item"><label>County</label><span>${d.county || '—'}</span></div>
      <div class="popup-item"><label>Year</label><span>${d.yr || '—'}</span></div>
      <div class="popup-item"><label>Month</label><span>${mn}</span></div>
      <div class="popup-item"><label>Time</label><span>${d.time || '—'}</span></div>
      <div class="popup-item"><label>Length</label><span>${d.length_miles ? d.length_miles.toFixed(2) + ' mi' : '—'}</span></div>
      <div class="popup-item"><label>Width</label><span>${d.width_yards ? Math.round(d.width_yards) + ' yd' : '—'}</span></div>
      <div class="popup-item"><label>Injuries</label><span>${d.injuries || 0}</span></div>
      <div class="popup-item"><label>Fatalities</label><span style="color:${d.fatalities > 0 ? '#f44336' : 'inherit'}">${d.fatalities || 0}</span></div>
      <div class="popup-item"><label>Coord</label><span>${d.start_lat.toFixed(4)}, ${d.start_lon.toFixed(4)}</span></div>
      <div class="popup-item"><label>Damage</label><span>$${d.damage_millions.toFixed(3)}M</span></div>
    </div>
  </div>`
}

export function MapView() {
  const containerRef   = useRef<HTMLDivElement>(null)
  const mapRef         = useRef<L.Map | null>(null)
  const tileRef        = useRef<L.TileLayer | null>(null)
  const clusterRef     = useRef<L.MarkerClusterGroup | null>(null)
  const rawGroupRef    = useRef<L.LayerGroup | null>(null)
  const markerMapRef   = useRef(new Map<number, L.LayerGroup>())
  const heatRef        = useRef<L.Layer | null>(null)

  const theme         = useStore(s => s.theme)
  const useClustering = useStore(s => s.useClustering)
  const heatmapActive = useStore(s => s.heatmapActive)
  const allData       = useStore(s => s.allData)
  const filteredData  = useStore(selectFiltered)
  const selectRow     = useStore(s => s.selectRow)
  const playbackActive  = useStore(s => s.playbackActive)
  const playbackDateIdx = useStore(s => s.playbackDateIdx)
  const playbackDates   = useStore(s => s.playbackDates)

  // Init map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    const map = L.map(containerRef.current, {
      zoomControl: true, attributionControl: false, preferCanvas: true,
      minZoom: 3, maxBoundsViscosity: 1.0,
      maxBounds: L.latLngBounds(L.latLng(-85.05, -540), L.latLng(85.05, 540)),
    }).setView([38, -92], 4)
    tileRef.current = L.tileLayer(TILES.dark, { maxZoom: 19, minZoom: 3 }).addTo(map)
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      const el = document.getElementById('coord-display')
      if (el) el.textContent = `LAT ${e.latlng.lat.toFixed(4)}  LON ${e.latlng.lng.toFixed(4)}`
    })
    mapRef.current = map
  }, [])

  // Theme
  useEffect(() => {
    const map = mapRef.current; if (!map) return
    if (heatRef.current) { map.removeLayer(heatRef.current); heatRef.current = null }
    if (!heatmapActive || !filteredData.length) return
    const pts = filteredData
      .filter(d => !isNaN(d.start_lat) && !isNaN(d.start_lon))
      .map(d => [d.start_lat, d.start_lon, (d.ef_scale ?? 0) / 5] as [number, number, number])
    if (!pts.length) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    heatRef.current = (L as any).heatLayer(pts, {
      radius: 22, blur: 16, maxZoom: 12, max: 1,
      gradient: { 0.2: '#4caf50', 0.4: '#eeff00', 0.6: '#f4a836', 0.8: '#b02727', 1.0: '#fa01d0' },
    }).addTo(map)
  }, [heatmapActive, filteredData])

  const buildLayers = useCallback((d: TornadoEvent, lonOffset: number, interactive: boolean) => {
    const ef = d.ef_scale ?? 0
    const color = getEfColor(d.ef_scale)
    const slon = d.start_lon + lonOffset
    const widthW = d.width_yards ? Math.min(1 + d.width_yards / 200, 8) : 1.5 + ef * 0.7
    const layers: L.Layer[] = []
    const hasEnd = d.end_lat !== null && d.end_lon !== null &&
      (Math.abs(d.end_lat) > 0.001 || Math.abs(d.end_lon ?? 0) > 0.001)
    if (hasEnd && lonOffset === 0) {
      const line = L.polyline([[d.start_lat, slon], [d.end_lat!, d.end_lon! + lonOffset]],
        { color, weight: widthW, opacity: 0.75, interactive })
      if (interactive) line.on('click', () => selectRow(d._idx))
      layers.push(line)
    }
    const size = 5 + ef * 2
    const icon = L.divIcon({
      html: `<div style="width:${size}px;height:${size}px;background:${color};border:1px solid rgba(0,0,0,.4);border-radius:${ef < 3 ? '50%' : '0'};box-shadow:0 0 5px ${color}88;${ef === 5 ? 'transform:rotate(45deg);' : ''}"></div>`,
      className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    })
    const marker = L.marker([d.start_lat, slon], { icon, interactive })
    if (interactive) {
      marker.bindPopup(popupHTML(d), { maxWidth: 280 })
      marker.on('click', () => selectRow(d._idx))
    }
    layers.push(marker)
    return layers
  }, [selectRow])

  // Re-render all markers when data or cluster mode changes
  useEffect(() => {
    const map = mapRef.current; if (!map || !allData.length) return
    // Clear
    if (clusterRef.current) { map.removeLayer(clusterRef.current); clusterRef.current = null }
    if (rawGroupRef.current) { map.removeLayer(rawGroupRef.current); rawGroupRef.current = null }
    map.eachLayer(l => { if (l instanceof L.Polyline && !(l instanceof L.Polygon)) map.removeLayer(l) })
    markerMapRef.current.clear()

    if (useClustering) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cluster = (L as any).markerClusterGroup({
        maxClusterRadius: 40, minimumClusterSize: 6,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        iconCreateFunction(c: any) {
          const n = c.getChildCount(), sz = n < 10 ? 32 : n < 100 ? 38 : 44
          return L.divIcon({ html: `<div class="cluster-icon" style="width:${sz}px;height:${sz}px;line-height:${sz}px">${n}</div>`, className: '', iconSize: [sz, sz] })
        },
      })
      allData.forEach(d => buildLayers(d, 0, true).forEach(l => cluster.addLayer(l)))
      cluster.addTo(map)
      clusterRef.current = cluster
    } else {
      const group = L.layerGroup().addTo(map)
      allData.forEach(d => {
        const lg = L.layerGroup([...buildLayers(d, 0, true), ...buildLayers(d, -360, false), ...buildLayers(d, 360, false)])
        group.addLayer(lg)
        markerMapRef.current.set(d._idx, lg)
      })
      rawGroupRef.current = group
    }
    // Fit to filtered after initial render
    const pts = filteredData.filter(d => !isNaN(d.start_lat))
    if (pts.length) map.fitBounds(L.latLngBounds(pts.map(d => [d.start_lat, d.start_lon] as [number, number])), { padding: [40, 40] })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allData, useClustering])

  // Update visibility when filter changes
  useEffect(() => {
    const map = mapRef.current; if (!map) return
    const vis = new Set(filteredData.map(d => d._idx))
    if (useClustering && clusterRef.current) {
      clusterRef.current.clearLayers()
      filteredData.forEach(d => buildLayers(d, 0, true).forEach(l => clusterRef.current!.addLayer(l)))
    } else {
      markerMapRef.current.forEach((lg, idx) => {
        if (vis.has(idx)) { if (!map.hasLayer(lg)) lg.addTo(map) }
        else { if (map.hasLayer(lg)) map.removeLayer(lg) }
      })
    }
  }, [filteredData, useClustering, buildLayers])

  // Playback
  useEffect(() => {
    if (!playbackActive || !playbackDates.length) return
    const map = mapRef.current; if (!map) return
    const upTo = playbackDates[playbackDateIdx]
    const visible = allData.filter(d => d.date && d.date <= upTo)
    const vis = new Set(visible.map(d => d._idx))
    if (useClustering && clusterRef.current) {
      clusterRef.current.clearLayers()
      visible.forEach(d => buildLayers(d, 0, true).forEach(l => clusterRef.current!.addLayer(l)))
    } else {
      markerMapRef.current.forEach((lg, idx) => {
        if (vis.has(idx)) { if (!map.hasLayer(lg)) lg.addTo(map) }
        else { if (map.hasLayer(lg)) map.removeLayer(lg) }
      })
    }
  }, [playbackActive, playbackDateIdx, playbackDates, allData, useClustering, buildLayers])

  // Heatmap
  useEffect(() => {
    const map = mapRef.current; if (!map) return
    if (heatRef.current) { map.removeLayer(heatRef.current); heatRef.current = null }
    if (!heatmapActive || !filteredData.length) return
    const pts = filteredData.map(d => [d.start_lat, d.start_lon, (d.ef_scale ?? 0) / 5] as [number, number, number])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    heatRef.current = (L as any).heatLayer(pts, {
      radius: 22, blur: 16, maxZoom: 12, max: 1,
      gradient: { 0.2: '#4caf50', 0.4: '#eeff00', 0.6: '#f4a836', 0.8: '#b02727', 1.0: '#fa01d0' },
    }).addTo(map)
  }, [heatmapActive, filteredData])

  // Expose fitBounds to DataTable button
  useEffect(() => {
    const fitFn = () => {
      const map = mapRef.current
      const pts = filteredData.filter(d => !isNaN(d.start_lat))
      if (!map || !pts.length) return
      map.fitBounds(L.latLngBounds(pts.map(d => [d.start_lat, d.start_lon] as [number, number])), { padding: [40, 40] })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__fitMapToBounds = fitFn
  }, [filteredData])

  return (
    <div className="map-panel">
      <div ref={containerRef} id="map" style={{ width: '100%', height: '100%' }} />
      <div className="map-overlay">
        <div className="map-card">
          <div className="map-card-title">// EF Scale</div>
          <div className="ef-legend">
            {(['#4caf50','#80ecf1','#eeff00','#f4a836','#b02727','#fa01d0'] as const)
              .map((c, i) => (
                <div key={i} className="ef-row">
                  <div className="ef-swatch" style={{ background: c }} />
                  {['EF0 — Weak','EF1 — Moderate','EF2 — Significant','EF3 — Severe','EF4 — Devastating','EF5 — Catastrophic'][i]}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
