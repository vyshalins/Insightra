import { useState } from 'react'
import { analyzeVoice, type VoiceAnalysisResult } from '../../api'
import { useVoiceWorkspace } from '../VoiceWorkspaceContext'

export default function VoiceIngestPage() {
  const { addSession, sessions, clearSessions } = useVoiceWorkspace()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VoiceAnalysisResult | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please upload an audio file first.')
      return
    }

    setError(null)
    setIsAnalyzing(true)
    try {
      const response = await analyzeVoice(selectedFile)
      setResult(response)
      addSession(selectedFile.name, response)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Analysis failed.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-work-card nb-panel-card">
        <h2 className="nb-work-card__title nb-heading">Voice capture</h2>
        <p className="mode-hint">
          Each successful analysis is appended to the transcript dataset for the pipeline on the left.
        </p>
        <div className="controls">
          <label htmlFor="audio-file" className="file-label">
            Select audio file
          </label>
          <input
            id="audio-file"
            className="nb-input"
            type="file"
            accept="audio/*,.m4a,.wav,.mp3,.webm"
            onChange={handleFileChange}
            disabled={isAnalyzing}
          />
        </div>
        <p className="file-name">Selected: {selectedFile ? selectedFile.name : 'No file selected'}</p>
        <div className="mode-actions">
          <button
            type="button"
            className="nb-btn nb-btn--push"
            onClick={() => void handleAnalyze()}
            disabled={isAnalyzing}
            aria-busy={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze voice'}
          </button>
          <button
            type="button"
            className="nb-btn nb-btn--secondary"
            onClick={() => {
              clearSessions()
              setResult(null)
              setSelectedFile(null)
            }}
            disabled={isAnalyzing || sessions.length === 0}
          >
            Clear all sessions
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="nb-card nb-work-card nb-panel-card">
        <h2 className="nb-work-card__title nb-heading">Latest result</h2>
        {!result ? (
          <p className="empty-state">Run analysis to see transcript, emotion, issues, and actions.</p>
        ) : (
          <div className="results-grid">
            <div className="nb-result-block">
              <h3>Transcript</h3>
              <p>{result.transcript || 'No transcript returned.'}</p>
            </div>
            <div className="nb-result-block">
              <h3>Emotion</h3>
              <p>{result.emotion || 'Unknown'}</p>
            </div>
            <div className="nb-result-block">
              <h3>Issues</h3>
              {result.issues.length > 0 ? (
                <ul>
                  {result.issues.map((issue, index) => (
                    <li key={`${issue}-${index}`}>{issue}</li>
                  ))}
                </ul>
              ) : (
                <p>No issues detected.</p>
              )}
            </div>
            <div className="nb-result-block">
              <h3>Actions</h3>
              {result.actions.length > 0 ? (
                <ul>
                  {result.actions.map((action, index) => (
                    <li key={`${action}-${index}`}>{action}</li>
                  ))}
                </ul>
              ) : (
                <p>No actions generated.</p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Session summary</h2>
        <p className="mode-hint">Stored clips this visit: {sessions.length}</p>
      </section>
    </div>
  )
}
