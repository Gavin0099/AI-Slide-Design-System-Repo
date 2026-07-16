import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  GOOGLE_FONTS_REPOSITORY,
  fetchUpstreamAsset,
  upstreamAssetUrl,
  verifyUpstreamAsset,
} from './font-provenance.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fontRoot = path.join(repoRoot, 'theme', 'fonts')
const manifest = JSON.parse(await readFile(path.join(fontRoot, 'font-manifest.json'), 'utf8'))

assert.equal(manifest.sourceRepository, GOOGLE_FONTS_REPOSITORY)
assert.match(manifest.sourceCommit, /^[a-f0-9]{40}$/u)

for (const asset of manifest.assets) {
  const url = upstreamAssetUrl(manifest.sourceCommit, asset.sourcePath)
  const localBuffer = await readFile(path.join(fontRoot, asset.path))
  const upstreamBuffer = await fetchUpstreamAsset(url, asset.path)
  const digest = verifyUpstreamAsset(asset, localBuffer, upstreamBuffer)
  console.log(`${asset.path}: upstream bytes verified at ${manifest.sourceCommit.slice(0, 8)} (${digest})`)
}

console.log('Font upstream provenance passed: local assets byte-match the official google/fonts pinned commit')
console.log('Claim boundary: network verification does not make mutable repository metadata or reviewer identity tamper-proof')
