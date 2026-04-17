import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useCallback, useEffect, useRef } from 'react'
import '../FeaturesLayout.css'
import '../../App.css'
import { DataPipelineSidebar } from './DataPipelineSidebar'
import { VoicePipelineSidebar } from './VoicePipelineSidebar'
import { getWorkspacePageMeta } from './workspacePageMeta'

export function FeaturesLayout() {
  const { pathname } = useLocation()
  const isDataWorkspace = pathname.startsWith('/app/data')
  const isVoiceWorkspace = pathname.startsWith('/app/voice')
  const isPipelineShell = isDataWorkspace || isVoiceWorkspace
  const meta = getWorkspacePageMeta(pathname)
  const searchRef = useRef<HTMLInputElement>(null)

  const onSearchKey = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      searchRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', onSearchKey)
    return () => window.removeEventListener('keydown', onSearchKey)
  }, [onSearchKey])

  const primaryCtaTo = isVoiceWorkspace ? '/app/voice/ingest' : isDataWorkspace ? '/app/data/ingest' : '/app/voice/overview'
  const primaryCtaLabel = isVoiceWorkspace ? 'Voice capture' : isDataWorkspace ? 'Ingest data' : 'Open workspace'

  return (
    <div className={`features-shell ${isPipelineShell ? 'features-shell--wide' : ''}`}>
      {isPipelineShell ? (
        <aside className="features-rail" aria-label="Application navigation">
          <div className="features-rail__top">
            <Link to="/" className="features-rail__brand">
              <span className="features-rail__logo" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
                    fill="var(--mw-accent)"
                    stroke="var(--mw-accent)"
                    strokeWidth="1.2"
                    strokeLinejoin="miter"
                  />
                </svg>
              </span>
              <span className="features-rail__title">Insight</span>
            </Link>

            <nav className="features-rail__workspaces" aria-label="Workspace">
              <NavLink
                to="/app/voice/overview"
                className={`features-rail__ws ${pathname.startsWith('/app/voice') ? 'features-rail__ws--active' : ''}`}
              >
                Voice
              </NavLink>
              <NavLink
                to="/app/data/overview"
                className={`features-rail__ws ${pathname.startsWith('/app/data') ? 'features-rail__ws--active' : ''}`}
              >
                Data
              </NavLink>
            </nav>

            <div className="features-rail__nav-label">Pipeline</div>
            {isDataWorkspace ? <DataPipelineSidebar /> : <VoicePipelineSidebar />}
          </div>

          <div className="features-rail__bottom">
            <button type="button" className="features-rail__theme" disabled title="Dark mode (coming soon)">
              <span className="features-rail__theme-label">Dark mode</span>
              <span className="features-rail__theme-track" aria-hidden="true">
                <span className="features-rail__theme-knob" />
              </span>
            </button>
            <Link to="/" className="features-rail__back">
              Back to site
            </Link>
          </div>
        </aside>
      ) : null}

      <div className="features-workspace">
        {isPipelineShell ? (
          <header className="features-workspace-header" role="banner">
            <div className="features-workspace-header__intro">
              <h1 className="features-workspace-header__title nb-heading">{meta.title}</h1>
              <p className="features-workspace-header__sub">{meta.subtitle}</p>
            </div>
            <div className="features-workspace-header__actions">
              <label className="features-search">
                <span className="features-search__icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3-3" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  ref={searchRef}
                  type="search"
                  className="features-search__input"
                  placeholder="Search in page…"
                  aria-label="Search (filters current view where supported)"
                  disabled
                  readOnly
                />
                <kbd className="features-search__kbd">Ctrl K</kbd>
              </label>
              <details className="features-export">
                <summary className="features-export__btn">Export</summary>
                <div className="features-export__menu" role="menu">
                  <span className="features-export__hint">Use export actions inside each step (JSON / CSV).</span>
                </div>
              </details>
              <Link className="nb-btn nb-btn--push features-workspace-header__cta" to={primaryCtaTo}>
                {primaryCtaLabel}
              </Link>
            </div>
          </header>
        ) : null}

        <main
          className={`nb-workspace-wrap features-main ${isPipelineShell ? 'nb-workspace-wrap--wide' : ''}`}
          id="app-main"
          aria-label="Application workspace"
        >
          <section className="nb-workspace nb-section nb-section--white">
            <div className="nb-workspace__inner">
              {!isPipelineShell ? (
                <div className="nb-workspace__head">
                  <h1 className="nb-workspace__title nb-heading">Workspace</h1>
                  <p className="nb-workspace__sub">Pick Voice or Data from the app home.</p>
                </div>
              ) : null}
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
