import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

export const AUTHORITY_SCHEMA = 'visual-review-authority.v1'

export function manifestSha256(manifestBuffer) {
  return createHash('sha256').update(manifestBuffer).digest('hex')
}

export function validateVisualReviewAuthority(receipt, expectedManifestSha256) {
  assert.equal(receipt?.schema, AUTHORITY_SCHEMA, 'visual authority receipt schema is unsupported')
  assert.equal(receipt?.deck, 'ai-governance', 'visual authority receipt deck must be ai-governance')
  assert.equal(receipt?.decision, 'approved', 'visual authority receipt must record an explicit approved decision')
  assert.equal(receipt?.reviewerType, 'human', 'visual authority receipt reviewerType must be human')
  assert.match(receipt?.reviewerId ?? '', /\S/u, 'visual authority receipt reviewerId is required')
  assert.match(receipt?.reviewedAt ?? '', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u, 'visual authority receipt reviewedAt must be an ISO UTC timestamp')
  assert.match(receipt?.evidenceRef ?? '', /\S/u, 'visual authority receipt evidenceRef is required')
  assert.ok(
    ['independent', 'single-contributor'].includes(receipt?.independenceMode),
    'visual authority receipt independenceMode must be independent or single-contributor',
  )
  assert.equal(
    receipt?.baselineManifestSha256,
    expectedManifestSha256,
    'visual authority receipt is stale: baseline manifest SHA-256 does not match',
  )
}
