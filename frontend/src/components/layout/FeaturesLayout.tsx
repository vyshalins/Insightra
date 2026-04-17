import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import '../FeaturesLayout.css'
import '../../App.css'
import { DataPipelineSidebar } from './DataPipelineSidebar'
import { VoicePipelineSidebar } from './VoicePipelineSidebar'

export function FeaturesLayout() {
  const { pathname } = useLocation()
  const isDataWorkspace = pathname.startsWith('/app/data')
  const isVoiceWorkspace = pathname.startsWith('/app/voice')
  const isPipelineShell = isDataWorkspace || isVoiceWorkspace

  return (
    <div className={`features-shell ${isPipelineShell ? 'features-shell--wide' : ''}`}>
      <header className="features-topbar" role="banner">
        <div className="features-topbar__brand">
          <Link to="/" className="features-sidebar__logo-link">
            <span className="features-sidebar__logo" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
                  fill="#ffe17c"
                  stroke="#ffe17c"
                  strokeWidth="1.2"
                  strokeLinejoin="miter"
                />
              </svg>
            </span>
            <span className="features-sidebar__title">Insight</span>
          </Link>
        </div>
        <nav className="features-topbar__primary" aria-label="Primary workspace">
          <NavLink
            to="/app/voice"
            className={({ isActive }) =>
              `features-topbar__pill ${isActive ? 'features-topbar__pill--active' : ''}`
            }
          >
            Voice analysis
          </NavLink>
          <NavLink
            to="/app/data"
            className={({ isActive }) =>
              `features-topbar__pill ${isActive ? 'features-topbar__pill--active' : ''}`
            }
          >
            Data ingestion
          </NavLink>
        </nav>
      </header>

      <div className="features-body">
        {isDataWorkspace ? (
          <aside className="features-data-sidebar" aria-label="Review analysis modules">
            <DataPipelineSidebar />
            <div className="features-data-sidebar__footer">
              <Link to="/" className="features-sidebar__back">
                Back to site
              </Link>
            </div>
          </aside>
        ) : null}
        {isVoiceWorkspace ? (
          <aside className="features-data-sidebar" aria-label="Voice analysis modules">
            <VoicePipelineSidebar />
            <div className="features-data-sidebar__footer">
              <Link to="/" className="features-sidebar__back">
                Back to site
              </Link>
            </div>
          </aside>
        ) : null}

        <main
          className={`nb-workspace-wrap features-main ${isPipelineShell ? 'nb-workspace-wrap--wide' : ''}`}
          id="app-main"
          aria-label="Application workspace"
        >
          <section className="nb-workspace nb-section nb-section--white">
            <div className="nb-workspace__inner">
              <div className="nb-workspace__head">
                <h1 className="nb-workspace__title nb-heading">Workspace</h1>
                <p className="nb-workspace__sub">
                  {isVoiceWorkspace
                    ? 'Capture audio up top, then use the pipeline for transcripts, classification, trends, and actions—same layout as data ingestion.'
                    : isDataWorkspace
                      ? 'Ingest reviews from the top entry, then move through exploration, intelligence, analytics, and recommendations in the sidebar. Run insights on analytics pages to unlock headline callouts and action strips.'
                      : 'Pick Voice analysis or Data ingestion above.'}
                </p>
              </div>
              <div className="nb-panels">
                <Outlet />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
