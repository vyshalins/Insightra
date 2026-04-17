import { Outlet } from 'react-router-dom'
import { VoiceWorkspaceProvider } from './VoiceWorkspaceContext'
import '../components/DataInputPanel.css'

export function VoiceWorkspaceLayout() {
  return (
    <VoiceWorkspaceProvider>
      <Outlet />
    </VoiceWorkspaceProvider>
  )
}
