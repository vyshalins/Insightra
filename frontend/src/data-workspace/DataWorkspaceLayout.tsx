import { Outlet } from 'react-router-dom'
import { DataWorkspaceProvider } from './DataWorkspaceContext'
import '../components/DataInputPanel.css'

export function DataWorkspaceLayout() {
  return (
    <DataWorkspaceProvider>
      <Outlet />
    </DataWorkspaceProvider>
  )
}
