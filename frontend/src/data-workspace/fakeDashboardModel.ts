import type { FakeReviewResult, ReviewRecord } from '../api'

/** Aligns with backend README default `FAKE_THRESHOLD` for client triage band. */
export const FAKE_THRESHOLD_HINT = 0.6
export const SUSPICIOUS_CONF_MIN = 0.35

export type RiskTier = 'low' | 'medium' | 'high'

export type TriageLabel = 'likely_real' | 'suspicious' | 'likely_fake'

export type MergedFakeRow = {
  review: ReviewRecord
  result: FakeReviewResult
  triage: TriageLabel
}

export type FakeSummary = {
  analyzed: number
  fakes: number
  suspicious: number
  likelyReal: number
  avgRisk: number
}

export function triageLabel(result: FakeReviewResult, thresholdHint = FAKE_THRESHOLD_HINT): TriageLabel {
  if (result.is_fake) return 'likely_fake'
  if (result.fake_confidence >= SUSPICIOUS_CONF_MIN && result.fake_confidence < thresholdHint) {
    return 'suspicious'
  }
  return 'likely_real'
}

export function triageCounts(results: FakeReviewResult[]) {
  let likelyReal = 0
  let suspicious = 0
  let likelyFake = 0
  for (const r of results) {
    const t = triageLabel(r)
    if (t === 'likely_fake') likelyFake += 1
    else if (t === 'suspicious') suspicious += 1
    else likelyReal += 1
  }
  return { likelyReal, suspicious, likelyFake }
}

export function computeFakeSummary(results: FakeReviewResult[]): FakeSummary | null {
  if (!results.length) return null
  const { likelyReal, suspicious, likelyFake } = triageCounts(results)
  const avgRisk = results.reduce((acc, r) => acc + r.fake_confidence, 0) / results.length
  return {
    analyzed: results.length,
    fakes: likelyFake,
    suspicious,
    likelyReal,
    avgRisk,
  }
}

export function computeRiskTier(results: FakeReviewResult[]): RiskTier {
  if (!results.length) return 'low'
  const fakeRate = results.filter((r) => r.is_fake).length / results.length
  const avg = results.reduce((acc, r) => acc + r.fake_confidence, 0) / results.length
  if (fakeRate > 0.15 || avg > 0.55) return 'high'
  if (fakeRate > 0.05 || avg > 0.35) return 'medium'
  return 'low'
}

export function mergeResultsWithReviews(
  reviews: ReviewRecord[],
  results: FakeReviewResult[],
): MergedFakeRow[] {
  const idToReview = new Map(reviews.map((r) => [r.review_id, r]))
  const rows: MergedFakeRow[] = []
  for (const result of results) {
    const review = idToReview.get(result.review_id)
    if (!review) continue
    rows.push({ review, result, triage: triageLabel(result) })
  }
  return rows
}

export function buildAlerts(merged: MergedFakeRow[]): string[] {
  const alerts: string[] = []
  let campaignSignals = 0
  let borderline = 0
  for (const { result } of merged) {
    if (result.similarity_neighbor) campaignSignals += 1
    if (result.fake_signals.some((s) => s.includes('near_duplicate'))) campaignSignals += 1
    if (!result.is_fake && result.fake_confidence >= 0.48 && result.fake_confidence < FAKE_THRESHOLD_HINT) {
      borderline += 1
    }
  }
  if (campaignSignals >= 3) {
    alerts.push(`${campaignSignals} reviews show similarity or near-duplicate campaign signals`)
  }
  if (borderline >= 2) {
    alerts.push(`${borderline} reviews are high-risk but below the fake threshold (review manually)`)
  }
  const fakeCount = merged.filter((m) => m.result.is_fake).length
  if (fakeCount >= 5) {
    alerts.push(`${fakeCount} reviews flagged as likely fake in this batch`)
  }
  return alerts
}

export type HistogramBin = { label: string; count: number }

export function binConfidence(results: FakeReviewResult[], binCount = 10): HistogramBin[] {
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => {
    const lo = i / binCount
    const hi = (i + 1) / binCount
    return { label: `${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}%`, count: 0 }
  })
  for (const r of results) {
    const x = Math.max(0, Math.min(0.999999, r.fake_confidence))
    const idx = Math.min(binCount - 1, Math.floor(x * binCount))
    bins[idx].count += 1
  }
  return bins
}

export type RiskPoint = { ts: number; score: number; id: string }

export function seriesRiskOverTime(merged: MergedFakeRow[]): RiskPoint[] {
  const withTime = merged
    .map(({ review, result }) => {
      const t = Date.parse(review.timestamp)
      return Number.isFinite(t)
        ? { ts: t, score: result.fake_confidence, id: review.review_id }
        : null
    })
    .filter((x): x is RiskPoint => x != null)
  withTime.sort((a, b) => a.ts - b.ts)
  return withTime
}

const TEN_MIN_MS = 10 * 60 * 1000
const CAMPAIGN_MIN_IN_WINDOW = 5

export type CampaignHeuristic = {
  detected: boolean
  title: string
  detail: string
}

export function campaignHeuristic(merged: MergedFakeRow[]): CampaignHeuristic {
  const risky = merged.filter(
    ({ result }) =>
      result.similarity_neighbor ||
      result.fake_signals.some((s) => s.toLowerCase().includes('duplicate')),
  )
  if (!risky.length) {
    return {
      detected: false,
      title: 'No coordinated pattern detected',
      detail: 'Heuristic scan of this batch found no dense cluster of similarity or duplicate signals.',
    }
  }
  const points = risky
    .map(({ review, result }) => {
      const t = Date.parse(review.timestamp)
      return Number.isFinite(t) ? { ts: t, result } : null
    })
    .filter((x): x is { ts: number; result: FakeReviewResult } => x != null)
    .sort((a, b) => a.ts - b.ts)

  if (!points.length) {
    return {
      detected: false,
      title: 'No coordinated pattern detected',
      detail: 'Similarity flags exist but timestamps were missing for clustering.',
    }
  }

  let maxInWindow = 0
  let j = 0
  for (let i = 0; i < points.length; i++) {
    while (j < points.length && points[j].ts - points[i].ts <= TEN_MIN_MS) {
      j += 1
    }
    maxInWindow = Math.max(maxInWindow, j - i)
  }

  if (maxInWindow >= CAMPAIGN_MIN_IN_WINDOW) {
    return {
      detected: true,
      title: 'Possible coordinated activity',
      detail: `Batch heuristic: up to ${maxInWindow} reviews with similarity/duplicate signals fell inside a 10-minute span (not a full bot detector).`,
    }
  }
  return {
    detected: false,
    title: 'No coordinated pattern detected',
    detail: `At most ${maxInWindow} similar reviews in any 10-minute window in this batch (threshold ${CAMPAIGN_MIN_IN_WINDOW}).`,
  }
}
