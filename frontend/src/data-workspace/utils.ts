import type { ReviewRecord } from '../api'

export function toCsv(records: ReviewRecord[]): string {
  const headers = [
    'review_id',
    'text',
    'source',
    'timestamp',
    'product_id',
    'original_text',
    'detected_language',
    'translated',
  ]
  const escapeCell = (value: string) => `"${value.replaceAll('"', '""')}"`
  const rows = records.map((record) =>
    [
      escapeCell(record.review_id),
      escapeCell(record.text),
      escapeCell(record.source),
      escapeCell(record.timestamp),
      escapeCell(record.product_id),
      escapeCell(record.original_text ?? ''),
      escapeCell(record.detected_language ?? ''),
      escapeCell(String(record.translated ?? false)),
    ].join(','),
  )
  return [headers.join(','), ...rows].join('\n')
}

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function formatTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp)
  return Number.isNaN(parsed.getTime()) ? timestamp : parsed.toLocaleString()
}

export function getRecordLanguage(record: ReviewRecord): string {
  return (record.detected_language ?? '').trim().toLowerCase() || 'unknown'
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
}
