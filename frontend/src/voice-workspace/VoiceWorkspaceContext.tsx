import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  analyzeFakeReviews,
  analyzeInsights,
  type FakeReviewResult,
  type InsightsResponse,
  type ReviewRecord,
  type VoiceAnalysisResult,
} from '../api'
import { FAKE_ANALYZE_MAX_ROWS, INSIGHTS_MAX_ROWS } from '../data-workspace/constants'

export type VoiceSession = {
  id: string
  fileName: string
  analyzedAt: string
  transcript: string
  emotion: string
  issues: string[]
  actions: string[]
}

export function sessionsToReviewRecords(sessions: VoiceSession[]): ReviewRecord[] {
  return sessions.map((s) => ({
    review_id: s.id,
    text: (s.transcript || '').trim() || '(empty transcript)',
    source: 'voice',
    timestamp: s.analyzedAt,
    product_id: (s.fileName || 'audio').replace(/\s+/g, ' ').slice(0, 120),
    original_text: s.transcript !== (s.transcript || '').trim() ? s.transcript : null,
    detected_language: 'en',
    translated: false,
  }))
}

export type VoiceWorkspaceContextValue = {
  sessions: VoiceSession[]
  addSession: (fileName: string, result: VoiceAnalysisResult) => void
  clearSessions: () => void
  reviewRecords: ReviewRecord[]
  fakeResults: FakeReviewResult[] | null
  fakeLoading: boolean
  fakeError: string | null
  insights: InsightsResponse | null
  insightsLoading: boolean
  insightsError: string | null
  handleAnalyzeFakes: () => Promise<void>
  handleAnalyzeInsights: () => Promise<void>
  fakeByReviewId: Map<string, FakeReviewResult>
  insightsHasZScore: boolean
}

const VoiceWorkspaceContext = createContext<VoiceWorkspaceContextValue | null>(null)

export function VoiceWorkspaceProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<VoiceSession[]>([])
  const [fakeResults, setFakeResults] = useState<FakeReviewResult[] | null>(null)
  const [fakeLoading, setFakeLoading] = useState(false)
  const [fakeError, setFakeError] = useState<string | null>(null)
  const [insights, setInsights] = useState<InsightsResponse | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)

  const clearAnalysis = useCallback(() => {
    setFakeResults(null)
    setFakeError(null)
    setInsights(null)
    setInsightsError(null)
  }, [])

  const addSession = useCallback(
    (fileName: string, result: VoiceAnalysisResult) => {
      const id = crypto.randomUUID()
      const analyzedAt = new Date().toISOString()
      setSessions((prev) => [
        {
          id,
          fileName,
          analyzedAt,
          transcript: result.transcript,
          emotion: result.emotion,
          issues: result.issues,
          actions: result.actions,
        },
        ...prev,
      ])
      clearAnalysis()
    },
    [clearAnalysis],
  )

  const clearSessions = useCallback(() => {
    setSessions([])
    clearAnalysis()
  }, [clearAnalysis])

  const reviewRecords = useMemo(() => sessionsToReviewRecords(sessions), [sessions])

  const fakeByReviewId = useMemo(() => {
    const map = new Map<string, FakeReviewResult>()
    fakeResults?.forEach((row) => map.set(row.review_id, row))
    return map
  }, [fakeResults])

  const insightsHasZScore = useMemo(
    () =>
      insights?.trends.some((t) => t.z_score != null && t.z_score !== undefined) ?? false,
    [insights],
  )

  const handleAnalyzeFakes = useCallback(async () => {
    if (!reviewRecords.length) {
      return
    }
    setFakeError(null)
    setFakeLoading(true)
    try {
      const batch = reviewRecords.slice(0, FAKE_ANALYZE_MAX_ROWS)
      const response = await analyzeFakeReviews(batch)
      setFakeResults(response.results)
    } catch (err) {
      setFakeResults(null)
      setFakeError(err instanceof Error ? err.message : 'Fake detection failed.')
    } finally {
      setFakeLoading(false)
    }
  }, [reviewRecords])

  const handleAnalyzeInsights = useCallback(async () => {
    if (!reviewRecords.length) {
      return
    }
    setInsightsError(null)
    setInsightsLoading(true)
    try {
      const batch = reviewRecords.slice(0, INSIGHTS_MAX_ROWS)
      const response = await analyzeInsights(batch)
      setInsights(response)
    } catch (err) {
      setInsights(null)
      setInsightsError(err instanceof Error ? err.message : 'Insights request failed.')
    } finally {
      setInsightsLoading(false)
    }
  }, [reviewRecords])

  const value: VoiceWorkspaceContextValue = {
    sessions,
    addSession,
    clearSessions,
    reviewRecords,
    fakeResults,
    fakeLoading,
    fakeError,
    insights,
    insightsLoading,
    insightsError,
    handleAnalyzeFakes,
    handleAnalyzeInsights,
    fakeByReviewId,
    insightsHasZScore,
  }

  return <VoiceWorkspaceContext.Provider value={value}>{children}</VoiceWorkspaceContext.Provider>
}

export function useVoiceWorkspace(): VoiceWorkspaceContextValue {
  const ctx = useContext(VoiceWorkspaceContext)
  if (!ctx) {
    throw new Error('useVoiceWorkspace must be used within VoiceWorkspaceProvider')
  }
  return ctx
}

export function useVoiceWorkspaceOptional(): VoiceWorkspaceContextValue | null {
  return useContext(VoiceWorkspaceContext)
}
