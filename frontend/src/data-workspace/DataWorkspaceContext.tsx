import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { flushSync } from 'react-dom'
import {
  analyzeFakeReviews,
  analyzeInsights,
  fetchYoutube,
  getReviewStreamWsUrl,
  processNextChunk,
  uploadCsv,
  uploadJson,
  uploadManual,
  type FakeReviewResult,
  type InsightsResponse,
  type IngestionResponse,
  type ReviewRecord,
} from '../api'
import {
  DEFAULT_CHUNK_SIZE,
  FAKE_ANALYZE_MAX_ROWS,
  INSIGHTS_MAX_ROWS,
  LIVE_ANALYSIS_DEBOUNCE_MS,
  PAGE_SIZE,
} from './constants'
import { downloadFile, getRecordLanguage, toCsv, tokenize } from './utils'

export type InputMode = 'csv' | 'json' | 'manual' | 'youtube'
export type TranslationFilter = 'all' | 'translated' | 'not_translated'
export type DatasetSort = 'timestamp_desc' | 'timestamp_asc' | 'text_length_desc' | 'text_length_asc'

export type DataWorkspaceContextValue = {
  mode: InputMode
  setMode: (m: InputMode) => void
  csvFile: File | null
  setCsvFile: (f: File | null) => void
  jsonFile: File | null
  setJsonFile: (f: File | null) => void
  manualText: string
  setManualText: (t: string) => void
  youtubeUrl: string
  setYoutubeUrl: (t: string) => void
  isLoading: boolean
  error: string | null
  result: IngestionResponse | null
  filterText: string
  setFilterText: (t: string) => void
  languageFilter: string
  setLanguageFilter: (t: string) => void
  translationFilter: TranslationFilter
  setTranslationFilter: (t: TranslationFilter) => void
  sortBy: DatasetSort
  setSortBy: (s: DatasetSort) => void
  currentPage: number
  setCurrentPage: Dispatch<SetStateAction<number>>
  showRawJson: boolean
  setShowRawJson: Dispatch<SetStateAction<boolean>>
  requestedChunkSize: number
  setRequestedChunkSize: Dispatch<SetStateAction<number>>
  fakeResults: FakeReviewResult[] | null
  fakeLoading: boolean
  fakeError: string | null
  /** Full insights payload (trends, bias, recommendations, urgency). */
  insights: InsightsResponse | null
  insightsLoading: boolean
  insightsError: string | null
  liveStreamActive: boolean
  liveStreamError: string | null
  streamIntervalMs: string
  setStreamIntervalMs: (s: string) => void
  filteredAndSortedRecords: ReviewRecord[]
  languageOptions: string[]
  totalPages: number
  paginatedRecords: ReviewRecord[]
  previewRecords: ReviewRecord[]
  allRecords: ReviewRecord[]
  metrics: {
    total: number
    translatedCount: number
    translatedPct: number
    uniqueLanguages: number
    avgCleanedLength: number
    avgOriginalLength: number
    compressionRatio: number
    languageChartData: { name: string; value: number }[]
    translationChartData: { name: string; value: number }[]
    qualityChartData: { name: string; value: number }[]
    topTokenData: { token: string; count: number }[]
  }
  fakeByReviewId: Map<string, FakeReviewResult>
  insightsHasZScore: boolean
  resetModeInputs: (targetMode: InputMode) => void
  handleSubmit: () => Promise<void>
  handleProcessNextChunk: () => Promise<void>
  handleProcessAllRemaining: () => Promise<void>
  handleAnalyzeFakes: () => Promise<void>
  handleAnalyzeInsights: () => Promise<void>
  handleExportJson: () => void
  handleExportCsv: () => void
  handleStartLiveStream: () => void
  handleStopLiveStream: () => void
  renderFakeCells: (record: ReviewRecord) => ReactNode
}

const DataWorkspaceContext = createContext<DataWorkspaceContextValue | null>(null)

