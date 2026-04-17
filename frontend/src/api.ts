export type VoiceAnalysisResult = {
  transcript: string
  emotion: string
  issues: string[]
  actions: string[]
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8000'

export async function analyzeVoice(file: File): Promise<VoiceAnalysisResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/voice/analyze`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const body = (await response.json()) as { detail?: string }
      if (body?.detail) {
        message = body.detail
      }
    } catch {
      // Keep generic error if JSON parse fails.
    }
    throw new Error(message)
  }

  return (await response.json()) as VoiceAnalysisResult
}
