/**
 * parse.ts
 * Converts raw PapaParse row objects into typed TornadoEvent records.
 * Handles NOAA SPC's evolving damage encoding (raw dollars pre-2016,
 * millions post-2016) and multiple date string formats.
 */
import type { TornadoEvent, ColumnMapping } from '../types'

type RawRow = Record<string, string>

function get(row: RawRow, mapping: ColumnMapping, field: string): string | undefined {
  const col = mapping[field]
  return col ? row[col] : undefined
}

function parseNum(v: string | undefined): number {
  if (v === undefined || v === '') return 0
  const n = parseFloat(v.replace(/[$,]/g, ''))
  return isNaN(n) ? 0 : n
}

function parseInt2(v: string | undefined): number {
  if (!v) return 0
  const n = parseInt(v, 10)
  return isNaN(n) ? 0 : n
}

/** Parse any of: yyyy-mm-dd, yyyymmdd, m/d/yyyy — returns ms timestamp or null */
export function parseDateMs(str: string): number | null {
  const s = str.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.slice(0, 10)); return isNaN(d.getTime()) ? null : d.getTime()
  }
  if (/^\d{8}$/.test(s)) {
    const d = new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`)
    return isNaN(d.getTime()) ? null : d.getTime()
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
    const d = new Date(s); return isNaN(d.getTime()) ? null : d.getTime()
  }
  return null
}

export function parseRows(rows: RawRow[], mapping: ColumnMapping): TornadoEvent[] {
  // Sample damage values to auto-detect unit (raw dollars vs millions)
  const dmgSample = rows.slice(0, 200)
    .map(r => parseFloat((get(r, mapping, 'damage_millions') ?? '0').replace(/[$,]/g, '')))
    .filter(v => !isNaN(v) && v > 0)
  const dmgMedian = dmgSample.length
    ? [...dmgSample].sort((a, b) => a - b)[Math.floor(dmgSample.length / 2)]
    : 0
  const dmgDivisor = dmgMedian >= 1000 ? 1e6 : 1

  const result: TornadoEvent[] = []

  rows.forEach((row, i) => {
    const slat = parseFloat(get(row, mapping, 'start_lat') ?? '')
    const slon = parseFloat(get(row, mapping, 'start_lon') ?? '')
    if (isNaN(slat) || isNaN(slon)) return

    // Year: explicit column, or extracted from date string
    const yrRaw = get(row, mapping, 'yr')
    let yr: number | null = yrRaw ? parseInt2(yrRaw) || null : null
    if (!yr) {
      const dateStr = get(row, mapping, 'date') ?? ''
      const m4 = dateStr.match(/\b(\d{4})\b/)
      if (m4) yr = parseInt(m4[1], 10)
    }

    const efRaw = get(row, mapping, 'ef_scale')
    const ef = efRaw !== undefined && efRaw !== '' ? parseInt2(efRaw) : null

    const moRaw = get(row, mapping, 'mo')
    const mo = moRaw ? parseInt2(moRaw) || null : null

    const elat = parseFloat(get(row, mapping, 'end_lat') ?? '')
    const elon = parseFloat(get(row, mapping, 'end_lon') ?? '')

    let dmg = parseNum(get(row, mapping, 'damage_millions'))
    dmg = dmg / dmgDivisor

    result.push({
      _idx: i,
      id: get(row, mapping, 'id') ?? `T-${String(i + 1).padStart(4, '0')}`,
      date: get(row, mapping, 'date') ?? '',
      time: get(row, mapping, 'time') ?? '',
      mo,
      yr,
      state: get(row, mapping, 'state') ?? '',
      county: get(row, mapping, 'county') ?? '',
      start_lat: slat,
      start_lon: slon,
      end_lat: isNaN(elat) ? null : elat,
      end_lon: isNaN(elon) ? null : elon,
      ef_scale: ef,
      length_miles: parseNum(get(row, mapping, 'length_miles')),
      width_yards:  parseNum(get(row, mapping, 'width_yards')),
      injuries:     parseInt2(get(row, mapping, 'injuries')),
      fatalities:   parseInt2(get(row, mapping, 'fatalities')),
      damage_millions: dmg,
    })
  })

  return result
}