export function DataWorkspaceProvider({ children }: { children: ReactNode }) {
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
  const [datasetRevision, setDatasetRevision] = useState(0)
  const [liveStreamActive, setLiveStreamActive] = useState(false)
  const [liveStreamError, setLiveStreamError] = useState<string | null>(null)
  const [streamIntervalMs, setStreamIntervalMs] = useState('1500')

  const liveReviewsRef = useRef<ReviewRecord[]>([])
  const liveWsRef = useRef<WebSocket | null>(null)
  const liveDebounceRef = useRef<number | null>(null)
  const liveAnalysisGen = useRef(0)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setFakeResults(null)
      setFakeError(null)
      setInsights(null)
      setInsightsError(null)
    }, 0)
    return () => window.clearTimeout(id)
  }, [datasetRevision, filterText, languageFilter, translationFilter, sortBy])

  const fakeByReviewId = useMemo(() => {
    const map = new Map<string, FakeReviewResult>()
    fakeResults?.forEach((row) => map.set(row.review_id, row))
    return map
  }, [fakeResults])

  const resetModeInputs = useCallback((targetMode: InputMode) => {
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
  }, [])

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

  const handleAnalyzeFakes = useCallback(async () => {
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
  }, [filteredAndSortedRecords])

  const handleAnalyzeInsights = useCallback(async () => {
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
  }, [filteredAndSortedRecords])

  const clearLiveDebounce = useCallback(() => {
    if (liveDebounceRef.current != null) {
      window.clearTimeout(liveDebounceRef.current)
      liveDebounceRef.current = null
    }
  }, [])

  const runLiveAnalysis = useCallback(async (reviews: ReviewRecord[]) => {
    const gen = ++liveAnalysisGen.current
    const fakeBatch = reviews.slice(0, FAKE_ANALYZE_MAX_ROWS)
    const insightsBatch = reviews.slice(0, INSIGHTS_MAX_ROWS)
    if (fakeBatch.length === 0) {
      return
    }
    setFakeError(null)
    setInsightsError(null)
    setFakeLoading(true)
    setInsightsLoading(true)
    try {
      const [fakeResponse, insightsResponse] = await Promise.all([
        analyzeFakeReviews(fakeBatch),
        analyzeInsights(insightsBatch),
      ])
      if (gen !== liveAnalysisGen.current) {
        return
      }
      setFakeResults(fakeResponse.results)
      setInsights(insightsResponse)
    } catch (err) {
      if (gen !== liveAnalysisGen.current) {
        return
      }
      setFakeResults(null)
      setInsights(null)
      const message = err instanceof Error ? err.message : 'Live analysis failed.'
      setFakeError(message)
      setInsightsError(message)
    } finally {
      if (gen === liveAnalysisGen.current) {
        setFakeLoading(false)
        setInsightsLoading(false)
      }
    }
  }, [])

  const scheduleLiveAnalysis = useCallback(() => {
    clearLiveDebounce()
    liveDebounceRef.current = window.setTimeout(() => {
      liveDebounceRef.current = null
      void runLiveAnalysis(liveReviewsRef.current)
    }, LIVE_ANALYSIS_DEBOUNCE_MS)
  }, [clearLiveDebounce, runLiveAnalysis])

  const handleStopLiveStream = useCallback(() => {
    clearLiveDebounce()
    if (liveWsRef.current) {
      liveWsRef.current.close()
      liveWsRef.current = null
    }
    setLiveStreamActive(false)
  }, [clearLiveDebounce])

  const handleStartLiveStream = useCallback(() => {
    const sessionId = result?.session_id
    if (!sessionId || liveStreamActive) {
      return
    }
    const parsedInterval = Number.parseInt(streamIntervalMs, 10)
    const intervalMs = Number.isNaN(parsedInterval)
      ? 1500
      : Math.min(60_000, Math.max(50, parsedInterval))

    handleStopLiveStream()
    liveAnalysisGen.current += 1
    setLiveStreamError(null)
    liveReviewsRef.current = []

    flushSync(() => {
      setDatasetRevision((v) => v + 1)
      setResult((prev) => {
        if (!prev) {
          return prev
        }
        const total = prev.total_rows ?? prev.count
        return {
          ...prev,
          reviews: [],
          count: 0,
          processed_rows: 0,
          remaining_rows: total,
          has_more: false,
        }
      })
    })

    setLiveStreamActive(true)
    const url = getReviewStreamWsUrl(sessionId, intervalMs)
    const ws = new WebSocket(url)
    liveWsRef.current = ws

    ws.onmessage = (event) => {
      let data: { type: string; review?: ReviewRecord; detail?: unknown; count?: number }
      try {
        data = JSON.parse(event.data as string) as typeof data
      } catch {
        setLiveStreamError('Invalid message from stream.')
        handleStopLiveStream()
        return
      }

      if (data.type === 'error') {
        setLiveStreamError(
          typeof data.detail === 'string' ? data.detail : 'Stream rejected by server.',
        )
        handleStopLiveStream()
        return
      }

      if (data.type === 'review' && data.review) {
        liveReviewsRef.current = [...liveReviewsRef.current, data.review]
        setResult((prev) => {
          if (!prev) {
            return prev
          }
          return {
            ...prev,
            reviews: [...prev.reviews, data.review as ReviewRecord],
            count: prev.count + 1,
            processed_rows: (prev.processed_rows ?? 0) + 1,
            remaining_rows: Math.max(0, (prev.remaining_rows ?? 0) - 1),
          }
        })
        scheduleLiveAnalysis()
        return
      }

      if (data.type === 'done') {
        clearLiveDebounce()
        void runLiveAnalysis(liveReviewsRef.current)
        setLiveStreamActive(false)
        ws.close()
        liveWsRef.current = null
      }
    }

    ws.onerror = () => {
      setLiveStreamError('WebSocket connection error.')
    }

    ws.onclose = () => {
      liveWsRef.current = null
      setLiveStreamActive(false)
    }
  }, [
    result?.session_id,
    liveStreamActive,
    streamIntervalMs,
    handleStopLiveStream,
    scheduleLiveAnalysis,
    clearLiveDebounce,
    runLiveAnalysis,
  ])

  useEffect(
    () => () => {
      clearLiveDebounce()
      liveWsRef.current?.close()
      liveWsRef.current = null
    },
    [clearLiveDebounce],
  )

  const insightsHasZScore = useMemo(
    () =>
      insights?.trends.some((t) => t.z_score != null && t.z_score !== undefined) ?? false,
    [insights],
  )

  const renderFakeCells = useCallback(
    (record: ReviewRecord) => {
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
    },
    [fakeByReviewId],
  )

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

  const runRequest = useCallback(async (request: () => Promise<IngestionResponse>) => {
    setError(null)
    setIsLoading(true)
    try {
      const response = await request()
      setResult(response)
      setDatasetRevision((v) => v + 1)
      setCurrentPage(1)
      setLanguageFilter('all')
      setTranslationFilter('all')
      setRequestedChunkSize(response.chunk_size ?? DEFAULT_CHUNK_SIZE)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSubmit = useCallback(async () => {
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
  }, [mode, csvFile, jsonFile, manualText, youtubeUrl, runRequest])

  const handleExportJson = useCallback(() => {
    const content = JSON.stringify(filteredAndSortedRecords, null, 2)
    downloadFile('displayed-reviews.json', content, 'application/json')
  }, [filteredAndSortedRecords])

  const handleExportCsv = useCallback(() => {
    const content = toCsv(filteredAndSortedRecords)
    downloadFile('displayed-reviews.csv', content, 'text/csv;charset=utf-8')
  }, [filteredAndSortedRecords])

  const handleProcessNextChunk = useCallback(async () => {
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
      setDatasetRevision((v) => v + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chunk processing failed.')
    } finally {
      setIsLoading(false)
    }
  }, [result?.session_id, result?.has_more, requestedChunkSize])

  const handleProcessAllRemaining = useCallback(async () => {
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
      setDatasetRevision((v) => v + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing remaining chunks failed.')
    } finally {
      setIsLoading(false)
    }
  }, [result, requestedChunkSize])

  const value: DataWorkspaceContextValue = {
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
    filterText,
    setFilterText,
    languageFilter,
    setLanguageFilter,
    translationFilter,
    setTranslationFilter,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    showRawJson,
    setShowRawJson,
    requestedChunkSize,
    setRequestedChunkSize,
    fakeResults,
    fakeLoading,
    fakeError,
    insights,
    insightsLoading,
    insightsError,
    liveStreamActive,
    liveStreamError,
    streamIntervalMs,
    setStreamIntervalMs,
    filteredAndSortedRecords,
    languageOptions,
    totalPages,
    paginatedRecords,
    previewRecords,
    allRecords,
    metrics,
    fakeByReviewId,
    insightsHasZScore,
    resetModeInputs,
    handleSubmit,
    handleProcessNextChunk,
    handleProcessAllRemaining,
    handleAnalyzeFakes,
    handleAnalyzeInsights,
    handleExportJson,
    handleExportCsv,
    handleStartLiveStream,
    handleStopLiveStream,
    renderFakeCells,
  }

  return <DataWorkspaceContext.Provider value={value}>{children}</DataWorkspaceContext.Provider>
}

export function useDataWorkspace(): DataWorkspaceContextValue {
  const ctx = useContext(DataWorkspaceContext)
  if (!ctx) {
    throw new Error('useDataWorkspace must be used within DataWorkspaceProvider')
  }
  return ctx
}

/** Optional hook for components that may render outside the provider. */
export function useDataWorkspaceOptional(): DataWorkspaceContextValue | null {
  return useContext(DataWorkspaceContext)
}
