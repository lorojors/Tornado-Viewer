import { useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { useStore, selectFiltered } from '../store'
import { getEfColor } from '../utils/constants'

function buildPopupHtml(d: any, color: string): string {
  const dmg = d.damage_millions > 1000
    ? `$${(d.damage_millions / 1000).toFixed(1)}B`
    : d.damage_millions > 0
      ? `$${d.damage_millions.toFixed(1)}M`
      : '—'

  return `
    <div style="font-family:Inter,sans-serif;font-size:13px;color:#dce4e4;background:#192121;padding:12px;border-radius:4px;min-width:200px;line-height:1.5;border:1px solid #3a494a;">
      <div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:14px;margin-bottom:8px;letter-spacing:0.02em;">${d.id}</div>
      <div style="color:#b9caca;font-size:12px;margin-bottom:10px;border-bottom:1px solid #3a494a;padding-bottom:8px;">
        ${d.date}${d.time ? ' · ' + d.time : ''} · ${d.state || '—'}${d.county ? ', ' + d.county : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#849495;margin-bottom:2px;">EF Scale</div>
          <div style="font-weight:700;">
            <span style="background:${color};color:#000;padding:2px 8px;border-radius:2px;font-size:11px;">
              ${d.ef_scale !== null ? 'EF' + d.ef_scale : 'Unknown'}
            </span>
          </div>
        </div>
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#849495;margin-bottom:2px;">Path Length</div>
          <div style="font-weight:600;">${d.length_miles ? d.length_miles.toFixed(1) + ' mi' : '—'}</div>
        </div>
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#849495;margin-bottom:2px;">Width</div>
          <div style="font-weight:600;">${d.width_yards ? d.width_yards.toFixed(0) + ' yd' : '—'}</div>
        </div>
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#849495;margin-bottom:2px;">Damage</div>
          <div style="font-weight:600;">${dmg}</div>
        </div>
      </div>
      <div style="display:flex;gap:16px;font-size:12px;">
        ${d.fatalities > 0 ? `<div style="color:#e53935;font-weight:600;">${d.fatalities} fatalities</div>` : ''}
        ${d.injuries > 0 ? `<div style="color:#f4a836;font-weight:600;">${d.injuries} injuries</div>` : ''}
      </div>
      ${d.start_lat && d.start_lon ? `
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #3a494a;font-size:11px;color:#849495;font-family:monospace;">
          START: ${d.start_lat.toFixed(4)}, ${d.start_lon.toFixed(4)}
          ${d.end_lat && d.end_lon ? `<br>END: ${d.end_lat.toFixed(4)}, ${d.end_lon.toFixed(4)}` : ''}
        </div>
      ` : ''}
    </div>
  `
}

export function MapView() {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const heatRef = useRef<L.Layer | null>(null)
  const pathsRef = useRef<L.LayerGroup | null>(null)

  const filtered = useStore(selectFiltered)
  const allData = useStore(s => s.allData)
  const heatmapActive = useStore(s => s.heatmapActive)
  const selectedIdx = useStore(s => s.selectedIdx)
  const selectRow = useStore(s => s.selectRow)

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [39.8283, -98.5795],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
      opacity: 0.7,
    }).addTo(map)

    mapRef.current = map
    markersRef.current = L.layerGroup().addTo(map)
    pathsRef.current = L.layerGroup().addTo(map)

    ;(window as any).__fitMapToBounds = () => {
      if (!markersRef.current || !mapRef.current) return
      const layers = markersRef.current.getLayers()
      if (layers.length === 0) return
      const group = L.featureGroup(layers as L.Layer[])
      mapRef.current.fitBounds(group.getBounds().pad(0.1), { animate: true })
    }

    map.on('mousemove', (e) => {
      const el = document.getElementById('coord-display')
      if (el) el.textContent = `LAT ${e.latlng.lat.toFixed(4)}  LON ${e.latlng.lng.toFixed(4)}`
    })

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = null
      pathsRef.current = null
      heatRef.current = null
    }
  }, [])

  const buildMarkers = useCallback(() => {
    if (!mapRef.current) return

    // Clear all layers
    if (heatRef.current) {
      mapRef.current.removeLayer(heatRef.current)
      heatRef.current = null
    }
    if (markersRef.current) markersRef.current.clearLayers()
    if (pathsRef.current) pathsRef.current.clearLayers()

    if (filtered.length === 0) return

    // Heatmap mode
    if (heatmapActive) {
      const heatPoints = filtered
        .filter(d => d.start_lat && d.start_lon)
        .map(d => [d.start_lat, d.start_lon, 0.5] as [number, number, number])

      if (heatPoints.length > 0) {
        heatRef.current = (L as any).heatLayer(heatPoints, {
          radius: 15,
          blur: 25,
          maxZoom: 10,
          gradient: {
            0.0: '#4caf50',
            0.2: '#00dce5',
            0.4: '#ffeb3b',
            0.6: '#f4a836',
            0.8: '#e53935',
            1.0: '#b02727',
          },
        }).addTo(mapRef.current)
      }
      return
    }

    // Individual markers + paths
    filtered.forEach(d => {
      if (!d.start_lat || !d.start_lon) return
      const color = getEfColor(d.ef_scale)
      const isSelected = selectedIdx === d._idx
      const popupHtml = buildPopupHtml(d, color)

      // ── PATH LINE (visible) ──────────────────────────────────────────────
      let visiblePath: L.Polyline | null = null
      if (d.end_lat && d.end_lon) {
        visiblePath = L.polyline(
          [[d.start_lat, d.start_lon], [d.end_lat, d.end_lon]],
          {
            color: color,
            weight: isSelected ? 4 : 2,
            opacity: isSelected ? 1 : 0.7,
            dashArray: isSelected ? undefined : '4, 6',
            lineCap: 'round',
            lineJoin: 'round',
          }
        )
        pathsRef.current!.addLayer(visiblePath)
      }

      // ── PATH HIT AREA (invisible, wide, clickable) ────────────────────────
      if (d.end_lat && d.end_lon) {
        const hitPath = L.polyline(
          [[d.start_lat, d.start_lon], [d.end_lat, d.end_lon]],
          {
            color: 'transparent',
            weight: 20, // Wide hit area
            opacity: 0,
            lineCap: 'round',
            lineJoin: 'round',
            interactive: true,
          }
        )

        // Click hit area → select row in table + show popup
        hitPath.on('click', (e) => {
          selectRow(d._idx)
          L.popup({
            closeButton: false,
            className: 'vortex-popup',
            offset: [0, -4],
            autoPan: true,
            autoPanPadding: [50, 50],
          })
            .setLatLng(e.latlng)
            .setContent(popupHtml)
            .openOn(mapRef.current!)
        })

        // Hover effects on visible path
        hitPath.on('mouseover', () => {
          visiblePath?.setStyle({ weight: 4, opacity: 1 })
        })
        hitPath.on('mouseout', () => {
          visiblePath?.setStyle({ weight: isSelected ? 4 : 2, opacity: isSelected ? 1 : 0.7 })
        })

        pathsRef.current!.addLayer(hitPath)
      }

      // ── START POINT MARKER ────────────────────────────────────────────────
      const marker = L.circleMarker([d.start_lat, d.start_lon], {
        radius: isSelected ? 10 : 6,
        fillColor: color,
        color: isSelected ? '#00dce5' : '#000',
        weight: isSelected ? 3 : 1.5,
        opacity: 1,
        fillOpacity: isSelected ? 1 : 0.9,
      })

      marker.on('click', () => {
        selectRow(d._idx)
        marker.bindPopup(popupHtml, {
          closeButton: false,
          className: 'vortex-popup',
          offset: [0, -6],
        }).openPopup()
      })

      marker.bindTooltip(`${d.id} · EF${d.ef_scale ?? '?'}`, {
        direction: 'top',
        offset: [0, -8],
        className: 'vortex-tooltip',
      })

      markersRef.current!.addLayer(marker)

      // ── END POINT MARKER ──────────────────────────────────────────────────
      if (d.end_lat && d.end_lon) {
        const endMarker = L.circleMarker([d.end_lat, d.end_lon], {
          radius: isSelected ? 6 : 4,
          fillColor: color,
          color: isSelected ? '#00dce5' : '#000',
          weight: isSelected ? 2 : 1,
          opacity: 1,
          fillOpacity: 0.4,
        })

        endMarker.on('click', () => {
          selectRow(d._idx)
          endMarker.bindPopup(popupHtml, {
            closeButton: false,
            className: 'vortex-popup',
            offset: [0, -4],
          }).openPopup()
        })

        markersRef.current!.addLayer(endMarker)
      }
    })
  }, [filtered, heatmapActive, selectedIdx, selectRow])

  useEffect(() => {
    buildMarkers()
  }, [buildMarkers])

  useEffect(() => {
    if (selectedIdx === null || !mapRef.current) return
    const event = filtered.find(d => d._idx === selectedIdx)
    if (!event?.start_lat || !event?.start_lon) return
    mapRef.current.flyTo([event.start_lat, event.start_lon], 10, {
      duration: 1,
      easeLinearity: 0.25,
    })
  }, [selectedIdx, filtered])

  return (
    <div className="map-container">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {allData.length > 0 && (
        <div className="map-overlay-stats">
          <div className="glass-card" style={{ padding: '12px 16px', minWidth: 140 }}>
            <div className="label-caps" style={{ marginBottom: 6 }}>Active Tracks</div>
            <div className="data-tabular" style={{ fontSize: 24, color: 'var(--v-primary-fixed-dim)' }}>
              {filtered.length.toLocaleString()}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '12px 16px', minWidth: 140 }}>
            <div className="label-caps" style={{ marginBottom: 6 }}>Max Intensity</div>
            <div className="data-tabular" style={{ fontSize: 24 }}>
              {(() => {
                const max = Math.max(...filtered.map(d => d.ef_scale ?? -1))
                return max >= 0 ? `EF${max}` : '—'
              })()}
            </div>
          </div>
        </div>
      )}

      {allData.length === 0 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          pointerEvents: 'none',
        }}>
          <svg width="64" height="64" viewBox="0 0 28 28" fill="none" stroke="var(--v-primary-fixed-dim)" strokeWidth="1.5">
            <path d="M14 2C14 2,22 8,20 14C18 20,15 18,14 24C13 18,10 20,8 14C6 8,14 2,14 2Z" />
            <path d="M9 9L19 9M8 13L20 13M10 17L18 17" opacity="0.5" />
            <circle cx="14" cy="14" r="2" opacity="0.5" />
          </svg>
          <span className="label-caps" style={{ color: 'var(--v-on-surface-variant)' }}>
            Awaiting Storm Data
          </span>
        </div>
      )}
    </div>
  )
}