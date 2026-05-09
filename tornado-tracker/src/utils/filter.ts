/**
 * filter.ts
 * Pure filter + sort functions. No side effects, easy to unit-test.
 */
import type { TornadoEvent, FilterState, SortState } from '../types/index'

export function applyFilters(data: TornadoEvent[], f: FilterState): TornadoEvent[] {
  const search = f.search.toLowerCase()
  return data.filter(d => {
    if (f.ef !== 'ALL' && String(d.ef_scale) !== f.ef) return false
    if (f.state && d.state !== f.state) return false
    if (f.county && d.county !== f.county) return false
    if (f.month && String(d.mo) !== f.month) return false
    if (f.year  && String(d.yr)  !== f.year)  return false
    if (f.dateFrom && d.date && d.date < f.dateFrom) return false
    if (f.dateTo   && d.date && d.date > f.dateTo)   return false
    if (search && !`${d.id} ${d.state} ${d.county} ${d.date}`.toLowerCase().includes(search)) return false
    return true
  })
}

export function applySort(data: TornadoEvent[], s: SortState): TornadoEvent[] {
  if (!s.col) return data
  const col = s.col
  return [...data].sort((a, b) => {
    let av: string | number | null = a[col] ?? ''
    let bv: string | number | null = b[col] ?? ''
    if (typeof av === 'string') av = av.toLowerCase()
    if (typeof bv === 'string') bv = bv.toLowerCase()
    if (av < bv) return s.dir === 'asc' ? -1 : 1
    if (av > bv) return s.dir === 'asc' ?  1 : -1
    return 0
  })
}
