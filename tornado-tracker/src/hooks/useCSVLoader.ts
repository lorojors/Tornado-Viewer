/**
 * useCSVLoader.ts
 * Wraps PapaParse multi-file parsing in a React hook.
 * Returns { loading, loadingText, parseFiles }.
 */
import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import { detectColumns } from '../utils/columns'
import { parseRows } from '../utils/parse'
import type { TornadoEvent, ColumnMapping } from '../types'

type RawRow = Record<string, string>

interface LoadResult {
  data: TornadoEvent[]
  headers: string[]
  rows: RawRow[]
  mapping: ColumnMapping
  needsMapper: boolean
}

interface UseCSVLoader {
  loading: boolean
  loadingText: string
  parseFiles: (files: File[]) => Promise<LoadResult | null>
}

export function useCSVLoader(): UseCSVLoader {
  const [loading, setLoading]       = useState(false)
  const [loadingText, setLoadingText] = useState('')

  const parseFiles = useCallback(async (files: File[]): Promise<LoadResult | null> => {
    if (!files.length) return null
    setLoading(true)
    setLoadingText(`Loading ${files.length} file${files.length > 1 ? 's' : ''}…`)

    return new Promise(resolve => {
      const allRows: RawRow[] = []
      let headers: string[] | null = null
      let pending = files.length

      files.forEach(file => {
        Papa.parse<RawRow>(file, {
          header: true,
          skipEmptyLines: true,
          complete(results) {
            if (!headers) {
              headers = results.meta.fields ?? []
            }
            allRows.push(...results.data)
            pending--
            if (pending === 0) {
              setLoading(false)
              if (!headers) { resolve(null); return }
              const mapping = detectColumns(headers)
              const needsMapper = !mapping['start_lat'] || !mapping['start_lon']
              const data = needsMapper ? [] : parseRows(allRows, mapping)
              resolve({ data, headers, rows: allRows, mapping, needsMapper })
            }
          },
          error() {
            pending--
            if (pending === 0) { setLoading(false); resolve(null) }
          },
        })
      })
    })
  }, [])

  return { loading, loadingText, parseFiles }
}
