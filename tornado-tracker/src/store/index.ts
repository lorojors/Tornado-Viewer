/**
 * store/index.ts
 * Zustand store — single source of truth for the entire app.
 * Replaces all the scattered `let` globals in the original script.js.
 *
 * Structure:
 *   data      — raw loaded TornadoEvent array (never mutated after load)
 *   filters   — current filter values
 *   sort      — current sort column + direction
 *   ui        — screen, panel open/closed, theme, pagination, selected row
 *   analytics — analytics panel state (tab, compare snapshot, playback)
 *
 * Derived state (filteredData, sortedData) is computed in selectors below
 * the store definition so components subscribe to exactly what they need.
 */
import { create } from 'zustand'
import type {
  TornadoEvent, FilterState, SortState,
  EfFilter, SortableField, SortDir,
  AnalyticsTab, CompareSnapshot, AppScreen,
  ColumnMapping,
} from '../types/index'
import { applyFilters, applySort } from '../utils/filter'
import { PAGE_SIZE } from '../utils/constants'

// ─── Shape ────────────────────────────────────────────────────────────────────

interface AppState {
  // ── Data ──────────────────────────────────────────────────────────────────
  allData: TornadoEvent[]
  rawHeaders: string[]
  rawRows: Record<string, string>[]
  colMapping: ColumnMapping

  // ── Filters ───────────────────────────────────────────────────────────────
  filters: FilterState
  sort: SortState

  // ── UI ────────────────────────────────────────────────────────────────────
  screen: AppScreen
  theme: 'dark' | 'light'
  selectedIdx: number | null
  currentPage: number
  analyticsPanelOpen: boolean
  useClustering: boolean
  heatmapActive: boolean

  // ── Analytics ─────────────────────────────────────────────────────────────
  analyticsTab: AnalyticsTab
  compareSnapshot: CompareSnapshot | null
  playbackActive: boolean
  playbackDateIdx: number
  playbackDates: string[]
  playbackSpeed: number

  // ── Actions ───────────────────────────────────────────────────────────────
  loadData: (data: TornadoEvent[], headers: string[], rows: Record<string, string>[], mapping: ColumnMapping) => void
  resetApp: () => void

  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  setFilters: (partial: Partial<FilterState>) => void
  clearDateRange: () => void
  setEfFilter: (ef: EfFilter) => void
  setSort: (col: SortableField) => void

  setScreen: (s: AppScreen) => void
  setTheme: (t: 'dark' | 'light') => void
  selectRow: (idx: number | null) => void
  setPage: (p: number) => void
  toggleAnalyticsPanel: () => void
  setAnalyticsTab: (tab: AnalyticsTab) => void
  toggleClustering: () => void
  toggleHeatmap: () => void

  takeSnapshot: (data: TornadoEvent[]) => void
  clearSnapshot: () => void

  startPlayback: (dates: string[]) => void
  stepPlayback: () => void
  stopPlayback: () => void
  setPlaybackSpeed: (s: number) => void
}

// ─── Initial filter state ─────────────────────────────────────────────────────

