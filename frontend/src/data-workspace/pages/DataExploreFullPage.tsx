import { useDataWorkspace } from '../DataWorkspaceContext'
import { DatasetToolbar } from '../DatasetToolbar'
import { EmptyDatasetCta } from '../EmptyDatasetCta'
import { formatTimestamp, getRecordLanguage } from '../utils'

export default function DataExploreFullPage() {
  const {
    result,
    paginatedRecords,
    currentPage,
    setCurrentPage,
    totalPages,
    renderFakeCells,
    showRawJson,
    setShowRawJson,
    allRecords,
    filteredAndSortedRecords,
  } = useDataWorkspace()

  if (!result) {
    return (
      <div className="data-input-panel">
        <section className="nb-card nb-panel-card">
          <h2 className="nb-panel-card__title">Full Dataset View</h2>
          <EmptyDatasetCta />
        </section>
      </div>
    )
  }

  return (
    <div className="data-input-panel">
      <section className="nb-card nb-panel-card">
        <h2 className="nb-panel-card__title">Full Dataset View</h2>
        <p className="mode-hint">Complete normalized dataset with filters and pagination.</p>
        <DatasetToolbar />
        <h3 className="nb-section-heading">Full Normalized Dataset</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Review ID</th>
                <th>Text</th>
                <th>Source</th>
                <th>Timestamp</th>
                <th>Product ID</th>
                <th>Original Text</th>
                <th>Language</th>
                <th>Translated</th>
                <th>Fake verdict</th>
                <th>Risk %</th>
                <th>Signals</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={11}>No records match current filter.</td>
                </tr>
              ) : (
                paginatedRecords.map((record) => (
                  <tr key={`full-${record.review_id}-${record.timestamp}`}>
                    <td>{record.review_id}</td>
                    <td>{record.text}</td>
                    <td>{record.source}</td>
                    <td>{formatTimestamp(record.timestamp)}</td>
                    <td>{record.product_id}</td>
                    <td>{record.original_text || '—'}</td>
                    <td>
                      <span className="data-chip">{getRecordLanguage(record)}</span>
                    </td>
                    <td>
                      <span className={`data-chip ${record.translated ? 'chip-yes' : 'chip-no'}`}>
                        {record.translated ? 'Yes' : 'No'}
                      </span>
                    </td>
                    {renderFakeCells(record)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button
            type="button"
            className="nb-btn nb-btn--secondary"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            className="nb-btn nb-btn--secondary"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>

        <div className="raw-json-section">
          <button
            type="button"
            className="nb-btn nb-btn--secondary"
            onClick={() => setShowRawJson((shown) => !shown)}
          >
            {showRawJson ? 'Hide Raw JSON' : 'Show Raw JSON'}
          </button>
          {showRawJson ? (
            <pre className="raw-json">
              {JSON.stringify(
                {
                  ...result,
                  total_records: allRecords.length,
                  displayed_records: filteredAndSortedRecords.length,
                },
                null,
                2,
              )}
            </pre>
          ) : null}
        </div>
      </section>
    </div>
  )
}
