import type { InsightSeverity } from './insightNarratives'

export type InsightKeyCalloutProps = {
  title?: string
  body: string
  severity?: InsightSeverity
}

export function InsightKeyCallout({
  title = 'Key insight',
  body,
  severity = 'info',
}: InsightKeyCalloutProps) {
  return (
    <aside className={`insight-callout insight-callout--${severity}`} aria-label={title}>
      <h3 className="insight-callout__title">{title}</h3>
      <p className="insight-callout__body">{body}</p>
    </aside>
  )
}
