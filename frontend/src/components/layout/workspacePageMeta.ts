export type WorkspaceKind = 'voice' | 'data'

export type WorkspacePageMeta = {
  title: string
  subtitle: string
}

const VOICE_META: Record<string, WorkspacePageMeta> = {
  overview: {
    title: 'Overview',
    subtitle: 'Session volume, pipeline health, and quick links into capture and intelligence.',
  },
  ingest: {
    title: 'Voice capture',
    subtitle: 'Record or upload audio, then run the same pipeline as review ingestion.',
  },
  'explore/full': {
    title: 'Full dataset',
    subtitle: 'Transcripts normalized like review rows for exploration and filters.',
  },
  'explore/preprocessed': {
    title: 'Preprocessed',
    subtitle: 'Cleaned text and quality signals before deeper intelligence steps.',
  },
  'intelligence/fake': {
    title: 'Fake and sentiment',
    subtitle: 'Text-side risk and tone on voice-derived rows.',
  },
  'intelligence/features': {
    title: 'Feature extraction',
    subtitle: 'Themes, emotion mix, and structured signals from transcripts.',
  },
  'analytics/trends': {
    title: 'Trend detection',
    subtitle: 'Run insights to unlock headline callouts and change narratives.',
  },
  'analytics/bias': {
    title: 'Bias and correlation',
    subtitle: 'Fairness-style signals and correlations in the current window.',
  },
  'analytics/aspect-sentiment': {
    title: 'Aspect sentiment',
    subtitle: 'What speakers praise vs. criticize across aspects.',
  },
  'decision/recommendations': {
    title: 'Recommendations',
    subtitle: 'Prioritized actions from urgency and recommendation payloads.',
  },
}

const DATA_META: Record<string, WorkspacePageMeta> = {
  overview: {
    title: 'Overview',
    subtitle: 'Ingestion volume, language mix, and shortcuts into exploration and intelligence.',
  },
  ingest: {
    title: 'Ingestion',
    subtitle: 'CSV, JSON, manual paste, or YouTube — then chunk through normalization.',
  },
  'explore/full': {
    title: 'Full dataset',
    subtitle: 'All normalized reviews with filters, sorting, and export.',
  },
  'explore/preprocessed': {
    title: 'Preprocessed',
    subtitle: 'Cleaning stats and preview of transformed rows.',
  },
  'intelligence/fake': {
    title: 'Fake review detection',
    subtitle: 'Batch scoring with explainable drivers per row.',
  },
  'intelligence/features': {
    title: 'Feature extraction',
    subtitle: 'Themes, language, and metadata coverage for the current dataset.',
  },
  'analytics/trends': {
    title: 'Trend detection',
    subtitle: 'Run insights to unlock z-score narratives and action strips.',
  },
  'analytics/bias': {
    title: 'Bias and correlation',
    subtitle: 'Structured correlations and humanized caveats.',
  },
  'analytics/aspect-sentiment': {
    title: 'Aspect sentiment',
    subtitle: 'Aspect-level praise and friction from review text.',
  },
  'decision/recommendations': {
    title: 'Recommendations',
    subtitle: 'Ranked actions from the decision layer.',
  },
}

const DEFAULT_VOICE: WorkspacePageMeta = {
  title: 'Voice workspace',
  subtitle: 'Capture audio and run the full intelligence pipeline.',
}

const DEFAULT_DATA: WorkspacePageMeta = {
  title: 'Data workspace',
  subtitle: 'Ingest reviews and move through exploration, intelligence, and actions.',
}

export function getWorkspacePageMeta(pathname: string): WorkspacePageMeta & { kind: WorkspaceKind | null } {
  if (pathname.startsWith('/app/voice')) {
    const rest = pathname.replace(/^\/app\/voice\/?/, '')
    const key = rest || 'overview'
    return { kind: 'voice', ...(VOICE_META[key] ?? DEFAULT_VOICE) }
  }
  if (pathname.startsWith('/app/data')) {
    const rest = pathname.replace(/^\/app\/data\/?/, '')
    const key = rest || 'overview'
    return { kind: 'data', ...(DATA_META[key] ?? DEFAULT_DATA) }
  }
  return { kind: null, title: 'Workspace', subtitle: 'Pick Voice or Data in the sidebar.' }
}
