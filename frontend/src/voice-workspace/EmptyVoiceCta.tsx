import { Link } from 'react-router-dom'

export function EmptyVoiceCta() {
  return (
    <p className="empty-state">
      <Link to="/app/voice/ingest">Go to Voice capture</Link> to analyze at least one audio clip. Each run
      appends a row to your voice dataset.
    </p>
  )
}
