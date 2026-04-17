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
}

export type IngestionResponse = {
  reviews: ReviewRecord[]
  source: string
  count: number
  invalid_rows: number
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8000'

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

async function postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
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
