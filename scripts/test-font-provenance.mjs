import assert from 'node:assert/strict'
import { fetchUpstreamAsset, sha256, upstreamAssetUrl, verifyUpstreamAsset } from './font-provenance.mjs'

const source = Buffer.from('pinned upstream font bytes')
const asset = {
  path: 'NotoSansTC-VF.ttf',
  bytes: source.length,
  sha256: sha256(source),
}

assert.equal(
  upstreamAssetUrl(
    'b950a7257470b900078f2bf3223823a8602de7e1',
    'ofl/notosanstc/NotoSansTC[wght].ttf',
  ),
  'https://raw.githubusercontent.com/google/fonts/b950a7257470b900078f2bf3223823a8602de7e1/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf',
)
assert.equal(verifyUpstreamAsset(asset, source, source), asset.sha256)
assert.throws(
  () => verifyUpstreamAsset(asset, source, Buffer.from('replaced upstream bytes')),
  /upstream byte length differs from manifest|upstream SHA-256 differs from manifest/,
)
assert.throws(
  () => upstreamAssetUrl('b950a725', 'ofl/notosanstc/NotoSansTC[wght].ttf'),
  /full Git SHA/,
)
assert.throws(
  () => upstreamAssetUrl('b950a7257470b900078f2bf3223823a8602de7e1', 'apache/other/font.ttf'),
  /outside the pinned Noto Sans TC family/,
)
await assert.rejects(
  () => fetchUpstreamAsset('https://example.invalid/font.ttf', 'font.ttf', {
    fetchImpl: async () => {
      const error = new Error('timed out')
      error.name = 'TimeoutError'
      throw error
    },
    timeoutMs: 1_000,
  }),
  /font\.ttf upstream fetch timed out after 1 seconds/,
)
await assert.rejects(
  () => fetchUpstreamAsset('https://example.invalid/font.ttf', 'font.ttf', {
    fetchImpl: async () => ({ ok: false, status: 404 }),
  }),
  /font\.ttf upstream fetch failed: HTTP 404/,
)

console.log('Font provenance regression passed: URL pinning and byte/digest mismatches fail closed')
