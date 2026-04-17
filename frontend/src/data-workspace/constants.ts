export const PAGE_SIZE = 20
export const DEFAULT_CHUNK_SIZE = 300
export const MIN_CHUNK_SIZE = 100
export const MAX_CHUNK_SIZE = 1000
/** Matches backend default `FAKE_ANALYZE_MAX_ROWS`. */
export const FAKE_ANALYZE_MAX_ROWS = 2000
/** Matches backend `INSIGHTS_MAX_ROWS`. */
export const INSIGHTS_MAX_ROWS = 2000

/** Debounce for fake + insights refresh while live stream appends reviews. */
export const LIVE_ANALYSIS_DEBOUNCE_MS = 900
