import { Link } from 'react-router-dom'
import './Marketing.css'

export type WorkspaceTab = 'voice' | 'data'

const BRANDS = ['ACME', 'GLOBEX', 'MOBU', 'UMBRELLA', 'STARK', 'WAYNE', 'VEHEMENT', 'PRAXIS', 'SOYLENT', 'INITECH']

export function MarketingLandingAbove() {
  return (
    <>
      <header className="nb-nav">
        <Link className="nb-nav__brand" to="/">
          <span className="nb-nav__logo" aria-hidden="true">
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
          Insight
        </Link>
        <nav className="nb-nav__links" aria-label="Page sections">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#personas">Personas</a>
          <Link to="/app/voice/overview">Workspace</Link>
        </nav>
        <div className="nb-nav__cta">
          <Link className="nb-btn nb-btn--push" to="/app/voice/overview">
            Open workspace
          </Link>
        </div>
      </header>
      <div className="nb-page-spacer" aria-hidden="true" />

      <div id="top">
        <section className="nb-hero nb-yellow-dots">
          <div className="nb-hero__grid">
            <div>
              <span className="nb-badge">NEW: Voice + review intelligence</span>
              <h1 className="nb-hero__title nb-heading">
                Turn messy signals into{' '}
                <span className="nb-hero__outline">clear</span> decisions.
              </h1>
              <p className="nb-hero__lede">
                Upload a call or ingest reviews at scale. Insight surfaces emotion, risk, fake patterns, and
                urgency so your team can act fast.
              </p>
              <div className="nb-hero__ctas">
                <Link className="nb-btn nb-btn--push" to="/app/voice/overview">
                  Analyze voice
                </Link>
                <Link className="nb-btn nb-btn--secondary" to="/app/data/overview">
                  Ingest reviews
                </Link>
              </div>
            </div>
            <div className="nb-mock" aria-hidden="true">
              <div className="nb-mock__bar">
                <span className="nb-mock__dot nb-mock__dot--r" />
                <span className="nb-mock__dot nb-mock__dot--y" />
                <span className="nb-mock__dot nb-mock__dot--g" />
              </div>
              <div className="nb-mock__body">
                <div className="nb-mock__chart">
                  <span style={{ fontWeight: 800, fontSize: '0.75rem' }}>Revenue pulse</span>
                  <div className="nb-mock__bars">
                    <div className="nb-mock__barcol" style={{ height: '45%' }} />
                    <div className="nb-mock__barcol" style={{ height: '72%' }} />
                    <div className="nb-mock__barcol" style={{ height: '55%' }} />
                    <div className="nb-mock__barcol" style={{ height: '90%' }} />
                    <div className="nb-mock__barcol" style={{ height: '38%' }} />
                  </div>
                </div>
                <div className="nb-mock__side">
                  <div className="nb-mock__tile nb-mock__tile--sage" />
                  <div className="nb-mock__tile nb-mock__tile--dark" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="nb-marquee-wrap">
          <div className="nb-marquee" aria-hidden="true">
            <div className="nb-marquee-track">
              {BRANDS.map((name, i) => (
                <span key={`m-a-${name}-${i}`}>{name}</span>
              ))}
              {BRANDS.map((name, i) => (
                <span key={`m-b-${name}-${i}`}>{name}</span>
              ))}
            </div>
          </div>
        </div>

        <section className="nb-section nb-section--white">
          <div className="nb-section__inner">
            <h2 className="nb-section__title nb-heading">Problem vs solution</h2>
            <div className="nb-prob-grid">
              <article className="nb-prob-card nb-prob-card--problem">
                <h3>Without Insight</h3>
                <ul className="nb-icon-list">
                  <li className="nb-x">Voice and text live in different tools.</li>
                  <li className="nb-x">Reviews pile up before anyone spots risk.</li>
                  <li className="nb-x">Trends feel subjective and slow to validate.</li>
                </ul>
              </article>
              <article className="nb-prob-card nb-prob-card--solution">
                <h3>With Insight</h3>
                <ul className="nb-icon-list">
                  <li className="nb-check">One workspace for calls and datasets.</li>
                  <li className="nb-check">Hybrid fake detection flags suspicious rows early.</li>
                  <li className="nb-check">Urgency + trend tables prioritize what changed.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section id="features" className="nb-section nb-section--yellow nb-yellow-dots">
          <div className="nb-section__inner">
            <h2 className="nb-section__title nb-heading">What you can ship faster</h2>
            <div className="nb-feature-grid">
              <article className="nb-feature-card">
                <div className="nb-feature-card__icon" aria-hidden="true" />
                <h3>Voice intelligence</h3>
                <p>Transcripts, tone, issues, and suggested actions from a single audio upload.</p>
              </article>
              <article className="nb-feature-card">
                <div className="nb-feature-card__icon" aria-hidden="true" />
                <h3>Review ingestion</h3>
                <p>CSV, JSON, manual paste, or YouTube comments—normalized rows with translation flags.</p>
              </article>
              <article className="nb-feature-card">
                <div className="nb-feature-card__icon" aria-hidden="true" />
                <h3>Signals & charts</h3>
                <p>Language mix, quality checks, token peaks, and exports for downstream ML or BI.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="how" className="nb-section nb-section--dark">
          <div className="nb-section__inner">
            <h2 className="nb-section__title nb-heading">How it works</h2>
            <div className="nb-how">
              <div className="nb-step">
                <div className="nb-step__circle">1</div>
                <h3>Bring data</h3>
                <p>Drop audio for voice analysis or load reviews via CSV, JSON, manual text, or YouTube.</p>
              </div>
              <div className="nb-step">
                <div className="nb-step__circle">2</div>
                <h3>Normalize & scan</h3>
                <p>Chunk large sets, translate-aware filters, and run fake + urgency scoring on what matters.</p>
              </div>
              <div className="nb-step">
                <div className="nb-step__circle">3</div>
                <h3>Share the story</h3>
                <p>Preview tables, charts, and exports your stakeholders can trust—hard numbers, hard borders.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="personas" className="nb-section nb-section--white">
          <div className="nb-section__inner">
            <h2 className="nb-section__title nb-heading">Built for sharp teams</h2>
            <div className="nb-bento">
              <article className="nb-bento-card nb-bento-card--sage">
                <div className="nb-bento-card__head">
                  <span className="nb-bento-card__pill">Product</span>
                </div>
                <h3>Hear the customer</h3>
                <p>Pair qualitative calls with quantitative review trends to prioritize the roadmap.</p>
              </article>
              <article className="nb-bento-card nb-bento-card--yellow">
                <div className="nb-bento-card__head">
                  <span className="nb-bento-card__pill">Operations</span>
                </div>
                <h3>Stop fires earlier</h3>
                <p>Urgency scoring and fake detection highlight spikes before they hit social channels.</p>
              </article>
              <article className="nb-bento-card nb-bento-card--dark">
                <div className="nb-bento-card__head">
                  <span className="nb-bento-card__pill">Analytics</span>
                </div>
                <h3>Clean handoffs</h3>
                <p>Exports, JSON views, and stable schemas so models and dashboards stay in sync.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="nb-section nb-section--sage">
          <div className="nb-section__inner">
            <h2 className="nb-section__title nb-heading">Teams stay loud about it</h2>
            <div className="nb-quote-grid">
              <figure className="nb-quote nb-quote--shape">
                <div className="nb-stars" aria-label="5 out of 5 stars">
                  ★★★★★
                </div>
                <blockquote>
                  <p>“We finally see urgency alongside sentiment. Borders are ugly—in a good way.”</p>
                </blockquote>
                <footer>— Riley, CX Lead</footer>
              </figure>
              <figure className="nb-quote nb-quote--shape">
                <div className="nb-stars" aria-label="5 out of 5 stars">
                  ★★★★★
                </div>
                <blockquote>
                  <p>“Fake review triage used to be a weekend job. Now it’s a button.”</p>
                </blockquote>
                <footer>— Morgan, Trust & Safety</footer>
              </figure>
              <figure className="nb-quote nb-quote--shape">
                <div className="nb-stars" aria-label="5 out of 5 stars">
                  ★★★★★
                </div>
                <blockquote>
                  <p>“Voice + data in one brutal UI. Our exec deck writes itself.”</p>
                </blockquote>
                <footer>— Avery, RevOps</footer>
              </figure>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

export function MarketingLandingBelow() {
  return (
    <>
      <section className="nb-cta-band nb-yellow-dots">
        <h2 className="nb-heading">Ready to break the noise?</h2>
        <Link className="nb-btn nb-btn--push" to="/app/voice/overview">
          Open workspace
        </Link>
      </section>
      <footer className="nb-footer">
        <div className="nb-footer__grid">
          <div>
            <h4>Product</h4>
            <ul>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <Link to="/app/voice/overview">Workspace</Link>
              </li>
              <li>
                <a href="#how">Workflow</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Resources</h4>
            <ul>
              <li>
                <a href="#personas">Personas</a>
              </li>
              <li>
                <a href="#top">Overview</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li>
                <Link to="/">Insight</Link>
              </li>
              <li>Neo-brutal, zero blur.</li>
            </ul>
          </div>
          <div>
            <h4>Social</h4>
            <div className="nb-social">
              <a href="#top" aria-label="Social placeholder X">
                X
              </a>
              <a href="#top" aria-label="Social placeholder in">
                in
              </a>
              <a href="#top" aria-label="Social placeholder git">
                {'<>'}
              </a>
            </div>
          </div>
        </div>
        <p className="nb-footer__bottom">© {new Date().getFullYear()} Insight. All borders reserved.</p>
      </footer>
    </>
  )
}
