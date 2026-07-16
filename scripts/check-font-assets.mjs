import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fontRoot = path.join(repoRoot, 'theme', 'fonts')
const manifest = JSON.parse(await readFile(path.join(fontRoot, 'font-manifest.json'), 'utf8'))

assert.equal(manifest.family, 'Noto Sans TC Local')
assert.equal(manifest.sourceRepository, 'https://github.com/google/fonts')
assert.match(manifest.sourceCommit, /^[a-f0-9]{40}$/)
assert.equal(manifest.license, 'OFL-1.1')
assert.equal(manifest.assets.length, 3)

for (const asset of manifest.assets) {
  const assetPath = path.join(fontRoot, asset.path)
  const buffer = await readFile(assetPath)
  const metadata = await stat(assetPath)
  const digest = createHash('sha256').update(buffer).digest('hex')
  assert.equal(metadata.size, asset.bytes, `${asset.path} byte length drifted`)
  assert.equal(digest, asset.sha256, `${asset.path} SHA-256 drifted`)
}

const typography = await readFile(path.join(repoRoot, 'theme', 'styles', 'typography.css'), 'utf8')
assert.match(typography, /font-family:\s*"Noto Sans TC Local"/)
assert.match(typography, /url\("\.\.\/fonts\/NotoSansTC-VF\.ttf"\)/)
assert.doesNotMatch(typography, /Microsoft JhengHei|PingFang|system-ui/)

console.log('Local font asset integrity passed: repo files match committed manifest sizes and SHA-256 values')
console.log('Claim boundary: this command records but does not contact or authenticate the upstream source commit')
