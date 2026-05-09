import { useEffect } from 'react'
import { useStore } from '../store'

export function usePlayback(): void {
  const active = useStore(s => s.playbackActive)
  const speed  = useStore(s => s.playbackSpeed)
  const step   = useStore(s => s.stepPlayback)
  const stop   = useStore(s => s.stopPlayback)
  const idx    = useStore(s => s.playbackDateIdx)
  const dates  = useStore(s => s.playbackDates)

  useEffect(() => {
    if (!active) return
    if (idx >= dates.length) { stop(); return }
    const id = setTimeout(step, Math.round(400 / speed))
    return () => clearTimeout(id)
  }, [active, idx, speed, dates.length, step, stop])
}
