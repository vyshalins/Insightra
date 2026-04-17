export type VoiceAnalysisResult = {
  transcript: string
  emotion: string
  issues: string[]
  actions: string[]
}

export type ReviewRecord = {
  review_id: string
  text: string
  source: string
  timestamp: string
  product_id: string
  original_text?: string | null
  detected_language?: string | null
  translated?: boolean
  preprocess_sentiment?: string | null
  preprocess_sarcastic?: boolean | null
  preprocess_ambiguous?: boolean | null
  preprocess_meaning?: string | null
  preprocess_confidence?: number | null
}

export type IngestionResponse = {
  reviews: ReviewRecord[]
  source: string
  count: number
  invalid_rows: number
  session_id?: string | null
  total_rows?: number
  processed_rows?: number
  remaining_rows?: number
  chunk_size?: number
  has_more?: boolean
}

export type FakeReviewResult = {
  review_id: string
  is_fake: boolean
  fake_confidence: number
  rule_score: number
  ml_fake_prob?: number | null
  fake_signals: string[]
  explanation: string
  similarity_neighbor: boolean
}

export type FakeBatchResponse = {
  results: FakeReviewResult[]
  count: number
}

export type TrendFeatureResult = {
  feature: string
  prev_rate: number
  current_rate: number
  delta: number
  trend: string
  classification: string
  z_score?: number | null
}

export type UrgencyItem = {
  feature: string
  urgency: string
  score: number
  action: string
}

export type BiasSummary = {
  raw_sentiment: number
  adjusted_sentiment: number
  volume_weight: number
}

export type InsightsMeta = {
  current_window_size: number
  previous_window_size: number
  total_input_reviews: number
  anomaly_mode: string
  notes: string
}

export type AspectSentimentFeature = {
  feature: string
  sentiment_label: string
  mean_polarity: number
  sample_count: number
  confidence?: number | null
}

export type AspectSentimentWindows = {
  previous: AspectSentimentFeature[]
  current: AspectSentimentFeature[]
  groq_refined: boolean
  excluded_ambiguous_count: number
}

export type InsightsResponse = {
  trends: TrendFeatureResult[]
  urgency_score: number
  urgency_level: string
  urgency_items: UrgencyItem[]
  bias: BiasSummary
  recommendations: string[]
  meta: InsightsMeta
  aspect_sentiment: AspectSentimentWindows
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8000'

/**
 * WebSocket URL for simulated live replay (`/ws/review-stream`).
 * Uses the same host as `VITE_API_BASE_URL`, switching http→ws and https→wss.
 */
export function getReviewStreamWsUrl(sessionId: string, intervalMs: number): string {
  const trimmed = API_BASE_URL.replace(/\/$/, '')
  const wsRoot = trimmed.startsWith('https://')
    ? `wss://${trimmed.slice('https://'.length)}`
    : trimmed.startsWith('http://')
      ? `ws://${trimmed.slice('http://'.length)}`
      : `ws://${trimmed}`
  const base = wsRoot.endsWith('/') ? wsRoot : `${wsRoot}/`
  const url = new URL('/ws/review-stream', base)
  url.searchParams.set('session_id', sessionId)
  url.searchParams.set('interval_ms', String(intervalMs))
  return url.toString()
}

async function parseApiError(response: Response): Promise<never> {
  let message = `Request failed with status ${response.status}`
  if (!response.ok) {
    try {
      const body = (await response.json()) as { detail?: string }
      if (body?.detail) {
        message = body.detail
      }
    } catch {
      // Keep generic error if JSON parse fails.
    }
  }
  throw new Error(message)
}

async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    await parseApiError(response)
  }
  return (await response.json()) as T
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    await parseApiError(response)
  }
  return (await response.json()) as T
}

export async function analyzeVoice(file: File): Promise<VoiceAnalysisResult> {
  const formData = new FormData()
  formData.append('file', file)
  return await postFormData<VoiceAnalysisResult>('/voice/analyze', formData)
}

export async function uploadCsv(file: File): Promise<IngestionResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return await postFormData<IngestionResponse>('/upload/csv', formData)
}

export async function uploadJson(file: File): Promise<IngestionResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return await postFormData<IngestionResponse>('/upload/json', formData)
}

export async function uploadManual(text: string): Promise<IngestionResponse> {
  return await postJson<IngestionResponse>('/upload/manual', { text })
}

export async function fetchYoutube(url: string): Promise<IngestionResponse> {
  return await postJson<IngestionResponse>('/fetch/youtube', { url })
}

export async function processNextChunk(
  sessionId: string,
  chunkSize?: number,
): Promise<IngestionResponse> {
  const payload: Record<string, unknown> = { session_id: sessionId }
  if (chunkSize) {
    payload.chunk_size = chunkSize
  }
  return await postJson<IngestionResponse>('/upload/chunk/next', payload)
}

/** Hybrid fake review detection (rules + optional ML + SBERT on backend). */
export async function analyzeFakeReviews(reviews: ReviewRecord[]): Promise<FakeBatchResponse> {
  return await postJson<FakeBatchResponse>('/upload/analyze-fakes', { reviews })
}

/** Trends, urgency, bias-adjusted sentiment, recommendations (time-windowed). */
export async function analyzeInsights(reviews: ReviewRecord[]): Promise<InsightsResponse> {
  return await postJson<InsightsResponse>('/upload/analyze-insights', { reviews })
}
