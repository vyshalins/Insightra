import type { DatasetSort, TranslationFilter } from './DataWorkspaceContext'
import { useDataWorkspace } from './DataWorkspaceContext'

export function DatasetToolbar() {
  const {
    filterText,
    setFilterText,
    sortBy,
    setSortBy,
    languageFilter,
    setLanguageFilter,
    translationFilter,
    setTranslationFilter,
    languageOptions,
    handleExportJson,
    handleExportCsv,
    setCurrentPage,
  } = useDataWorkspace()

  return (
    <div className="dataset-controls nb-dataset-toolbar">
      <label htmlFor="filter-text">
        Filter
        <input
          id="filter-text"
          type="text"
          placeholder="Search in id/text/source/product/timestamp"
          value={filterText}
          onChange={(event) => {
            setFilterText(event.target.value)
            setCurrentPage(1)
          }}
        />
      </label>

      <label htmlFor="sort-order">
        Sort
        <select
          id="sort-order"
          value={sortBy}
          onChange={(event) => {
            setSortBy(event.target.value as DatasetSort)
            setCurrentPage(1)
          }}
        >
          <option value="timestamp_desc">Newest first</option>
          <option value="timestamp_asc">Oldest first</option>
          <option value="text_length_desc">Longest cleaned text</option>
          <option value="text_length_asc">Shortest cleaned text</option>
        </select>
      </label>

      <label htmlFor="language-filter">
        Language
        <select
          id="language-filter"
          value={languageFilter}
          onChange={(event) => {
            setLanguageFilter(event.target.value)
            setCurrentPage(1)
          }}
        >
          {languageOptions.map((language) => (
            <option key={language} value={language}>
              {language === 'all' ? 'All languages' : language}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="translation-filter">
        Translation
        <select
          id="translation-filter"
          value={translationFilter}
          onChange={(event) => {
            setTranslationFilter(event.target.value as TranslationFilter)
            setCurrentPage(1)
          }}
        >
          <option value="all">All</option>
          <option value="translated">Translated</option>
          <option value="not_translated">Not translated</option>
        </select>
      </label>

      <div className="dataset-actions">
        <button type="button" className="nb-btn nb-btn--secondary" onClick={handleExportJson}>
          Export JSON
        </button>
        <button type="button" className="nb-btn nb-btn--secondary" onClick={handleExportCsv}>
          Export CSV
        </button>
      </div>
    </div>
  )
}
