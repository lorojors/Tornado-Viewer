// ─── Core domain types ────────────────────────────────────────────────────────

export interface TornadoEvent {
  readonly _idx: number
  id: string
  date: string
  time: string
  mo: number | null
  yr: number | null
  state: string
  county: string
  start_lat: number
  start_lon: number
  end_lat: number | null
  end_lon: number | null
  ef_scale: number | null
  length_miles: number
  width_yards: number
  injuries: number
  fatalities: number
  damage_millions: number
}

export type FieldKey = keyof Omit<TornadoEvent, '_idx'>
export type ColumnMapping = Partial<Record<string, string>>

export type EfFilter = 'ALL' | '0' | '1' | '2' | '3' | '4' | '5'
export type SortDir = 'asc' | 'desc'
export type SortableField = 'id' | 'ef_scale' | 'state' | 'county' | 'length_miles' | 'fatalities' | 'damage_millions'

export interface FilterState {
  search: string
  state: string
  county: string
  month: string
  year: string
  dateFrom: string
  dateTo: string
  ef: EfFilter
}

export interface SortState {
  col: SortableField | null
  dir: SortDir
}

export interface OutbreakEvent {
  id: number
  startDate: string
  endDate: string
  events: TornadoEvent[]
  count: number
  maxEF: number
  totalFat: number
  totalInj: number
  totalDmg: number
  states: string[]
}

export type AnalyticsTab = 'charts' | 'outbreaks' | 'trends' | 'compare'

export interface CompareSnapshot {
  data: TornadoEvent[]
  label: string
}

export type AppScreen = 'drop' | 'dashboard'
