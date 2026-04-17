import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
  analyzeFakeReviews,
  analyzeInsights,
  fetchYoutube,
  processNextChunk,
  uploadCsv,
  uploadJson,
  uploadManual,
  type FakeReviewResult,
  type InsightsResponse,
  type IngestionResponse,
  type ReviewRecord,
} from '../api'
import './DataInputPanel.css'

const DataInputCharts = lazy(() => import('./DataInputCharts'))

type InputMode = 'csv' | 'json' | 'manual' | 'youtube'
type TranslationFilter = 'all' | 'translated' | 'not_translated'
type DatasetSort = 'timestamp_desc' | 'timestamp_asc' | 'text_length_desc' | 'text_length_asc'

const PAGE_SIZE = 20
const DEFAULT_CHUNK_SIZE = 300
const MIN_CHUNK_SIZE = 100
const MAX_CHUNK_SIZE = 1000
/** Matches backend default `FAKE_ANALYZE_MAX_ROWS`. */
const FAKE_ANALYZE_MAX_ROWS = 2000
/** Matches backend `INSIGHTS_MAX_ROWS`. */
const INSIGHTS_MAX_ROWS = 2000

function ChartsSkeleton() {
  return (
    <div className="charts-skeleton charts-grid" aria-hidden="true">
      {[0, 1, 2, 3].map((slot) => (
        <div key={slot} className="charts-skeleton-card">
          <div className="charts-skeleton-shimmer" />
        </div>
      ))}
    </div>
  )
}

