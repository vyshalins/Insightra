import { useMemo, useState } from 'react'
import {
  fetchYoutube,
  uploadCsv,
  uploadJson,
  uploadManual,
  type IngestionResponse,
  type ReviewRecord,
} from '../api'
import './DataInputPanel.css'

type InputMode = 'csv' | 'json' | 'manual' | 'youtube'

const PAGE_SIZE = 20

function toCsv(records: ReviewRecord[]): string {
  const headers = ['review_id', 'text', 'source', 'timestamp', 'product_id']
  const escapeCell = (value: string) => `"${value.replaceAll('"', '""')}"`
  const rows = records.map((record) =>
    [
      escapeCell(record.review_id),
      escapeCell(record.text),
      escapeCell(record.source),
      escapeCell(record.timestamp),
      escapeCell(record.product_id),
    ].join(','),
  )
  return [headers.join(','), ...rows].join('\n')
}

function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function formatTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp)
  return Number.isNaN(parsed.getTime()) ? timestamp : parsed.toLocaleString()
}

export function DataInputPanel() {
  const [mode, setMode] = useState<InputMode>('csv')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [jsonFile, setJsonFile] = useState<File | null>(null)
  const [manualText, setManualText] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<IngestionResponse | null>(null)
  const [filterText, setFilterText] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [showRawJson, setShowRawJson] = useState(false)

  const resetModeInputs = (targetMode: InputMode) => {
    if (targetMode === 'csv') {
      setCsvFile(null)
      return
    }
    if (targetMode === 'json') {
      setJsonFile(null)
      return
    }
    if (targetMode === 'manual') {
      setManualText('')
      return
    }
    setYoutubeUrl('')
  }

  const filteredAndSortedRecords = useMemo(() => {
    if (!result) {
      return []
    }

    const needle = filterText.trim().toLowerCase()
    const filtered = needle
      ? result.reviews.filter((record) =>
          [record.review_id, record.text, record.source, record.product_id, record.timestamp]
            .join(' ')
            .toLowerCase()
            .includes(needle),
        )
      : result.reviews

    const sorted = [...filtered].sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime()
      const bTime = new Date(b.timestamp).getTime()
      if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
        return a.timestamp.localeCompare(b.timestamp)
      }
      return sortOrder === 'asc' ? aTime - bTime : bTime - aTime
    })

    return sorted
  }, [filterText, result, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRecords.length / PAGE_SIZE))
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const paginatedRecords = filteredAndSortedRecords.slice(pageStart, pageStart + PAGE_SIZE)
  const previewRecords = filteredAndSortedRecords.slice(0, 20)

  const runRequest = async (request: () => Promise<IngestionResponse>) => {
    setError(null)
    setIsLoading(true)
    try {
      const response = await request()
      setResult(response)
      setCurrentPage(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (mode === 'csv') {
      if (!csvFile) {
        setError('Please choose a CSV file before submitting.')
        return
      }
      await runRequest(async () => await uploadCsv(csvFile))
      return
    }

    if (mode === 'json') {
      if (!jsonFile) {
        setError('Please choose a JSON file before submitting.')
        return
      }
      await runRequest(async () => await uploadJson(jsonFile))
      return
    }

    if (mode === 'manual') {
      if (!manualText.trim()) {
        setError('Please enter text for manual ingestion before submitting.')
        return
      }
      await runRequest(async () => await uploadManual(manualText))
      return
    }

    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL before submitting.')
      return
    }
    await runRequest(async () => await fetchYoutube(youtubeUrl))
  }

  const handleExportJson = () => {
    const content = JSON.stringify(filteredAndSortedRecords, null, 2)
    downloadFile('displayed-reviews.json', content, 'application/json')
  }

  const handleExportCsv = () => {
    const content = toCsv(filteredAndSortedRecords)
    downloadFile('displayed-reviews.csv', content, 'text/csv;charset=utf-8')
  }

  const renderModeInputs = () => {
    if (mode === 'csv') {
      return (
        <>
          <label htmlFor="csv-input">CSV File</label>
          <input
            id="csv-input"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
            disabled={isLoading}
          />
          <p className="mode-hint">Accepted format: .csv</p>
          <p className="selected-input">Selected: {csvFile ? csvFile.name : 'No file selected'}</p>
        </>
      )
    }

    if (mode === 'json') {
      return (
        <>
          <label htmlFor="json-input">JSON File</label>
          <input
            id="json-input"
            type="file"
            accept=".json,application/json"
            onChange={(event) => setJsonFile(event.target.files?.[0] ?? null)}
            disabled={isLoading}
          />
          <p className="mode-hint">Accepted format: .json</p>
          <p className="selected-input">Selected: {jsonFile ? jsonFile.name : 'No file selected'}</p>
        </>
      )
    }

    if (mode === 'manual') {
      return (
        <>
          <label htmlFor="manual-text">Manual Text Input</label>
          <textarea
            id="manual-text"
            rows={6}
            value={manualText}
            onChange={(event) => setManualText(event.target.value)}
            placeholder="Paste or type review text here..."
            disabled={isLoading}
          />
          <p className="mode-hint">Hint: submit non-empty text only.</p>
        </>
      )
    }

    return (
      <>
        <label htmlFor="youtube-url">YouTube URL</label>
        <input
          id="youtube-url"
          type="url"
          value={youtubeUrl}
          onChange={(event) => setYoutubeUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          disabled={isLoading}
        />
        <p className="mode-hint">Hint: ensure backend YouTube API key is configured.</p>
      </>
    )
  }

  return (
    <div className="data-input-panel">
      <section className="card">
        <h2>Ingestion Input</h2>
        <div className="mode-tabs" role="tablist" aria-label="Ingestion modes">
          {(['csv', 'json', 'manual', 'youtube'] as const).map((candidateMode) => (
            <button
              key={candidateMode}
              type="button"
              className={`mode-tab ${mode === candidateMode ? 'active' : ''}`}
              onClick={() => setMode(candidateMode)}
              disabled={isLoading}
            >
              {candidateMode.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="mode-card">{renderModeInputs()}</div>

        <div className="mode-actions">
          <button type="button" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit'}
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => resetModeInputs(mode)}
            disabled={isLoading}
          >
            Clear Input
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="card">
        <h2>Dataset Summary</h2>
        {!result ? (
          <p className="empty-state">Submit ingestion data to view normalized dataset results.</p>
        ) : (
          <>
            <div className="summary-grid">
              <article className="summary-card">
                <h3>Source</h3>
                <p>
                  <span className="source-badge">{result.source}</span>
                </p>
              </article>
              <article className="summary-card">
                <h3>Count</h3>
                <p>{result.count}</p>
              </article>
              <article className="summary-card">
                <h3>Invalid Rows</h3>
                <p>{result.invalid_rows}</p>
              </article>
            </div>

            <div className="dataset-controls">
              <label htmlFor="filter-text">
                Filter
                <input
                  id="filter-text"
                  type="text"
                  placeholder="Search in id/text/source/product/timestamp"
                  value={filterText}
                  onChange={(event) => {
                    setFilterText(event.target.value)
                    setCurrentPage(1)
                  }}
                />
              </label>

              <label htmlFor="sort-order">
                Sort timestamp
                <select
                  id="sort-order"
                  value={sortOrder}
                  onChange={(event) => {
                    setSortOrder(event.target.value === 'asc' ? 'asc' : 'desc')
                    setCurrentPage(1)
                  }}
                >
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
              </label>

              <div className="dataset-actions">
                <button type="button" className="secondary-btn" onClick={handleExportJson}>
                  Export JSON
                </button>
                <button type="button" className="secondary-btn" onClick={handleExportCsv}>
                  Export CSV
                </button>
              </div>
            </div>

            <h3>Preview (First 20 records)</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Review ID</th>
                    <th>Text</th>
                    <th>Source</th>
                    <th>Timestamp</th>
                    <th>Product ID</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No records match current filter.</td>
                    </tr>
                  ) : (
                    previewRecords.map((record) => (
                      <tr key={`preview-${record.review_id}-${record.timestamp}`}>
                        <td>{record.review_id}</td>
                        <td>{record.text}</td>
                        <td>{record.source}</td>
                        <td>{formatTimestamp(record.timestamp)}</td>
                        <td>{record.product_id}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <h3>Full Normalized Dataset</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Review ID</th>
                    <th>Text</th>
                    <th>Source</th>
                    <th>Timestamp</th>
                    <th>Product ID</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No records match current filter.</td>
                    </tr>
                  ) : (
                    paginatedRecords.map((record) => (
                      <tr key={`full-${record.review_id}-${record.timestamp}`}>
                        <td>{record.review_id}</td>
                        <td>{record.text}</td>
                        <td>{record.source}</td>
                        <td>{formatTimestamp(record.timestamp)}</td>
                        <td>{record.product_id}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>

            <div className="raw-json-section">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowRawJson((shown) => !shown)}
              >
                {showRawJson ? 'Hide Raw JSON' : 'Show Raw JSON'}
              </button>
              {showRawJson ? (
                <pre className="raw-json">{JSON.stringify(result, null, 2)}</pre>
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
