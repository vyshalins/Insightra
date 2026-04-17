import { NavLink } from 'react-router-dom'

function subLink(to: string, label: string) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `features-pipeline__sublink ${isActive ? 'features-pipeline__sublink--active' : ''}`
      }
    >
      {label}
    </NavLink>
  )
}

export function DataPipelineSidebar() {
  return (
    <nav className="features-pipeline" aria-label="Analysis and insights">
      <div className="features-pipeline__overview">
        <NavLink
          to="/app/data/overview"
          className={({ isActive }) =>
            `features-pipeline__sublink features-pipeline__overview-link ${isActive ? 'features-pipeline__sublink--active' : ''}`
          }
        >
          Overview
        </NavLink>
      </div>
      <details className="features-pipeline__group" open>
        <summary className="features-pipeline__summary">Data exploration</summary>
        <div className="features-pipeline__links">
          {subLink('/app/data/explore/full', 'Full dataset view')}
          {subLink('/app/data/explore/preprocessed', 'Preprocessed and cleaned')}
        </div>
      </details>
      <details className="features-pipeline__group" open>
        <summary className="features-pipeline__summary">Intelligence and classification</summary>
        <div className="features-pipeline__links">
          {subLink('/app/data/intelligence/fake', 'Fake review detection')}
          {subLink('/app/data/intelligence/features', 'Feature extraction')}
        </div>
      </details>
      <details className="features-pipeline__group" open>
        <summary className="features-pipeline__summary">Advanced analytics</summary>
        <div className="features-pipeline__links">
          {subLink('/app/data/analytics/trends', 'Trend detection')}
          {subLink('/app/data/analytics/bias', 'Bias and correlation')}
          {subLink('/app/data/analytics/aspect-sentiment', 'Aspect sentiment')}
        </div>
      </details>
      <details className="features-pipeline__group" open>
        <summary className="features-pipeline__summary">Decision layer</summary>
        <div className="features-pipeline__links">
          {subLink('/app/data/decision/recommendations', 'Recommendation engine')}
        </div>
      </details>
      <div className="features-pipeline__ingest-link">
        <NavLink
          to="/app/data/ingest"
          className={({ isActive }) =>
            `features-pipeline__sublink features-pipeline__ingest-cta ${isActive ? 'features-pipeline__sublink--active' : ''}`
          }
        >
          Ingestion and session
        </NavLink>
      </div>
    </nav>
  )
}
