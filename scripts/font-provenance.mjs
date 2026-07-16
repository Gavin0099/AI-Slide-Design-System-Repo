import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

export const GOOGLE_FONTS_REPOSITORY = 'https://github.com/google/fonts'
export const GOOGLE_FONTS_RAW_ROOT = 'https://raw.githubusercontent.com/google/fonts'

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

export function upstreamAssetUrl(sourceCommit, sourcePath) {
  assert.match(sourceCommit, /^[a-f0-9]{40}$/u, 'source commit must be a full Git SHA')
  assert.match(sourcePath, /^ofl\/notosanstc\/[A-Za-z0-9._\-[\]]+$/u, 'source path is outside the pinned Noto Sans TC family')
  const encodedPath = sourcePath.split('/').map(encodeURIComponent).join('/')
  return `${GOOGLE_FONTS_RAW_ROOT}/${sourceCommit}/${encodedPath}`
}

export function verifyUpstreamAsset(asset, localBuffer, upstreamBuffer) {
  const localDigest = sha256(localBuffer)
  const upstreamDigest = sha256(upstreamBuffer)

  assert.equal(localBuffer.length, asset.bytes, `${asset.path} local byte length drifted`)
  assert.equal(upstreamBuffer.length, asset.bytes, `${asset.path} upstream byte length differs from manifest`)
  assert.equal(localDigest, asset.sha256, `${asset.path} local SHA-256 drifted`)
  assert.equal(upstreamDigest, asset.sha256, `${asset.path} upstream SHA-256 differs from manifest`)
  assert.deepEqual(localBuffer, upstreamBuffer, `${asset.path} local bytes differ from pinned upstream bytes`)

  return upstreamDigest
}

export async function fetchUpstreamAsset(url, assetPath, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? 120_000
  let response
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) })
  }
  catch (error) {
    if (error?.name === 'TimeoutError')
      throw new Error(`${assetPath} upstream fetch timed out after ${timeoutMs / 1000} seconds`)
    throw error
  }
  if (!response.ok)
    throw new Error(`${assetPath} upstream fetch failed: HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}
