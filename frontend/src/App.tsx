import { useState } from 'react'
import './App.css'
import { analyzeVoice, type VoiceAnalysisResult } from './api'

function App() {
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
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Analysis failed.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <main className="app">
      <header>
        <h1>Voice Analysis</h1>
        <p>Upload audio to analyze transcript and sentiment.</p>
      </header>

      <section className="card">
        <h2>Input</h2>
        <div className="controls">
          <label htmlFor="audio-file" className="file-label">
            Select audio file
          </label>
          <input
            id="audio-file"
            type="file"
            accept="audio/*,.m4a,.wav,.mp3,.webm"
            onChange={handleFileChange}
            disabled={isAnalyzing}
          />
        </div>
        <p className="file-name">
          Selected: {selectedFile ? selectedFile.name : 'No file selected'}
        </p>
        <button type="button" onClick={handleAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? 'Analyzing...' : 'Analyze Voice'}
        </button>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="card">
        <h2>Results</h2>
        {!result ? (
          <p className="empty-state">Run analysis to see transcript, emotion, issues, and actions.</p>
        ) : (
          <div className="results-grid">
            <div>
              <h3>Transcript</h3>
              <p>{result.transcript || 'No transcript returned.'}</p>
            </div>
            <div>
              <h3>Emotion</h3>
              <p>{result.emotion || 'Unknown'}</p>
            </div>
            <div>
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
            <div>
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
    </main>
  )
}

export default App
