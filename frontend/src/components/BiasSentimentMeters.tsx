import { polarityToPercent } from './insightNarratives'

type Props = {
  rawSentiment: number
  adjustedSentiment: number
}

function Meter({ label, value }: { label: string; value: number }) {
  const pct = polarityToPercent(value)
  const swath =
    pct > 50 ? (
      <span
        className="bias-meter__swath bias-meter__swath--pos"
        style={{ left: '50%', width: `${pct - 50}%` }}
      />
    ) : pct < 50 ? (
      <span
        className="bias-meter__swath bias-meter__swath--neg"
        style={{ left: `${pct}%`, width: `${50 - pct}%` }}
      />
    ) : null
  return (
    <div className="bias-meter">
      <div className="bias-meter__label">{label}</div>
      <div className="bias-meter__track" aria-hidden="true">
        {swath}
        <span className="bias-meter__neutral-line" />
        <span className="bias-meter__marker" style={{ left: `${pct}%` }} title={value.toFixed(3)} />
      </div>
      <div className="bias-meter__ticks">
        <span>Negative</span>
        <span>Neutral</span>
        <span>Positive</span>
      </div>
    </div>
  )
}

export function BiasSentimentMeters({ rawSentiment, adjustedSentiment }: Props) {
  return (
    <div className="bias-meter-grid">
      <Meter label="Raw sentiment (TextBlob)" value={rawSentiment} />
      <Meter label="Adjusted (shrinkage toward neutral)" value={adjustedSentiment} />
    </div>
  )
}
