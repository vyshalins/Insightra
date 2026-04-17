export function ChartsSkeleton() {
  return (
    <div className="charts-skeleton charts-grid" aria-hidden="true">
      {[0, 1, 2, 3].map((slot) => (
        <div key={slot} className="charts-skeleton-card">
          <div className="charts-skeleton-bars">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      ))}
    </div>
  )
}
