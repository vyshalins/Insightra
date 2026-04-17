const FALLBACK = 'Run insights to generate prioritized action items from the current window.'

type Props = {
  recommendations: string[] | undefined
  maxItems?: number
}

export function InsightRecommendationStrip({ recommendations, maxItems = 3 }: Props) {
  const items = (recommendations ?? []).map((s) => s.trim()).filter(Boolean).slice(0, maxItems)
  const show = items.length > 0 ? items : [FALLBACK]

  return (
    <section className="insight-rec-strip" aria-label="Recommendations">
      <h3 className="insight-rec-strip__title">What to do next</h3>
      <ul className="insight-rec-strip__list">
        {show.map((line, i) => (
          <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
        ))}
      </ul>
    </section>
  )
}
