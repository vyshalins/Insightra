import { Link } from 'react-router-dom'

export function EmptyDatasetCta() {
  return (
    <p className="empty-state">
      <Link to="/app/data/ingest">Go to Ingestion</Link> to load a dataset first.
    </p>
  )
}
