import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import { FeaturesLayout } from './components/layout/FeaturesLayout'
import { VoiceWorkspaceLayout } from './voice-workspace/VoiceWorkspaceLayout'
import VoiceIngestPage from './voice-workspace/pages/VoiceIngestPage'
import VoiceExploreFullPage from './voice-workspace/pages/VoiceExploreFullPage'
import VoiceExplorePreprocessedPage from './voice-workspace/pages/VoiceExplorePreprocessedPage'
import VoiceFakePage from './voice-workspace/pages/VoiceFakePage'
import VoiceFeaturesPage from './voice-workspace/pages/VoiceFeaturesPage'
import VoiceTrendsPage from './voice-workspace/pages/VoiceTrendsPage'
import VoiceBiasPage from './voice-workspace/pages/VoiceBiasPage'
import VoiceAspectSentimentPage from './voice-workspace/pages/VoiceAspectSentimentPage'
import VoiceRecommendationsPage from './voice-workspace/pages/VoiceRecommendationsPage'
import { DataWorkspaceLayout } from './data-workspace/DataWorkspaceLayout'
import DataIngestPage from './data-workspace/pages/DataIngestPage'
import DataExploreFullPage from './data-workspace/pages/DataExploreFullPage'
import DataExplorePreprocessedPage from './data-workspace/pages/DataExplorePreprocessedPage'
import DataFakePage from './data-workspace/pages/DataFakePage'
import DataFeaturesPage from './data-workspace/pages/DataFeaturesPage'
import DataTrendsPage from './data-workspace/pages/DataTrendsPage'
import DataBiasPage from './data-workspace/pages/DataBiasPage'
import DataAspectSentimentPage from './data-workspace/pages/DataAspectSentimentPage'
import DataRecommendationsPage from './data-workspace/pages/DataRecommendationsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<FeaturesLayout />}>
        <Route index element={<Navigate to="voice" replace />} />
        <Route path="voice" element={<VoiceWorkspaceLayout />}>
          <Route index element={<Navigate to="ingest" replace />} />
          <Route path="ingest" element={<VoiceIngestPage />} />
          <Route path="explore/full" element={<VoiceExploreFullPage />} />
          <Route path="explore/preprocessed" element={<VoiceExplorePreprocessedPage />} />
          <Route path="intelligence/fake" element={<VoiceFakePage />} />
          <Route path="intelligence/features" element={<VoiceFeaturesPage />} />
          <Route path="analytics/trends" element={<VoiceTrendsPage />} />
          <Route path="analytics/bias" element={<VoiceBiasPage />} />
          <Route path="analytics/aspect-sentiment" element={<VoiceAspectSentimentPage />} />
          <Route path="decision/recommendations" element={<VoiceRecommendationsPage />} />
        </Route>
        <Route path="data" element={<DataWorkspaceLayout />}>
          <Route index element={<Navigate to="ingest" replace />} />
          <Route path="ingest" element={<DataIngestPage />} />
          <Route path="explore/full" element={<DataExploreFullPage />} />
          <Route path="explore/preprocessed" element={<DataExplorePreprocessedPage />} />
          <Route path="intelligence/fake" element={<DataFakePage />} />
          <Route path="intelligence/features" element={<DataFeaturesPage />} />
          <Route path="analytics/trends" element={<DataTrendsPage />} />
          <Route path="analytics/bias" element={<DataBiasPage />} />
          <Route path="analytics/aspect-sentiment" element={<DataAspectSentimentPage />} />
          <Route path="decision/recommendations" element={<DataRecommendationsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
