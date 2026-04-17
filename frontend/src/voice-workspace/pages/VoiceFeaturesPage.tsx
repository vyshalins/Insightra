import { useMemo } from 'react'
import { tokenize } from '../../data-workspace/utils'
import { useVoiceWorkspace } from '../VoiceWorkspaceContext'
import { EmptyVoiceCta } from '../EmptyVoiceCta'

export default function VoiceFeaturesPage() {
  const { sessions } = useVoiceWorkspace()

  const { topTokens, emotionMix, intentHints } = useMemo(() => {
    const freq = new Map<string, number>()
    const emotions = new Map<string, number>()
    const intents = new Set<string>()
    sessions.forEach((s) => {
      emotions.set(s.emotion, (emotions.get(s.emotion) ?? 0) + 1)
      tokenize(s.transcript).forEach((t) => freq.set(t, (freq.get(t) ?? 0) + 1))
      s.issues.forEach((i) => intents.add(i))
      s.actions.forEach((a) => intents.add(a))
    })
    const topTokens = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
    const emotionMix = [...emotions.entries()].sort((a, b) => b[1] - a[1])
    return {
      topTokens,
      emotionMix,
      intentHints: [...intents].slice(0, 20),
    }
  }, [sessions])

  if (!sessions.length) {
    return (
      <div className="data-input-panel">
        <section className="nb-card nb-panel-card">
          <h2 className="nb-panel-card__title">Feature extraction</h2>
          <EmptyVoiceCta />
        </section>
      </div>
    )
  }

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Feature extraction</h2>
        <p className="mode-hint">
          Keywords from transcripts, emotion distribution from the voice model, and intent-like phrases
          from issues and actions. Fine-grained per-utterance intent scores are not in the API yet.
        </p>

        <h3 className="nb-section-heading">Keywords</h3>
        <ul className="insights-rec-list">
          {topTokens.map(([word, n]) => (
            <li key={word}>
              <strong>{word}</strong> — {n}
            </li>
          ))}
        </ul>

        <h3 className="nb-section-heading">Emotion mix</h3>
        <ul className="insights-rec-list">
          {emotionMix.map(([label, n]) => (
            <li key={label}>
              <strong>{label || 'Unknown'}</strong> — {n} clip(s)
            </li>
          ))}
        </ul>

        <h3 className="nb-section-heading">Intent and actions (text signals)</h3>
        <ul className="insights-rec-list">
          {intentHints.length === 0 ? (
            <li>No issues or actions yet.</li>
          ) : (
            intentHints.map((line) => <li key={line}>{line}</li>)
          )}
        </ul>
      </section>
    </div>
  )
}
