export function CorrelationRoadmapCard() {
  return (
    <aside className="insight-roadmap-card" aria-label="Planned correlation analyses">
      <h3 className="insight-roadmap-card__title">Insights roadmap</h3>
      <p className="insight-roadmap-card__lead">
        Structured correlation APIs are not wired yet. Planned analyses include:
      </p>
      <ul className="insight-roadmap-card__list">
        <li>Star rating vs sentiment (when ratings are ingested)</li>
        <li>Detected language vs complaint themes</li>
        <li>Product or region vs feature mention rates</li>
        <li>Time-of-day vs urgency (for ops staffing)</li>
      </ul>
    </aside>
  )
}
