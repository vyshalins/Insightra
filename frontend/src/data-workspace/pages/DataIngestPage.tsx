import { MAX_CHUNK_SIZE, MIN_CHUNK_SIZE } from '../constants'
import { useDataWorkspace } from '../DataWorkspaceContext'

export default function DataIngestPage() {
  const {
    mode,
    setMode,
    csvFile,
    setCsvFile,
    jsonFile,
    setJsonFile,
    manualText,
    setManualText,
    youtubeUrl,
    setYoutubeUrl,
    isLoading,
    error,
    result,
    requestedChunkSize,
    setRequestedChunkSize,
    liveStreamActive,
    liveStreamError,
    streamIntervalMs,
    setStreamIntervalMs,
    resetModeInputs,
    handleSubmit,
    handleProcessNextChunk,
    handleProcessAllRemaining,
    handleStartLiveStream,
    handleStopLiveStream,
  } = useDataWorkspace()

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
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Ingestion Input</h2>
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
              disabled={isLoading || liveStreamActive}
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
          <button
            type="button"
            className="nb-btn nb-btn--push"
            onClick={() => void handleSubmit()}
            disabled={isLoading || liveStreamActive}
            aria-busy={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
          </button>
          <button
            type="button"
            className="nb-btn nb-btn--secondary"
            onClick={() => resetModeInputs(mode)}
            disabled={isLoading || liveStreamActive}
          >
            Clear Input
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Dataset Summary</h2>
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
                className="nb-btn nb-btn--secondary"
                onClick={() => void handleProcessNextChunk()}
                disabled={
                  isLoading ||
                  liveStreamActive ||
                  !(result.has_more ?? false) ||
                  !result.session_id
                }
                aria-busy={isLoading}
              >
                Process Next Chunk
              </button>
              <button
                type="button"
                className="nb-btn nb-btn--secondary"
                onClick={() => void handleProcessAllRemaining()}
                disabled={
                  isLoading ||
                  liveStreamActive ||
                  !(result.has_more ?? false) ||
                  !result.session_id
                }
                aria-busy={isLoading}
              >
                Process Remaining
              </button>
              <p className="chunk-status">
                {result.has_more
                  ? 'Partial dataset loaded. Process next chunk to continue.'
                  : 'All rows processed for this dataset.'}
              </p>
              <div className="live-stream-controls" aria-label="Simulated live replay">
                <label htmlFor="stream-interval-ms">
                  Stream interval (ms)
                  <input
                    id="stream-interval-ms"
                    type="number"
                    min={50}
                    max={60000}
                    value={streamIntervalMs}
                    onChange={(event) => setStreamIntervalMs(event.target.value)}
                    disabled={isLoading || liveStreamActive}
                  />
                </label>
                <button
                  type="button"
                  className="nb-btn nb-btn--push"
                  onClick={handleStartLiveStream}
                  disabled={isLoading || liveStreamActive || !result.session_id}
                >
                  Start live stream
                </button>
                <button
                  type="button"
                  className="nb-btn nb-btn--secondary"
                  onClick={handleStopLiveStream}
                  disabled={!liveStreamActive}
                >
                  Stop stream
                </button>
                <p className="mode-hint">
                  Replays all normalized rows from this session over a WebSocket (clears the table first,
                  then pushes one review at a time). Use Intelligence and Analytics steps after loading.
                </p>
                {liveStreamError ? <p className="error-text">{liveStreamError}</p> : null}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