function toCsv(records: ReviewRecord[]): string {
  const headers = [
    'review_id',
    'text',
    'source',
    'timestamp',
    'product_id',
    'original_text',
    'detected_language',
    'translated',
  ]
  const escapeCell = (value: string) => `"${value.replaceAll('"', '""')}"`
  const rows = records.map((record) =>
    [
      escapeCell(record.review_id),
      escapeCell(record.text),
      escapeCell(record.source),
      escapeCell(record.timestamp),
      escapeCell(record.product_id),
      escapeCell(record.original_text ?? ''),
      escapeCell(record.detected_language ?? ''),
      escapeCell(String(record.translated ?? false)),
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

function getRecordLanguage(record: ReviewRecord): string {
  return (record.detected_language ?? '').trim().toLowerCase() || 'unknown'
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
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
  const [languageFilter, setLanguageFilter] = useState('all')
  const [translationFilter, setTranslationFilter] = useState<TranslationFilter>('all')
  const [sortBy, setSortBy] = useState<DatasetSort>('timestamp_desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [showRawJson, setShowRawJson] = useState(false)
  const [requestedChunkSize, setRequestedChunkSize] = useState(DEFAULT_CHUNK_SIZE)
  const [fakeResults, setFakeResults] = useState<FakeReviewResult[] | null>(null)
  const [fakeLoading, setFakeLoading] = useState(false)
  const [fakeError, setFakeError] = useState<string | null>(null)
  const [insights, setInsights] = useState<InsightsResponse | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)

  useEffect(() => {
    setFakeResults(null)
    setFakeError(null)
    setInsights(null)
    setInsightsError(null)
  }, [result, filterText, languageFilter, translationFilter, sortBy])

  const fakeByReviewId = useMemo(() => {
    const map = new Map<string, FakeReviewResult>()
    fakeResults?.forEach((row) => map.set(row.review_id, row))
    return map
  }, [fakeResults])

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

  const languageOptions = useMemo(() => {
    if (!result) {
      return ['all']
    }
    const values = new Set<string>()
    result.reviews.forEach((record) => values.add(getRecordLanguage(record)))
    return ['all', ...Array.from(values).sort()]
  }, [result])

  const filteredAndSortedRecords = useMemo(() => {
    if (!result) {
      return []
    }

    const needle = filterText.trim().toLowerCase()
    const filtered = result.reviews.filter((record) => {
      const language = getRecordLanguage(record)
      const translated = record.translated ?? false

      if (languageFilter !== 'all' && language !== languageFilter) {
        return false
      }
      if (translationFilter === 'translated' && !translated) {
        return false
      }
      if (translationFilter === 'not_translated' && translated) {
        return false
      }
      if (!needle) {
        return true
      }

      return [
        record.review_id,
        record.text,
        record.source,
        record.product_id,
        record.timestamp,
        record.original_text ?? '',
        language,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'text_length_desc' || sortBy === 'text_length_asc') {
        const lengthCompare = a.text.length - b.text.length
        return sortBy === 'text_length_asc' ? lengthCompare : -lengthCompare
      }

      const aTimestamp = new Date(a.timestamp).getTime()
      const bTimestamp = new Date(b.timestamp).getTime()
      if (Number.isNaN(aTimestamp) || Number.isNaN(bTimestamp)) {
        return sortBy === 'timestamp_asc'
          ? a.timestamp.localeCompare(b.timestamp)
          : b.timestamp.localeCompare(a.timestamp)
      }
      return sortBy === 'timestamp_asc' ? aTimestamp - bTimestamp : bTimestamp - aTimestamp
    })

    return sorted
  }, [filterText, languageFilter, result, sortBy, translationFilter])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRecords.length / PAGE_SIZE))
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const paginatedRecords = filteredAndSortedRecords.slice(pageStart, pageStart + PAGE_SIZE)
  const previewRecords = filteredAndSortedRecords.slice(0, 20)
  const allRecords = result?.reviews ?? []

  const fakeSummary = useMemo(() => {
    if (!fakeResults?.length) {
      return null
    }
    const fakes = fakeResults.filter((r) => r.is_fake).length
    const avgRisk =
      fakeResults.reduce((acc, r) => acc + r.fake_confidence, 0) / fakeResults.length
    return { analyzed: fakeResults.length, fakes, avgRisk }
  }, [fakeResults])

  const handleAnalyzeFakes = async () => {
    if (!filteredAndSortedRecords.length) {
      return
    }
    setFakeError(null)
    setFakeLoading(true)
    try {
      const batch = filteredAndSortedRecords.slice(0, FAKE_ANALYZE_MAX_ROWS)
      const response = await analyzeFakeReviews(batch)
      setFakeResults(response.results)
    } catch (err) {
      setFakeResults(null)
      setFakeError(err instanceof Error ? err.message : 'Fake detection failed.')
    } finally {
      setFakeLoading(false)
    }
  }

  const handleAnalyzeInsights = async () => {
    if (!filteredAndSortedRecords.length) {
      return
    }
    setInsightsError(null)
    setInsightsLoading(true)
    try {
      const batch = filteredAndSortedRecords.slice(0, INSIGHTS_MAX_ROWS)
      const response = await analyzeInsights(batch)
      setInsights(response)
    } catch (err) {
      setInsights(null)
      setInsightsError(err instanceof Error ? err.message : 'Insights request failed.')
    } finally {
      setInsightsLoading(false)
    }
  }

  const insightsHasZScore = useMemo(
    () =>
      insights?.trends.some((t) => t.z_score != null && t.z_score !== undefined) ?? false,
    [insights],
  )

  const renderFakeCells = (record: ReviewRecord) => {
    const fr = fakeByReviewId.get(record.review_id)
    if (!fr) {
      return (
        <>
          <td className="fake-col">—</td>
          <td className="fake-col">—</td>
          <td className="fake-col fake-signals">—</td>
        </>
      )
    }
    const signalsText =
      fr.fake_signals.length > 0 ? fr.fake_signals.map((s) => s.replaceAll('_', ' ')).join(', ') : '—'
    return (
      <>
        <td className="fake-col">
          <span className={`fake-verdict ${fr.is_fake ? 'fake-verdict--fake' : 'fake-verdict--real'}`}>
            {fr.is_fake ? 'Likely fake' : 'Likely real'}
          </span>
        </td>
        <td className="fake-col" title={fr.explanation}>
          {(fr.fake_confidence * 100).toFixed(1)}%
          {fr.ml_fake_prob != null ? (
            <span className="fake-ml-hint"> (ML {(fr.ml_fake_prob * 100).toFixed(0)}%)</span>
          ) : null}
        </td>
        <td className="fake-col fake-signals" title={fr.explanation}>
          {signalsText}
          {fr.similarity_neighbor ? <span className="fake-dup-flag"> · near-dup</span> : null}
        </td>
      </>
    )
  }

  const metrics = useMemo(() => {
    const total = filteredAndSortedRecords.length
    const translatedCount = filteredAndSortedRecords.filter((item) => item.translated).length
    const originalTextMissing = filteredAndSortedRecords.filter((item) => !item.original_text).length
    const emptyCleaned = filteredAndSortedRecords.filter((item) => !item.text.trim()).length
    const languages = new Map<string, number>()
    const wordFreq = new Map<string, number>()
    let cleanedLengthSum = 0
    let originalLengthSum = 0

    filteredAndSortedRecords.forEach((record) => {
      const language = getRecordLanguage(record)
      languages.set(language, (languages.get(language) ?? 0) + 1)
      cleanedLengthSum += record.text.length
      originalLengthSum += (record.original_text ?? '').length
      tokenize(record.text).forEach((token) => {
        wordFreq.set(token, (wordFreq.get(token) ?? 0) + 1)
      })
    })

    const languageChartData = Array.from(languages.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    const topTokenData = Array.from(wordFreq.entries())
      .map(([token, count]) => ({ token, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    const translationChartData = [
      { name: 'Translated', value: translatedCount },
      { name: 'Not Translated', value: Math.max(0, total - translatedCount) },
    ]

    const qualityChartData = [
      { name: 'Missing Original', value: originalTextMissing },
      { name: 'Empty Cleaned', value: emptyCleaned },
      { name: 'Unique Languages', value: languages.size },
    ]

    const avgCleanedLength = total === 0 ? 0 : cleanedLengthSum / total
    const avgOriginalLength = total === 0 ? 0 : originalLengthSum / total
    const compressionRatio = avgOriginalLength === 0 ? 0 : avgCleanedLength / avgOriginalLength

    return {
      total,
      translatedCount,
      translatedPct: total === 0 ? 0 : (translatedCount / total) * 100,
      uniqueLanguages: languages.size,
      avgCleanedLength,
      avgOriginalLength,
      compressionRatio,
      languageChartData,
      translationChartData,
      qualityChartData,
      topTokenData,
    }
  }, [filteredAndSortedRecords])

  const runRequest = async (request: () => Promise<IngestionResponse>) => {
    setError(null)
    setIsLoading(true)
    try {
      const response = await request()
      setResult(response)
      setCurrentPage(1)
      setLanguageFilter('all')
      setTranslationFilter('all')
      setRequestedChunkSize(response.chunk_size ?? DEFAULT_CHUNK_SIZE)
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

  const handleProcessNextChunk = async () => {
    const sessionId = result?.session_id
    const hasMore = result?.has_more ?? false
    if (!sessionId || !hasMore) {
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      const response = await processNextChunk(sessionId, requestedChunkSize)
      setResult((previous) => {
        if (!previous) {
          return response
        }
        return {
          ...response,
          reviews: [...previous.reviews, ...response.reviews],
          count: previous.count + response.count,
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chunk processing failed.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProcessAllRemaining = async () => {
    if (!result?.session_id || !(result.has_more ?? false)) {
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      let latest = result
      let aggregatedReviews = [...result.reviews]
      let aggregatedCount = result.count
      let guard = 0

      while ((latest.has_more ?? false) && guard < 100) {
        const response = await processNextChunk(latest.session_id ?? '', requestedChunkSize)
        aggregatedReviews = [...aggregatedReviews, ...response.reviews]
        aggregatedCount += response.count
        latest = {
          ...response,
          reviews: aggregatedReviews,
          count: aggregatedCount,
        }
        guard += 1
      }

      setResult(latest)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing remaining chunks failed.')
    } finally {
      setIsLoading(false)
    }
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
              id={`ingest-tab-${candidateMode}`}
              type="button"
              role="tab"
              aria-selected={mode === candidateMode}
              aria-controls="ingest-mode-panel"
              className={`mode-tab ${mode === candidateMode ? 'active' : ''}`}
              onClick={() => setMode(candidateMode)}
              disabled={isLoading}
            >
              {candidateMode.toUpperCase()}
            </button>
          ))}
        </div>

        <div
          id="ingest-mode-panel"
          className="mode-card"
          role="tabpanel"
          aria-labelledby={`ingest-tab-${mode}`}
        >
          {renderModeInputs()}
        </div>

        <div className="mode-actions">
          <button type="button" onClick={handleSubmit} disabled={isLoading} aria-busy={isLoading}>
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
              <article className="summary-card">
                <h3>Total Rows</h3>
                <p>{result.total_rows ?? result.count}</p>
              </article>
              <article className="summary-card">
                <h3>Processed Rows</h3>
                <p>{result.processed_rows ?? result.count}</p>
              </article>
              <article className="summary-card">
                <h3>Remaining Rows</h3>
                <p>{result.remaining_rows ?? 0}</p>
              </article>
            </div>

            <div className="chunk-controls">
              <label htmlFor="chunk-size-input">
                Chunk size
                <input
                  id="chunk-size-input"
                  type="number"
                  min={MIN_CHUNK_SIZE}
                  max={MAX_CHUNK_SIZE}
                  value={requestedChunkSize}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    if (!Number.isNaN(value)) {
                      setRequestedChunkSize(Math.max(MIN_CHUNK_SIZE, Math.min(MAX_CHUNK_SIZE, value)))
                    }
                  }}
                  disabled={isLoading}
                />
              </label>
              <button
                type="button"
                className="secondary-btn"
                onClick={handleProcessNextChunk}
                disabled={isLoading || !(result.has_more ?? false) || !result.session_id}
                aria-busy={isLoading}
              >
                Process Next Chunk
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={handleProcessAllRemaining}
                disabled={isLoading || !(result.has_more ?? false) || !result.session_id}
                aria-busy={isLoading}
              >
                Process Remaining
              </button>
              <p className="chunk-status">
                {result.has_more
                  ? 'Partial dataset loaded. Process next chunk to continue.'
                  : 'All rows processed for this dataset.'}
              </p>
            </div>

            <div className="fake-detect-panel">
              <h3>Fake review detection</h3>
              <p className="mode-hint">
                Runs hybrid scoring on the dataset after your filters (max {FAKE_ANALYZE_MAX_ROWS} rows per
                request). Clear filters to score more rows.
              </p>
              <div className="fake-detect-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleAnalyzeFakes}
                  disabled={fakeLoading || filteredAndSortedRecords.length === 0}
                  aria-busy={fakeLoading}
                >
                  {fakeLoading ? 'Analyzing…' : 'Run fake detection'}
                </button>
                {fakeSummary ? (
                  <p className="fake-detect-summary" role="status">
                    Analyzed {fakeSummary.analyzed}: {fakeSummary.fakes} flagged likely fake · avg risk score{' '}
                    {(fakeSummary.avgRisk * 100).toFixed(1)}%
                    {filteredAndSortedRecords.length > FAKE_ANALYZE_MAX_ROWS ? (
                      <span className="fake-detect-truncate">
                        {' '}
                        (only first {FAKE_ANALYZE_MAX_ROWS} filtered rows sent)
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>
              {fakeError ? <p className="error-text">{fakeError}</p> : null}
            </div>

            <div
              className="insights-panel"
              role="region"
              aria-label="Trend and urgency insights"
            >
              <h3>Trends and urgency</h3>
              <p className="mode-hint">
                Compares the latest window of reviews vs the prior window (lexicon themes, sentiment,
                optional fake-rate). Uses filtered rows (max {INSIGHTS_MAX_ROWS} per request).
              </p>
              <div className="insights-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleAnalyzeInsights}
                  disabled={insightsLoading || filteredAndSortedRecords.length === 0}
                  aria-busy={insightsLoading}
                >
                  {insightsLoading ? 'Computing…' : 'Run insights'}
                </button>
              </div>
              {insightsError ? <p className="error-text">{insightsError}</p> : null}
              {insights ? (
                <div className="insights-body" aria-live="polite">
                  <div className="summary-grid insights-summary-grid">
                    <article className="summary-card insights-card-urgency">
                      <h3>Urgency</h3>
                      <p className="insights-urgency-line">
                        <span className="insights-urgency-score">{insights.urgency_score.toFixed(1)}</span>
                        <span
                          className={`insights-urgency-pill insights-urgency-pill--${insights.urgency_level}`}
                        >
                          {insights.urgency_level === 'high'
                            ? 'Immediate attention'
                            : insights.urgency_level === 'medium'
                              ? 'Monitor'
                              : 'Low priority'}
                        </span>
                      </p>
                      <p className="insights-legend">
                        Score over 80 suggests immediate ops review; 50–80 monitor; under 50 typically safe
                        to backlog.
                      </p>
                    </article>
                    <article className="summary-card">
                      <h3>Raw sentiment</h3>
                      <p>{insights.bias.raw_sentiment.toFixed(3)}</p>
                      <p className="insights-subnote">Mean TextBlob polarity (current window)</p>
                    </article>
                    <article className="summary-card">
                      <h3>Adjusted sentiment</h3>
                      <p>{insights.bias.adjusted_sentiment.toFixed(3)}</p>
                      <p className="insights-subnote">
                        Shrinkage toward neutral (bias correction); Δ{' '}
                        {(insights.bias.adjusted_sentiment - insights.bias.raw_sentiment).toFixed(3)}
                      </p>
                    </article>
                    <article className="summary-card">
                      <h3>Volume weight</h3>
                      <p>{(insights.bias.volume_weight * 100).toFixed(0)}%</p>
                      <p className="insights-subnote">Confidence from sample size</p>
                    </article>
                  </div>
                  <p className="insights-meta">
                    Windows: prev {insights.meta.previous_window_size} · current{' '}
                    {insights.meta.current_window_size} · anomaly: {insights.meta.anomaly_mode}
                    {insights.meta.notes ? ` · ${insights.meta.notes}` : ''}
                  </p>
                  <h4 className="insights-subheading">Feature trend table</h4>
                  <p className="insights-legend">
                    Classification uses change in mention rate (percentage points): under 5% noise, 5–20%
                    emerging, over 20% systemic.
                  </p>
                  <div className="table-wrap insights-table-wrap">
                    <table className="insights-table">
                      <thead>
                        <tr>
                          <th>Feature</th>
                          <th>Prev</th>
                          <th>Now</th>
                          <th>Delta</th>
                          <th>Trend</th>
                          <th>Severity</th>
                          {insightsHasZScore ? <th>Z / score</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {[...insights.trends]
                          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                          .slice(0, 8)
                          .map((t) => {
                            const clf = t.classification
                            const chipClass =
                              clf === 'systemic'
                                ? 'insights-chip insights-chip--systemic'
                                : clf === 'emerging'
                                  ? 'insights-chip insights-chip--emerging'
                                  : 'insights-chip insights-chip--noise'
                            return (
                              <tr key={t.feature}>
                                <td>{t.feature}</td>
                                <td>{(t.prev_rate * 100).toFixed(1)}%</td>
                                <td>{(t.current_rate * 100).toFixed(1)}%</td>
                                <td>{(t.delta * 100).toFixed(1)} pp</td>
                                <td>
                                  <span className={`insights-trend insights-trend--${t.trend}`}>
                                    {t.trend}
                                  </span>
                                </td>
                                <td>
                                  <span className={chipClass}>{clf}</span>
                                </td>
                                {insightsHasZScore ? (
                                  <td>{t.z_score != null ? t.z_score.toFixed(2) : '—'}</td>
                                ) : null}
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                  {insights.urgency_items.length > 0 ? (
                    <>
                      <h4 className="insights-subheading">Urgency by feature</h4>
                      <ul className="insights-urgency-list">
                        {insights.urgency_items.map((u) => (
                          <li key={u.feature}>
                            <span className={`insights-urgency-pill insights-urgency-pill--${u.urgency}`}>
                              {u.urgency}
                            </span>{' '}
                            <strong>{u.feature}</strong> (score {u.score.toFixed(0)}): {u.action}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  <h4 className="insights-subheading">Recommendations</h4>
                  {insights.recommendations.length > 0 ? (
                    <ul className="insights-rec-list">
                      {insights.recommendations.map((line, i) => (
                        <li key={`rec-${i}`}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="insights-subnote">No recommendation lines returned.</p>
                  )}
                </div>
              ) : null}
            </div>

            <h3>Preprocessing Analytics</h3>
            <div className="summary-grid analytics-summary-grid">
              <article className="summary-card">
                <h3>Total Displayed</h3>
                <p>{metrics.total}</p>
              </article>
              <article className="summary-card">
                <h3>Unique Languages</h3>
                <p>{metrics.uniqueLanguages}</p>
              </article>
              <article className="summary-card">
                <h3>Translated</h3>
                <p>
                  {metrics.translatedCount} ({metrics.translatedPct.toFixed(1)}%)
                </p>
              </article>
              <article className="summary-card">
                <h3>Avg Cleaned Length</h3>
                <p>{metrics.avgCleanedLength.toFixed(1)}</p>
              </article>
              <article className="summary-card">
                <h3>Avg Original Length</h3>
                <p>{metrics.avgOriginalLength.toFixed(1)}</p>
              </article>
              <article className="summary-card">
                <h3>Compression Ratio</h3>
                <p>{metrics.compressionRatio.toFixed(2)}</p>
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
                Sort
                <select
                  id="sort-order"
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value as DatasetSort)
                    setCurrentPage(1)
                  }}
                >
                  <option value="timestamp_desc">Newest first</option>
                  <option value="timestamp_asc">Oldest first</option>
                  <option value="text_length_desc">Longest cleaned text</option>
                  <option value="text_length_asc">Shortest cleaned text</option>
                </select>
              </label>

              <label htmlFor="language-filter">
                Language
                <select
                  id="language-filter"
                  value={languageFilter}
                  onChange={(event) => {
                    setLanguageFilter(event.target.value)
                    setCurrentPage(1)
                  }}
                >
                  {languageOptions.map((language) => (
                    <option key={language} value={language}>
                      {language === 'all' ? 'All languages' : language}
                    </option>
                  ))}
                </select>
              </label>

              <label htmlFor="translation-filter">
                Translation
                <select
                  id="translation-filter"
                  value={translationFilter}
                  onChange={(event) => {
                    setTranslationFilter(event.target.value as TranslationFilter)
                    setCurrentPage(1)
                  }}
                >
                  <option value="all">All</option>
                  <option value="translated">Translated</option>
                  <option value="not_translated">Not translated</option>
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

            <Suspense fallback={<ChartsSkeleton />}>
              <DataInputCharts
                languageChartData={metrics.languageChartData}
                translationChartData={metrics.translationChartData}
                qualityChartData={metrics.qualityChartData}
                topTokenData={metrics.topTokenData}
              />
            </Suspense>

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
                    <th>Original Text</th>
                    <th>Language</th>
                    <th>Translated</th>
                    <th>Fake verdict</th>
                    <th>Risk %</th>
                    <th>Signals</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11}>No records match current filter.</td>
                    </tr>
                  ) : (
                    previewRecords.map((record) => (
                      <tr key={`preview-${record.review_id}-${record.timestamp}`}>
                        <td>{record.review_id}</td>
                        <td>{record.text}</td>
                        <td>{record.source}</td>
                        <td>{formatTimestamp(record.timestamp)}</td>
                        <td>{record.product_id}</td>
                        <td>{record.original_text || '—'}</td>
                        <td>
                          <span className="data-chip">{getRecordLanguage(record)}</span>
                        </td>
                        <td>
                          <span
                            className={`data-chip ${record.translated ? 'chip-yes' : 'chip-no'}`}
                          >
                            {record.translated ? 'Yes' : 'No'}
                          </span>
                        </td>
                        {renderFakeCells(record)}
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
                    <th>Original Text</th>
                    <th>Language</th>
                    <th>Translated</th>
                    <th>Fake verdict</th>
                    <th>Risk %</th>
                    <th>Signals</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11}>No records match current filter.</td>
                    </tr>
                  ) : (
                    paginatedRecords.map((record) => (
                      <tr key={`full-${record.review_id}-${record.timestamp}`}>
                        <td>{record.review_id}</td>
                        <td>{record.text}</td>
                        <td>{record.source}</td>
                        <td>{formatTimestamp(record.timestamp)}</td>
                        <td>{record.product_id}</td>
                        <td>{record.original_text || '—'}</td>
                        <td>
                          <span className="data-chip">{getRecordLanguage(record)}</span>
                        </td>
                        <td>
                          <span
                            className={`data-chip ${record.translated ? 'chip-yes' : 'chip-no'}`}
                          >
                            {record.translated ? 'Yes' : 'No'}
                          </span>
                        </td>
                        {renderFakeCells(record)}
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
                <pre className="raw-json">
                  {JSON.stringify(
                    {
                      ...result,
                      total_records: allRecords.length,
                      displayed_records: filteredAndSortedRecords.length,
                    },
                    null,
                    2,
                  )}
                </pre>
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
