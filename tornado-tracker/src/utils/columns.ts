/**
 * columns.ts
 * Auto-detects column mappings from CSV headers using alias lists.
 * Returns a ColumnMapping that maps internal field keys → actual CSV header names.
 */
import type { ColumnMapping } from '../types'

/**
 * Maps each internal field key to the list of header aliases it recognises
 * (all lowercased — comparison is case-insensitive).
 */
export const COL_ALIASES: Record<string, string[]> = {
  id:             ['om', 'id', 'tornado_id', 'event_id', 'tornid'],
  date:           ['date', 'date_str', 'event_date', 'begin_date'],
  time:           ['time', 'begin_time', 'start_time'],
  mo:             ['mo', 'month', 'begin_month'],
  yr:             ['yr', 'year', 'begin_yearmonth', 'begin_year'],
  state:          ['st', 'state', 'stf', 'state_abbr'],
  county:         ['county', 'countyns', 'cz_name', 'f_county'],
  start_lat:      ['slat', 'start_lat', 'begin_lat', 'latitude', 'lat'],
  start_lon:      ['slon', 'start_lon', 'begin_lon', 'longitude', 'lon', 'lng'],
  end_lat:        ['elat', 'end_lat', 'end_lat', 'fin_lat'],
  end_lon:        ['elon', 'end_lon', 'fin_lon'],
  ef_scale:       ['mag', 'ef', 'f_scale', 'ef_scale', 'f_scale_num', 'magnitude'],
  length_miles:   ['len', 'length', 'length_miles', 'path_length'],
  width_yards:    ['wid', 'width', 'width_yards', 'path_width'],
  injuries:       ['inj', 'injuries', 'injuries_direct', 'total_injuries'],
  fatalities:     ['fat', 'fatalities', 'deaths_direct', 'total_fatalities'],
  damage_millions:['loss', 'damage', 'damage_property', 'prop_loss', 'damage_millions', 'damage_property_num'],
}

/**
 * Given an array of CSV header strings, returns a ColumnMapping
 * where each recognised field key maps to the first matching header.
 */
export function detectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  const lowerHeaders = headers.map(h => h.toLowerCase().trim())

  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
      const idx = lowerHeaders.indexOf(alias)
      if (idx !== -1) {
        mapping[field] = headers[idx] // preserve original casing
        break
      }
    }
  }

  return mapping
}
