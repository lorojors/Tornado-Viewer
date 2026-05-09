import { useCallback, useRef } from 'react'
import { useStore } from '../store'
import Papa from 'papaparse'
import { detectColumns } from '../utils/columns'
import { parseRows } from '../utils/parse'

export function DropZone() {
  const loadData = useStore(s => s.loadData)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(async (files: File[]) => {
    const csvFiles = files.filter(f => f.name.toLowerCase().endsWith('.csv'))
    if (!csvFiles.length) return

    const allRows: Record<string, string>[] = []
    let allHeaders: string[] = []
    let mapping: Record<string, string> = {}

    for (const file of csvFiles) {
      const text = await file.text()
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      })

      if (result.data.length > 0) {
        if (allHeaders.length === 0) {
          allHeaders = result.meta.fields ?? Object.keys(result.data[0])
        }
        allRows.push(...result.data)
      }
    }

    if (allRows.length === 0) return

    mapping = detectColumns(allHeaders)
    const events = parseRows(allRows, mapping)
    loadData(events, allHeaders, allRows, mapping)
  }, [loadData])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }, [processFiles])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const onFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files))
    }
  }, [processFiles])

  const onClickBrowse = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div 
      className="drop-zone-screen"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <div className="drop-zone-hero">
        <h1 className="display-lg drop-zone-title">Upload Storm Data</h1>
        <p className="drop-zone-subtitle">
          Ingest critical meteorological datasets into the primary analysis engine.
          Support for raw NEXRAD dumps, SPC reports, and standardized CSV schemas.
        </p>
      </div>

      <div 
        className="drop-zone-area"
        onClick={onClickBrowse}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          onChange={onFileInputChange}
          style={{ display: 'none' }}
        />
        
        <div className="drop-zone-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3-3m0 0l3 3m-3-3v12"/>
          </svg>
        </div>
        
        <div className="drop-zone-text">Drag & Drop Datasets</div>
        <div className="drop-zone-hint">
          Drop your files here or click to browse. Max file size: 5GB per batch.
        </div>
        
        <div className="drop-zone-actions">
          <button className="btn btn-ghost" onClick={(e) => e.stopPropagation()}>
            NOAA SPC
          </button>
          <button className="btn btn-ghost" onClick={(e) => e.stopPropagation()}>
            Storm Events DB
          </button>
          <button className="btn btn-ghost" onClick={(e) => e.stopPropagation()}>
            Custom CSV
          </button>
        </div>
      </div>
    </div>
  )
}