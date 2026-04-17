import type { FakeReviewResult } from '../api'
import type { VoiceSession } from './VoiceWorkspaceContext'

export function voiceFakeCells(record: VoiceSession, fakeById: Map<string, FakeReviewResult>) {
  const fr = fakeById.get(record.id)
  if (!fr) {
    return (
      <>
        <td className="fake-col">—</td>
        <td className="fake-col">—</td>
        <td className="fake-col fake-signals">—</td>
      </>
    )
  }
  const signalsText =
    fr.fake_signals.length > 0 ? fr.fake_signals.map((s) => s.replaceAll('_', ' ')).join(', ') : '—'
  return (
    <>
      <td className="fake-col">
        <span className={`fake-verdict ${fr.is_fake ? 'fake-verdict--fake' : 'fake-verdict--real'}`}>
          {fr.is_fake ? 'Likely fake' : 'Likely real'}
        </span>
      </td>
      <td className="fake-col" title={fr.explanation}>
        {(fr.fake_confidence * 100).toFixed(1)}%
        {fr.ml_fake_prob != null ? (
          <span className="fake-ml-hint"> (ML {(fr.ml_fake_prob * 100).toFixed(0)}%)</span>
        ) : null}
      </td>
      <td className="fake-col fake-signals" title={fr.explanation}>
        {signalsText}
        {fr.similarity_neighbor ? <span className="fake-dup-flag"> · near-dup</span> : null}
      </td>
    </>
  )
}