const DEFAULT_FILTERS: FilterState = {
  search: '', state: '', county: '', month: '',
  year: '', dateFrom: '', dateTo: '', ef: 'ALL',
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  // Data
  allData: [], rawHeaders: [], rawRows: [], colMapping: {},

  // Filters
  filters: { ...DEFAULT_FILTERS },
  sort: { col: null, dir: 'asc' },

  // UI
  screen: 'drop',
  theme: 'dark',
  selectedIdx: null,
  currentPage: 0,
  analyticsPanelOpen: false,
  useClustering: true,
  heatmapActive: false,

  // Analytics
  analyticsTab: 'charts',
  compareSnapshot: null,
  playbackActive: false,
  playbackDateIdx: 0,
  playbackDates: [],
  playbackSpeed: 1,

  // ── Data actions ────────────────────────────────────────────────────────────

  loadData: (data, headers, rows, mapping) =>
    set({
      allData: data,
      rawHeaders: headers,
      rawRows: rows,
      colMapping: mapping,
      screen: 'dashboard',
      filters: { ...DEFAULT_FILTERS },
      sort: { col: null, dir: 'asc' },
      selectedIdx: null,
      currentPage: 0,
    }),

  resetApp: () =>
    set({
      allData: [], rawHeaders: [], rawRows: [], colMapping: {},
      screen: 'drop',
      filters: { ...DEFAULT_FILTERS },
      sort: { col: null, dir: 'asc' },
      selectedIdx: null,
      currentPage: 0,
      analyticsPanelOpen: false,
      heatmapActive: false,
      compareSnapshot: null,
      playbackActive: false,
    }),

  // ── Filter actions ──────────────────────────────────────────────────────────

  setFilter: (key, value) =>
    set(s => ({ filters: { ...s.filters, [key]: value }, currentPage: 0 })),

  setFilters: (partial) =>
    set(s => ({ filters: { ...s.filters, ...partial }, currentPage: 0 })),

  clearDateRange: () =>
    set(s => ({ filters: { ...s.filters, dateFrom: '', dateTo: '' }, currentPage: 0 })),

  setEfFilter: (ef) =>
    set(s => ({ filters: { ...s.filters, ef }, currentPage: 0 })),

  setSort: (col: SortableField) =>
    set(s => {
      const sameCol = s.sort.col === col
      const dir: SortDir = sameCol && s.sort.dir === 'asc' ? 'desc' : 'asc'
      return { sort: { col, dir }, currentPage: 0 }
    }),

  // ── UI actions ──────────────────────────────────────────────────────────────

  setScreen: (screen) => set({ screen }),
  setTheme: (theme) => set({ theme }),
  selectRow: (selectedIdx) => set({ selectedIdx }),
  setPage: (currentPage) => set({ currentPage }),
  toggleAnalyticsPanel: () => set(s => ({ analyticsPanelOpen: !s.analyticsPanelOpen })),
  setAnalyticsTab: (analyticsTab) => set({ analyticsTab }),
  toggleClustering: () => set(s => ({ useClustering: !s.useClustering })),
  toggleHeatmap: () => set(s => ({ heatmapActive: !s.heatmapActive })),

  // ── Compare actions ─────────────────────────────────────────────────────────

  takeSnapshot: (data) => {
    const states = [...new Set(data.map(d => d.state).filter(Boolean))].sort()
    const years  = [...new Set(data.map(d => d.yr).filter((y): y is number => y !== null))].sort()
    const label =
      `${data.length.toLocaleString()} events · ${states.slice(0,3).join(', ')}${states.length > 3 ? '…' : ''}` +
      (years.length ? ` · ${years[0]}–${years[years.length-1]}` : '')
    set({ compareSnapshot: { data: [...data], label } })
  },

  clearSnapshot: () => set({ compareSnapshot: null }),

  // ── Playback actions ────────────────────────────────────────────────────────

  startPlayback: (dates) =>
    set({ playbackActive: true, playbackDates: dates, playbackDateIdx: 0 }),

  stepPlayback: () => {
    const s = get()
    if (s.playbackDateIdx >= s.playbackDates.length - 1) {
      set({ playbackActive: false })
    } else {
      set({ playbackDateIdx: s.playbackDateIdx + 1 })
    }
  },

  stopPlayback: () => set({ playbackActive: false, playbackDateIdx: 0 }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
}))

// ─── Derived selectors ────────────────────────────────────────────────────────
// These are plain functions — call inside components, no extra subscription cost.

export function selectFiltered(state: AppState): TornadoEvent[] {
  return applyFilters(state.allData, state.filters)
}

export function selectSorted(state: AppState): TornadoEvent[] {
  return applySort(applyFilters(state.allData, state.filters), state.sort)
}

export function selectPage(state: AppState): TornadoEvent[] {
  const sorted = selectSorted(state)
  return sorted.slice(state.currentPage * PAGE_SIZE, (state.currentPage + 1) * PAGE_SIZE)
}

export function selectTotalPages(state: AppState): number {
  return Math.ceil(selectSorted(state).length / PAGE_SIZE)
}

export function selectHeaderStats(state: AppState) {
  const d = state.allData
  return {
    total:      d.length,
    maxEF:      Math.max(...d.map(x => x.ef_scale ?? -1)),
    fatalities: d.reduce((s, x) => s + x.fatalities, 0),
    injuries:   d.reduce((s, x) => s + x.injuries, 0),
    damage:     d.reduce((s, x) => s + x.damage_millions, 0),
  }
}

export function selectUniqueStates(state: AppState): string[] {
  return [...new Set(state.allData.map(d => d.state).filter(Boolean))].sort()
}

export function selectUniqueCounties(state: AppState, forState: string): string[] {
  const source = forState ? state.allData.filter(d => d.state === forState) : state.allData
  return [...new Set(source.map(d => d.county).filter(Boolean))].sort()
}

export function selectUniqueMonths(state: AppState): number[] {
  return [...new Set(state.allData.map(d => d.mo).filter((m): m is number => m !== null))].sort((a,b) => a-b)
}

export function selectUniqueYears(state: AppState): number[] {
  return [...new Set(state.allData.map(d => d.yr).filter((y): y is number => y !== null))].sort((a,b) => a-b)
}

export function selectAllDates(state: AppState): string[] {
  return [...new Set(state.allData.map(d => d.date).filter(Boolean))].sort()
}
