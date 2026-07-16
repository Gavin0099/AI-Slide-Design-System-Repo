import assert from 'node:assert/strict'
import { manifestSha256, validateVisualReviewAuthority } from './visual-review-authority.mjs'

const manifestBuffer = Buffer.from('{"deck":"ai-governance"}\n')
const digest = manifestSha256(manifestBuffer)
const validReceipt = {
  schema: 'visual-review-authority.v1',
  deck: 'ai-governance',
  decision: 'approved',
  reviewerType: 'human',
  reviewerId: 'human-reviewer',
  reviewedAt: '2026-07-16T12:00:00Z',
  evidenceRef: 'external-review:example',
  independenceMode: 'independent',
  baselineManifestSha256: digest,
}

assert.doesNotThrow(() => validateVisualReviewAuthority(validReceipt, digest))
assert.throws(
  () => validateVisualReviewAuthority({ ...validReceipt, reviewerType: 'agent' }, digest),
  /reviewerType must be human/,
)
assert.throws(
  () => validateVisualReviewAuthority({ ...validReceipt, decision: 'suggested' }, digest),
  /explicit approved decision/,
)
assert.throws(
  () => validateVisualReviewAuthority({ ...validReceipt, baselineManifestSha256: '0'.repeat(64) }, digest),
  /receipt is stale/,
)

console.log('Visual authority regression passed: agent, non-decision, and stale receipts fail closed')
