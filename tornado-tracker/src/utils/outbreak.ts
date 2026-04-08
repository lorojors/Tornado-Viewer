/**
 * outbreak.ts
 * Sliding-window outbreak detection.
 * An outbreak = 6+ tornadoes whose dates fall within a 48-hour window.
 */
import type { TornadoEvent, OutbreakEvent } from '../types'
import { parseDateMs } from './parse'

const MS_48H = 48 * 60 * 60 * 1000

export function detectOutbreaks(data: TornadoEvent[]): OutbreakEvent[] {
  const dated = data
    .filter(d => d.date)
    .map(d => ({ event: d, ts: parseDateMs(d.date) }))
    .filter((x): x is { event: TornadoEvent; ts: number } => x.ts !== null)
    .sort((a, b) => a.ts - b.ts)

  const outbreaks: OutbreakEvent[] = []
  let i = 0

  while (i < dated.length) {
    let j = i + 1
    while (j < dated.length && dated[j].ts - dated[i].ts <= MS_48H) j++

    const window = dated.slice(i, j).map(x => x.event)
    if (window.length >= 6) {
      const maxEF    = Math.max(...window.map(d => d.ef_scale ?? -1))
      const totalFat = window.reduce((s, d) => s + d.fatalities, 0)
      const totalInj = window.reduce((s, d) => s + d.injuries, 0)
      const totalDmg = window.reduce((s, d) => s + d.damage_millions, 0)
      const states   = [...new Set(window.map(d => d.state).filter(Boolean))].sort()
      outbreaks.push({
        id: outbreaks.length + 1,
        startDate: dated[i].event.date,
        endDate:   dated[j - 1].event.date,
        events: window, count: window.length,
        maxEF, totalFat, totalInj, totalDmg, states,
      })
      i = j
    } else {
      i++
    }
  }

  return outbreaks
}
