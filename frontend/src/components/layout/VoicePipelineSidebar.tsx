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

export function VoicePipelineSidebar() {
  return (
    <nav className="features-pipeline" aria-label="Voice analysis pipeline">
      <details className="features-pipeline__group" open>
        <summary className="features-pipeline__summary">Data exploration</summary>
        <div className="features-pipeline__links">
          {subLink('/app/voice/explore/full', 'Full dataset view (transcripts)')}
          {subLink('/app/voice/explore/preprocessed', 'Preprocessed and cleaned')}
        </div>
      </details>
      <details className="features-pipeline__group" open>
        <summary className="features-pipeline__summary">Intelligence and classification</summary>
        <div className="features-pipeline__links">
          {subLink('/app/voice/intelligence/fake', 'Fake and sentiment (text)')}
          {subLink('/app/voice/intelligence/features', 'Feature extraction')}
        </div>
      </details>
      <details className="features-pipeline__group" open>
        <summary className="features-pipeline__summary">Advanced analytics</summary>
        <div className="features-pipeline__links">
          {subLink('/app/voice/analytics/trends', 'Trend detection')}
          {subLink('/app/voice/analytics/bias', 'Bias and correlation')}
        </div>
      </details>
      <details className="features-pipeline__group" open>
        <summary className="features-pipeline__summary">Decision layer</summary>
        <div className="features-pipeline__links">
          {subLink('/app/voice/decision/recommendations', 'Recommendation engine')}
        </div>
      </details>
      <div className="features-pipeline__ingest-link">
        <NavLink
          to="/app/voice/ingest"
          className={({ isActive }) =>
            `features-pipeline__sublink features-pipeline__ingest-cta ${isActive ? 'features-pipeline__sublink--active' : ''}`
          }
        >
          Voice capture
        </NavLink>
      </div>
    </nav>
  )
}
