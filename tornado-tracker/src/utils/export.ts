/**
 * export.ts
 * Exports the currently filtered + sorted TornadoEvent array to a CSV file.
 * Uses the File System Access API (showSaveFilePicker) when available,
 * with an <a download> fallback for browsers that don't support it.
 */
import type { TornadoEvent } from '../types'

const CSV_HEADERS: (keyof Omit<TornadoEvent, '_idx'>)[] = [
  'id', 'date', 'time', 'yr', 'mo', 'state', 'county',
  'start_lat', 'start_lon', 'end_lat', 'end_lon',
  'ef_scale', 'length_miles', 'width_yards',
  'injuries', 'fatalities', 'damage_millions',
]

function escape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  // Quote if contains comma, quote, or newline
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function buildCSV(data: TornadoEvent[]): string {
  const header = CSV_HEADERS.join(',')
  const rows = data.map(d =>
    CSV_HEADERS.map(k => escape(d[k])).join(',')
  )
  return [header, ...rows].join('\n')
}

export async function exportFilteredCSV(data: TornadoEvent[]): Promise<void> {
  if (!data.length) return

  const csv = buildCSV(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const filename = `tornado_export_${new Date().toISOString().slice(0, 10)}.csv`

  // Try File System Access API first
  if ('showSaveFilePicker' in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'CSV File', accept: { 'text/csv': ['.csv'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch {
      // User cancelled or API not permitted — fall through to anchor method
    }
  }

  // Fallback: <a download>
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
