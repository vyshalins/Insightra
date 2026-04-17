import type { AspectSentimentFeature, BiasSummary, InsightsResponse, TrendFeatureResult } from '../api'

export type InsightSeverity = 'info' | 'warning' | 'critical'

export function polarityToneLabel(p: number): string {
  if (p > 0.15) return 'Mostly positive tone'
  if (p < -0.15) return 'Mostly negative tone'
  return 'Mixed / neutral tone'
}

export function biasNarrative(bias: BiasSummary): { rawTone: string; adjTone: string; body: string } {
  const rawTone = polarityToneLabel(bias.raw_sentiment)
  const adjTone = polarityToneLabel(bias.adjusted_sentiment)
  const shrink = bias.adjusted_sentiment - bias.raw_sentiment
  let body = `After shrinkage toward neutral, the window reads as ${adjTone.toLowerCase()}.`
  if (Math.abs(shrink) > 0.08) {
    body += ` The adjustment shifted the mean by ${shrink > 0 ? '+' : ''}${shrink.toFixed(2)} (raw was ${rawTone.toLowerCase()}), which often reflects polarized posting or a small sample.`
  } else {
    body += ` Raw window was ${rawTone.toLowerCase()}.`
  }
  return { rawTone, adjTone, body }
}

/** Map polarity [-1,1] to horizontal position percent (0=left, 100=right) with neutral at 50. */
export function polarityToPercent(p: number): number {
  return Math.max(0, Math.min(100, 50 + p * 50))
}

export function topTrendHeadline(trends: TrendFeatureResult[]): {
  body: string
  severity: InsightSeverity
} | null {
  if (!trends.length) return null
  const sorted = [...trends].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  const t = sorted[0]
  const pp = Math.abs(t.delta * 100).toFixed(1)
  const dir = t.delta >= 0 ? 'rose' : 'fell'
  let severity: InsightSeverity = 'info'
  if (t.classification === 'systemic') severity = 'critical'
  else if (t.classification === 'emerging' || t.trend === 'spike') severity = 'warning'
  const feat = t.feature.charAt(0).toUpperCase() + t.feature.slice(1)
  const body = `${feat} mention rate ${dir} by ${pp} percentage points between windows (${t.trend}, ${t.classification}).`
  return { body, severity }
}

export function featurePageInsightLine(insights: InsightsResponse): { body: string; severity: InsightSeverity } {
  const firstRec = insights.recommendations[0]?.trim()
  if (firstRec) return { body: firstRec, severity: 'info' }
  const trend = topTrendHeadline(insights.trends)
  if (trend) return trend
  return {
    body: 'Run insights to see which product themes move between windows and to load recommendations.',
    severity: 'info',
  }
}

export function languageNarrative(rows: { name: string; value: number }[]): string {
  if (!rows.length) return 'No language mix recorded for this filter.'
  const total = rows.reduce((a, r) => a + r.value, 0)
  if (total <= 0) return 'No language mix recorded.'
  const sorted = [...rows].sort((a, b) => b.value - a.value)
  const top = sorted.slice(0, 4)
  const parts = top.map((r) => `${r.name}: ${((r.value / total) * 100).toFixed(0)}%`)
  const runner = sorted[1]?.value ?? 0
  const diverse = sorted.length >= 2 && runner / total >= 0.2
  return `${parts.join(' · ')}.${diverse ? ' Regional mix is meaningful — translation and locale handling matter for this batch.' : ''}`
}

export function aspectPolarityBarWidth(row: AspectSentimentFeature): number {
  return Math.min(100, Math.round(Math.abs(row.mean_polarity) * 100))
}

export function isCriticalTrendRow(t: TrendFeatureResult): boolean {
  const pp = Math.abs(t.delta) * 100
  return (t.classification === 'systemic' || t.trend === 'spike') && pp >= 5
}
